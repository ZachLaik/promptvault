
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Code, BookOpen, Zap, Globe, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DocsPage() {
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedStates(prev => ({ ...prev, [id]: true }));
      setTimeout(() => {
        setCopiedStates(prev => ({ ...prev, [id]: false }));
      }, 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const CodeBlock = ({ children, language = "bash", copyId }: { children: string; language?: string; copyId?: string }) => (
    <div className="relative">
      <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
        <code className={`language-${language}`}>{children}</code>
      </pre>
      {copyId && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-2 right-2 h-8 w-8 p-0 text-gray-400 hover:text-gray-200"
          onClick={() => copyToClipboard(children, copyId)}
        >
          {copiedStates[copyId] ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </Button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-6xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">PromptVault Documentation</h1>
          <p className="text-xl text-gray-600">Learn how to integrate PromptVault into your applications with our SDKs and REST API</p>
        </div>

        {/* Quick Start Section */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Zap className="h-6 w-6 text-blue-500" />
              <CardTitle className="text-2xl">Quick Start</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-6">Get started with PromptVault in under 2 minutes. Choose your preferred language:</p>
            
            <Tabs defaultValue="python" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="python" className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                  Python
                </TabsTrigger>
                <TabsTrigger value="javascript" className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-yellow-400 rounded-full"></span>
                  JavaScript
                </TabsTrigger>
                <TabsTrigger value="curl" className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  cURL
                </TabsTrigger>
              </TabsList>

              <TabsContent value="python" className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    1. Install the SDK
                    <Badge variant="secondary">Recommended</Badge>
                  </h4>
                  <CodeBlock copyId="python-install">
{`pip install git+https://github.com/ZachLaik/promptvault.git#subdirectory=python-sdk`}
                  </CodeBlock>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">2. Configure and use</h4>
                  <CodeBlock language="python" copyId="python-usage">
{`import promptvault

# Configure once
promptvault.configure(
    base_url="https://your-replit-url.replit.dev",
    api_key="pk_your_api_key"
)

# Method 1: Elegant dot notation (recommended)
prompt = promptvault.agents_lextenso.research_manager
print(str(prompt))

# Method 2: Function call syntax
prompt = promptvault.get_prompt("research-manager", "agents-lextenso")

# Method 3: With variables
rendered = prompt.render(
    user_name="John Doe",
    topic="contract law"
)`}
                  </CodeBlock>
                </div>
              </TabsContent>

              <TabsContent value="javascript" className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    1. Install the SDK
                    <Badge variant="secondary">Recommended</Badge>
                  </h4>
                  <CodeBlock copyId="js-install">
{`npm install git+https://github.com/ZachLaik/promptvault.git#main:javascript-sdk`}
                  </CodeBlock>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">2. Configure and use</h4>
                  <CodeBlock language="javascript" copyId="js-usage">
{`import PromptVault from 'promptvault-js';

// Configure once
const pv = new PromptVault({
  baseUrl: 'https://your-replit-url.replit.dev',
  apiKey: 'pk_your_api_key'
});

// Method 1: Elegant dot notation (recommended)
const prompt = await pv.agents_lextenso.research_manager();
console.log(prompt.toString());

// Method 2: Function call syntax
const prompt2 = await pv.getPrompt('research-manager', 'agents-lextenso');

// Method 3: With variables
const rendered = prompt.render({
  user_name: 'John Doe',
  topic: 'contract law'
});`}
                  </CodeBlock>
                </div>
              </TabsContent>

              <TabsContent value="curl" className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">1. Get a prompt</h4>
                  <CodeBlock language="bash" copyId="curl-get">
{`curl -X GET "https://your-replit-url.replit.dev/api/prompts/research-manager?projectSlug=agents-lextenso" \\
  -H "X-API-Key: pk_your_api_key"`}
                  </CodeBlock>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">2. Create/Update a prompt</h4>
                  <CodeBlock language="bash" copyId="curl-post">
{`curl -X POST "https://your-replit-url.replit.dev/api/prompts/research-manager" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: pk_your_api_key" \\
  -d '{
    "projectSlug": "agents-lextenso",
    "content": "You are a research assistant...",
    "message": "Updated via API"
  }'`}
                  </CodeBlock>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* API Reference Section */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Globe className="h-6 w-6 text-green-500" />
              <CardTitle className="text-2xl">API Reference</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="get-prompt" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="get-prompt">Get Prompt</TabsTrigger>
                <TabsTrigger value="create-prompt">Create Prompt</TabsTrigger>
                <TabsTrigger value="list-prompts">List Prompts</TabsTrigger>
              </TabsList>

              <TabsContent value="get-prompt" className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-green-100 text-green-800">GET</Badge>
                    <code className="text-sm">/api/prompts/{`{slug}`}</code>
                  </div>
                  <p className="text-sm text-gray-600">Retrieve a prompt by its slug and project.</p>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Parameters</h4>
                  <div className="bg-gray-50 p-3 rounded border">
                    <p className="text-sm"><code>projectSlug</code> (query, required) - The project identifier</p>
                    <p className="text-sm"><code>version</code> (query, optional) - Specific version number</p>
                  </div>
                </div>

                <Tabs defaultValue="curl-example" className="w-full">
                  <TabsList>
                    <TabsTrigger value="curl-example">cURL</TabsTrigger>
                    <TabsTrigger value="python-example">Python</TabsTrigger>
                    <TabsTrigger value="js-example">JavaScript</TabsTrigger>
                  </TabsList>

                  <TabsContent value="curl-example">
                    <CodeBlock language="bash" copyId="api-get-curl">
{`curl -X GET "https://your-replit-url.replit.dev/api/prompts/research-manager?projectSlug=agents-lextenso" \\
  -H "X-API-Key: pk_your_api_key"`}
                    </CodeBlock>
                  </TabsContent>

                  <TabsContent value="python-example">
                    <CodeBlock language="python" copyId="api-get-python">
{`import requests

response = requests.get(
    "https://your-replit-url.replit.dev/api/prompts/research-manager",
    headers={"X-API-Key": "pk_your_api_key"},
    params={"projectSlug": "agents-lextenso"}
)

prompt_data = response.json()
print(prompt_data["content"])`}
                    </CodeBlock>
                  </TabsContent>

                  <TabsContent value="js-example">
                    <CodeBlock language="javascript" copyId="api-get-js">
{`const response = await fetch(
  'https://your-replit-url.replit.dev/api/prompts/research-manager?projectSlug=agents-lextenso',
  {
    headers: {
      'X-API-Key': 'pk_your_api_key'
    }
  }
);

const promptData = await response.json();
console.log(promptData.content);`}
                    </CodeBlock>
                  </TabsContent>
                </Tabs>
              </TabsContent>

              <TabsContent value="create-prompt" className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-blue-100 text-blue-800">POST</Badge>
                    <code className="text-sm">/api/prompts/{`{slug}`}</code>
                  </div>
                  <p className="text-sm text-gray-600">Create a new prompt or update an existing one.</p>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Request Body</h4>
                  <div className="bg-gray-50 p-3 rounded border">
                    <p className="text-sm"><code>projectSlug</code> (string, required) - The project identifier</p>
                    <p className="text-sm"><code>content</code> (string, required) - The prompt content</p>
                    <p className="text-sm"><code>message</code> (string, optional) - Version commit message</p>
                  </div>
                </div>

                <Tabs defaultValue="curl-create" className="w-full">
                  <TabsList>
                    <TabsTrigger value="curl-create">cURL</TabsTrigger>
                    <TabsTrigger value="python-create">Python</TabsTrigger>
                    <TabsTrigger value="js-create">JavaScript</TabsTrigger>
                  </TabsList>

                  <TabsContent value="curl-create">
                    <CodeBlock language="bash" copyId="api-post-curl">
{`curl -X POST "https://your-replit-url.replit.dev/api/prompts/research-manager" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: pk_your_api_key" \\
  -d '{
    "projectSlug": "agents-lextenso",
    "content": "You are a research assistant specialized in legal matters...",
    "message": "Updated prompt with new guidelines"
  }'`}
                    </CodeBlock>
                  </TabsContent>

                  <TabsContent value="python-create">
                    <CodeBlock language="python" copyId="api-post-python">
{`import requests

data = {
    "projectSlug": "agents-lextenso",
    "content": "You are a research assistant specialized in legal matters...",
    "message": "Updated prompt with new guidelines"
}

response = requests.post(
    "https://your-replit-url.replit.dev/api/prompts/research-manager",
    headers={
        "Content-Type": "application/json",
        "X-API-Key": "pk_your_api_key"
    },
    json=data
)

result = response.json()
print(f"Created version {result['version']}")`}
                    </CodeBlock>
                  </TabsContent>

                  <TabsContent value="js-create">
                    <CodeBlock language="javascript" copyId="api-post-js">
{`const response = await fetch(
  'https://your-replit-url.replit.dev/api/prompts/research-manager',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': 'pk_your_api_key'
    },
    body: JSON.stringify({
      projectSlug: 'agents-lextenso',
      content: 'You are a research assistant specialized in legal matters...',
      message: 'Updated prompt with new guidelines'
    })
  }
);

const result = await response.json();
console.log(\`Created version \${result.version}\`);`}
                    </CodeBlock>
                  </TabsContent>
                </Tabs>
              </TabsContent>

              <TabsContent value="list-prompts" className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-green-100 text-green-800">GET</Badge>
                    <code className="text-sm">/api/projects/{`{projectSlug}`}/prompts</code>
                  </div>
                  <p className="text-sm text-gray-600">List all prompts in a project.</p>
                </div>

                <Tabs defaultValue="curl-list" className="w-full">
                  <TabsList>
                    <TabsTrigger value="curl-list">cURL</TabsTrigger>
                    <TabsTrigger value="python-list">Python</TabsTrigger>
                    <TabsTrigger value="js-list">JavaScript</TabsTrigger>
                  </TabsList>

                  <TabsContent value="curl-list">
                    <CodeBlock language="bash" copyId="api-list-curl">
{`curl -X GET "https://your-replit-url.replit.dev/api/projects/agents-lextenso/prompts" \\
  -H "X-API-Key: pk_your_api_key"`}
                    </CodeBlock>
                  </TabsContent>

                  <TabsContent value="python-list">
                    <CodeBlock language="python" copyId="api-list-python">
{`import requests

response = requests.get(
    "https://your-replit-url.replit.dev/api/projects/agents-lextenso/prompts",
    headers={"X-API-Key": "pk_your_api_key"}
)

prompts = response.json()
for prompt in prompts:
    print(f"{prompt['slug']}: {prompt['title']}")`}
                    </CodeBlock>
                  </TabsContent>

                  <TabsContent value="js-list">
                    <CodeBlock language="javascript" copyId="api-list-js">
{`const response = await fetch(
  'https://your-replit-url.replit.dev/api/projects/agents-lextenso/prompts',
  {
    headers: {
      'X-API-Key': 'pk_your_api_key'
    }
  }
);

const prompts = await response.json();
prompts.forEach(prompt => {
  console.log(\`\${prompt.slug}: \${prompt.title}\`);
});`}
                    </CodeBlock>
                  </TabsContent>
                </Tabs>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Authentication Section */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-purple-500" />
              <CardTitle className="text-2xl">Authentication</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">All API requests require authentication using your API key in the request headers.</p>
            
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Getting Your API Key</h4>
                <ol className="list-decimal list-inside text-gray-600 space-y-1 ml-4">
                  <li>Navigate to the API Keys section in your dashboard</li>
                  <li>Click "Generate New API Key"</li>
                  <li>Give your key a descriptive name</li>
                  <li>Copy the generated key (it's only shown once)</li>
                </ol>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Using Your API Key</h4>
                <p className="text-gray-600 mb-2">Include your API key in the request headers:</p>
                <CodeBlock copyId="auth-header">
{`X-API-Key: pk_your_api_key_here`}
                </CodeBlock>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SDK Features Section */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Code className="h-5 w-5 text-blue-500" />
                <CardTitle>Python SDK Features</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  Elegant dot notation: <code>promptvault.project.prompt</code>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  Variable substitution with <code>.render()</code>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  Automatic latest version fetching
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  Built-in caching for performance
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  One-time configuration
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-500" />
                <CardTitle>JavaScript SDK Features</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  Promise-based async/await syntax
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  Browser and Node.js compatible
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  TypeScript support
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  Template variable support
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  Error handling with clear messages
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
