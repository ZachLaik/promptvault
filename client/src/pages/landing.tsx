
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Code, Zap, Users, Lock, GitBranch, Globe } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Navigation */}
      <nav className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center mr-3">
                <Code className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-bold text-xl text-gray-900">PromptVault</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/docs">
                <Button variant="ghost">Documentation</Button>
              </Link>
              <Link href="/login">
                <Button>Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <div className="text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Manage Your AI Prompts
            <br />
            <span className="text-primary">Like a Pro</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            A lightweight, multi-tenant prompt management platform with versioning, 
            team collaboration, and seamless API access. Built for developers who need 
            reliable prompt storage and retrieval.
          </p>
          <div className="flex items-center justify-center space-x-4">
            <Link href="/login">
              <Button size="lg" className="text-lg px-8">
                Start Free
              </Button>
            </Link>
            <Link href="/docs">
              <Button size="lg" variant="outline" className="text-lg px-8">
                View Docs
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Everything You Need</h2>
          <p className="text-lg text-gray-600">Powerful features to manage your prompts efficiently</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Card>
            <CardContent className="p-6">
              <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <GitBranch className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Version Control</h3>
              <p className="text-gray-600">
                Track every change to your prompts with full version history. 
                Roll back, compare, and manage iterations with ease.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Team Collaboration</h3>
              <p className="text-gray-600">
                Invite team members with granular role-based permissions. 
                Work together seamlessly across projects.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <Globe className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">RESTful API</h3>
              <p className="text-gray-600">
                Access your prompts programmatically with a clean REST API. 
                Perfect for AI applications and automation.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="h-12 w-12 bg-yellow-100 rounded-lg flex items-center justify-center mb-4">
                <Lock className="h-6 w-6 text-yellow-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Secure API Keys</h3>
              <p className="text-gray-600">
                Generate and manage API keys with ease. 
                Each key is securely hashed and tracked for usage.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="h-12 w-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                <Zap className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">SDKs Available</h3>
              <p className="text-gray-600">
                Python and JavaScript SDKs with elegant syntax. 
                Get started in minutes with simple, intuitive APIs.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="h-12 w-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                <Code className="h-6 w-6 text-indigo-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Multi-Project</h3>
              <p className="text-gray-600">
                Organize prompts across multiple projects. 
                Keep your workflows clean and organized.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Code Example */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-gray-900 rounded-2xl p-8 md:p-12">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-4">Simple. Powerful. Fast.</h2>
            <p className="text-lg text-gray-300">Access your prompts with just a few lines of code</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <div className="bg-gray-800 rounded-lg p-4 mb-2">
                <div className="text-xs text-gray-400 mb-2">Python SDK</div>
                <pre className="text-sm text-gray-100 overflow-x-auto">
{`import promptvault

# Configure once
promptvault.configure(
    base_url="prompting-manager.replit.app",
    api_key="pk_your_key"
)

# Use dot notation
prompt = promptvault.project.my_prompt
print(str(prompt))`}
                </pre>
              </div>
            </div>

            <div>
              <div className="bg-gray-800 rounded-lg p-4 mb-2">
                <div className="text-xs text-gray-400 mb-2">JavaScript SDK</div>
                <pre className="text-sm text-gray-100 overflow-x-auto">
{`import PromptVault from 'promptvault-js';

// Configure once
const pv = new PromptVault({
  baseUrl: 'prompting-manager.replit.app',
  apiKey: 'pk_your_key'
});

// Use dot notation
const prompt = await pv.project.my_prompt();
console.log(prompt.toString());`}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-12 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join developers who trust PromptVault for their AI applications
          </p>
          <Link href="/login">
            <Button size="lg" variant="secondary" className="text-lg px-8">
              Create Free Account
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="h-6 w-6 bg-primary rounded-lg flex items-center justify-center mr-2">
                <Code className="h-3 w-3 text-primary-foreground" />
              </div>
              <span className="font-semibold text-gray-900">PromptVault</span>
            </div>
            <p className="text-sm text-gray-500">
              Built with ❤️ for AI developers
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
