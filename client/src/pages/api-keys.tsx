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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatTimeAgo } from "@/lib/auth";
import { insertApiKeySchema, type ApiKey } from "@shared/schema";
import {
  Info,
  Copy,
  Trash2,
  TriangleAlert,
} from "lucide-react";

interface ApiKeyWithMasked extends Omit<ApiKey, 'keyHash'> {
  maskedKey: string;
  keyValue?: string;
}

export default function ApiKeysPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newApiKey, setNewApiKey] = useState<ApiKeyWithMasked | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: apiKeys = [], isLoading } = useQuery<ApiKeyWithMasked[]>({
    queryKey: ["/api/api-keys"],
  });

  const createApiKeyMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/api-keys", data);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/api-keys"] });
      setIsCreateDialogOpen(false);
      setNewApiKey(data);
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

  const deleteApiKeyMutation = useMutation({
    mutationFn: async (keyId: number) => {
      await apiRequest("DELETE", `/api/api-keys/${keyId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/api-keys"] });
      toast({
        title: "Success",
        description: "API key deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete API key",
        variant: "destructive",
      });
    },
  });

  const form = useForm({
    resolver: zodResolver(insertApiKeySchema.omit(["userId", "keyHash", "keyPrefix"])),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const onSubmit = (data: any) => {
    createApiKeyMutation.mutate(data);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "API key copied to clipboard",
    });
  };

  const deleteApiKey = (keyId: number) => {
    if (confirm("Are you sure you want to delete this API key? This action cannot be undone.")) {
      deleteApiKeyMutation.mutate(keyId);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      
      <main className="ml-64 min-h-screen">
        <Header
          title="API Keys"
          subtitle="Manage your API keys for programmatic access"
          action={{
            label: "Generate New Key",
            onClick: () => setIsCreateDialogOpen(true),
          }}
        />
        
        <div className="p-6">
          {/* API Documentation */}
          <Card className="bg-blue-50 border-blue-200 mb-6">
            <CardContent className="p-6">
              <div className="flex items-start">
                <div className="h-6 w-6 bg-blue-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                  <Info className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-blue-900 mb-2">API Usage Instructions</h3>
                  <p className="text-sm text-blue-700 mb-3">
                    Use your API key to authenticate requests to the Prompt Manager API. Include it in the{" "}
                    <code className="bg-blue-100 px-1 rounded">X-API-Key</code> header.
                  </p>
                  <div className="bg-white rounded-lg border border-blue-200 p-3">
                    <p className="text-xs text-blue-600 mb-1">Example:</p>
                    <code className="text-xs text-gray-800 block">
                      curl -H "X-API-Key: pk_live_..." https://your-domain.com/api/prompts/my-prompt?projectSlug=my-project
                    </code>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* API Keys Table */}
          <Card>
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Your API Keys</h2>
            </div>
            
            {isLoading ? (
              <div className="p-6">
                <p className="text-gray-500">Loading API keys...</p>
              </div>
            ) : apiKeys.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-gray-500">No API keys yet. Create your first API key to get started.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Key</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Used</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {apiKeys.map((key) => (
                      <tr key={key.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <p className="text-sm font-medium text-gray-900">{key.name}</p>
                          <p className="text-sm text-gray-500">{key.description}</p>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <code className="text-sm text-gray-900 bg-gray-100 px-2 py-1 rounded font-mono">
                              {key.maskedKey}
                            </code>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(key.maskedKey)}
                              className="ml-2 text-gray-400 hover:text-gray-600"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatTimeAgo(key.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {key.lastUsedAt ? formatTimeAgo(key.lastUsedAt) : "Never"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge className={key.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                            {key.isActive ? "Active" : "Revoked"}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {key.isActive && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteApiKey(key.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Revoke
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </main>

      {/* Create API Key Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate New API Key</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="name">Key Name</Label>
              <Input
                id="name"
                placeholder="e.g., Production API"
                {...form.register("name")}
                className="mt-1"
              />
              {form.formState.errors.name && (
                <p className="text-sm text-red-600 mt-1">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>
            
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Optional description of this key's purpose"
                {...form.register("description")}
                className="mt-1"
              />
              {form.formState.errors.description && (
                <p className="text-sm text-red-600 mt-1">
                  {form.formState.errors.description.message}
                </p>
              )}
            </div>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-start">
                <TriangleAlert className="h-5 w-5 text-yellow-600 mr-2 mt-0.5" />
                <div className="text-sm text-yellow-700">
                  <p className="font-medium">Important!</p>
                  <p>Your API key will be shown only once. Make sure to copy it and store it securely.</p>
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

      {/* New API Key Success Dialog */}
      <Dialog open={!!newApiKey} onOpenChange={() => setNewApiKey(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>API Key Generated</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-start">
                <Info className="h-5 w-5 text-green-600 mr-2 mt-0.5" />
                <div className="text-sm text-green-700">
                  <p className="font-medium">Success!</p>
                  <p>Your API key has been generated. Copy it now as it won't be shown again.</p>
                </div>
              </div>
            </div>
            
            {newApiKey && (
              <div>
                <Label>Your new API key:</Label>
                <div className="flex items-center mt-1">
                  <code className="flex-1 text-sm text-gray-900 bg-gray-100 px-3 py-2 rounded font-mono">
                    {newApiKey.keyValue}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(newApiKey.keyValue!)}
                    className="ml-2"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
            
            <div className="flex items-center justify-end pt-4">
              <Button onClick={() => setNewApiKey(null)}>
                Done
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
