import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { getInitials } from "@/lib/auth";
import {
  Home,
  Folder,
  Key,
  Users,
  Settings,
  Code,
  Book,
  LogOut,
  Sparkles,
  Plug,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Sidebar() {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: Home },
    { name: "Projects", href: "/projects", icon: Folder },
    { name: "Optimize", href: "/optimize", icon: Sparkles },
    { name: "API Keys", href: "/api-keys", icon: Key },
    { name: "MCP Access", href: "/mcp-access", icon: Plug },
    { name: "Team", href: "/team", icon: Users },
    { name: "Docs", href: "/docs", icon: Book },
  ];

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return location === "/" || location === "/dashboard";
    }
    return location.startsWith(href);
  };

  return (
    <aside className="fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200 z-50">
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="flex items-center px-6 py-4 border-b border-gray-200">
          <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center mr-3">
            <Code className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-semibold text-gray-900">Prompt Manager</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.name} href={item.href}>
                <div
                  className={`flex items-center px-3 py-2 rounded-lg font-medium transition-colors ${isActive(item.href)
                      ? "bg-primary/10 text-primary"
                      : "text-gray-700 hover:bg-gray-50"
                    }`}
                >
                  <Icon className="h-5 w-5 mr-3" />
                  {item.name}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* User Menu */}
        <div className="border-t border-gray-200 p-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="flex items-center cursor-pointer hover:bg-gray-50 rounded-lg p-2 -m-2">
                <div className="h-8 w-8 bg-gray-300 rounded-full flex items-center justify-center mr-3">
                  <span className="text-gray-600 text-sm font-medium">
                    {user ? getInitials(user.username) : "U"}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{user?.username}</p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                </div>
                <Settings className="h-4 w-4 text-gray-400" />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <Link href="/account-settings">
                <DropdownMenuItem className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  Account Settings
                </DropdownMenuItem>
              </Link>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="cursor-pointer text-red-600">
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </aside>
  );
}