
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
                <h1>Prompt Manager - Integration Guide</h1>

                <p>This Prompt Manager provides multiple ways to integrate prompts into your applications. Choose the method that best fits your needs.</p>

                <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h3 className="text-blue-800 font-semibold mb-2">Quick Navigation</h3>
                  <ul className="text-blue-700 text-sm space-y-1">
                    <li><a href="#javascript-sdk" className="hover:underline">• JavaScript/Node.js SDK</a></li>
                    <li><a href="#python-sdk" className="hover:underline">• Python SDK</a></li>
                    <li><a href="#direct-api" className="hover:underline">• Direct HTTP API</a></li>
                    <li><a href="#getting-started" className="hover:underline">• Getting Started</a></li>
                  </ul>
                </div>

                <h2 id="javascript-sdk">JavaScript/Node.js Integration</h2>

                <h3>Option 1: PromptVault JavaScript SDK (Recommended)</h3>

                <p>The easiest way to use prompts in JavaScript/Node.js with elegant syntax and no HTTP requests in your code:</p>

                <h4>Installation</h4>
                <pre><code>{`# Install from the SDK directory
npm install ./javascript-sdk

# Or copy promptvault.js directly into your project`}</code></pre>

                <h4>Usage</h4>
                <pre><code>{`import PromptVault from 'promptvault-js';

// Configure once
const pv = new PromptVault({
  baseUrl: "https://prompting-manager.replit.app",
  apiKey: "your_api_key"
});

// Method 1: Elegant dot notation (recommended)
const prompt = await pv.project_name.prompt_name();
console.log(prompt.toString());

// Method 2: Function call syntax
const prompt2 = await pv.getPrompt('prompt-name', 'project-name');

// Method 3: With version specification
const promptV1 = await pv.getPrompt('prompt-name', 'project-name', 1);`}</code></pre>

                <h4>Features</h4>
                <ul>
                  <li><strong>No HTTP requests in your code</strong>: The SDK handles all API communication internally</li>
                  <li><strong>Elegant dot notation</strong>: Access prompts like <code>pv.project_name.prompt_name()</code></li>
                  <li><strong>Template variables</strong>: Built-in support for <code>{`\${variable}`}</code> substitution</li>
                  <li><strong>Version control</strong>: Access specific prompt versions</li>
                  <li><strong>Promise-based</strong>: Uses modern async/await syntax</li>
                  <li><strong>Error handling</strong>: Clear error messages and proper exception handling</li>
                  <li><strong>TypeScript compatible</strong>: Works with TypeScript projects</li>
                </ul>

                <h4>Using Variables in JavaScript</h4>
                <p>PromptVault JavaScript SDK supports variable substitution using <code>{`\${variable_name}`}</code> placeholders:</p>

                <pre><code>{`// Example prompt content in Prompt Manager:
"You are a \${role} assistant. Help with \${task}: \${user_question}"`}</code></pre>

                <p>Then render the prompt with variables in your JavaScript code:</p>

                <pre><code>{`import PromptVault from 'promptvault-js';

// Configure once
const pv = new PromptVault({
  baseUrl: "https://prompting-manager.replit.app",
  apiKey: "your_api_key"
});

// Get the prompt template
const template = await pv.customer_support.chat_assistant();

// Render with variables
const rendered = template.render({
  role: "customer service",
  task: "billing questions", 
  user_question: "How do I cancel my subscription?"
});

console.log(rendered);
// Output: "You are a customer service assistant. Help with billing questions: How do I cancel my subscription?"`}</code></pre>

                <h4>Creating New Prompt Versions</h4>
                <pre><code>{`// Create a new version of a prompt
const newVersion = await pv.createPromptVersion(
  'prompt-slug',
  'project-slug',
  'Your new prompt content with \${variables}',
  'Version message describing changes'
);

console.log(\`Created version \${newVersion.version}\`);</code></pre>

                <h3>Option 2: Direct HTTP API in JavaScript</h3>

                <p>For developers who prefer direct API calls:</p>

                <pre><code>{`async function getPrompt(slug, projectSlug, apiKey, baseUrl) {
  const response = await fetch(
    \`\${baseUrl}/api/prompts/\${slug}?projectSlug=\${projectSlug}\`,
    {
      headers: {
        'X-API-Key': apiKey
      }
    }
  );
  
  if (!response.ok) {
    throw new Error(\`HTTP error! status: \${response.status}\`);
  }
  
  const data = await response.json();
  return data.content;
}

// Usage
const prompt = await getPrompt(
  'research-manager',
  'research-agents',
  'your_api_key',
  'https://prompting-manager.replit.app'
);

console.log(prompt);</code></pre>

                <h3>Real-World JavaScript Examples</h3>

                <h4>With PromptVault SDK + OpenAI</h4>

                <pre><code>{`import PromptVault from 'promptvault-js';
import OpenAI from 'openai';

// Setup
const pv = new PromptVault({
  baseUrl: "https://prompting-manager.replit.app",
  apiKey: "your_api_key"
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Get prompt template and render with variables
const template = await pv.agents_lextenso.research_manager();
const systemPrompt = template.render({
  expertise: "contract law",
  focus_area: "termination clauses",
  detail_level: "comprehensive"
});

const response = await openai.chat.completions.create({
  model: "gpt-4",
  messages: [
    { role: "system", content: systemPrompt },
    { role: "user", content: "What are contract termination rules in French law?" }
  ]
});

console.log(response.choices[0].message.content);</code></pre>

                <h4>With Express.js API</h4>

                <pre><code>{`import express from 'express';
import PromptVault from 'promptvault-js';

const app = express();
const pv = new PromptVault({
  baseUrl: "https://prompting-manager.replit.app",
  apiKey: process.env.PROMPTVAULT_API_KEY
});

app.get('/api/chat/:promptName', async (req, res) => {
  try {
    const prompt = await pv.chatbots[req.params.promptName]();
    res.json({ prompt: prompt.toString() });
  } catch (error) {
    res.status(404).json({ error: 'Prompt not found' });
  }
});

app.listen(3000);</code></pre>

                <h4>With React (Frontend)</h4>

                <pre><code>{`import { useState, useEffect } from 'react';

function PromptComponent() {
  const [prompt, setPrompt] = useState('');
  
  useEffect(() => {
    async function fetchPrompt() {
      try {
        const response = await fetch('/api/prompts/my-prompt?projectSlug=my-project', {
          headers: {
            'X-API-Key': 'your_api_key'
          }
        });
        const data = await response.json();
        setPrompt(data.content);
      } catch (error) {
        console.error('Failed to fetch prompt:', error);
      }
    }
    
    fetchPrompt();
  }, []);
  
  return <div>{prompt}</div>;
}</code></pre>

                <h2 id="python-sdk">Python Integration</h2>

                <h3>Option 1: PromptVault Python SDK (Recommended)</h3>

                <p>The easiest way to use prompts with elegant syntax:</p>

                <h3>Installation</h3>
                <pre><code>{`# Install from GitHub subdirectory
pip install git+https://github.com/ZachLaik/promptvault.git#subdirectory=python-sdk

# Or install locally if you cloned the repo
cd python-sdk && pip install .`}</code></pre>

                <h3>Usage</h3>
                <pre><code>{`import promptvault

# Configure once
promptvault.configure(
    base_url="https://prompting-manager.replit.app",
    api_key="your_api_key"
)

# Use elegant dot notation (promptvault.project_name.prompt_name)
prompt = promptvault.research_agents.research_manager

# That's it! Use the prompt content
print(prompt)`}</code></pre>

                <h3>Features</h3>
                <ul>
                  <li><strong>Elegant syntax</strong>: <code>promptvault.project_name.prompt_name</code></li>
                  <li><strong>One-time setup</strong>: Configure once, use everywhere</li>
                  <li><strong>Latest version</strong>: Always get the most recent prompt</li>
                  <li><strong>Variable substitution</strong>: Easy template rendering with <code>.render()</code></li>
                  <li><strong>Error handling</strong>: Clear error messages</li>
                  <li><strong>Specific versions</strong>: <code>promptvault.get_prompt("slug", "project", version=3)</code></li>
                </ul>

                <h3>Using Variables in Prompts</h3>
                <p>PromptVault supports variable substitution using Python's string formatting. In your prompt content, use <code>{`{variable_name}`}</code> placeholders:</p>

                <pre><code>{`# Example prompt content in Prompt Manager:
"You are a {role} assistant. Help with {task}: {user_question}"`}</code></pre>

                <p>Then render the prompt with variables in your Python code:</p>

                <pre><code>{`import promptvault

# Configure once
promptvault.configure(
    base_url="https://prompting-manager.replit.app",
    api_key="your_api_key"
)

# Get the prompt template
template = promptvault.customer_support.chat_assistant

# Render with variables
rendered_prompt = template.render(
    role="customer service",
    task="billing questions",
    user_question="How do I cancel my subscription?"
)

print(rendered_prompt)
# Output: "You are a customer service assistant. Help with billing questions: How do I cancel my subscription?"`}</code></pre>

                <h4>Variable Features:</h4>
                <ul>
                  <li><strong>Backward compatible</strong>: Use prompts as strings without variables</li>
                  <li><strong>Error handling</strong>: Clear errors for missing variables</li>
                  <li><strong>Flexible</strong>: Pass any number of variables as keyword arguments</li>
                </ul>

                <h3 id="direct-api">Option 2: Direct HTTP API (30 seconds)</h3>

                <p>For developers who prefer direct API calls:</p>

                <pre><code>{`import requests

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

print(prompt)  # Your full prompt content ready to use`}</code></pre>

                <h2>Real-World Examples</h2>

                <h3>With PromptVault SDK + OpenAI</h3>

                <pre><code>{`import promptvault
import openai

# Setup
promptvault.configure(
    base_url="https://prompting-manager.replit.app",
    api_key="your_api_key"
)
openai.api_key = "your_openai_key"

# Get prompt template and render with variables
template = promptvault.agents_lextenso.research_manager
system_prompt = template.render(
    expertise="contract law",
    focus_area="termination clauses",
    detail_level="comprehensive"
)

response = openai.ChatCompletion.create(
    model="gpt-4",
    messages=[
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": "What are contract termination rules in French law?"}
    ]
)

print(response.choices[0].message.content)`}</code></pre>

                <h3>With Direct HTTP API + OpenAI</h3>

                <pre><code>{`import requests
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

print(response.choices[0].message.content)`}</code></pre>

                <h2 id="getting-started">Getting Started</h2>

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
