import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { formatTimeAgo } from "@/lib/auth";
import type { Project, Prompt } from "@shared/schema";
import {
  Sparkles,
  Search,
  ArrowRight,
  FileText,
  Folder,
  Clock,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

interface ProjectWithRole extends Project {
  role: string;
}

interface PromptWithProject extends Prompt {
  projectName: string;
  projectSlug: string;
  optimizationCount?: number;
  lastOptimization?: {
    status: string;
    score?: number;
    createdAt: string;
  };
}

export default function OptimizeHub() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProject, setSelectedProject] = useState<string>("all");

  const { data: projects = [] } = useQuery<ProjectWithRole[]>({
    queryKey: ["/api/projects"],
  });

  const { data: allPrompts = [], isLoading } = useQuery<PromptWithProject[]>({
    queryKey: ["/api/prompts/all-with-optimizations"],
    queryFn: async () => {
      // Fetch all prompts from all projects the user has access to
      const prompts: PromptWithProject[] = [];

      for (const project of projects) {
        try {
          const response = await apiRequest("GET", `/api/projects/${project.id}/prompts`);
          const projectPrompts = await response.json();

          for (const prompt of projectPrompts) {
            // Try to get optimization info
            try {
              const optResponse = await apiRequest(
                "GET",
                `/api/prompts/${prompt.slug}/optimizations?projectSlug=${project.slug}`
              );
              const optimizations = await optResponse.json();

              prompts.push({
                ...prompt,
                projectName: project.name,
                projectSlug: project.slug,
                optimizationCount: optimizations.length,
                lastOptimization: optimizations[0] ? {
                  status: optimizations[0].status,
                  score: optimizations[0].optimizedScore ? parseFloat(optimizations[0].optimizedScore) : undefined,
                  createdAt: optimizations[0].createdAt,
                } : undefined,
              });
            } catch {
              prompts.push({
                ...prompt,
                projectName: project.name,
                projectSlug: project.slug,
                optimizationCount: 0,
              });
            }
          }
        } catch (error) {
          console.error(`Failed to fetch prompts for project ${project.id}:`, error);
        }
      }

      return prompts;
    },
    enabled: projects.length > 0,
  });

  const filteredPrompts = allPrompts.filter((prompt) => {
    const matchesSearch =
      prompt.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prompt.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prompt.projectName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesProject = selectedProject === "all" || prompt.projectSlug === selectedProject;

    return matchesSearch && matchesProject;
  });

  const getStatusBadge = (prompt: PromptWithProject) => {
    if (!prompt.lastOptimization) {
      return (
        <Badge variant="outline" className="text-gray-500">
          <AlertCircle className="h-3 w-3 mr-1" />
          Not optimized
        </Badge>
      );
    }

    if (prompt.lastOptimization.status === "completed") {
      return (
        <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
          <CheckCircle className="h-3 w-3 mr-1" />
          {prompt.lastOptimization.score
            ? `${(prompt.lastOptimization.score * 100).toFixed(0)}% score`
            : "Optimized"}
        </Badge>
      );
    }

    if (prompt.lastOptimization.status === "running") {
      return (
        <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">
          <Clock className="h-3 w-3 mr-1 animate-spin" />
          Running
        </Badge>
      );
    }

    return (
      <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50">
        <AlertCircle className="h-3 w-3 mr-1" />
        Failed
      </Badge>
    );
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />

      <main className="flex-1 ml-64 p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-purple-500" />
            Prompt Optimization
          </h1>
          <p className="text-gray-500 mt-1">
            Optimize your prompts using DSPy-style techniques with Q&A examples
          </p>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search prompts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Filter by project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.slug}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Prompts Grid */}
        {isLoading ? (
          <div className="text-center py-12 text-gray-500">Loading prompts...</div>
        ) : filteredPrompts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Sparkles className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No prompts found</h3>
              <p className="text-gray-500 mb-4">
                {searchQuery || selectedProject !== "all"
                  ? "Try adjusting your filters"
                  : "Create a prompt in one of your projects to start optimizing"}
              </p>
              <Link href="/projects">
                <Button>Go to Projects</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPrompts.map((prompt) => (
              <Card key={`${prompt.projectSlug}-${prompt.slug}`} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate">{prompt.title}</CardTitle>
                      <CardDescription className="flex items-center gap-1 mt-1">
                        <Folder className="h-3 w-3" />
                        {prompt.projectName}
                      </CardDescription>
                    </div>
                    {getStatusBadge(prompt)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                    <span className="flex items-center gap-1">
                      <FileText className="h-4 w-4" />
                      {prompt.category}
                    </span>
                    {prompt.optimizationCount && prompt.optimizationCount > 0 ? (
                      <span>{prompt.optimizationCount} optimization{prompt.optimizationCount > 1 ? "s" : ""}</span>
                    ) : (
                      <span>No optimizations yet</span>
                    )}
                  </div>

                  {prompt.lastOptimization && (
                    <div className="text-xs text-gray-400 mb-4">
                      Last optimized {formatTimeAgo(prompt.lastOptimization.createdAt)}
                    </div>
                  )}

                  <Link href={`/projects/${prompt.projectSlug}/prompts/${prompt.slug}/optimize`}>
                    <Button className="w-full bg-purple-600 hover:bg-purple-700">
                      <Sparkles className="h-4 w-4 mr-2" />
                      Optimize
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Quick Tips */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-lg">How Prompt Optimization Works</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex gap-3">
                <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-purple-600 font-bold">1</span>
                </div>
                <div>
                  <h4 className="font-medium">Create a Dataset</h4>
                  <p className="text-sm text-gray-500">
                    Add Q&A examples that represent ideal input/output pairs for your prompt
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-purple-600 font-bold">2</span>
                </div>
                <div>
                  <h4 className="font-medium">Configure Settings</h4>
                  <p className="text-sm text-gray-500">
                    Choose your model, optimizer algorithm, and evaluation metric
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-purple-600 font-bold">3</span>
                </div>
                <div>
                  <h4 className="font-medium">Run Optimization</h4>
                  <p className="text-sm text-gray-500">
                    The system will iterate to find the best prompt formulation
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
