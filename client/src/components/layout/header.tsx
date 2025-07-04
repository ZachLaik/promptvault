import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface HeaderProps {
  title: string;
  subtitle?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
}

export function Header({ title, subtitle, action }: HeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          {subtitle && <p className="text-sm text-gray-600">{subtitle}</p>}
        </div>
        {action && (
          <div className="flex items-center space-x-3">
            <Button onClick={action.onClick} className="font-medium">
              {action.icon || <Plus className="h-4 w-4 mr-2" />}
              {action.label}
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
