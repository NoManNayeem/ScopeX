import Link from 'next/link'
import { ArrowRight, Bot, Zap, Shield } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Navigation */}
      <nav className="flex items-center justify-between p-6">
        <div className="flex items-center space-x-2">
          <Bot className="h-8 w-8 text-blue-600" />
          <span className="text-2xl font-bold text-gray-900">ScopeX</span>
        </div>
        <div className="flex items-center space-x-4">
          <Link 
            href="/login" 
            className="text-gray-600 hover:text-gray-900 transition-colors"
          >
            Login
          </Link>
          <Link 
            href="/register" 
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="container mx-auto px-6 py-20">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            AI Agents with 
            <span className="text-blue-600"> Plug-and-Play</span> Tools
          </h1>
          <p className="text-xl text-gray-600 mb-8 leading-relaxed">
            Build powerful AI agents with Agno AgentOS. Connect MCP servers and custom tools 
            in a beautiful, interactive chat interface designed for user satisfaction.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/register" 
              className="bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center"
            >
              Start Building
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <Link 
              href="/chat" 
              className="border border-gray-300 text-gray-700 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-50 transition-colors"
            >
              Try Demo
            </Link>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="container mx-auto px-6 py-20">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center p-6">
            <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bot className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold mb-3">Smart Agents</h3>
            <p className="text-gray-600">
              Conversational AI with strong memory and context awareness for consistent interactions.
            </p>
          </div>
          <div className="text-center p-6">
            <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Zap className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold mb-3">Plug & Play</h3>
            <p className="text-gray-600">
              Connect any MCP server or custom tool with simple configuration and instant availability.
            </p>
          </div>
          <div className="text-center p-6">
            <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="h-8 w-8 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold mb-3">Secure & Private</h3>
            <p className="text-gray-600">
              Your data stays in your infrastructure with complete privacy and control.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-6 text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Bot className="h-6 w-6" />
            <span className="text-xl font-bold">ScopeX</span>
          </div>
          <p className="text-gray-400">
            Built with Agno AgentOS • Next.js • TypeScript
          </p>
        </div>
      </footer>
    </div>
  )
}
