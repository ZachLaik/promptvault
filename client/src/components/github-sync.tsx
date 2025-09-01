
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Github, Upload } from "lucide-react";

interface GitHubSyncProps {
  projectId: number;
  projectName: string;
}

export function GitHubSync({ projectId, projectName }: GitHubSyncProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [repos, setRepos] = useState<any[]>([]);
  const [selectedRepo, setSelectedRepo] = useState("");
  const [newRepoName, setNewRepoName] = useState("");
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchRepos = async () => {
    try {
      const response = await fetch("/api/github/repos", {
        credentials: "include"
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch repositories");
      }
      
      const data = await response.json();
      setRepos(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch GitHub repositories. Make sure your GitHub account is connected.",
        variant: "destructive"
      });
    }
  };

  const handleSync = async () => {
    if (!selectedRepo && !newRepoName) {
      toast({
        title: "Error",
        description: "Please select a repository or enter a new repository name",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      let repoOwner, repoName;
      
      if (isCreateMode && newRepoName) {
        // Create new repository
        const createResponse = await fetch("/api/github/repos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            name: newRepoName,
            description: `Prompts for ${projectName}`,
            isPrivate: true
          })
        });
        
        if (!createResponse.ok) {
          throw new Error("Failed to create repository");
        }
        
        const newRepo = await createResponse.json();
        [repoOwner, repoName] = newRepo.repository.fullName.split("/");
      } else {
        [repoOwner, repoName] = selectedRepo.split("/");
      }
      
      // Sync project to repository
      const syncResponse = await fetch(`/api/projects/${projectId}/sync-github`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ repoOwner, repoName })
      });
      
      if (!syncResponse.ok) {
        throw new Error("Failed to sync project");
      }
      
      toast({
        title: "Success",
        description: "Project synced to GitHub successfully!"
      });
      
      setIsOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to sync project",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          onClick={fetchRepos}
          className="flex items-center gap-2"
        >
          <Github className="h-4 w-4" />
          Sync to GitHub
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sync Project to GitHub</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex gap-2">
            <Button
              variant={!isCreateMode ? "default" : "outline"}
              onClick={() => setIsCreateMode(false)}
              className="flex-1"
            >
              Existing Repo
            </Button>
            <Button
              variant={isCreateMode ? "default" : "outline"}
              onClick={() => setIsCreateMode(true)}
              className="flex-1"
            >
              Create New
            </Button>
          </div>
          
          {isCreateMode ? (
            <div>
              <Label htmlFor="new-repo">New Repository Name</Label>
              <Input
                id="new-repo"
                value={newRepoName}
                onChange={(e) => setNewRepoName(e.target.value)}
                placeholder={`${projectName.toLowerCase().replace(/\s+/g, "-")}-prompts`}
                className="mt-1"
              />
            </div>
          ) : (
            <div>
              <Label htmlFor="repo-select">Select Repository</Label>
              <Select onValueChange={setSelectedRepo} value={selectedRepo}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Choose a repository" />
                </SelectTrigger>
                <SelectContent>
                  {repos.map((repo) => (
                    <SelectItem key={repo.fullName} value={repo.fullName}>
                      {repo.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          <div className="bg-gray-50 p-3 rounded-md text-sm">
            <p className="font-medium mb-1">What will be synced:</p>
            <ul className="text-gray-600 space-y-1">
              <li>• All prompts and their latest versions</li>
              <li>• Project metadata and descriptions</li>
              <li>• Structured YAML format for easy reading</li>
            </ul>
          </div>
          
          <Button 
            onClick={handleSync} 
            disabled={isLoading}
            className="w-full flex items-center gap-2"
          >
            {isLoading ? (
              "Syncing..."
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Sync to GitHub
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
