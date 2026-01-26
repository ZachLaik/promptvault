import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatTimeAgo, getInitials } from "@/lib/auth";
import type { Project, Prompt, PromptVersion } from "@shared/schema";
import {
  ChevronRight,
  History,
  Play,
  Save,
  GitCompare,
  X,
  Wand2,
} from "lucide-react";

interface PromptVersionWithAuthor extends PromptVersion {
  author: {
    id: number;
    username: string;
    email: string;
  };
}

function computeDiff(oldText: string, newText: string): { type: 'same' | 'add' | 'remove'; text: string }[] {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  const result: { type: 'same' | 'add' | 'remove'; text: string }[] = [];
  
  let oldIndex = 0;
  let newIndex = 0;
  
  while (oldIndex < oldLines.length || newIndex < newLines.length) {
    if (oldIndex >= oldLines.length) {
      result.push({ type: 'add', text: newLines[newIndex] });
      newIndex++;
    } else if (newIndex >= newLines.length) {
      result.push({ type: 'remove', text: oldLines[oldIndex] });
      oldIndex++;
    } else if (oldLines[oldIndex] === newLines[newIndex]) {
      result.push({ type: 'same', text: oldLines[oldIndex] });
      oldIndex++;
      newIndex++;
    } else {
      const oldLineInNew = newLines.indexOf(oldLines[oldIndex], newIndex);
      const newLineInOld = oldLines.indexOf(newLines[newIndex], oldIndex);
      
      if (oldLineInNew === -1 && newLineInOld === -1) {
        result.push({ type: 'remove', text: oldLines[oldIndex] });
        result.push({ type: 'add', text: newLines[newIndex] });
        oldIndex++;
        newIndex++;
      } else if (oldLineInNew !== -1 && (newLineInOld === -1 || oldLineInNew - newIndex <= newLineInOld - oldIndex)) {
        while (newIndex < oldLineInNew) {
          result.push({ type: 'add', text: newLines[newIndex] });
          newIndex++;
        }
      } else {
        while (oldIndex < newLineInOld) {
          result.push({ type: 'remove', text: oldLines[oldIndex] });
          oldIndex++;
        }
      }
    }
  }
  
  return result;
}

export default function PromptEditor() {
  const { projectId, promptSlug } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [currentContent, setCurrentContent] = useState("");
  const [message, setMessage] = useState("");
  const [activeApiTab, setActiveApiTab] = useState("curl");
  const [selectedVersions, setSelectedVersions] = useState<number[]>([]);
  const [showCompareDialog, setShowCompareDialog] = useState(false);

  const { data: project } = useQuery<Project>({
    queryKey: [`/api/projects/${projectId}`],
    enabled: !!projectId,
  });

  const { data: versions = [] } = useQuery<PromptVersionWithAuthor[]>({
    queryKey: [`/api/prompts/${promptSlug}/versions`, { projectSlug: project?.slug }],
    enabled: !!promptSlug && !!project?.slug,
  });

  const latestVersion = versions[0];

  const saveVersionMutation = useMutation({
    mutationFn: async (data: { content: string; message: string }) => {
      const response = await apiRequest("POST", `/api/prompts/${promptSlug}`, {
        content: data.content,
        message: data.message,
        projectSlug: project?.slug,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/prompts/${promptSlug}/versions`] });
      setMessage("");
      toast({
        title: "Success",
        description: "New version saved successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save version",
        variant: "destructive",
      });
    },
  });

  const form = useForm({
    defaultValues: {
      slug: promptSlug || "",
      title: promptSlug?.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase()) || "",
      category: "general",
    },
  });

  // Initialize content when latest version loads
  useEffect(() => {
    if (latestVersion && !currentContent) {
      setCurrentContent(latestVersion.content);
    }
  }, [latestVersion, currentContent]);

  const handleSave = () => {
    if (!currentContent.trim()) {
      toast({
        title: "Error",
        description: "Content cannot be empty",
        variant: "destructive",
      });
      return;
    }

    saveVersionMutation.mutate({
      content: currentContent,
      message: message || `Version ${(latestVersion?.version || 0) + 1}`,
    });
  };

  const loadVersion = (version: PromptVersionWithAuthor) => {
    setCurrentContent(version.content);
    setMessage(`Loaded version ${version.version}`);
  };

  const toggleVersionSelection = (versionNumber: number) => {
    setSelectedVersions(prev => {
      if (prev.includes(versionNumber)) {
        return prev.filter(v => v !== versionNumber);
      }
      if (prev.length >= 2) {
        return [prev[1], versionNumber].sort((a, b) => a - b);
      }
      return [...prev, versionNumber].sort((a, b) => a - b);
    });
  };

  const handleCompare = () => {
    if (selectedVersions.length === 2) {
      setShowCompareDialog(true);
    }
  };

  const compareVersions = useMemo(() => {
    if (selectedVersions.length !== 2) return null;
    const [v1Num, v2Num] = selectedVersions.sort((a, b) => a - b);
    const v1 = versions.find(v => v.version === v1Num);
    const v2 = versions.find(v => v.version === v2Num);
    if (!v1 || !v2) return null;
    return {
      older: v1,
      newer: v2,
      diff: computeDiff(v1.content, v2.content),
    };
  }, [selectedVersions, versions]);

  if (!project) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Sidebar />
        <main className="ml-64 min-h-screen flex items-center justify-center">
          <p className="text-gray-500">Loading project...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      
      <main className="ml-64 min-h-screen">
        {/* Editor Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <nav className="flex items-center space-x-2 text-sm text-gray-500 mr-4">
                <Link href="/projects" className="hover:text-gray-700">
                  Projects
                </Link>
                <ChevronRight className="h-4 w-4" />
                <Link href={`/projects/${projectId}`} className="hover:text-gray-700">
                  {project.name}
                </Link>
                <ChevronRight className="h-4 w-4" />
                <span className="text-gray-900 font-medium">{promptSlug}</span>
              </nav>
              {latestVersion && (
                <Badge className="ml-3">
                  v{latestVersion.version}
                </Badge>
              )}
            </div>
            <div className="flex items-center space-x-3">
              <Button variant="outline" className="text-gray-600 hover:text-gray-900">
                <History className="h-4 w-4 mr-2" />
                History
              </Button>
              <Button
                variant="outline"
                className="text-purple-600 hover:text-purple-900 hover:bg-purple-50 border-purple-200"
                disabled={!currentContent.trim()}
                onClick={() => setLocation(`/projects/${projectId}/prompts/${promptSlug}/optimize`)}
              >
                <Wand2 className="h-4 w-4 mr-2" />
                Optimize
              </Button>
              <Button variant="outline" className="text-gray-600 hover:text-gray-900">
                <Play className="h-4 w-4 mr-2" />
                Test
              </Button>
              <Button
                onClick={handleSave}
                disabled={saveVersionMutation.isPending}
              >
                <Save className="h-4 w-4 mr-2" />
                {saveVersionMutation.isPending ? "Saving..." : "Save Version"}
              </Button>
            </div>
          </div>
        </header>
        
        {/* Editor Content */}
        <div className="flex h-screen">
          {/* Main Editor */}
          <div className="flex-1 p-6">
            <Card className="h-full flex flex-col">
              {/* Prompt Metadata */}
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="slug">Prompt Slug</Label>
                    <Input
                      id="slug"
                      value={form.watch("slug")}
                      {...form.register("slug")}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={form.watch("title")}
                      {...form.register("title")}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Select value={form.watch("category")} onValueChange={(value) => form.setValue("category", value)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">General</SelectItem>
                        <SelectItem value="customer-support">Customer Support</SelectItem>
                        <SelectItem value="content-generation">Content Generation</SelectItem>
                        <SelectItem value="data-processing">Data Processing</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              
              {/* Version Message */}
              <div className="px-6 py-3 border-b border-gray-200">
                <Label htmlFor="message">Version Message</Label>
                <Input
                  id="message"
                  placeholder="Describe what changed in this version..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="mt-1"
                />
              </div>
              
              {/* Prompt Content Editor */}
              <div className="flex-1 flex flex-col">
                <div className="px-6 py-3 border-b border-gray-200">
                  <h3 className="text-sm font-medium text-gray-900">Prompt Content</h3>
                </div>
                <div className="flex-1 p-6">
                  <Textarea
                    className="w-full h-full border border-gray-300 rounded-lg p-4 text-sm font-mono resize-none"
                    placeholder="Enter your prompt content here..."
                    value={currentContent}
                    onChange={(e) => setCurrentContent(e.target.value)}
                  />
                </div>
              </div>
            </Card>
          </div>
          
          {/* Sidebar with History */}
          <div className="w-80 p-6 pl-0">
            <Card className="h-full">
              <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-900">Version History</h3>
                {selectedVersions.length === 2 && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={handleCompare}
                    className="h-7 text-xs"
                  >
                    <GitCompare className="h-3 w-3 mr-1" />
                    Compare
                  </Button>
                )}
              </div>
              
              {versions.length > 1 && (
                <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
                  <p className="text-xs text-gray-500">
                    {selectedVersions.length === 0 && "Select 2 versions to compare"}
                    {selectedVersions.length === 1 && "Select 1 more version to compare"}
                    {selectedVersions.length === 2 && `Comparing v${Math.min(...selectedVersions)} and v${Math.max(...selectedVersions)}`}
                  </p>
                </div>
              )}
              
              <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
                {versions.length === 0 ? (
                  <p className="text-sm text-gray-500">No versions yet.</p>
                ) : (
                  versions.map((version) => (
                    <div
                      key={version.id}
                      className={`border rounded-lg p-3 hover:bg-gray-50 cursor-pointer transition-colors ${
                        selectedVersions.includes(version.version) 
                          ? 'border-blue-400 bg-blue-50' 
                          : 'border-gray-200'
                      }`}
                      onClick={() => loadVersion(version)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {versions.length > 1 && (
                            <Checkbox
                              checked={selectedVersions.includes(version.version)}
                              onCheckedChange={() => toggleVersionSelection(version.version)}
                              onClick={(e) => e.stopPropagation()}
                            />
                          )}
                          <span className="text-sm font-medium text-gray-900">v{version.version}</span>
                        </div>
                        <span className="text-xs text-gray-500">{formatTimeAgo(version.createdAt)}</span>
                      </div>
                      <div className="flex items-center mb-2">
                        <div className="h-5 w-5 bg-blue-100 rounded-full flex items-center justify-center mr-2">
                          <span className="text-xs font-medium text-blue-800">
                            {getInitials(version.author.username)}
                          </span>
                        </div>
                        <span className="text-xs text-gray-600">{version.author.username}</span>
                      </div>
                      <p className="text-xs text-gray-500">{version.message}</p>
                    </div>
                  ))
                )}
              </div>
              
              {/* API Usage */}
              <div className="border-t border-gray-200 p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3">API Usage</h4>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex border-b border-gray-200 mb-3">
                    <button 
                      className={`px-3 py-1 text-xs font-medium rounded-t ${
                        activeApiTab === 'curl' 
                          ? 'text-gray-700 border-b-2 border-blue-500 bg-white' 
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                      onClick={() => setActiveApiTab('curl')}
                    >
                      cURL
                    </button>
                    <button 
                      className={`px-3 py-1 text-xs font-medium ml-1 rounded-t ${
                        activeApiTab === 'python' 
                          ? 'text-gray-700 border-b-2 border-blue-500 bg-white' 
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                      onClick={() => setActiveApiTab('python')}
                    >
                      Python SDK
                    </button>
                    <button 
                      className={`px-3 py-1 text-xs font-medium ml-1 rounded-t ${
                        activeApiTab === 'javascript' 
                          ? 'text-gray-700 border-b-2 border-blue-500 bg-white' 
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                      onClick={() => setActiveApiTab('javascript')}
                    >
                      JavaScript SDK
                    </button>
                    <button 
                      className={`px-3 py-1 text-xs font-medium ml-1 rounded-t ${
                        activeApiTab === 'http' 
                          ? 'text-gray-700 border-b-2 border-blue-500 bg-white' 
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                      onClick={() => setActiveApiTab('http')}
                    >
                      Raw HTTP
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {/* cURL Tab */}
                    {activeApiTab === 'curl' && (
                      <div>
                        <div className="mb-3">
                          <p className="text-xs text-gray-600 mb-2">GET Request:</p>
                          <code className="text-xs bg-white px-2 py-1 rounded border block mb-2 break-all font-mono">
                            curl -X GET "https://prompting-manager.replit.app/api/prompts/{promptSlug}?projectSlug={project.slug}" \<br/>
                            &nbsp;&nbsp;-H "X-API-Key: pk_your_api_key"
                          </code>
                        </div>
                        
                        <div>
                          <p className="text-xs text-gray-600 mb-2">POST Request (Create/Update):</p>
                          <code className="text-xs bg-white px-2 py-1 rounded border block font-mono">
                            {`curl -X POST "https://prompting-manager.replit.app/api/prompts/${promptSlug}" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: pk_your_api_key" \\
  -d '{"projectSlug": "${project.slug}", "content": "Your prompt content...", "message": "Version message"}'`}
                          </code>
                        </div>
                      </div>
                    )}
                    
                    {/* Python SDK Tab */}
                    {activeApiTab === 'python' && (
                      <div>
                        <div className="mb-3">
                          <p className="text-xs text-gray-600 mb-2">Install SDK:</p>
                          <code className="text-xs bg-white px-2 py-1 rounded border block mb-2 font-mono">
                            pip install git+https://github.com/your-repo/promptvault.git#subdirectory=python-sdk
                          </code>
                        </div>
                        
                        <div>
                          <p className="text-xs text-gray-600 mb-2">Usage:</p>
                          <code className="text-xs bg-white px-2 py-1 rounded border block font-mono whitespace-pre-line">
                            {`import promptvault

# Configure
promptvault.configure(
    base_url="https://prompting-manager.replit.app",
    api_key="pk_your_api_key"
)

# Method 1: Dot notation (recommended)
prompt = promptvault.${project.slug.replace('-', '_')}.${promptSlug.replace('-', '_')}
print(str(prompt))

# Method 2: Function call syntax
prompt = promptvault.get_prompt("${promptSlug}", "${project.slug}")

# Method 3: With variables
rendered = prompt.render(
    variable_name="value"
)`}
                          </code>
                        </div>
                      </div>
                    )}
                    
                    {/* JavaScript SDK Tab */}
                    {activeApiTab === 'javascript' && (
                      <div>
                        <div className="mb-3">
                          <p className="text-xs text-gray-600 mb-2">Install SDK:</p>
                          <code className="text-xs bg-white px-2 py-1 rounded border block mb-2 font-mono">
                            npm install git+https://github.com/your-repo/promptvault.git#main:javascript-sdk
                          </code>
                        </div>
                        
                        <div>
                          <p className="text-xs text-gray-600 mb-2">Usage:</p>
                          <code className="text-xs bg-white px-2 py-1 rounded border block font-mono whitespace-pre-line">
                            {`import PromptVault from 'promptvault-js';

// Configure
const pv = new PromptVault({
  baseUrl: 'https://prompting-manager.replit.app',
  apiKey: 'pk_your_api_key'
});

// Method 1: Dot notation (recommended)
const prompt = await pv.${project.slug.replace('-', '_')}.${promptSlug.replace('-', '_')}();
console.log(prompt.toString());

// Method 2: Function call syntax
const prompt2 = await pv.getPrompt('${promptSlug}', '${project.slug}');

// Method 3: With variables
const rendered = prompt.render({
  variable_name: 'value'
});`}
                          </code>
                        </div>
                      </div>
                    )}
                    
                    {/* Raw HTTP Tab */}
                    {activeApiTab === 'http' && (
                      <div>
                        <div className="mb-3">
                          <p className="text-xs text-gray-600 mb-2">Python (requests):</p>
                          <code className="text-xs bg-white px-2 py-1 rounded border block mb-2 font-mono whitespace-pre-line">
                            {`import requests

response = requests.get(
    "https://prompting-manager.replit.app/api/prompts/${promptSlug}",
    headers={"X-API-Key": "pk_your_api_key"},
    params={"projectSlug": "${project.slug}"}
)
content = response.json()["content"]`}
                          </code>
                        </div>
                        
                        <div>
                          <p className="text-xs text-gray-600 mb-2">JavaScript (fetch):</p>
                          <code className="text-xs bg-white px-2 py-1 rounded border block font-mono whitespace-pre-line">
                            {`const response = await fetch(
  'https://prompting-manager.replit.app/api/prompts/${promptSlug}?projectSlug=${project.slug}',
  { headers: { 'X-API-Key': 'pk_your_api_key' } }
);
const data = await response.json();
console.log(data.content);`}
                          </code>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </main>

      {/* Compare Dialog */}
      <Dialog open={showCompareDialog} onOpenChange={setShowCompareDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitCompare className="h-5 w-5" />
              Compare Versions
              {compareVersions && (
                <span className="text-sm font-normal text-gray-500">
                  v{compareVersions.older.version} → v{compareVersions.newer.version}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {compareVersions && (
            <div className="flex-1 overflow-auto">
              <div className="flex gap-4 mb-4">
                <div className="flex-1 p-3 bg-red-50 rounded-lg border border-red-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="bg-red-100 text-red-700 border-red-300">
                      v{compareVersions.older.version}
                    </Badge>
                    <span className="text-sm text-gray-600">
                      {compareVersions.older.author.username} • {formatTimeAgo(compareVersions.older.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">{compareVersions.older.message}</p>
                </div>
                <div className="flex-1 p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                      v{compareVersions.newer.version}
                    </Badge>
                    <span className="text-sm text-gray-600">
                      {compareVersions.newer.author.username} • {formatTimeAgo(compareVersions.newer.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">{compareVersions.newer.message}</p>
                </div>
              </div>

              <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm overflow-auto max-h-96">
                {compareVersions.diff.map((line, index) => (
                  <div
                    key={index}
                    className={`px-2 py-0.5 ${
                      line.type === 'add' 
                        ? 'bg-green-900/40 text-green-300' 
                        : line.type === 'remove' 
                        ? 'bg-red-900/40 text-red-300' 
                        : 'text-gray-300'
                    }`}
                  >
                    <span className="select-none mr-2 text-gray-500">
                      {line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' '}
                    </span>
                    {line.text || ' '}
                  </div>
                ))}
              </div>

              <div className="mt-4 flex justify-between items-center text-sm text-gray-500">
                <div className="flex gap-4">
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 bg-green-500 rounded"></span>
                    Additions
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 bg-red-500 rounded"></span>
                    Deletions
                  </span>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setCurrentContent(compareVersions.newer.content);
                    setShowCompareDialog(false);
                    setSelectedVersions([]);
                    toast({
                      title: "Version Loaded",
                      description: `Loaded v${compareVersions.newer.version} content into editor`,
                    });
                  }}
                >
                  Load Newer Version
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
