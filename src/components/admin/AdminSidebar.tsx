import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  BarChart, 
  Settings, 
  LogOut, 
  ChevronLeft, 
  ChevronRight,
  Menu,
  X,
  ShieldCheck,
  Gift,
  CreditCard,
  HelpCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Logo from '@/components/Logo';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

interface AdminSidebarProps {
  mobileOpen?: boolean;
  onMobileToggle?: () => void;
}

export default function AdminSidebar({ mobileOpen = false, onMobileToggle }: AdminSidebarProps) {
  const [expanded, setExpanded] = useState(true);
  const { signOut, user } = useAuth();
  
  // Filter navigation items based on user role
  const navigation = [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard, roles: ['admin', 'parceiro'] },
    { name: 'Usuários', href: '/admin/users', icon: Users, roles: ['admin', 'parceiro'] },
    { name: 'Planos', href: '/admin/plans', icon: CreditCard, roles: ['admin'] },
    { name: 'Indicações', href: '/admin/referrals', icon: Gift, roles: ['admin', 'parceiro'] },
    { name: 'Configurações', href: '/admin/settings', icon: Settings, roles: ['admin'] },
    { name: 'Central de Ajuda', href: '/admin/help', icon: HelpCircle, roles: ['admin'] },
  ].filter(item => item.roles.includes(user?.role || ''));
  
  const toggleSidebar = () => {
    setExpanded(!expanded);
  };
  
  const toggleMobileSidebar = () => {
    onMobileToggle?.();
  };
  
  // Classes for navigation links
  const navItemClasses = ({ isActive }: { isActive: boolean }) => {
    return cn(
      "flex items-center space-x-2 md:space-x-3 py-2 px-2.5 md:px-3 rounded-md transition-colors min-h-[40px] md:min-h-[44px]",
      {
        "bg-primary/10 text-primary font-medium": isActive,
        "hover:bg-muted text-muted-foreground hover:text-foreground": !isActive,
      }
    );
  };
  
  // Sidebar content
  const sidebarContent = (
    <>
      <div className="flex items-center justify-between p-3 md:p-4">
        <div className="flex items-center space-x-2">
          <Logo showText={false} size="sm" className="md:w-8 md:h-8" />
          {expanded && (
            <div className="flex items-center">
              <span className="font-bold text-sm md:text-base">
                {user?.role === 'parceiro' ? 'Revenda' : 'Admin'}
              </span>
              <ShieldCheck className="h-3.5 w-3.5 md:h-4 md:w-4 ml-1 text-primary" />
            </div>
          )}
        </div>

        {/* Mobile close button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleMobileSidebar}
          className="md:hidden h-8 w-8"
        >
          <X className="h-4 w-4" />
        </Button>

        {/* Desktop expand/collapse button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="hidden md:flex"
        >
          {expanded ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
        </Button>
      </div>

      <div className="px-2 py-2">
        <nav className="space-y-0.5 flex flex-col">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              className={navItemClasses}
              onClick={() => onMobileToggle?.()}
            >
              <item.icon className="h-4 w-4 md:h-5 md:w-5 shrink-0" />
              {expanded && <span className="text-sm md:text-base">{item.name}</span>}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="mt-auto p-3 md:p-4">
        <Separator className="mb-3 md:mb-4" />
        <button
          onClick={() => signOut()}
          className="flex items-center space-x-3 py-2 w-full text-left text-muted-foreground hover:text-destructive transition-colors"
        >
          <LogOut className="h-4 w-4 md:h-5 md:w-5 shrink-0" />
          {expanded && <span className="text-sm md:text-base">Sair</span>}
        </button>
      </div>
    </>
  );
  
  // Mobile overlay
  const mobileOverlay = (
    <div 
      className={cn(
        "fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity",
        {
          "opacity-100": mobileOpen,
          "opacity-0 pointer-events-none": !mobileOpen,
        }
      )}
      onClick={toggleMobileSidebar}
    />
  );
  
  return (
    <>
      {/* Mobile overlay */}
      {mobileOverlay}
      
      {/* Mobile sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 w-[260px] bg-background border-r z-50 transition-transform duration-300 md:hidden flex flex-col",
          {
            "translate-x-0": mobileOpen,
            "-translate-x-full": !mobileOpen,
          }
        )}
      >
        {sidebarContent}
      </div>
      
      {/* Desktop sidebar */}
      <div 
        className={cn(
          "hidden md:flex flex-col h-screen border-r bg-background transition-all duration-300",
          {
            "w-64": expanded,
            "w-16": !expanded,
          }
        )}
      >
        {sidebarContent}
      </div>
    </>
  );
}