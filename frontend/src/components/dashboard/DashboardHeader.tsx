import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, FileText, Plus } from 'lucide-react';

interface DashboardHeaderProps {
  onAddDocument: () => void;
}

export function DashboardHeader({ onAddDocument }: DashboardHeaderProps) {
  const { user, logout } = useAuth();

  const regionName = user?.region === 'russia' ? 'Russia' : 'Dubai';

  return (
    <header className="bg-card border-b border-border sticky top-0 z-40">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-display font-bold text-foreground">
                  BoraDoc Vault
                </h1>
                <p className="text-xs text-muted-foreground">
                  {regionName} Region
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Button variant="accent" onClick={onAddDocument}>
              <Plus className="w-4 h-4" />
              Add Document
            </Button>
            
            <div className="flex items-center gap-3 pl-4 border-l border-border">
              <div className="text-right">
                <p className="text-sm font-medium text-foreground">{user?.email}</p>
                <p className="text-xs text-muted-foreground capitalize">{user?.region} Database</p>
              </div>
              <Button variant="ghost" size="icon" onClick={logout}>
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
