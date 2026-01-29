import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { Info, Loader2 } from 'lucide-react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

const formSchema = z.object({
  meta_pixel_id: z.string()
    .regex(/^\d+$/, 'O ID do Pixel deve conter apenas números')
    .min(1, 'ID do Pixel é obrigatório')
    .optional()
    .or(z.literal('')),
  meta_events: z.string()
    .optional()
    .transform(val => val ? JSON.parse(val) : null)
    .refine(val => !val || typeof val === 'object', 'Formato JSON inválido')
    .or(z.literal('')),
  ga_measurement_id: z.string()
    .regex(/^(G|UA)-[A-Z0-9-]+$/, 'ID de medição inválido')
    .optional()
    .or(z.literal('')),
  ga_events: z.string()
    .optional()
    .transform(val => val ? JSON.parse(val) : null)
    .refine(val => !val || typeof val === 'object', 'Formato JSON inválido')
    .or(z.literal('')),
});

type FormValues = z.infer<typeof formSchema>;

export default function TrackingSettingsContent() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      meta_pixel_id: '',
      meta_events: '',
      ga_measurement_id: '',
      ga_events: '',
    },
  });

  useEffect(() => {
    if (user) {
      loadSettings();
    }
  }, [user]);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('tracking_settings')
        .select('*')
        .eq('user_id', user?.id)
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (data) {
        form.reset({
          meta_pixel_id: data.meta_pixel_id || '',
          meta_events: data.meta_events ? JSON.stringify(data.meta_events, null, 2) : '',
          ga_measurement_id: data.ga_measurement_id || '',
          ga_events: data.ga_events ? JSON.stringify(data.ga_events, null, 2) : '',
        });
      }
    } catch (error) {
      console.error('Error loading tracking settings:', error);
      toast.error('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (values: FormValues) => {
    try {
      setSaving(true);

      const { data: existingSettings } = await supabase
        .from('tracking_settings')
        .select('id')
        .eq('user_id', user?.id)
        .eq('is_active', true)
        .maybeSingle();

      if (existingSettings) {
        // Update existing settings
        const { error } = await supabase
          .from('tracking_settings')
          .update({
            meta_pixel_id: values.meta_pixel_id || null,
            meta_events: values.meta_events ? JSON.parse(values.meta_events) : null,
            ga_measurement_id: values.ga_measurement_id || null,
            ga_events: values.ga_events ? JSON.parse(values.ga_events) : null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingSettings.id);

        if (error) throw error;
      } else {
        // Create new settings
        const { error } = await supabase
          .from('tracking_settings')
          .insert({
            user_id: user?.id,
            meta_pixel_id: values.meta_pixel_id || null,
            meta_events: values.meta_events ? JSON.parse(values.meta_events) : null,
            ga_measurement_id: values.ga_measurement_id || null,
            ga_events: values.ga_events ? JSON.parse(values.ga_events) : null,
            is_active: true,
          });

        if (error) throw error;
      }

      toast.success('Configurações salvas com sucesso');
    } catch (error) {
      console.error('Error saving tracking settings:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const getEventPlaceholder = () => {
    switch (user?.niche_type) {
      case 'veiculos':
        return `{
  "ViewContent": {
    "content_type": "car",
    "content_ids": ["${'{carId}'}"]
  }
}`;
      case 'diversos':
        return `{
  "ViewContent": {
    "content_type": "product",
    "content_ids": ["${'{productId}'}"]
  }
}`;
      default:
        return `{
  "ViewContent": {
    "content_type": "property",
    "content_ids": ["${'{propertyId}'}"]
  }
}`;
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
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Meta Pixel Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Meta Pixel
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Encontre seu Pixel ID no Events Manager do Meta</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="meta_pixel_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ID do Pixel</FormLabel>
                    <FormControl>
                      <Input placeholder="123456789" {...field} />
                    </FormControl>
                    <FormDescription>
                      Digite apenas os números do ID do seu Meta Pixel
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="meta_events"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Eventos Personalizados</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={getEventPlaceholder()}
                        className="font-mono"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Configure eventos personalizados em formato JSON
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Google Analytics Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Google Analytics
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Use o ID de medição do GA4 (G-XXXXXX) ou UA</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="ga_measurement_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ID de Medição</FormLabel>
                    <FormControl>
                      <Input placeholder="G-XXXXXXXX" {...field} />
                    </FormControl>
                    <FormDescription>
                      Digite o ID de medição do Google Analytics (GA4 ou Universal Analytics)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ga_events"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Eventos Personalizados</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={`{
  "view_item": {
    "item_id": "${user?.niche_type === 'carros' ? '{carId}' : '{propertyId}'}",
    "item_type": "${user?.niche_type === 'carros' ? 'car' : 'property'}"
  }
}`}
                        className="font-mono"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Configure eventos personalizados em formato JSON
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {saving ? 'Salvando...' : 'Salvar Configurações'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}