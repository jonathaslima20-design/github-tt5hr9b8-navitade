import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Save } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormDescription,
} from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { User } from '@/types';
import type { CategoryDisplaySetting } from '@/types';
import { normalizeCategoryNameForComparison } from '@/lib/categoryUtils';

const formSchema = z.object({
  filters: z.object({
    showFilters: z.boolean().default(true),
    showSearch: z.boolean().default(true),
    showPriceRange: z.boolean().default(true),
    showCategories: z.boolean().default(true),
    showBrands: z.boolean().default(true),
    showGender: z.boolean().default(true),
    showStatus: z.boolean().default(true),
    showCondition: z.boolean().default(true),
  }),
  priceRange: z.object({
    minPrice: z.number().min(0, 'Preço mínimo deve ser maior ou igual a 0'),
    maxPrice: z.number().min(1, 'Preço máximo deve ser maior que 0'),
  }).refine((data) => data.maxPrice > data.minPrice, {
    message: 'Preço máximo deve ser maior que o preço mínimo',
    path: ['maxPrice'],
  }),
});

interface StorefrontSettings {
  id: string;
  settings: {
    filters?: {
      showFilters?: boolean;
      showSearch?: boolean;
      showPriceRange?: boolean;
      showCategories?: boolean;
      showBrands?: boolean;
      showGender?: boolean;
      showStatus?: boolean;
      showCondition?: boolean;
    };
    priceRange?: {
      minPrice?: number;
      maxPrice?: number;
    };
    itemsPerPage?: number;
  };
}

export default function StorefrontFiltersManager() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [priceRange, setPriceRange] = useState<[number, number]>([10, 5000]);
  const { user } = useAuth();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      filters: {
        showFilters: true,
        showSearch: true,
        showPriceRange: true,
        showCategories: true,
        showBrands: true,
        showGender: true,
        showStatus: true,
        showCondition: true,
      },
      priceRange: {
        minPrice: 10,
        maxPrice: 5000,
      },
    },
  });

  useEffect(() => {
    if (user?.id) {
      loadSettings();
    }
  }, [user?.id]);

  const loadSettings = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('user_storefront_settings')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        // Handle both old flat structure and new nested structure
        const filters = data.settings.filters || {
          showFilters: data.settings.showFilters ?? true,
          showSearch: data.settings.showSearch ?? true,
          showPriceRange: data.settings.showPriceRange ?? true,
          showCategories: data.settings.showCategories ?? true,
          showBrands: data.settings.showBrands ?? true,
          showGender: data.settings.showGender ?? true,
          showStatus: data.settings.showStatus ?? true,
          showCondition: data.settings.showCondition ?? true,
        };

        const priceRangeSettings = data.settings.priceRange || {
          minPrice: 10,
          maxPrice: 5000,
        };

        form.reset({
          filters,
          priceRange: priceRangeSettings,
        });

        setPriceRange([priceRangeSettings.minPrice, priceRangeSettings.maxPrice]);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setSaving(true);

      // Get current settings to preserve other data
      const { data: currentSettings } = await supabase
        .from('user_storefront_settings')
        .select('settings')
        .eq('user_id', user?.id)
        .maybeSingle();

      // Ensure we always send a properly structured settings object
      const settingsData = {
        ...currentSettings?.settings,
        filters: values.filters || {
          showFilters: true,
          showSearch: true,
          showPriceRange: true,
          showCategories: true,
          showBrands: true,
          showGender: true,
          showStatus: true,
          showCondition: true,
        },
        priceRange: values.priceRange || {
          minPrice: 10,
          maxPrice: 5000,
        },
        // Keep existing itemsPerPage if it exists, otherwise default to 12
        itemsPerPage: currentSettings?.settings?.itemsPerPage || 12,
      };

      const { data: existingSettings } = await supabase
        .from('user_storefront_settings')
        .select('id')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (existingSettings) {
        const { error } = await supabase
          .from('user_storefront_settings')
          .update({
            settings: settingsData,
          })
          .eq('id', existingSettings.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_storefront_settings')
          .insert({
            user_id: user?.id,
            settings: settingsData,
          });

        if (error) throw error;
      }

      toast.success('Configurações salvas com sucesso');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const handlePriceRangeChange = (newRange: number[]) => {
    setPriceRange([newRange[0], newRange[1]]);
    form.setValue('priceRange.minPrice', newRange[0]);
    form.setValue('priceRange.maxPrice', newRange[1]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Filtros Gerais */}
          <FormField
            control={form.control}
            name="filters.showFilters"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">
                    Mostrar Filtros
                  </FormLabel>
                  <FormDescription>
                    Exibir barra de filtros na vitrine
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="filters.showSearch"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">
                    Busca por Texto
                  </FormLabel>
                  <FormDescription>
                    Permitir busca por texto livre
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="filters.showPriceRange"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">
                    Filtro de Preço
                  </FormLabel>
                  <FormDescription>
                    Permitir filtrar por faixa de preço
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="filters.showStatus"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">
                    Filtro de Status
                  </FormLabel>
                  <FormDescription>
                    Permitir filtrar por status (disponível, vendido, etc.)
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          {/* Filtros específicos para produtos */}
          <FormField
            control={form.control}
            name="filters.showCategories"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">
                    Filtro por Categoria
                  </FormLabel>
                  <FormDescription>
                    Permitir filtrar por categoria de produto
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="filters.showCondition"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">
                    Filtro de Condição
                  </FormLabel>
                  <FormDescription>
                    Permitir filtrar por condição (novo, usado, seminovo)
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="filters.showBrands"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">
                    Filtro por Marca
                  </FormLabel>
                  <FormDescription>
                    Permitir filtrar por marca do produto
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="filters.showGender"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">
                    Filtro de Gênero
                  </FormLabel>
                  <FormDescription>
                    Permitir filtrar por gênero (masculino, feminino, unissex)
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        {/* Configuração da Faixa de Preço */}
        <Card>
          <CardHeader>
            <CardTitle>Configuração da Faixa de Preço</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="priceRange.minPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preço Mínimo (R$)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="10.00"
                        {...field}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value) || 0;
                          field.onChange(value);
                          setPriceRange([value, priceRange[1]]);
                        }}
                      />
                    </FormControl>
                    <FormDescription>
                      Valor mínimo para o filtro de preço na vitrine
                    </FormDescription>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priceRange.maxPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preço Máximo (R$)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        step="0.01"
                        placeholder="5000.00"
                        {...field}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value) || 5000;
                          field.onChange(value);
                          setPriceRange([priceRange[0], value]);
                        }}
                      />
                    </FormControl>
                    <FormDescription>
                      Valor máximo para o filtro de preço na vitrine
                    </FormDescription>
                  </FormItem>
                )}
              />
            </div>

            {/* Preview do Slider */}
            <div className="space-y-4">
              <FormLabel>Preview da Faixa de Preço</FormLabel>
              <div className="px-2">
                <Slider
                  min={form.watch('priceRange.minPrice')}
                  max={form.watch('priceRange.maxPrice')}
                  step={10}
                  value={priceRange}
                  onValueChange={handlePriceRangeChange}
                  className="w-full"
                />
                <div className="flex justify-between mt-3 text-sm">
                  <div className="text-center">
                    <div className="font-medium text-primary">
                      {formatCurrency(priceRange[0], user?.currency || 'BRL', user?.language || 'pt-BR')}
                    </div>
                    <div className="text-xs text-muted-foreground">Mínimo</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-primary">
                      {formatCurrency(priceRange[1], user?.currency || 'BRL', user?.language || 'pt-BR')}
                    </div>
                    <div className="text-xs text-muted-foreground">Máximo</div>
                  </div>
                </div>
              </div>
              <FormDescription>
                Esta é uma prévia de como o filtro de preço aparecerá na sua vitrine
              </FormDescription>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Save className="h-4 w-4 mr-2" />
            Salvar Configurações
          </Button>
        </div>
      </form>
    </Form>
  );
}