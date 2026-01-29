import { useState, useEffect } from 'react';
import { Loader2, GripVertical, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { CategoryDisplaySetting } from '@/types';
import { normalizeCategoryNameForComparison } from '@/lib/categoryUtils';

export default function CategoryDisplaySettings() {
  const [categorySettings, setCategorySettings] = useState<CategoryDisplaySetting[]>([]);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (user?.id) {
      loadData();
    }
  }, [user?.id]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load available categories from products
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('category')
        .eq('user_id', user?.id)
        .eq('is_visible_on_storefront', true);

      if (productsError) throw productsError;

      // Extract unique categories
      const allCategories = new Set<string>();
      products?.forEach(product => {
        if (product.category && Array.isArray(product.category)) {
          product.category.forEach(cat => allCategories.add(cat));
        }
      });

      const categoriesList = Array.from(allCategories).sort();
      setAvailableCategories(categoriesList);

      // Load current settings
      const { data: settings, error: settingsError } = await supabase
        .from('user_storefront_settings')
        .select('settings')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (settingsError && settingsError.code !== 'PGRST116') throw settingsError;

      const currentSettings = settings?.settings?.categoryDisplaySettings || [];
      
      // Merge with available categories, ensuring all categories are represented
      const mergedSettings: CategoryDisplaySetting[] = [];
      
      // Add existing settings in their current order
      currentSettings.forEach((setting: CategoryDisplaySetting) => {
        if (categoriesList.includes(setting.category)) {
          mergedSettings.push(setting);
        }
      });

      // Add new categories not in settings
      categoriesList.forEach((category) => {
        if (!mergedSettings.find(s => s.category === category)) {
          mergedSettings.push({
            category,
            order: mergedSettings.length,
            enabled: true
          });
        }
      });

      // Ensure proper order values (0, 1, 2, 3...)
      mergedSettings.forEach((setting, index) => {
        setting.order = index;
      });

      // Sort by order to ensure correct display
      mergedSettings.sort((a, b) => a.order - b.order);

      console.log('Loaded category settings:', mergedSettings);
      setCategorySettings(mergedSettings);
      
      // DIAGNÓSTICO ESPECÍFICO PARA NIKE
      const nikeCategory = mergedSettings.find(setting => 
        setting.category.toLowerCase() === 'nike'
      );
      
      if (nikeCategory) {
        console.log('🏷️ NIKE CATEGORY CONFIG:', {
          category: nikeCategory.category,
          enabled: nikeCategory.enabled,
          order: nikeCategory.order,
          allCategories: mergedSettings.map(s => s.category)
        });
      } else {
        console.log('⚠️ NIKE CATEGORY NOT FOUND in settings', {
          availableCategories: categoriesList,
          settingsCategories: mergedSettings.map(s => s.category),
          searchTerm: 'nike'
        });
        
        // Auto-add Nike category if products exist but setting is missing
        const hasNikeProducts = categoriesList.some(cat => 
          normalizeCategoryNameForComparison(cat) === 'nike'
        );
        if (hasNikeProducts) {
          console.log('🔧 AUTO-ADDING Nike category to settings');
          mergedSettings.push({
            category: 'Nike',
            order: mergedSettings.length,
            enabled: true
          });
          setCategorySettings(mergedSettings);
        }
      }
    } catch (error) {
      console.error('Error loading category settings:', error);
      toast.error('Erro ao carregar configurações de categoria');
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const items = Array.from(categorySettings);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update order values sequentially
    const updatedItems = items.map((item, index) => ({
      ...item,
      order: index
    }));

    console.log('New order after drag:', updatedItems);
    setCategorySettings(updatedItems);
  };

  const updateCategorySetting = (index: number, updates: Partial<CategoryDisplaySetting>) => {
    setCategorySettings(prev => prev.map((setting, i) => 
      i === index ? { ...setting, ...updates } : setting
    ));
  };

  const saveSettings = async () => {
    try {
      setSaving(true);

      // Ensure order values are sequential and correct
      const orderedSettings = categorySettings.map((setting, index) => ({
        ...setting,
        order: index
      }));

      console.log('Saving category settings with order:', orderedSettings);

      // Get current settings
      const { data: currentSettings } = await supabase
        .from('user_storefront_settings')
        .select('settings')
        .eq('user_id', user?.id)
        .maybeSingle();

      const updatedSettings = {
        ...currentSettings?.settings,
        categoryDisplaySettings: orderedSettings
      };

      // Upsert settings
      const { error } = await supabase
        .from('user_storefront_settings')
        .upsert({
          user_id: user?.id,
          settings: updatedSettings
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      toast.success('Configurações de categoria salvas com sucesso');
    } catch (error) {
      console.error('Error saving category settings:', error);
      toast.error('Erro ao salvar configurações');
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

  if (availableCategories.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground mb-4">
            Nenhuma categoria encontrada nos seus produtos visíveis.
          </p>
          <p className="text-sm text-muted-foreground">
            Adicione categorias aos seus produtos para configurar a organização da vitrine.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold">Organização por Categorias</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Configure a ordem das categorias na sua vitrine
          </p>
        </div>
        <Button 
          onClick={saveSettings} 
          disabled={saving}
          className="w-full sm:w-auto"
        >
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar Configurações
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Configurações de Categoria</CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="categories">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                  {categorySettings.map((setting, index) => (
                    <Draggable key={setting.category} draggableId={setting.category} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`p-3 sm:p-4 border rounded-lg bg-background ${
                            snapshot.isDragging ? 'shadow-lg' : ''
                          }`}
                        >
                          {/* Mobile Layout */}
                          <div className="block sm:hidden space-y-3">
                            {/* Header with drag handle and order */}
                            <div className="flex items-center gap-3">
                              <div {...provided.dragHandleProps} className="cursor-grab">
                                <GripVertical className="h-5 w-5 text-muted-foreground" />
                              </div>
                              <div className="flex items-center justify-center w-8 h-8 bg-primary/10 text-primary rounded-full text-sm font-medium">
                                {index + 1}
                              </div>
                              <div className="flex-1">
                                <Badge variant="outline" className="text-sm">
                                  {setting.category}
                                </Badge>
                              </div>
                              <div className="flex items-center">
                                {setting.enabled ? (
                                  <Eye className="h-4 w-4 text-green-600" />
                                ) : (
                                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                                )}
                              </div>
                            </div>

                            {/* Controls */}
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-2">
                                <Label htmlFor={`enabled-mobile-${index}`} className="text-xs">
                                  Visível
                                </Label>
                                <div className="flex items-center justify-center h-10">
                                  <Switch
                                    id={`enabled-mobile-${index}`}
                                    checked={setting.enabled}
                                    onCheckedChange={(checked) => updateCategorySetting(index, {
                                      enabled: checked
                                    })}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Desktop Layout */}
                          <div className="hidden sm:flex items-center gap-4">
                            {/* Drag Handle */}
                            <div {...provided.dragHandleProps} className="cursor-grab">
                              <GripVertical className="h-5 w-5 text-muted-foreground" />
                            </div>

                            {/* Order Number */}
                            <div className="flex items-center justify-center w-8 h-8 bg-primary/10 text-primary rounded-full text-sm font-medium">
                              {index + 1}
                            </div>

                            {/* Category Name */}
                            <div className="flex-1">
                              <Badge variant="outline" className="text-sm">
                                {setting.category}
                              </Badge>
                            </div>

                            {/* Enable/Disable */}
                            <div className="flex items-center gap-2">
                              <Label htmlFor={`enabled-${index}`} className="text-sm">
                                {setting.enabled ? (
                                  <Eye className="h-4 w-4 text-green-600" />
                                ) : (
                                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                                )}
                              </Label>
                              <Switch
                                id={`enabled-${index}`}
                                checked={setting.enabled}
                                onCheckedChange={(checked) => updateCategorySetting(index, {
                                  enabled: checked
                                })}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </CardContent>
      </Card>

      <div className="text-sm text-muted-foreground space-y-2 px-1">
        <p>• Arraste as categorias para reordenar (a ordem será respeitada na vitrine)</p>
        <p>• Use o switch para mostrar/ocultar categorias na vitrine</p>
        <p>• Produtos sem categoria ou de categorias desabilitadas aparecerão no final</p>
        <p>• A numeração mostra a ordem atual das categorias</p>
      </div>
    </div>
  );
}