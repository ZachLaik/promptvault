import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import LoginPage from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import ProjectsPage from "@/pages/projects";
import ProjectDetail from "@/pages/project-detail";
import PromptEditor from "@/pages/prompt-editor";
import PromptNewPage from "@/pages/prompt-new";
import ApiKeysPage from "@/pages/api-keys";
import TeamPage from "@/pages/team";
import NotFound from "@/pages/not-found";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/">
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard">
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/projects">
        <ProtectedRoute>
          <ProjectsPage />
        </ProtectedRoute>
      </Route>
      <Route path="/projects/:projectId">
        <ProtectedRoute>
          <ProjectDetail />
        </ProtectedRoute>
      </Route>
      <Route path="/projects/:projectId/prompts/new">
        <ProtectedRoute>
          <PromptNewPage />
        </ProtectedRoute>
      </Route>
      <Route path="/projects/:projectId/prompts/:promptSlug/edit">
        <ProtectedRoute>
          <PromptEditor />
        </ProtectedRoute>
      </Route>
      <Route path="/api-keys">
        <ProtectedRoute>
          <ApiKeysPage />
        </ProtectedRoute>
      </Route>
      <Route path="/team">
        <ProtectedRoute>
          <TeamPage />
        </ProtectedRoute>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
