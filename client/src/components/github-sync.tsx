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

  const checkGitHubAppInstallation = () => {
    // Redirect to GitHub app installation
    window.open("https://github.com/apps/prompt-safekeep", "_blank");
    toast({
      title: "Install GitHub App",
      description: "Please install the Prompt Safekeep GitHub app and then try again.",
    });
  };

  const fetchRepos = async () => {
    try {
      const response = await fetch("/api/github/repos", {
        credentials: "include"
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.needsReauth) {
          toast({
            title: "GitHub Re-authentication Required",
            description: "Please reconnect your GitHub account to access repositories with updated permissions.",
            variant: "destructive"
          });
          // Redirect to GitHub OAuth
          window.location.href = "/api/auth/github";
          return;
        }
        throw new Error(errorData.message || "Failed to fetch repositories");
      }

      const data = await response.json();
      setRepos(data);
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch GitHub repositories.",
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
          onClick={checkGitHubAppInstallation}
          className="flex items-center gap-2"
        >
          <Github className="h-4 w-4" />
          Sync to GitHub
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Install GitHub App</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-blue-50 p-3 rounded-md">
            <p className="text-sm text-blue-800 mb-3">
              <strong>Before syncing to GitHub, you need to install our GitHub app.</strong>
            </p>
            <p className="text-xs text-blue-700 mb-3">
              The Prompt Safekeep app needs to be installed on your GitHub account to access and create repositories.
            </p>
            <Button
              onClick={checkGitHubAppInstallation}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Github className="h-4 w-4 mr-2" />
              Install GitHub App
            </Button>
          </div>

          <div className="bg-gray-50 p-3 rounded-md text-sm">
            <p className="font-medium mb-2">After installation:</p>
            <ol className="text-gray-600 space-y-1 text-xs list-decimal list-inside">
              <li>Grant repository access permissions</li>
              <li>Return to this page</li>
              <li>Click "Sync to GitHub" again</li>
              <li>Select or create a repository for your prompts</li>
            </ol>
          </div>

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