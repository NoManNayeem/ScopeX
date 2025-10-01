# ScopeX

Minimal platform built on Agno AgentOS with plug-and-play MCP and custom tools, and a Next.js frontend featuring an interactive chat UI, landing, profile, and settings.

## Stack
- Backend: Python 3.12, FastAPI via Agno AgentOS, SQLite
- Frontend: Next.js 14 (App Router), TypeScript, Tailwind
- Infra: Docker & docker-compose

## Quick start
1. Copy env files:
   - Backend: `cp backend/.env.example backend/.env`
   - Frontend: `cp frontend/.env.example frontend/.env`
2. Start services:
   - `docker compose up --build`
3. Open:
   - Backend API/docs: `http://localhost:7777/docs`
   - Frontend UI: `http://localhost:3000`

## Notes
- AgentOS provides pre-built endpoints for agents, sessions, and SSE streaming.
- MCP servers and custom tools are configured in the backend and selectable per chat in the UI.


