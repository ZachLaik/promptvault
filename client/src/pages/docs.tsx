
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Code, BookOpen, Zap, Globe } from "lucide-react";

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-4xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">API Documentation</h1>
          <p className="text-gray-600">Learn how to integrate PromptVault into your applications</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 mb-8">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Code className="h-5 w-5 text-blue-500" />
                <CardTitle>JavaScript SDK</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">Use our JavaScript SDK for seamless integration in Node.js and browser environments.</p>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Installation</h4>
                  <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
                    <code>npm install promptvault-js</code>
                  </pre>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Basic Usage</h4>
                  <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
                    <code>{`import PromptVault from 'promptvault-js';

const client = new PromptVault({
  baseUrl: 'your-prompt-manager-url',
  apiKey: 'your-api-key'
});

// Get a prompt
const prompt = await client.getPrompt('prompt-slug', 'project-slug');
console.log(prompt.content);

// Get specific version
const v1 = await client.getPrompt('prompt-slug', 'project-slug', { version: 1 });`}</code>
                  </pre>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-500" />
                <CardTitle>Python SDK</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">Integrate PromptVault into your Python applications with our lightweight SDK.</p>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Installation</h4>
                  <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
                    <code>pip install promptvault</code>
                  </pre>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Basic Usage</h4>
                  <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
                    <code>{`import promptvault

# Configure the client
promptvault.configure(
    base_url="your-prompt-manager-url",
    api_key="your-api-key"
)

# Elegant dot notation (recommended)
prompt = promptvault.project_name.prompt_slug
content = str(prompt)

# Function call syntax
content = promptvault.get_prompt("prompt-slug", "project-slug")

# With version
content = promptvault.get_prompt("prompt-slug", "project-slug", version=1)`}</code>
                  </pre>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-green-500" />
              <CardTitle>REST API</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">For developers who prefer direct API calls:</p>

            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Get Prompt</h4>
                <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
                  <code>{`async function getPrompt(slug, projectSlug, apiKey, baseUrl) {
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
  
  return await response.json();
}`}</code>
                </pre>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Create/Update Prompt</h4>
                <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
                  <code>{`async function updatePrompt(slug, projectSlug, content, apiKey, baseUrl) {
  const response = await fetch(
    \`\${baseUrl}/api/prompts/\${slug}\`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey
      },
      body: JSON.stringify({
        projectSlug,
        content,
        message: 'Updated via API'
      })
    }
  );
  
  return await response.json();
}`}</code>
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-purple-500" />
              <CardTitle>Authentication</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">All API requests require authentication using your API key.</p>
            
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Getting Your API Key</h4>
                <ol className="list-decimal list-inside text-sm text-gray-600 space-y-1">
                  <li>Navigate to the API Keys section in your dashboard</li>
                  <li>Click "Generate New API Key"</li>
                  <li>Give your key a descriptive name</li>
                  <li>Copy the generated key (it's only shown once)</li>
                </ol>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Using Your API Key</h4>
                <p className="text-sm text-gray-600 mb-2">Include your API key in the request headers:</p>
                <pre className="bg-gray-100 p-3 rounded text-sm">
                  <code>X-API-Key: pk_your_api_key_here</code>
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
