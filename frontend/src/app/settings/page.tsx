'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Plus, Trash2, Settings as SettingsIcon, Bot, Zap } from 'lucide-react'

interface MCPServer {
  id: number
  name: string
  transport: string
  url?: string
  command?: string
  args?: string[]
  env?: Record<string, string>
  headers?: Record<string, string>
  timeout?: number
  enabled: boolean
}

interface CustomTool {
  id: number
  name: string
  type: string
  config?: string
  enabled: boolean
}

export default function SettingsPage() {
  const [mcps, setMcps] = useState<MCPServer[]>([])
  const [tools, setTools] = useState<CustomTool[]>([])
  const [showAddMCP, setShowAddMCP] = useState(false)
  const [showAddTool, setShowAddTool] = useState(false)
  const [selectedTransport, setSelectedTransport] = useState('streamable-http')

  const addMCP = async (mcp: Omit<MCPServer, 'id'>) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/scopex/mcps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mcp)
      })
      if (response.ok) {
        const newMCP = await response.json()
        setMcps(prev => [...prev, newMCP])
        setShowAddMCP(false)
      }
    } catch (error) {
      console.error('Failed to add MCP:', error)
    }
  }

  const addTool = async (tool: Omit<CustomTool, 'id'>) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/scopex/tools`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tool)
      })
      if (response.ok) {
        const newTool = await response.json()
        setTools(prev => [...prev, newTool])
        setShowAddTool(false)
      }
    } catch (error) {
      console.error('Failed to add tool:', error)
    }
  }

  const deleteMCP = async (id: number) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/scopex/mcps/${id}`, {
        method: 'DELETE'
      })
      if (response.ok) {
        setMcps(prev => prev.filter(mcp => mcp.id !== id))
      }
    } catch (error) {
      console.error('Failed to delete MCP:', error)
    }
  }

  const deleteTool = async (id: number) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/scopex/tools/${id}`, {
        method: 'DELETE'
      })
      if (response.ok) {
        setTools(prev => prev.filter(tool => tool.id !== id))
      }
    } catch (error) {
      console.error('Failed to delete tool:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link 
                href="/chat" 
                className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to chat
              </Link>
            </div>
            <div className="flex items-center space-x-2">
              <SettingsIcon className="h-5 w-5 text-gray-500" />
              <span className="text-lg font-semibold text-gray-900">Settings</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="space-y-8">
          {/* MCP Servers */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Bot className="h-6 w-6 text-blue-600" />
                  <h2 className="text-xl font-semibold text-gray-900">MCP Servers</h2>
                </div>
                <button
                  onClick={() => setShowAddMCP(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add MCP</span>
                </button>
              </div>
            </div>
            <div className="p-6">
              {mcps.length === 0 ? (
                <div className="text-center py-8">
                  <Bot className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No MCP servers configured</p>
                  <p className="text-sm text-gray-400 mt-1">Add your first MCP server to get started</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {mcps.map((mcp) => (
                    <div key={mcp.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <h3 className="font-medium text-gray-900">{mcp.name}</h3>
                        <p className="text-sm text-gray-500">{mcp.transport}</p>
                      </div>
                      <button
                        onClick={() => deleteMCP(mcp.id)}
                        className="text-red-600 hover:text-red-700 p-2"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Custom Tools */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Zap className="h-6 w-6 text-green-600" />
                  <h2 className="text-xl font-semibold text-gray-900">Custom Tools</h2>
                </div>
                <button
                  onClick={() => setShowAddTool(true)}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Tool</span>
                </button>
              </div>
            </div>
            <div className="p-6">
              {tools.length === 0 ? (
                <div className="text-center py-8">
                  <Zap className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No custom tools configured</p>
                  <p className="text-sm text-gray-400 mt-1">Add your first custom tool to extend capabilities</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tools.map((tool) => (
                    <div key={tool.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <h3 className="font-medium text-gray-900">{tool.name}</h3>
                        <p className="text-sm text-gray-500">Custom tool</p>
                      </div>
                      <button
                        onClick={() => deleteTool(tool.id)}
                        className="text-red-600 hover:text-red-700 p-2"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add MCP Modal */}
      {showAddMCP && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Add MCP Server</h3>
            <form onSubmit={(e) => {
              e.preventDefault()
              const formData = new FormData(e.target as HTMLFormElement)
              const transport = formData.get('transport') as string
              
              const mcpData: any = {
                name: formData.get('name') as string,
                transport,
                enabled: true
              }

              if (transport === 'streamable-http') {
                mcpData.url = formData.get('url') as string
                mcpData.headers = formData.get('headers') ? JSON.parse(formData.get('headers') as string) : {}
                mcpData.timeout = formData.get('timeout') ? parseInt(formData.get('timeout') as string) : 30
              } else if (transport === 'stdio') {
                mcpData.command = formData.get('command') as string
                mcpData.args = formData.get('args') ? (formData.get('args') as string).split(',').map(s => s.trim()) : []
                mcpData.env = formData.get('env') ? JSON.parse(formData.get('env') as string) : {}
              }

              addMCP(mcpData)
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input 
                    name="name" 
                    required 
                    placeholder="e.g., GitHub MCP Server"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" 
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Transport Type</label>
                  <select 
                    name="transport" 
                    value={selectedTransport}
                    onChange={(e) => setSelectedTransport(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="streamable-http">Streamable HTTP (Recommended)</option>
                    <option value="stdio">STDIO (Local servers)</option>
                    <option value="sse">SSE (Deprecated)</option>
                  </select>
                </div>

                {/* HTTP Configuration */}
                <div className={`space-y-4 ${selectedTransport === 'streamable-http' ? 'block' : 'hidden'}`}>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Server URL</label>
                    <input 
                      name="url" 
                      placeholder="https://docs.agno.com/mcp"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" 
                    />
                    <p className="text-xs text-gray-500 mt-1">Examples: https://docs.agno.com/mcp, http://localhost:8000/mcp</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Headers (JSON)</label>
                    <textarea 
                      name="headers" 
                      rows={3}
                      placeholder='{"Authorization": "Bearer token", "X-API-Key": "key"}'
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Timeout (seconds)</label>
                    <input 
                      name="timeout" 
                      type="number" 
                      defaultValue={30}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" 
                    />
                  </div>
                </div>

                {/* STDIO Configuration */}
                <div className={`space-y-4 ${selectedTransport === 'stdio' ? 'block' : 'hidden'}`}>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Command</label>
                    <input 
                      name="command" 
                      placeholder="npx"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" 
                    />
                    <p className="text-xs text-gray-500 mt-1">Examples: npx, uvx, python, node</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Arguments (comma-separated)</label>
                    <input 
                      name="args" 
                      placeholder="-y, @modelcontextprotocol/server-github"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" 
                    />
                    <p className="text-xs text-gray-500 mt-1">Examples: -y, @modelcontextprotocol/server-github</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Environment Variables (JSON)</label>
                    <textarea 
                      name="env" 
                      rows={3}
                      placeholder='{"GITHUB_TOKEN": "your-token", "API_KEY": "your-key"}'
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Examples Section */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">💡 Popular MCP Servers</h4>
                  <div className="space-y-2 text-sm text-blue-800">
                    <div>
                      <strong>GitHub:</strong> npx -y @modelcontextprotocol/server-github
                    </div>
                    <div>
                      <strong>Notion:</strong> npx -y @notionhq/notion-mcp-server
                    </div>
                    <div>
                      <strong>Google Maps:</strong> npx -y @modelcontextprotocol/server-google-maps
                    </div>
                    <div>
                      <strong>Agno Docs:</strong> https://docs.agno.com/mcp
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex space-x-3 mt-6">
                <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">
                  Add MCP Server
                </button>
                <button type="button" onClick={() => setShowAddMCP(false)} className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Tool Modal */}
      {showAddTool && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Add Custom Tool</h3>
            <form onSubmit={(e) => {
              e.preventDefault()
              const formData = new FormData(e.target as HTMLFormElement)
              addTool({
                name: formData.get('name') as string,
                type: formData.get('type') as string,
                config: formData.get('config') as string,
                enabled: true
              })
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tool Name</label>
                  <input 
                    name="name" 
                    required 
                    placeholder="e.g., Weather Tool, Calculator, File Manager"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500" 
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tool Type</label>
                  <select name="type" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500">
                    <option value="reasoning">Reasoning Tools</option>
                    <option value="knowledge">Knowledge Tools</option>
                    <option value="memory">Memory Tools</option>
                    <option value="custom">Custom Function</option>
                    <option value="api">API Integration</option>
                    <option value="database">Database Tool</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Configuration (JSON)</label>
                  <textarea 
                    name="config" 
                    rows={8}
                    placeholder='{
  "description": "Tool description",
  "parameters": {
    "param1": "string",
    "param2": "number"
  },
  "function": "def my_tool(param1, param2): return result"
}'
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 font-mono text-sm" 
                  />
                </div>

                {/* Examples Section */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-green-900 mb-2">💡 Tool Examples</h4>
                  <div className="space-y-3 text-sm text-green-800">
                    <div>
                      <strong>Reasoning Tools:</strong> Enable structured thinking and problem-solving
                    </div>
                    <div>
                      <strong>Knowledge Tools:</strong> Search and analyze knowledge bases
                    </div>
                    <div>
                      <strong>Memory Tools:</strong> Store and retrieve user information
                    </div>
                    <div>
                      <strong>Custom Function:</strong> Python functions for specific tasks
                    </div>
                    <div>
                      <strong>API Integration:</strong> Connect to external services
                    </div>
                  </div>
                </div>

                {/* Quick Templates */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">🚀 Quick Templates</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      type="button"
                      onClick={() => {
                        const textarea = document.querySelector('textarea[name="config"]') as HTMLTextAreaElement
                        textarea.value = JSON.stringify({
                          "description": "Calculator tool for basic math operations",
                          "parameters": {
                            "expression": "string"
                          },
                          "function": "def calculate(expression): return eval(expression)"
                        }, null, 2)
                      }}
                      className="text-xs bg-white border border-gray-300 rounded px-2 py-1 hover:bg-gray-50"
                    >
                      Calculator
                    </button>
                    <button 
                      type="button"
                      onClick={() => {
                        const textarea = document.querySelector('textarea[name="config"]') as HTMLTextAreaElement
                        textarea.value = JSON.stringify({
                          "description": "File manager for reading and writing files",
                          "parameters": {
                            "path": "string",
                            "content": "string"
                          },
                          "function": "def file_manager(path, content=None): return file_operations(path, content)"
                        }, null, 2)
                      }}
                      className="text-xs bg-white border border-gray-300 rounded px-2 py-1 hover:bg-gray-50"
                    >
                      File Manager
                    </button>
                    <button 
                      type="button"
                      onClick={() => {
                        const textarea = document.querySelector('textarea[name="config"]') as HTMLTextAreaElement
                        textarea.value = JSON.stringify({
                          "description": "Weather API integration",
                          "parameters": {
                            "location": "string"
                          },
                          "function": "def get_weather(location): return weather_api_call(location)"
                        }, null, 2)
                      }}
                      className="text-xs bg-white border border-gray-300 rounded px-2 py-1 hover:bg-gray-50"
                    >
                      Weather API
                    </button>
                    <button 
                      type="button"
                      onClick={() => {
                        const textarea = document.querySelector('textarea[name="config"]') as HTMLTextAreaElement
                        textarea.value = JSON.stringify({
                          "description": "Database query tool",
                          "parameters": {
                            "query": "string"
                          },
                          "function": "def db_query(query): return database.execute(query)"
                        }, null, 2)
                      }}
                      className="text-xs bg-white border border-gray-300 rounded px-2 py-1 hover:bg-gray-50"
                    >
                      Database
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex space-x-3 mt-6">
                <button type="submit" className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700">
                  Add Custom Tool
                </button>
                <button type="button" onClick={() => setShowAddTool(false)} className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
