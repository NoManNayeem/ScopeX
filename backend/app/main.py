import os
import json
from typing import List, Optional
from dotenv import load_dotenv

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from agno.agent import Agent
from agno.models.openai import OpenAIChat
from agno.db.sqlite import SqliteDb
from agno.os import AgentOS
from agno.tools.mcp import MCPTools
from mcp import StdioServerParameters

# Optional Claude import
try:
    from agno.models.anthropic import Claude
    CLAUDE_AVAILABLE = True
except ImportError:
    CLAUDE_AVAILABLE = False

from sqlalchemy import create_engine, Integer, String, Boolean
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker, Session


# Load environment variables from .env file
load_dotenv()

# Ensure data directory exists
os.makedirs("data", exist_ok=True)

# ----- Config -----
AGNO_DB_URL = os.getenv("AGNO_DB_URL", "sqlite:///./data/scopex.db")
MODEL_PROVIDER = os.getenv("AGNO_MODEL_PROVIDER", "openai")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
ENABLE_MCP = os.getenv("AGNO_ENABLE_MCP_SERVER", "false").lower() == "true"
HOST = os.getenv("AGNO_HOST", "0.0.0.0")
PORT = int(os.getenv("AGNO_PORT", "7777"))
CORS_ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",") if o.strip()]
AGENT_ID = os.getenv("AGENT_ID", "scopex-agent")
AGENT_NAME = os.getenv("AGENT_NAME", "ScopeX Assistant")


# ----- SQLAlchemy for MCP/Tools config -----
class Base(DeclarativeBase):
	pass


class MCPServer(Base):
	__tablename__ = "mcp_servers"
	id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
	name: Mapped[str] = mapped_column(String(128))
	transport: Mapped[str] = mapped_column(String(64), default="streamable-http")
	url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
	command: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
	args: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)  # JSON string
	env: Mapped[Optional[str]] = mapped_column(String(2048), nullable=True)  # JSON string
	headers: Mapped[Optional[str]] = mapped_column(String(2048), nullable=True)  # JSON string
	timeout: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
	enabled: Mapped[bool] = mapped_column(Boolean, default=True)


class CustomTool(Base):
	__tablename__ = "custom_tools"
	id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
	name: Mapped[str] = mapped_column(String(128))
	# For minimal MVP, store metadata/json in string; real impl can expand
	config: Mapped[Optional[str]] = mapped_column(String(2048), nullable=True)
	enabled: Mapped[bool] = mapped_column(Boolean, default=True)


engine = create_engine(AGNO_DB_URL, echo=False)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base.metadata.create_all(engine)


def get_db() -> Session:
	db = SessionLocal()
	try:
		yield db
	finally:
		db.close()


# ----- AgentOS Setup -----
if MODEL_PROVIDER == "anthropic" and CLAUDE_AVAILABLE:
	model = Claude(id="claude-3-7-sonnet-latest")
else:
	model = OpenAIChat(id="gpt-5-mini")

agno_db = SqliteDb(db_file="data/scopex.db")
chat_agent = Agent(
	id=AGENT_ID,
	name=AGENT_NAME,
	model=model,
	db=agno_db,
	add_history_to_context=True,
	num_history_runs=3,
	markdown=True,
)

agent_os = AgentOS(
	agents=[chat_agent],
)

app: FastAPI = agent_os.get_app()

# Startup event to load MCP tools
@app.on_event("startup")
async def startup_event():
	"""Load MCP tools when the application starts"""
	print("Loading MCP tools at startup...")
	await update_agent_tools()

# CORS for frontend
app.add_middleware(
	CORSMiddleware,
	allow_origins=CORS_ORIGINS or ["*"],
	allow_credentials=True,
	allow_methods=["*"],
	allow_headers=["*"],
)


# ----- MCP Tools Management -----
async def load_mcp_tools(mcp_config: dict) -> MCPTools:
	"""Load MCP tools based on configuration"""
	transport = mcp_config.get('transport', 'stdio')
	
	if transport == 'stdio':
		server_params = StdioServerParameters(
			command=mcp_config['command'],
			args=mcp_config.get('args', []),
			env=mcp_config.get('env', {})
		)
		return MCPTools(server_params=server_params, transport="stdio")
	
	elif transport == 'streamable-http':
		# For HTTP transport, use URL directly
		return MCPTools(url=mcp_config['url'], transport="streamable-http")
	
	else:
		raise ValueError(f"Unsupported transport: {transport}")

async def update_agent_tools():
	"""Update the agent with available MCP tools"""
	try:
		# Get all enabled MCP servers
		db = SessionLocal()
		mcp_servers = db.query(MCPServer).filter(MCPServer.enabled == True).all()
		
		tools = []
		for mcp_server in mcp_servers:
			try:
				# Parse JSON fields
				args = json.loads(mcp_server.args) if mcp_server.args else []
				env = json.loads(mcp_server.env) if mcp_server.env else {}
				headers = json.loads(mcp_server.headers) if mcp_server.headers else {}
				
				mcp_tools = await load_mcp_tools({
					'transport': mcp_server.transport,
					'url': mcp_server.url,
					'command': mcp_server.command,
					'args': args,
					'env': env,
					'headers': headers,
					'timeout': mcp_server.timeout
				})
				
				# Connect to MCP server
				await mcp_tools.connect()
				tools.append(mcp_tools)
				print(f"Successfully loaded MCP server: {mcp_server.name}")
				
			except Exception as e:
				print(f"Failed to load MCP server {mcp_server.name}: {e}")
		
		# Update the agent with new tools
		chat_agent.set_tools(tools)
		print(f"Updated agent with {len(tools)} MCP tools")
		
	finally:
		db.close()

# ----- Simple CRUD for MCP servers and tools -----
class MCPIn(BaseModel):
	name: str
	transport: Optional[str] = "streamable-http"
	url: Optional[str] = None
	command: Optional[str] = None
	args: Optional[List[str]] = None
	env: Optional[dict] = None
	headers: Optional[dict] = None
	timeout: Optional[int] = 30
	enabled: Optional[bool] = True


class MCPOut(MCPIn):
	id: int

	class Config:
		from_attributes = True


@app.get("/scopex/mcps", response_model=List[MCPOut])
def list_mcps(db: Session = Depends(get_db)):
	mcps = db.query(MCPServer).all()
	# Convert JSON strings back to objects for response
	for mcp in mcps:
		if mcp.args:
			try:
				mcp.args = json.loads(mcp.args)
			except:
				mcp.args = []
		if mcp.env:
			try:
				mcp.env = json.loads(mcp.env)
			except:
				mcp.env = {}
		if mcp.headers:
			try:
				mcp.headers = json.loads(mcp.headers)
			except:
				mcp.headers = {}
	return mcps


@app.post("/scopex/mcps", response_model=MCPOut)
async def create_mcp(mcp: MCPIn, db: Session = Depends(get_db)):
	try:
		# Convert lists and dicts to JSON strings for storage
		mcp_data = mcp.model_dump()
		if mcp_data.get('args'):
			mcp_data['args'] = json.dumps(mcp_data['args'])
		if mcp_data.get('env'):
			mcp_data['env'] = json.dumps(mcp_data['env'])
		if mcp_data.get('headers'):
			mcp_data['headers'] = json.dumps(mcp_data['headers'])
		
		row = MCPServer(**mcp_data)
		db.add(row)
		db.commit()
		db.refresh(row)
		
		# Convert JSON strings back to objects for response
		if row.args:
			try:
				row.args = json.loads(row.args)
			except:
				row.args = []
		if row.env:
			try:
				row.env = json.loads(row.env)
			except:
				row.env = {}
		if row.headers:
			try:
				row.headers = json.loads(row.headers)
			except:
				row.headers = {}
		
		# Reload agent tools with new MCP server (don't fail if this fails)
		try:
			await update_agent_tools()
		except Exception as e:
			print(f"Warning: Failed to update agent tools: {e}")
		
		return row
	except Exception as e:
		print(f"Error creating MCP: {e}")
		raise HTTPException(status_code=500, detail=f"Failed to create MCP: {str(e)}")


@app.delete("/scopex/mcps/{mcp_id}")
async def delete_mcp(mcp_id: int, db: Session = Depends(get_db)):
	row = db.get(MCPServer, mcp_id)
	if not row:
		raise HTTPException(status_code=404, detail="MCP not found")
	db.delete(row)
	db.commit()
	
	# Reload agent tools after deletion
	await update_agent_tools()
	
	return {"ok": True}


@app.get("/scopex/tools/available")
async def get_available_tools():
	"""Get list of available tools from MCP servers"""
	try:
		# Get tools from the agent
		agent_tools = chat_agent.tools if hasattr(chat_agent, 'tools') else []
		available_tools = []
		
		for tool in agent_tools:
			if hasattr(tool, 'functions'):
				for tool_name, tool_info in tool.functions.items():
					available_tools.append({
						'name': tool_name,
						'description': tool_info.get('description', ''),
						'source': 'MCP Tool'
					})
		
		return {"tools": available_tools}
	except Exception as e:
		raise HTTPException(status_code=500, detail=f"Failed to get available tools: {str(e)}")


class ToolIn(BaseModel):
	name: str
	config: Optional[str] = None
	enabled: Optional[bool] = True


class ToolOut(ToolIn):
	id: int

	class Config:
		from_attributes = True


@app.get("/scopex/tools", response_model=List[ToolOut])
def list_tools(db: Session = Depends(get_db)):
	return db.query(CustomTool).all()


@app.post("/scopex/tools", response_model=ToolOut)
def create_tool(tool: ToolIn, db: Session = Depends(get_db)):
	row = CustomTool(**tool.model_dump())
	db.add(row)
	db.commit()
	db.refresh(row)
	return row


@app.delete("/scopex/tools/{tool_id}")
def delete_tool(tool_id: int, db: Session = Depends(get_db)):
	row = db.get(CustomTool, tool_id)
	if not row:
		raise HTTPException(status_code=404, detail="Tool not found")
	db.delete(row)
	db.commit()
	return {"ok": True}


if __name__ == "__main__":
	agent_os.serve(app=__name__ + ":app", host=HOST, port=PORT, reload=False)
