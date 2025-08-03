
import { Card, CardContent } from "@/components/ui/card";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      
      <main className="ml-64 min-h-screen">
        <Header
          title="Documentation"
          subtitle="Integration guide for using Prompt Manager in your applications"
        />
        
        <div className="p-6">
          <Card>
            <CardContent className="p-8">
              <div className="prose prose-slate max-w-none prose-headings:text-black prose-h1:text-xl prose-h1:font-bold prose-h1:mb-4 prose-h2:text-lg prose-h2:font-semibold prose-h2:mb-3 prose-h2:mt-6 prose-h3:text-base prose-h3:font-medium prose-h3:mb-2 prose-h3:mt-4 prose-p:mb-3 prose-p:text-black prose-p:text-sm prose-p:leading-relaxed prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-pre:text-xs prose-code:bg-gray-100 prose-code:text-black prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-strong:text-black prose-ul:mb-3 prose-li:mb-1 prose-li:text-black prose-li:text-sm">
                <h1>Prompt Manager - Python Integration</h1>

                <p>This Prompt Manager provides multiple ways to integrate prompts into your Python applications. Choose the method that best fits your needs.</p>

                <h2>Option 1: PromptVault SDK (Recommended)</h2>

                <p>The easiest way to use prompts with elegant syntax:</p>

                <h3>Installation</h3>
                <pre><code># Install from GitHub subdirectory
pip install git+https://github.com/ZachLaik/promptvault.git#subdirectory=python-sdk

# Or install locally if you cloned the repo
cd python-sdk && pip install .</code></pre>

                <h3>Usage</h3>
                <pre><code>import promptvault

# Configure once
promptvault.configure(
    base_url="https://prompting-manager.replit.app",
    api_key="your_api_key"
)

# Use elegant dot notation (promptvault.project_name.prompt_name)
prompt = promptvault.research_agents.research_manager

# That's it! Use the prompt content
print(prompt)</code></pre>

                <h3>Features</h3>
                <ul>
                  <li><strong>Elegant syntax</strong>: <code>promptvault.project_name.prompt_name</code></li>
                  <li><strong>One-time setup</strong>: Configure once, use everywhere</li>
                  <li><strong>Latest version</strong>: Always get the most recent prompt</li>
                  <li><strong>Error handling</strong>: Clear error messages</li>
                  <li><strong>Specific versions</strong>: <code>promptvault.get_prompt("slug", "project", version=3)</code></li>
                </ul>

                <h2>Option 2: Direct HTTP API (30 seconds)</h2>

                <p>For developers who prefer direct API calls:</p>

                <pre><code>import requests

def get_prompt(slug, project_slug, api_key, base_url):
    """Fetch a prompt from Prompt Manager"""
    response = requests.get(
        f"{base_url}/api/prompts/{slug}",
        headers={"x-api-key": api_key},
        params={"projectSlug": project_slug}
    )
    return response.json()["content"]

# Usage
prompt = get_prompt(
    slug="research_manager",
    project_slug="research_agents", 
    api_key="your_api_key",
    base_url="https://prompting-manager.replit.app"
)

print(prompt)  # Your full prompt content ready to use</code></pre>

                <h2>Real-World Examples</h2>

                <h3>With PromptVault SDK + OpenAI</h3>

                <pre><code>import promptvault
import openai

# Setup
promptvault.configure(
    base_url="https://prompting-manager.replit.app",
    api_key="your_api_key"
)
openai.api_key = "your_openai_key"

# Use elegant syntax directly
system_prompt = promptvault.agents_lextenso.research_manager

response = openai.ChatCompletion.create(
    model="gpt-4",
    messages=[
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": "What are contract termination rules in French law?"}
    ]
)

print(response.choices[0].message.content)</code></pre>

                <h3>With Direct HTTP API + OpenAI</h3>

                <pre><code>import requests
import openai

def get_prompt(slug, project_slug, api_key, base_url):
    response = requests.get(
        f"{base_url}/api/prompts/{slug}",
        headers={"x-api-key": api_key},
        params={"projectSlug": project_slug}
    )
    return response.json()["content"]

# Use with OpenAI
system_prompt = get_prompt(
    "research_manager", # (prompt name)
    "research_agents", # (project name)
    "your_api_key",
    "https://prompting-manager.replit.app"
)

response = openai.ChatCompletion.create(
    model="gpt-4",
    messages=[
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": "What are contract termination rules?"}
    ]
)

print(response.choices[0].message.content)</code></pre>

                <h2>Getting Started</h2>

                <h3>Step 1: Get Your API Key</h3>
                <ol>
                  <li>Log into your Prompt Manager</li>
                  <li>Go to API Keys section</li>
                  <li>Generate a new API key</li>
                </ol>

                <h3>Step 2: Choose Your Integration Method</h3>
                <ul>
                  <li><strong>Recommended</strong>: Use the PromptVault SDK for elegant syntax</li>
                  <li><strong>Alternative</strong>: Use direct HTTP calls for more control</li>
                </ul>

                <h3>Step 3: Start Using Prompts</h3>
                <p>Both methods support:</p>
                <ul>
                  <li><strong>Latest Version</strong>: Always get the most recent prompt</li>
                  <li><strong>Specific Versions</strong>: Access any version with <code>version=N</code></li>
                  <li><strong>Error Handling</strong>: Clear error messages and status codes</li>
                  <li><strong>Performance</strong>: Built-in request optimization</li>
                </ul>

                <h2>API Documentation</h2>

                <p>For complete API reference and testing, visit your Prompt Manager's Swagger UI at:<br />
                <code>https://prompting-manager.replit.app/docs</code></p>

                <p><strong>Ready to get started? Choose Option 1 (PromptVault SDK) for the best developer experience!</strong></p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
