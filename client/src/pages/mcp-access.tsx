import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Copy,
  Plug,
  Terminal,
  CheckCircle2,
  ExternalLink,
  Key,
  Sparkles,
  Info,
  TriangleAlert,
  Plus,
} from "lucide-react";

interface ApiKeyWithMasked {
  id: number;
  name: string;
  maskedKey: string;
  keyValue?: string;
  isActive: boolean;
  createdAt: string;
  lastUsedAt?: string;
}

const BASE_URL =
  typeof window !== "undefined"
    ? window.location.origin
    : "https://your-domain.com";

export default function McpAccessPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedKeyId, setSelectedKeyId] = useState<number | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<ApiKeyWithMasked | null>(null);

  const { data: apiKeys = [], isLoading } = useQuery<ApiKeyWithMasked[]>({
    queryKey: ["/api/api-keys"],
  });

  const activeKeys = apiKeys.filter((k) => k.isActive);

  // If we just created a key, select it automatically. Otherwise default to nothing or first
  const selectedKey = newlyCreatedKey
    ? newlyCreatedKey
    : (activeKeys.find((k) => k.id === selectedKeyId) ?? activeKeys[0] ?? null);

  // The actual URL we build uses the real key if we just generated it, otherwise the masked key
  const keyToDisplay = newlyCreatedKey && selectedKey?.id === newlyCreatedKey.id
    ? newlyCreatedKey.keyValue
    : selectedKey?.maskedKey;

  const mcpUrl = keyToDisplay
    ? `${BASE_URL}/mcp/${keyToDisplay}`
    : `${BASE_URL}/mcp/<your-api-key>`;

  const createApiKeyMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/api-keys", data);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/api-keys"] });
      setIsCreateDialogOpen(false);
      setNewlyCreatedKey(data);
      setSelectedKeyId(data.id);
      form.reset();
      toast({
        title: "Success",
        description: "API key created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create API key",
        variant: "destructive",
      });
    },
  });

  const form = useForm({
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const onSubmit = (data: any) => {
    createApiKeyMutation.mutate(data);
  };

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied", description: `${label} copied to clipboard` });
  };

  const claudeConfig = keyToDisplay
    ? JSON.stringify(
      {
        mcpServers: {
          promptvault: {
            type: "http",
            url: `${BASE_URL}/mcp/${keyToDisplay}`,
          },
        },
      },
      null,
      2
    )
    : `{
  "mcpServers": {
    "promptvault": {
      "type": "http",
      "url": "${BASE_URL}/mcp/<your-api-key>"
    }
  }
}`;

  const cursorConfig = keyToDisplay
    ? JSON.stringify(
      {
        mcp: {
          servers: {
            promptvault: {
              url: `${BASE_URL}/mcp/${keyToDisplay}`,
              transport: "http",
            },
          },
        },
      },
      null,
      2
    )
    : `{
  "mcp": {
    "servers": {
      "promptvault": {
        "url": "${BASE_URL}/mcp/<your-api-key>",
        "transport": "http"
      }
    }
  }
}`;

  const steps = [
    {
      num: 1,
      title: "Select an API key below",
      desc: "Pick one of your active API keys — it will be embedded in the MCP URL.",
    },
    {
      num: 2,
      title: "Copy the MCP URL",
      desc: "The URL already contains your API key. No custom headers needed.",
    },
    {
      num: 3,
      title: "Paste into your AI client",
      desc: "Use the Claude Desktop or Cursor snippets below to configure the server.",
    },
  ];

  const tools = [
    { name: "list_projects", desc: "List all projects you're a member of" },
    { name: "create_project", desc: "Create a new project" },
    { name: "list_prompts", desc: "List prompts in a project" },
    { name: "get_prompt", desc: "Fetch a specific prompt's content" },
    { name: "save_prompt", desc: "Create or update a prompt" },
    { name: "list_prompt_versions", desc: "Browse version history" },
    { name: "optimize_prompt", desc: "Run DSPy-style prompt optimization" },
    { name: "list_optimizations", desc: "View past optimization runs" },
    { name: "list_datasets", desc: "List Q&A datasets for your project" },
    { name: "create_dataset / update_dataset / delete_dataset", desc: "Manage datasets" },
    { name: "list_openrouter_keys", desc: "List stored OpenRouter API keys" },
    { name: "add_openrouter_key / delete_openrouter_key / set_default_openrouter_key", desc: "Manage OpenRouter keys" },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />

      <main className="ml-64 min-h-screen">
        <Header
          title="MCP Access"
          subtitle="Connect AI agents directly to your prompt library via the Model Context Protocol"
        />

        <div className="p-6 space-y-6 max-w-4xl">

          {/* What is MCP */}
          <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 bg-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Plug className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-indigo-900 text-base mb-1">
                    What is MCP?
                  </h3>
                  <p className="text-sm text-indigo-800 leading-relaxed">
                    The <strong>Model Context Protocol</strong> (MCP) lets AI
                    agents like Claude Desktop and Cursor talk directly to
                    PromptVault. Instead of copy-pasting prompts, your AI
                    assistant can fetch, create, and optimize prompts on its
                    own — all authenticated via your API key embedded in the
                    URL.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* How-to steps */}
          <div className="grid grid-cols-3 gap-4">
            {steps.map((s) => (
              <Card key={s.num} className="border-gray-200">
                <CardContent className="p-5">
                  <div className="h-8 w-8 bg-indigo-600 rounded-full flex items-center justify-center text-white text-sm font-bold mb-3">
                    {s.num}
                  </div>
                  <h4 className="font-medium text-gray-900 text-sm mb-1">
                    {s.title}
                  </h4>
                  <p className="text-xs text-gray-500 leading-relaxed">{s.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Key selector + MCP URL */}
          <Card>
            <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-2">
              <Key className="h-4 w-4 text-gray-500" />
              <h2 className="text-base font-semibold text-gray-900">
                Your MCP Endpoint
              </h2>
            </div>
            <CardContent className="p-6 space-y-4">
              {isLoading ? (
                <p className="text-sm text-gray-400">Loading keys…</p>
              ) : activeKeys.length === 0 ? (
                <div className="flex items-start gap-3 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <Info className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-yellow-800">
                    You don't have any active API keys yet.{" "}
                    <a href="/api-keys" className="underline font-medium">
                      Create one on the API Keys page
                    </a>{" "}
                    to get your MCP URL.
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-gray-600">
                      Select an API key to configure your client:
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsCreateDialogOpen(true)}
                      className="text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Generate New Key
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {activeKeys.map((k) => (
                      <button
                        key={k.id}
                        onClick={() => {
                          setSelectedKeyId(k.id);
                          if (newlyCreatedKey?.id !== k.id) {
                            setNewlyCreatedKey(null);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${(selectedKey?.id === k.id)
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : "bg-white text-gray-700 border-gray-300 hover:border-indigo-400"
                          }`}
                      >
                        {k.name}
                      </button>
                    ))}
                  </div>

                  {selectedKey && (!newlyCreatedKey || newlyCreatedKey.id !== selectedKey.id) && (
                    <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                      <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-blue-800">
                        <p className="font-medium pr-2">For your security, existing API keys are heavily masked (e.g., <code>pk_...</code>).</p>
                        <p className="mt-1">
                          The URL below shows the masked version. To connect your MCP client, you must replace the masked key with your actual, unmasked API key value.
                          If you don't have it saved, please generate a new key using the button above.
                        </p>
                      </div>
                    </div>
                  )}

                  {newlyCreatedKey && newlyCreatedKey.id === selectedKey?.id && (
                    <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                      <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-green-800">
                        <p className="font-medium">Success! New key generated.</p>
                        <p className="mt-1">
                          The full, unmasked API key is currently shown in the URL below. It will never be shown again, so copy your MCP configuration now.
                        </p>
                      </div>
                    </div>
                  )}

                  <div>
                    <p className="text-xs text-gray-500 mb-1 font-medium uppercase tracking-wide">
                      MCP Server URL
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-sm bg-gray-900 text-green-400 px-4 py-3 rounded-lg font-mono break-all">
                        {mcpUrl}
                      </code>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copy(mcpUrl, "MCP URL")}
                        className="flex-shrink-0"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      Your API key is embedded in the path — no custom headers required.
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Client configs */}
          <div className="grid grid-cols-2 gap-4">
            {/* Claude Desktop */}
            <Card>
              <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-purple-600" />
                  <h3 className="font-semibold text-gray-900 text-sm">Claude Desktop</h3>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copy(claudeConfig, "Claude Desktop config")}
                >
                  <Copy className="h-3.5 w-3.5 mr-1" />
                  Copy
                </Button>
              </div>
              <CardContent className="p-4">
                <p className="text-xs text-gray-500 mb-2">
                  Add to{" "}
                  <code className="bg-gray-100 px-1 rounded">
                    claude_desktop_config.json
                  </code>
                </p>
                <pre className="text-xs bg-gray-900 text-green-400 p-3 rounded-lg overflow-x-auto leading-relaxed">
                  {claudeConfig}
                </pre>
                <a
                  href="https://modelcontextprotocol.io/quickstart/user"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-indigo-600 hover:underline mt-2 flex items-center gap-1"
                >
                  <ExternalLink className="h-3 w-3" />
                  Claude Desktop MCP docs
                </a>
              </CardContent>
            </Card>

            {/* Cursor */}
            <Card>
              <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-blue-600" />
                  <h3 className="font-semibold text-gray-900 text-sm">Cursor</h3>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copy(cursorConfig, "Cursor config")}
                >
                  <Copy className="h-3.5 w-3.5 mr-1" />
                  Copy
                </Button>
              </div>
              <CardContent className="p-4">
                <p className="text-xs text-gray-500 mb-2">
                  Add to{" "}
                  <code className="bg-gray-100 px-1 rounded">.cursor/mcp.json</code>
                </p>
                <pre className="text-xs bg-gray-900 text-green-400 p-3 rounded-lg overflow-x-auto leading-relaxed">
                  {cursorConfig}
                </pre>
                <a
                  href="https://docs.cursor.com/context/model-context-protocol"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-indigo-600 hover:underline mt-2 flex items-center gap-1"
                >
                  <ExternalLink className="h-3 w-3" />
                  Cursor MCP docs
                </a>
              </CardContent>
            </Card>
          </div>

          {/* Available tools */}
          <Card>
            <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <h2 className="text-base font-semibold text-gray-900">
                Available MCP Tools
              </h2>
              <Badge className="bg-indigo-100 text-indigo-700 ml-1">
                {tools.length} tools
              </Badge>
            </div>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-100">
                {tools.map((t) => (
                  <div key={t.name} className="flex items-center gap-4 px-6 py-3">
                    <code className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded font-mono whitespace-nowrap">
                      {t.name}
                    </code>
                    <span className="text-sm text-gray-600">{t.desc}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

        </div>
      </main>

      {/* Create API Key Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate New API Key for MCP</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="name">Key Name</Label>
              <Input
                id="name"
                placeholder="e.g., Cursor MCP Key"
                {...form.register("name", { required: "Name is required" })}
                className="mt-1"
              />
              {form.formState.errors.name && (
                <p className="text-sm text-red-600 mt-1">
                  {form.formState.errors.name?.message as string}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Optional description"
                {...form.register("description")}
                className="mt-1"
              />
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-start">
                <TriangleAlert className="h-5 w-5 text-yellow-600 mr-2 mt-0.5" />
                <div className="text-sm text-yellow-700">
                  <p className="font-medium">Important!</p>
                  <p>Your API key will be shown only once. We'll pre-fill the MCP URL below, so make sure to copy the configuration before leaving the page.</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createApiKeyMutation.isPending}
              >
                {createApiKeyMutation.isPending ? "Generating..." : "Generate Key"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
