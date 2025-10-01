'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Settings, Plus, ChevronDown, X } from 'lucide-react'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface AvailableTool {
  name: string
  description: string
  source: string
}

interface MCPServer {
  id: number
  name: string
  transport: string
  url?: string
  command?: string
  enabled: boolean
}

interface CustomTool {
  id: number
  name: string
  type: string
  config?: string
  enabled: boolean
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [selectedTools, setSelectedTools] = useState<string[]>([])
  const [selectedMCPs, setSelectedMCPs] = useState<string[]>([])
  const [availableTools, setAvailableTools] = useState<AvailableTool[]>([])
  const [mcpServers, setMcpServers] = useState<MCPServer[]>([])
  const [customTools, setCustomTools] = useState<CustomTool[]>([])
  const [sessionId, setSessionId] = useState<string>('')
  const [userId, setUserId] = useState<string>('')
  const [showToolDropdown, setShowToolDropdown] = useState(false)
  const [showMCPDropdown, setShowMCPDropdown] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Load available tools and MCPs
  const loadAvailableTools = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/scopex/tools/available`)
      if (response.ok) {
        const data = await response.json()
        setAvailableTools(data.tools || [])
      }
    } catch (error) {
      console.error('Failed to load available tools:', error)
    }
  }

  const loadMCPs = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/scopex/mcps`)
      if (response.ok) {
        const mcps = await response.json()
        setMcpServers(mcps || [])
      }
    } catch (error) {
      console.error('Failed to load MCP servers:', error)
    }
  }

  const loadCustomTools = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/scopex/tools`)
      if (response.ok) {
        const tools = await response.json()
        setCustomTools(tools || [])
      }
    } catch (error) {
      console.error('Failed to load custom tools:', error)
    }
  }

  // Initialize session and load previous messages
  useEffect(() => {
    const initializeSession = () => {
      // Get or create session ID
      let currentSessionId = localStorage.getItem('scopex-session-id')
      if (!currentSessionId) {
        currentSessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        localStorage.setItem('scopex-session-id', currentSessionId)
      }
      setSessionId(currentSessionId)

      // Get or create user ID
      let currentUserId = localStorage.getItem('scopex-user-id')
      if (!currentUserId) {
        currentUserId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        localStorage.setItem('scopex-user-id', currentUserId)
      }
      setUserId(currentUserId)

      // Load previous messages from localStorage
      const savedMessages = localStorage.getItem(`scopex-messages-${currentSessionId}`)
      if (savedMessages) {
        try {
          const parsedMessages = JSON.parse(savedMessages)
          // Convert timestamp strings back to Date objects
          const messagesWithDates = parsedMessages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }))
          setMessages(messagesWithDates)
        } catch (error) {
          console.error('Error loading saved messages:', error)
        }
      }

      // Load available tools and MCPs
      loadAvailableTools()
      loadMCPs()
      loadCustomTools()
    }

    initializeSession()
  }, [])

  // Save messages to localStorage whenever messages change
  useEffect(() => {
    if (sessionId && messages.length > 0) {
      localStorage.setItem(`scopex-messages-${sessionId}`, JSON.stringify(messages))
    }
  }, [messages, sessionId])

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/agents/scopex-agent/runs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          message: input,
          stream: 'true',
          user_id: userId,
          session_id: sessionId,
          selected_tools: JSON.stringify(selectedTools),
          selected_mcps: JSON.stringify(selectedMCPs)
        })
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      const reader = response.body?.getReader()
      if (!reader) return

      const assistantMessageId = (Date.now() + 1).toString()
      const assistantMessage: Message = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date()
      }

      setMessages(prev => [...prev, assistantMessage])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = new TextDecoder().decode(value)
        const lines = chunk.split('\n')
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') {
              setIsLoading(false)
              return
            }
            
            try {
              const parsed = JSON.parse(data)
              if (parsed.content) {
                setMessages(prev => 
                  prev.map(msg => 
                    msg.id === assistantMessageId 
                      ? { ...msg, content: msg.content + parsed.content }
                      : msg
                  )
                )
              }
            } catch (e) {
              // Ignore parsing errors for non-JSON chunks
            }
          }
        }
      }
    } catch (error) {
      console.error('Error sending message:', error)
      // Check if we already have an assistant message for this request
      setMessages(prev => {
        const lastMessage = prev[prev.length - 1]
        if (lastMessage && lastMessage.role === 'assistant' && lastMessage.content === '') {
          // Update the existing empty assistant message with error
          return prev.map(msg => 
            msg.id === lastMessage.id 
              ? { ...msg, content: 'Sorry, I encountered an error. Please try again.' }
              : msg
          )
        } else {
          // Add new error message
          return [...prev, {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: 'Sorry, I encountered an error. Please try again.',
            timestamp: new Date()
          }]
        }
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.tool-dropdown') && !target.closest('.mcp-dropdown')) {
        setShowToolDropdown(false)
        setShowMCPDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Bot className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-xl font-semibold text-gray-900">ScopeX Chat</h1>
            <p className="text-sm text-gray-500">
              AI Assistant with Plug-and-Play Tools
              {sessionId && (
                <span className="ml-2 text-xs text-gray-400">
                  Session: {sessionId.split('-')[1]}
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              const newSessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
              localStorage.setItem('scopex-session-id', newSessionId)
              setSessionId(newSessionId)
              setMessages([])
              localStorage.removeItem(`scopex-messages-${sessionId}`)
            }}
            className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            New Chat
          </button>
          <Link 
            href="/settings" 
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Settings className="h-5 w-5" />
          </Link>
        </div>
      </div>

      {/* Tool Selection Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">Tools:</span>
            <div className="relative tool-dropdown">
              <button
                onClick={() => setShowToolDropdown(!showToolDropdown)}
                className="flex items-center space-x-2 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <span>Select Tools ({selectedTools.length})</span>
                <ChevronDown className="h-4 w-4" />
              </button>
              
              {showToolDropdown && (
                <div className="absolute top-full left-0 mt-1 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                  <div className="p-2">
                    <div className="text-xs font-medium text-gray-500 mb-2">Available Tools</div>
                    {availableTools.map((tool) => (
                      <label key={tool.name} className="flex items-start space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedTools.includes(tool.name)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedTools([...selectedTools, tool.name])
                            } else {
                              setSelectedTools(selectedTools.filter(t => t !== tool.name))
                            }
                          }}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900">{tool.name}</div>
                          <div className="text-xs text-gray-500">{tool.description}</div>
                          <div className="text-xs text-blue-600">{tool.source}</div>
                        </div>
                      </label>
                    ))}
                    {availableTools.length === 0 && (
                      <div className="text-sm text-gray-500 p-2">No tools available</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">MCPs:</span>
            <div className="relative mcp-dropdown">
              <button
                onClick={() => setShowMCPDropdown(!showMCPDropdown)}
                className="flex items-center space-x-2 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <span>Select MCPs ({selectedMCPs.length})</span>
                <ChevronDown className="h-4 w-4" />
              </button>
              
              {showMCPDropdown && (
                <div className="absolute top-full left-0 mt-1 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                  <div className="p-2">
                    <div className="text-xs font-medium text-gray-500 mb-2">MCP Servers</div>
                    {mcpServers.filter(mcp => mcp.enabled).map((mcp) => (
                      <label key={mcp.id} className="flex items-start space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedMCPs.includes(mcp.name)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedMCPs([...selectedMCPs, mcp.name])
                            } else {
                              setSelectedMCPs(selectedMCPs.filter(t => t !== mcp.name))
                            }
                          }}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900">{mcp.name}</div>
                          <div className="text-xs text-gray-500">{mcp.transport}</div>
                          {mcp.url && <div className="text-xs text-blue-600">{mcp.url}</div>}
                          {mcp.command && <div className="text-xs text-green-600">{mcp.command}</div>}
                        </div>
                      </label>
                    ))}
                    {mcpServers.filter(mcp => mcp.enabled).length === 0 && (
                      <div className="text-sm text-gray-500 p-2">No MCP servers available</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Selected Tools Display */}
          {(selectedTools.length > 0 || selectedMCPs.length > 0) && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">Active:</span>
              <div className="flex flex-wrap gap-1">
                {selectedTools.map((tool) => (
                  <span key={tool} className="inline-flex items-center space-x-1 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                    <span>{tool}</span>
                    <button
                      onClick={() => setSelectedTools(selectedTools.filter(t => t !== tool))}
                      className="hover:text-blue-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                {selectedMCPs.map((mcp) => (
                  <span key={mcp} className="inline-flex items-center space-x-1 px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                    <span>{mcp}</span>
                    <button
                      onClick={() => setSelectedMCPs(selectedMCPs.filter(t => t !== mcp))}
                      className="hover:text-green-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <Bot className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Start a conversation</h3>
            <p className="text-gray-500">Ask me anything! I can help with various tasks using my available tools.</p>
          </div>
        )}
        
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-3xl px-4 py-3 rounded-lg ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-200'
              }`}
            >
              <div className="flex items-start space-x-3">
                {message.role === 'assistant' && (
                  <Bot className="h-6 w-6 text-blue-600 mt-1 flex-shrink-0" />
                )}
                {message.role === 'user' && (
                  <User className="h-6 w-6 text-white mt-1 flex-shrink-0" />
                )}
                <div className="flex-1">
                  {message.role === 'assistant' ? (
                    <div className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-strong:text-gray-900 prose-code:text-gray-800 prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-gray-100 prose-pre:border prose-pre:border-gray-200">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap">{message.content}</div>
                  )}
                  <div className={`text-xs mt-2 ${
                    message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    {message.timestamp instanceof Date 
                      ? message.timestamp.toLocaleTimeString()
                      : new Date(message.timestamp).toLocaleTimeString()
                    }
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 px-4 py-3 rounded-lg max-w-3xl">
              <div className="flex items-center space-x-3">
                <Bot className="h-6 w-6 text-blue-600" />
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-gray-200 p-6">
        <div className="flex space-x-4">
          <div className="flex-1">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message here..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={1}
              disabled={isLoading}
            />
          </div>
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
          >
            <Send className="h-5 w-5" />
            <span>Send</span>
          </button>
        </div>
      </div>
    </div>
  )
}
