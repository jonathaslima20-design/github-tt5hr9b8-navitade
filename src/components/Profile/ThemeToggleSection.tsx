import { toast } from 'sonner';
import { Moon, Sun } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/lib/supabase';

interface User {
  id: string;
  theme?: string;
}

interface ThemeToggleSectionProps {
  user: User | null;
  isDarkTheme: boolean;
  setIsDarkTheme: (isDark: boolean) => void;
}

export function ThemeToggleSection({ user, isDarkTheme, setIsDarkTheme }: ThemeToggleSectionProps) {
  const handleThemeToggle = async (checked: boolean) => {
    try {
      setIsDarkTheme(checked);
      const theme = checked ? 'dark' : 'light';

      const { error } = await supabase
        .from('users')
        .update({ theme })
        .eq('id', user?.id);

      if (error) throw error;

      toast.success(`Tema ${checked ? 'escuro' : 'claro'} aplicado`);
    } catch (error: any) {
      console.error('Error updating theme:', error);
      toast.error('Erro ao atualizar tema');
      setIsDarkTheme(!checked);
    }
  };

  return (
    <div className="flex items-center justify-between">
      <div className="space-y-0.5">
        <Label>Tema da Vitrine</Label>
        <p className="text-sm text-muted-foreground">
          Escolha como seus clientes verão sua vitrine
        </p>
      </div>
      <div className="flex items-center space-x-2">
        <Sun className="h-4 w-4" />
        <Switch
          checked={isDarkTheme}
          onCheckedChange={handleThemeToggle}
        />
        <Moon className="h-4 w-4" />
      </div>
    </div>
  );
}
