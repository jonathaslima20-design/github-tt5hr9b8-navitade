import { useState, useEffect } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

interface CategorySelectorProps {
  value: string[];
  onChange: (categories: string[]) => void;
  userId?: string;
}

export function CategorySelector({ value = [], onChange, userId }: CategorySelectorProps) {
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        const allCategories = new Set<string>();

        // Fetch categories from user_product_categories table
        const { data: userCategories, error: categoriesError } = await supabase
          .from('user_product_categories')
          .select('name')
          .eq('user_id', userId);

        if (categoriesError) {
          console.error('Error fetching user categories:', categoriesError);
        } else {
          userCategories?.forEach((cat) => {
            if (cat.name && cat.name !== 'Sem Categoria') {
              allCategories.add(cat.name);
            }
          });
        }

        // Also fetch categories from existing products (for backwards compatibility)
        const { data: products, error: productsError } = await supabase
          .from('products')
          .select('category')
          .eq('user_id', userId);

        if (productsError) {
          console.error('Error fetching product categories:', productsError);
        } else {
          products?.forEach((product) => {
            if (Array.isArray(product.category)) {
              product.category.forEach((cat: string) => {
                if (cat && cat !== 'Sem Categoria') {
                  allCategories.add(cat);
                }
              });
            }
          });
        }

        setCategories(Array.from(allCategories).sort());
      } catch (error) {
        console.error('Error fetching categories:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, [userId]);

  const handleSelect = (category: string) => {
    if (value.includes(category)) {
      onChange(value.filter((c) => c !== category));
    } else {
      onChange([...value, category]);
    }
  };

  const handleRemove = (category: string) => {
    onChange(value.filter((c) => c !== category));
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            {value.length > 0
              ? `${value.length} categoria${value.length > 1 ? 's' : ''} selecionada${value.length > 1 ? 's' : ''}`
              : 'Selecione categorias...'}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0">
          <Command>
            <CommandInput placeholder="Buscar categoria..." />
            <CommandEmpty>
              {loading ? 'Carregando...' : 'Nenhuma categoria encontrada.'}
            </CommandEmpty>
            <CommandGroup className="max-h-64 overflow-auto">
              {categories.map((category) => (
                <CommandItem
                  key={category}
                  value={category}
                  onSelect={() => handleSelect(category)}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value.includes(category) ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {category}
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((category) => (
            <Badge
              key={category}
              variant="secondary"
              className="px-2 py-1"
            >
              {category}
              <button
                type="button"
                onClick={() => handleRemove(category)}
                className="ml-2 hover:text-destructive"
              >
                ×
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
