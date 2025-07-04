import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { generateSlug } from "@/lib/auth";
import { insertPromptSchema, type Project } from "@shared/schema";
import {
  ChevronRight,
  Save,
  ArrowLeft,
} from "lucide-react";
import { Link } from "wouter";

export default function NewPromptPage() {
  const { projectId } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: project } = useQuery<Project>({
    queryKey: [`/api/projects/${projectId}`],
    enabled: !!projectId,
  });

  const createPromptMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", `/api/projects/${projectId}/prompts`, data);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/prompts`] });
      toast({
        title: "Success",
        description: "Prompt created successfully",
      });
      setLocation(`/projects/${projectId}/prompts/${data.slug}/edit`);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create prompt",
        variant: "destructive",
      });
    },
  });

  const form = useForm({
    defaultValues: {
      slug: "",
      title: "",
      category: "general",
    },
  });

  const onSubmit = (data: any) => {
    createPromptMutation.mutate(data);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value;
    form.setValue("title", title);
    form.setValue("slug", generateSlug(title));
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
        {/* Header */}
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
                <span className="text-gray-900 font-medium">New Prompt</span>
              </nav>
            </div>
            <div className="flex items-center space-x-3">
              <Link href={`/projects/${projectId}`}>
                <Button variant="outline">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Project
                </Button>
              </Link>
            </div>
          </div>
        </header>
        
        {/* Content */}
        <div className="p-6">
          <div className="max-w-2xl mx-auto">
            <Card>
              <div className="px-6 py-4 border-b border-gray-200">
                <h1 className="text-xl font-semibold text-gray-900">Create New Prompt</h1>
                <p className="text-sm text-gray-600 mt-1">
                  Define the basic information for your new prompt template
                </p>
              </div>
              
              <CardContent className="p-6">
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div>
                    <Label htmlFor="title">Prompt Title</Label>
                    <Input
                      id="title"
                      placeholder="e.g., Customer Support Response"
                      {...form.register("title", { required: "Title is required" })}
                      onChange={handleTitleChange}
                      className="mt-1"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      A descriptive name for your prompt template
                    </p>
                    {form.formState.errors.title && (
                      <p className="text-sm text-red-600 mt-1">
                        {form.formState.errors.title.message}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="slug">Prompt Slug</Label>
                    <Input
                      id="slug"
                      placeholder="customer-support-response"
                      {...form.register("slug", { required: "Slug is required" })}
                      className="mt-1"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      URL-friendly identifier used in API calls (auto-generated from title)
                    </p>
                    {form.formState.errors.slug && (
                      <p className="text-sm text-red-600 mt-1">
                        {form.formState.errors.slug.message}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Select 
                      value={form.watch("category")} 
                      onValueChange={(value) => form.setValue("category", value)}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">General</SelectItem>
                        <SelectItem value="customer-support">Customer Support</SelectItem>
                        <SelectItem value="content-generation">Content Generation</SelectItem>
                        <SelectItem value="data-processing">Data Processing</SelectItem>
                        <SelectItem value="coding">Coding</SelectItem>
                        <SelectItem value="analysis">Analysis</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500 mt-1">
                      Helps organize and filter your prompts
                    </p>
                    {form.formState.errors.category && (
                      <p className="text-sm text-red-600 mt-1">
                        {form.formState.errors.category.message}
                      </p>
                    )}
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <Save className="h-5 w-5 text-blue-400" />
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-blue-800">
                          Next Steps
                        </h3>
                        <div className="mt-2 text-sm text-blue-700">
                          <p>
                            After creating this prompt, you'll be taken to the editor where you can:
                          </p>
                          <ul className="list-disc list-inside mt-1 space-y-1">
                            <li>Write your prompt content</li>
                            <li>Save your first version</li>
                            <li>Test the prompt</li>
                            <li>Access it via API</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-end space-x-3 pt-4">
                    <Link href={`/projects/${projectId}`}>
                      <Button type="button" variant="outline">
                        Cancel
                      </Button>
                    </Link>
                    <Button
                      type="submit"
                      disabled={createPromptMutation.isPending}
                    >
                      {createPromptMutation.isPending ? "Creating..." : "Create Prompt"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}