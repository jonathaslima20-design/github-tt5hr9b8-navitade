import { useState, useEffect } from 'react';
import { Plus, X, Loader2, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { sanitizeCategoryName, isValidCategoryName, logCategoryOperation, normalizeCategoryNameForComparison } from '@/lib/categoryUtils';

const formSchema = z.object({
  name: z.string()
    .min(1, 'Nome é obrigatório')
    .transform(val => sanitizeCategoryName(val))
    .refine(val => isValidCategoryName(val), {
      message: 'Nome deve ter entre 2 e 50 caracteres e não pode conter apenas espaços'
    }),
});

interface Category {
  id: string;
  name: string;
}

export default function ProductCategoriesManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const { user } = useAuth();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
    },
  });

  useEffect(() => {
    if (user?.id) {
      loadCategories();
    }
  }, [user?.id]);

  const loadCategories = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('user_product_categories')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error loading categories:', error);
      toast.error('Erro ao carregar categorias');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setSaving(true);

      // Additional validation and duplicate check
      const sanitizedName = sanitizeCategoryName(values.name);
      
      if (!isValidCategoryName(sanitizedName)) {
        toast.error('Nome de categoria inválido');
        return;
      }

      // Check for duplicates (case-insensitive, space-normalized)
      const isDuplicate = categories.some(cat => 
        normalizeCategoryNameForComparison(cat.name) === normalizeCategoryNameForComparison(sanitizedName)
      );

      if (isDuplicate) {
        toast.error('Esta categoria já existe');
        return;
      }

      logCategoryOperation('CREATING_CATEGORY', { name: sanitizedName, originalName: values.name });

      const { error } = await supabase
        .from('user_product_categories')
        .insert({
          name: sanitizedName,
          user_id: user?.id
        });

      if (error) throw error;

      toast.success('Categoria criada com sucesso');
      form.reset();
      loadCategories();
    } catch (error: any) {
      console.error('Error creating category:', error);
      
      // Handle specific database errors
      if (error.code === '23505') {
        toast.error('Esta categoria já existe');
      } else {
        toast.error(error.message || 'Erro ao criar categoria');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      setSaving(true);

      const { error } = await supabase
        .from('user_product_categories')
        .delete()
        .eq('id', id)
        .eq('user_id', user?.id);

      if (error) throw error;

      toast.success('Categoria excluída com sucesso');
      loadCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('Erro ao excluir categoria');
    } finally {
      setSaving(false);
    }
  };

  const handleEditCategory = async (id: string, name: string) => {
    try {
      setSaving(true);

      const sanitizedName = sanitizeCategoryName(name);
      
      if (!isValidCategoryName(sanitizedName)) {
        toast.error('Nome de categoria inválido');
        setEditingCategory(null);
        return;
      }

      // Check for duplicates (excluding current category)
      const isDuplicate = categories.some(cat => 
        cat.id !== id && 
        normalizeCategoryNameForComparison(cat.name) === normalizeCategoryNameForComparison(sanitizedName)
      );

      if (isDuplicate) {
        toast.error('Esta categoria já existe');
        setEditingCategory(null);
        return;
      }

      logCategoryOperation('UPDATING_CATEGORY', { 
        id, 
        newName: sanitizedName, 
        originalName: name 
      });

      const { error } = await supabase
        .from('user_product_categories')
        .update({ name: sanitizedName })
        .eq('id', id)
        .eq('user_id', user?.id);

      if (error) throw error;

      toast.success('Categoria atualizada com sucesso');
      setEditingCategory(null);
      loadCategories();
    } catch (error) {
      console.error('Error updating category:', error);
      
      // Handle specific database errors
      if (error.code === '23505') {
        toast.error('Esta categoria já existe');
      } else {
        toast.error('Erro ao atualizar categoria');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nova Categoria</FormLabel>
                <div className="flex gap-2">
                  <FormControl>
                    <Input placeholder="Nome da categoria" {...field} />
                  </FormControl>
                  <Button type="submit" disabled={saving}>
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Plus className="h-4 w-4 mr-2" />
                    )}
                    Adicionar
                  </Button>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </form>
      </Form>

      <Separator className="my-6" />

      <div className="space-y-2">
        {categories.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhuma categoria cadastrada
          </p>
        ) : (
          categories.map((category) => (
            <div
              key={category.id}
              className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50"
            >
              {editingCategory === category.id ? (
                <div className="flex-1 flex gap-2">
                  <Input
                    defaultValue={category.name}
                    placeholder="Nome da categoria"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const input = e.target as HTMLInputElement;
                        const sanitized = sanitizeCategoryName(input.value);
                        if (sanitized && isValidCategoryName(sanitized)) {
                          handleEditCategory(category.id, sanitized);
                        } else {
                          toast.error('Nome de categoria inválido');
                          setEditingCategory(null);
                        }
                      }
                      if (e.key === 'Escape') {
                        setEditingCategory(null);
                      }
                    }}
                    onBlur={(e) => {
                      const sanitized = sanitizeCategoryName(e.target.value);
                      if (sanitized && isValidCategoryName(sanitized)) {
                        handleEditCategory(category.id, sanitized);
                      } else {
                        setEditingCategory(null);
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingCategory(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <span className="text-sm">{category.name}</span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingCategory(category.id)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteCategory(category.id)}
                      disabled={saving}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}