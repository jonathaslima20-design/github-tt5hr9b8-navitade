import { Bell, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useAuth } from '@/contexts/AuthContext';
import { getInitials } from '@/lib/utils';

interface AdminHeaderProps {
  onMenuClick?: () => void;
}

export default function AdminHeader({ onMenuClick }: AdminHeaderProps) {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-2 px-3 md:py-3 md:px-4 lg:px-8 flex items-center justify-between">
      <div className="flex items-center gap-2 md:gap-3 min-w-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="md:hidden h-8 w-8 shrink-0"
        >
          <Menu className="h-4 w-4" />
        </Button>
        <h1 className="font-semibold text-sm md:text-lg truncate">Painel Admin</h1>
      </div>

      <div className="flex items-center gap-1 md:gap-3 shrink-0">
        <ThemeToggle />

        <Button variant="ghost" size="icon" className="relative h-8 w-8 md:h-9 md:w-9">
          <Bell className="h-4 w-4 md:h-5 md:w-5" />
          <span className="absolute top-1 right-1 h-1.5 w-1.5 md:h-2 md:w-2 rounded-full bg-primary"></span>
        </Button>

        <div className="flex items-center gap-2 md:gap-3">
          <Avatar className="h-7 w-7 md:h-9 md:w-9">
            <AvatarImage src={user?.avatar_url} alt={user?.name} />
            <AvatarFallback className="text-xs md:text-sm">{getInitials(user?.name || '')}</AvatarFallback>
          </Avatar>
          <div className="hidden lg:block">
            <p className="font-medium text-sm">{user?.name}</p>
            <p className="text-xs text-muted-foreground">Administrador</p>
          </div>
        </div>
      </div>
    </header>
  );
}