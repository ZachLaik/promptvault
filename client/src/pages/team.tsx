import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatTimeAgo, getInitials } from "@/lib/auth";
import { insertProjectMemberSchema, type Project } from "@shared/schema";
import {
  Users,
  UserPlus,
  Crown,
  Edit,
  Eye,
  Shield,
  MoreHorizontal,
} from "lucide-react";

interface ProjectWithRole extends Project {
  role: string;
}

interface ProjectMember {
  id: number;
  projectId: number;
  userId: number;
  role: string;
  joinedAt: string;
  user: {
    id: number;
    username: string;
    email: string;
  };
}

export default function TeamPage() {
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: projects = [] } = useQuery<ProjectWithRole[]>({
    queryKey: ["/api/projects"],
  });

  const { data: members = [] } = useQuery<ProjectMember[]>({
    queryKey: [`/api/projects/${selectedProject}/members`],
    enabled: !!selectedProject,
  });

  const inviteMemberMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", `/api/projects/${selectedProject}/members`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${selectedProject}/members`] });
      setIsInviteDialogOpen(false);
      toast({
        title: "Success",
        description: "Team member invited successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to invite team member",
        variant: "destructive",
      });
    },
  });

  const form = useForm({
    defaultValues: {
      email: "",
      role: "viewer",
    },
  });

  const onSubmit = (data: any) => {
    inviteMemberMutation.mutate(data);
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <Crown className="h-4 w-4" />;
      case "editor":
        return <Edit className="h-4 w-4" />;
      default:
        return <Eye className="h-4 w-4" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-purple-100 text-purple-800";
      case "editor":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const adminProjects = projects.filter(p => p.role === "admin");

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      
      <main className="ml-64 min-h-screen">
        <Header
          title="Team Management"
          subtitle="Manage team members across your projects"
          action={{
            label: "Invite Member",
            onClick: () => setIsInviteDialogOpen(true),
            icon: <UserPlus className="h-4 w-4 mr-2" />,
          }}
        />
        
        <div className="p-6">
          {/* Project Selector */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <Label htmlFor="project-select">Select Project</Label>
                  <Select value={selectedProject} onValueChange={setSelectedProject}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Choose a project to manage" />
                    </SelectTrigger>
                    <SelectContent>
                      {adminProjects.map((project) => (
                        <SelectItem key={project.id} value={project.id.toString()}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="text-sm text-gray-500">
                  <p>Only projects where you're an admin are shown</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Team Members */}
          {selectedProject ? (
            <Card>
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Team Members</h2>
                  <div className="flex items-center text-sm text-gray-500">
                    <Users className="h-4 w-4 mr-1" />
                    {members.length} members
                  </div>
                </div>
              </div>
              
              {members.length === 0 ? (
                <div className="p-6 text-center">
                  <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No team members yet</h3>
                  <p className="text-gray-500 mb-6">Invite team members to collaborate on this project</p>
                  <Button onClick={() => setIsInviteDialogOpen(true)}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Invite First Member
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Member</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {members.map((member) => (
                        <tr key={member.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="h-10 w-10 bg-gray-300 rounded-full flex items-center justify-center mr-3">
                                <span className="text-gray-600 text-sm font-medium">
                                  {getInitials(member.user.username)}
                                </span>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">{member.user.username}</p>
                                <p className="text-sm text-gray-500">{member.user.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge className={`${getRoleColor(member.role)} flex items-center w-fit`}>
                              {getRoleIcon(member.role)}
                              <span className="ml-1">{member.role}</span>
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatTimeAgo(member.joinedAt)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <Button variant="ghost" size="sm" className="text-gray-400 hover:text-gray-600">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Shield className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Project</h3>
                <p className="text-gray-500">
                  Choose a project from the dropdown above to manage its team members
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* Invite Member Dialog */}
      <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
          </DialogHeader>
          {!selectedProject ? (
            <div className="py-4">
              <p className="text-sm text-gray-500">Please select a project first to invite team members.</p>
              <Button 
                className="mt-4" 
                onClick={() => setIsInviteDialogOpen(false)}
              >
                Close
              </Button>
            </div>
          ) : (
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="user@example.com"
                  {...form.register("email", { required: "Email is required" })}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  The user must have an existing account
                </p>
                {form.formState.errors.email && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>
              
              <div>
                <Label htmlFor="role">Role</Label>
                <Select 
                  value={form.watch("role")} 
                  onValueChange={(value) => form.setValue("role", value)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viewer">
                      <div className="flex items-center">
                        <Eye className="h-4 w-4 mr-2" />
                        Viewer - Can view prompts
                      </div>
                    </SelectItem>
                    <SelectItem value="editor">
                      <div className="flex items-center">
                        <Edit className="h-4 w-4 mr-2" />
                        Editor - Can edit prompts
                      </div>
                    </SelectItem>
                    <SelectItem value="admin">
                      <div className="flex items-center">
                        <Crown className="h-4 w-4 mr-2" />
                        Admin - Full access
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                {form.formState.errors.role && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.role.message}
                  </p>
                )}
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="text-sm text-yellow-700">
                  <p className="font-medium">Role Permissions:</p>
                  <ul className="mt-1 space-y-1 text-xs">
                    <li><strong>Viewer:</strong> Can view and use prompts via API</li>
                    <li><strong>Editor:</strong> Can create and edit prompts</li>
                    <li><strong>Admin:</strong> Can manage team members and project settings</li>
                  </ul>
                </div>
              </div>
              
              <div className="flex items-center justify-end space-x-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsInviteDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={inviteMemberMutation.isPending}
                >
                  {inviteMemberMutation.isPending ? "Inviting..." : "Send Invitation"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}