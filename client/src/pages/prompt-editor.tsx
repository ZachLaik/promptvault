import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { useForm } from "react-hook-form";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatTimeAgo, getInitials } from "@/lib/auth";
import type { Project, Prompt, PromptVersion } from "@shared/schema";
import {
  ChevronRight,
  History,
  Play,
  Save,
} from "lucide-react";

interface PromptVersionWithAuthor extends PromptVersion {
  author: {
    id: number;
    username: string;
    email: string;
  };
}

export default function PromptEditor() {
  const { projectId, promptSlug } = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [currentContent, setCurrentContent] = useState("");
  const [message, setMessage] = useState("");

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
  useState(() => {
    if (latestVersion && !currentContent) {
      setCurrentContent(latestVersion.content);
    }
  });

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
                <Link href="/projects">
                  <a className="hover:text-gray-700">Projects</a>
                </Link>
                <ChevronRight className="h-4 w-4" />
                <Link href={`/projects/${projectId}`}>
                  <a className="hover:text-gray-700">{project.name}</a>
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
              <div className="px-4 py-3 border-b border-gray-200">
                <h3 className="text-sm font-medium text-gray-900">Version History</h3>
              </div>
              
              <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
                {versions.length === 0 ? (
                  <p className="text-sm text-gray-500">No versions yet.</p>
                ) : (
                  versions.map((version) => (
                    <div
                      key={version.id}
                      className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 cursor-pointer"
                      onClick={() => loadVersion(version)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-900">v{version.version}</span>
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
                  <p className="text-xs text-gray-600 mb-2">GET Request:</p>
                  <code className="text-xs bg-white px-2 py-1 rounded border block mb-2 break-all">
                    /api/prompts/{promptSlug}?projectSlug={project.slug}
                  </code>
                  <p className="text-xs text-gray-600 mb-1">Headers:</p>
                  <code className="text-xs bg-white px-2 py-1 rounded border block break-all">
                    X-API-Key: pk_...
                  </code>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
