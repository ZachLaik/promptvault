import { Switch, Route, useLocation } from "wouter";
import { useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import LandingPage from "@/pages/landing";
import LoginPage from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import ProjectsPage from "@/pages/projects";
import ProjectDetail from "./pages/project-detail";
import PromptEditor from "./pages/prompt-editor";
import PromptNew from "./pages/prompt-new";
import DocsPage from "./pages/docs";
import ApiKeysPage from "@/pages/api-keys";
import TeamPage from "@/pages/team";
import NotFound from "@/pages/not-found";
import AccountSettings from "@/pages/account-settings";

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
  const { user } = useAuth();
  const [location] = useLocation();

  useEffect(() => {
    const titles: Record<string, string> = {
      '/': 'PromptVault - AI Prompt Management',
      '/login': 'Login - PromptVault',
      '/dashboard': 'Dashboard - PromptVault',
      '/projects': 'Projects - PromptVault',
      '/api-keys': 'API Keys - PromptVault',
      '/team': 'Team - PromptVault',
      '/docs': 'Documentation - PromptVault',
      '/account-settings': 'Account Settings - PromptVault',
    };

    document.title = titles[location] || 'PromptVault';
  }, [location]);

  return (
    <Switch>
      <Route path="/">
        {user ? (
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        ) : (
          <LandingPage />
        )}
      </Route>
      <Route path="/login" component={LoginPage} />
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
          <PromptNew />
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
      <Route path="/account-settings">
        <ProtectedRoute>
          <AccountSettings />
        </ProtectedRoute>
      </Route>
      <Route path="/projects/:projectId/prompts/new">
        <ProtectedRoute>
          <PromptNew />
        </ProtectedRoute>
      </Route>
      <Route path="/projects/:projectId/prompts/:promptId">
        <ProtectedRoute>
          <PromptEditor />
        </ProtectedRoute>
      </Route>
      <Route path="/docs" component={DocsPage} />
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