import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { formatTimeAgo, getInitials } from "@/lib/auth";
import type { Project, Prompt } from "@shared/schema";
import {
  ChevronRight,
  Users,
  Code,
  Clock,
  Search,
  Plus,
  Edit,
  History,
  Copy,
} from "lucide-react";

export default function ProjectDetail() {
  const { projectId } = useParams();

  const { data: project } = useQuery<Project>({
    queryKey: [`/api/projects/${projectId}`],
    enabled: !!projectId,
  });

  const { data: prompts = [] } = useQuery<Prompt[]>({
    queryKey: [`/api/projects/${projectId}/prompts`],
    enabled: !!projectId,
  });

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

  const getProjectInitials = (name: string) => {
    return name
      .split(" ")
      .map(word => word.charAt(0).toUpperCase())
      .join("")
      .substring(0, 2);
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "customer-support":
        return "bg-blue-100 text-blue-800";
      case "content-generation":
        return "bg-purple-100 text-purple-800";
      case "data-processing":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      
      <main className="ml-64 min-h-screen">
        {/* Project Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <nav className="flex items-center space-x-2 text-sm text-gray-500 mr-4">
                <Link href="/projects">
                  <a className="hover:text-gray-700">Projects</a>
                </Link>
                <ChevronRight className="h-4 w-4" />
                <span className="text-gray-900 font-medium">{project.name}</span>
              </nav>
            </div>
            <div className="flex items-center space-x-3">
              <Button variant="outline" className="text-gray-600 hover:text-gray-900">
                <Users className="h-4 w-4 mr-2" />
                Manage Team
              </Button>
              <Link href={`/projects/${projectId}/prompts/new`}>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Prompt
                </Button>
              </Link>
            </div>
          </div>
        </header>
        
        {/* Project Content */}
        <div className="p-6">
          {/* Project Info */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center">
                  <div className="h-16 w-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center mr-4">
                    <span className="text-white font-bold text-xl">
                      {getProjectInitials(project.name)}
                    </span>
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
                    <p className="text-gray-600 mt-1">{project.description}</p>
                    <div className="flex items-center mt-3 space-x-4 text-sm text-gray-500">
                      <span>
                        <Code className="h-4 w-4 inline mr-1" />
                        {prompts.length} prompts
                      </span>
                      <span>
                        <Users className="h-4 w-4 inline mr-1" />
                        5 team members
                      </span>
                      <span>
                        <Clock className="h-4 w-4 inline mr-1" />
                        Updated {formatTimeAgo(project.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
                <Badge className="bg-green-100 text-green-800">
                  Active
                </Badge>
              </div>
            </CardContent>
          </Card>
          
          {/* API Usage Section */}
          <Card className="mb-6">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">API Usage</h2>
              <p className="text-sm text-gray-600 mt-1">Access all prompts from this project programmatically</p>
            </div>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Python */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-3 flex items-center">
                    <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                    Python SDK
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <code className="text-sm font-mono text-gray-800 block whitespace-pre-wrap">
{`import promptvault

# Configure once
promptvault.configure(
    base_url="https://your-replit-url.replit.dev",
    api_key="pk_your_api_key"
)

# Get all prompts from project
prompts = promptvault.get_project_prompts("${project.slug}")
for prompt in prompts:
    print(f"{prompt['slug']}: {prompt['title']}")

# Or use individual prompts
${prompts.map(prompt => `prompt = promptvault.${project.slug.replace('-', '_')}.${prompt.slug.replace('-', '_')}`).slice(0, 2).join('\n')}`}
                    </code>
                  </div>
                </div>

                {/* JavaScript */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-3 flex items-center">
                    <span className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></span>
                    JavaScript SDK
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <code className="text-sm font-mono text-gray-800 block whitespace-pre-wrap">
{`import PromptVault from 'promptvault-js';

const pv = new PromptVault({
  baseUrl: 'https://your-replit-url.replit.dev',
  apiKey: 'pk_your_api_key'
});

// Get all prompts from project
const prompts = await pv.getProjectPrompts('${project.slug}');
prompts.forEach(prompt => {
  console.log(\`\${prompt.slug}: \${prompt.title}\`);
});

// Or use individual prompts
${prompts.map(prompt => `const prompt = await pv.${project.slug.replace('-', '_')}.${prompt.slug.replace('-', '_')}();`).slice(0, 2).join('\n')}`}
                    </code>
                  </div>
                </div>

                {/* Direct API */}
                <div className="lg:col-span-2">
                  <h3 className="font-medium text-gray-900 mb-3 flex items-center">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                    Direct HTTP API
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-600 mb-2">List all prompts:</p>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <code className="text-xs font-mono text-gray-800 block">
                          GET /api/projects/{project.slug}/prompts<br/>
                          Headers: X-API-Key: pk_...
                        </code>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-2">Get specific prompt:</p>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <code className="text-xs font-mono text-gray-800 block">
                          GET /api/prompts/[slug]?projectSlug={project.slug}<br/>
                          Headers: X-API-Key: pk_...
                        </code>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Prompts Table */}
          <Card>
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Prompts</h2>
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <Input
                      type="text"
                      placeholder="Search prompts..."
                      className="pl-9 pr-3 py-2 w-64"
                    />
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  </div>
                  <Select defaultValue="all">
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="customer-support">Customer Support</SelectItem>
                      <SelectItem value="content-generation">Content Generation</SelectItem>
                      <SelectItem value="data-processing">Data Processing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            
            {prompts.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-gray-500">No prompts yet. Create your first prompt to get started.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prompt</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {prompts.map((prompt) => (
                      <tr key={prompt.id} className="hover:bg-gray-50 cursor-pointer">
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{prompt.slug}</p>
                            <p className="text-sm text-gray-500">{prompt.title}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge className={getCategoryColor(prompt.category)}>
                            {prompt.category.replace("-", " ")}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatTimeAgo(prompt.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            <Link href={`/projects/${projectId}/prompts/${prompt.slug}/edit`}>
                              <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button variant="ghost" size="sm" className="text-gray-400 hover:text-gray-600">
                              <History className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="text-gray-400 hover:text-gray-600">
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
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
    </div>
  );
}
