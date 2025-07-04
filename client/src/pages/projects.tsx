import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "wouter";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { generateSlug, formatTimeAgo } from "@/lib/auth";
import { insertProjectSchema, type Project } from "@shared/schema";
import {
  Folder,
  Users,
  Clock,
  MoreHorizontal,
} from "lucide-react";

interface ProjectWithRole extends Project {
  role: string;
}

export default function ProjectsPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: projects = [], isLoading } = useQuery<ProjectWithRole[]>({
    queryKey: ["/api/projects"],
  });

  const createProjectMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/projects", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setIsCreateDialogOpen(false);
      toast({
        title: "Success",
        description: "Project created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create project",
        variant: "destructive",
      });
    },
  });

  const form = useForm({
    resolver: zodResolver(insertProjectSchema),
    defaultValues: {
      name: "",
      description: "",
      slug: "",
    },
  });

  const onSubmit = (data: any) => {
    createProjectMutation.mutate(data);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    form.setValue("name", name);
    form.setValue("slug", generateSlug(name));
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-green-100 text-green-800";
      case "editor":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getProjectInitials = (name: string) => {
    return name
      .split(" ")
      .map(word => word.charAt(0).toUpperCase())
      .join("")
      .substring(0, 2);
  };

  const getGradientColor = (index: number) => {
    const gradients = [
      "from-blue-400 to-blue-600",
      "from-purple-400 to-purple-600",
      "from-green-400 to-green-600",
      "from-red-400 to-red-600",
      "from-yellow-400 to-yellow-600",
      "from-indigo-400 to-indigo-600",
    ];
    return gradients[index % gradients.length];
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      
      <main className="ml-64 min-h-screen">
        <Header
          title="Projects"
          subtitle="Manage all your prompt projects"
          action={{
            label: "New Project",
            onClick: () => setIsCreateDialogOpen(true),
          }}
        />
        
        <div className="p-6">
          {/* Projects Grid */}
          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Loading projects...</p>
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-12">
              <Folder className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No projects yet</h3>
              <p className="text-gray-500 mb-6">Get started by creating your first project</p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                Create Your First Project
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project, index) => (
                <Card key={project.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`h-12 w-12 bg-gradient-to-br ${getGradientColor(index)} rounded-lg flex items-center justify-center`}>
                        <span className="text-white font-bold text-lg">
                          {getProjectInitials(project.name)}
                        </span>
                      </div>
                      <Button variant="ghost" size="sm" className="text-gray-400 hover:text-gray-600">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">{project.name}</h3>
                      <p className="text-sm text-gray-600 line-clamp-2">{project.description}</p>
                    </div>
                    
                    <div className="flex items-center justify-between mb-4">
                      <Badge className={getRoleColor(project.role)}>
                        {project.role}
                      </Badge>
                      <div className="flex items-center text-sm text-gray-500">
                        <Clock className="h-4 w-4 mr-1" />
                        {formatTimeAgo(project.createdAt)}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-sm text-gray-500">
                        <Users className="h-4 w-4 mr-1" />
                        5 members
                      </div>
                      <Link href={`/projects/${project.id}`}>
                        <Button size="sm">
                          Open Project
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Create Project Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="name">Project Name</Label>
              <Input
                id="name"
                placeholder="e.g., Customer Support Bot"
                {...form.register("name")}
                onChange={handleNameChange}
                className="mt-1"
              />
              {form.formState.errors.name && (
                <p className="text-sm text-red-600 mt-1">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>
            
            <div>
              <Label htmlFor="slug">Project Slug</Label>
              <Input
                id="slug"
                placeholder="customer-support-bot"
                {...form.register("slug")}
                className="mt-1"
              />
              {form.formState.errors.slug && (
                <p className="text-sm text-red-600 mt-1">
                  {form.formState.errors.slug.message}
                </p>
              )}
            </div>
            
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Brief description of the project"
                {...form.register("description")}
                className="mt-1"
              />
              {form.formState.errors.description && (
                <p className="text-sm text-red-600 mt-1">
                  {form.formState.errors.description.message}
                </p>
              )}
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
                disabled={createProjectMutation.isPending}
              >
                {createProjectMutation.isPending ? "Creating..." : "Create Project"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}