
import { Octokit } from "@octokit/rest";
import yaml from "js-yaml";
import { storage } from "./storage";

export class GitHubSyncService {
  private octokit: Octokit;

  constructor(accessToken: string) {
    this.octokit = new Octokit({
      auth: accessToken,
    });
  }

  async syncProjectToGitHub(projectId: number, userId: number, repoOwner: string, repoName: string) {
    try {
      // Get project and prompts
      const project = await storage.getProject(projectId);
      if (!project) {
        throw new Error("Project not found");
      }

      const prompts = await storage.getProjectPrompts(projectId);
      
      // Build YAML structure
      const promptsData: any = {
        project: {
          name: project.name,
          slug: project.slug,
          description: project.description,
          lastSynced: new Date().toISOString()
        },
        prompts: {}
      };

      // Get latest versions for each prompt
      for (const prompt of prompts) {
        const latestVersion = await storage.getLatestPromptVersion(prompt.id);
        if (latestVersion) {
          promptsData.prompts[prompt.slug] = {
            title: prompt.title,
            description: prompt.description,
            category: prompt.category,
            version: latestVersion.version,
            content: latestVersion.content,
            message: latestVersion.message,
            lastUpdated: latestVersion.createdAt
          };
        }
      }

      // Convert to YAML
      const yamlContent = yaml.dump(promptsData, {
        indent: 2,
        lineWidth: -1,
        noRefs: true
      });

      // Check if file exists
      let sha: string | undefined;
      try {
        const existingFile = await this.octokit.repos.getContent({
          owner: repoOwner,
          repo: repoName,
          path: 'prompts.yaml'
        });
        
        if ('sha' in existingFile.data) {
          sha = existingFile.data.sha;
        }
      } catch (error) {
        // File doesn't exist, that's fine
      }

      // Create or update the file
      await this.octokit.repos.createOrUpdateFileContents({
        owner: repoOwner,
        repo: repoName,
        path: 'prompts.yaml',
        message: `Update prompts for project: ${project.name}`,
        content: Buffer.from(yamlContent).toString('base64'),
        sha: sha
      });

      return { success: true, message: 'Project synced to GitHub successfully' };
    } catch (error) {
      console.error('GitHub sync error:', error);
      throw new Error(`Failed to sync to GitHub: ${error.message}`);
    }
  }

  async createRepository(name: string, description: string, isPrivate: boolean = true) {
    try {
      const response = await this.octokit.repos.createForAuthenticatedUser({
        name,
        description,
        private: isPrivate,
        auto_init: true
      });
      
      return {
        success: true,
        repository: {
          name: response.data.name,
          fullName: response.data.full_name,
          url: response.data.html_url,
          cloneUrl: response.data.clone_url
        }
      };
    } catch (error) {
      console.error('Repository creation error:', error);
      throw new Error(`Failed to create repository: ${error.message}`);
    }
  }

  async getUserRepos() {
    try {
      const response = await this.octokit.repos.listForAuthenticatedUser({
        type: 'all',
        sort: 'updated',
        per_page: 100
      });
      
      return response.data.map(repo => ({
        name: repo.name,
        fullName: repo.full_name,
        description: repo.description,
        url: repo.html_url,
        private: repo.private
      }));
    } catch (error) {
      console.error('Get repos error:', error);
      throw new Error(`Failed to get repositories: ${error.message}`);
    }
  }
}
