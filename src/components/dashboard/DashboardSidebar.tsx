import { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package,
  LogOut, 
  ChevronLeft, 
  ChevronRight,
  Menu,
  X,
  LineChart,
  Settings,
  FolderTree,
  Gift,
  HelpCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { cn, getInitials } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import Logo from '@/components/Logo';
import SubscriptionModal from '@/components/subscription/SubscriptionModal';
import PlanStatusBadge from '@/components/subscription/PlanStatusBadge';

export default function DashboardSidebar() {
  const [expanded, setExpanded] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const { signOut, user } = useAuth();
  
  // Navigation items
  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Categorias', href: '/dashboard/categories', icon: FolderTree },
    { name: 'Produtos', href: '/dashboard/listings', icon: Package },
    { name: 'Indique e Ganhe', href: '/dashboard/referral', icon: Gift },
    { name: 'Configurações', href: '/dashboard/settings', icon: Settings },
    { name: 'Central de Ajuda', href: '/help', icon: HelpCircle },
  ];
  
  const toggleSidebar = () => {
    setExpanded(!expanded);
  };
  
  const toggleMobileSidebar = () => {
    setMobileOpen(!mobileOpen);
  };
  
  // Classes for navigation links
  const navItemClasses = ({ isActive }: { isActive: boolean }) => {
    return cn(
      "flex items-center space-x-3 py-2 px-3 rounded-md transition-colors",
      {
        "bg-primary/10 text-primary": isActive,
        "hover:bg-muted text-muted-foreground hover:text-foreground": !isActive,
      }
    );
  };

  return (
    <>
      {/* Mobile trigger */}
      <Button 
        variant="outline" 
        size="icon" 
        className="fixed top-3 left-4 z-50 md:hidden"
        onClick={toggleMobileSidebar}
      >
        <Menu className="h-5 w-5" />
      </Button>
      
      {/* Mobile overlay */}
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
      
      {/* Mobile sidebar */}
      <div 
        className={cn(
          "fixed inset-y-0 left-0 w-64 bg-background border-r z-50 transition-transform duration-300 md:hidden flex flex-col",
          {
            "translate-x-0": mobileOpen,
            "-translate-x-full": !mobileOpen,
          }
        )}
      >
        <div className="flex items-center justify-between p-4 flex-shrink-0">
          <NavLink to="/" className="flex items-center space-x-2">
            <Logo size="md" showText={false} />
          </NavLink>
          
          {/* Mobile close button */}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleMobileSidebar}
            className="md:hidden"
          >
            <X className="h-5 w-5" />
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
          <nav className="space-y-1 flex flex-col">
            {navigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                className={navItemClasses}
              >
                <item.icon className="h-5 w-5" />
                {expanded && <span>{item.name}</span>}
              </NavLink>
            ))}
          </nav>
        </div>
        
        <div className="mt-auto p-4">
          {/* User Profile Section - Single container */}
          <div 
            className="flex items-center gap-3 cursor-pointer hover:bg-muted/50 rounded-lg p-3 mb-4 transition-colors"
            onClick={() => setShowSubscriptionModal(true)}
          >
            <Avatar className="h-10 w-10">
              <AvatarImage src={user?.avatar_url} alt={user?.name} />
              <AvatarFallback className="text-sm">{getInitials(user?.name || '')}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{user?.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              <div className="mt-1">
                <PlanStatusBadge status={user?.plan_status} />
              </div>
            </div>
          </div>
          
          <Separator className="mb-4" />
          
          <Button
            variant="ghost"
            onClick={() => signOut()}
            className="w-full justify-start text-muted-foreground hover:text-destructive transition-colors"
          >
            <LogOut className="h-5 w-5" />
            <span className="ml-3">Sair</span>
          </Button>
        </div>
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
        <div className="flex items-center justify-between p-4">
          <NavLink to="/" className="flex items-center space-x-2">
            <Logo size="md" showText={false} />
          </NavLink>
          
          {/* Mobile close button */}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleMobileSidebar}
            className="md:hidden"
          >
            <X className="h-5 w-5" />
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
        
        <div className="px-2 py-2 flex-1">
          <nav className="space-y-1 flex flex-col">
            {navigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                className={navItemClasses}
              >
                <item.icon className="h-5 w-5" />
                {expanded && <span>{item.name}</span>}
              </NavLink>
            ))}
          </nav>
        </div>
        
        <div className="mt-auto p-4 flex-shrink-0">
          {/* User Profile Section - Single container */}
          <div 
            className="flex items-center gap-3 cursor-pointer hover:bg-muted/50 rounded-lg p-3 mb-4 transition-colors"
            onClick={() => setShowSubscriptionModal(true)}
          >
            <Avatar className="h-10 w-10">
              <AvatarImage src={user?.avatar_url} alt={user?.name} />
              <AvatarFallback className="text-sm">{getInitials(user?.name || '')}</AvatarFallback>
            </Avatar>
            {expanded && (
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{user?.name}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                <div className="mt-1">
                  <PlanStatusBadge status={user?.plan_status} />
                </div>
              </div>
            )}
          </div>
          
          <Button
            variant="ghost"
            onClick={() => signOut()}
            className="w-full justify-start text-muted-foreground hover:text-destructive transition-colors"
          >
            <LogOut className="h-5 w-5" />
            {expanded && <span className="ml-3">Sair</span>}
          </Button>
        </div>
      </div>

      <SubscriptionModal 
        open={showSubscriptionModal} 
        onOpenChange={setShowSubscriptionModal} 
      />
    </>
  );
}