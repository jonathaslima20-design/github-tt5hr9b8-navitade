import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useAuth } from '@/contexts/AuthContext';

export default function DashboardHeader() {
  const { user } = useAuth();

  return (
      <header className="border-b bg-background py-3 px-4 lg:px-8 flex items-center justify-between">
        <div></div>
        
        <div className="flex items-center space-x-4">
          <ThemeToggle />
        </div>
      </header>
  );
}