import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { Loader as Loader2, ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@radix-ui/react-collapsible';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { cleanWhatsAppNumber, formatWhatsAppForDisplay } from '@/lib/utils';
import { getErrorMessage } from '@/lib/errorMessages';

// Import refactored components
import { AvatarSection } from '@/components/Profile/AvatarSection';
import { CoverImageSection } from '@/components/Profile/CoverImageSection';
import { BasicInfoForm } from '@/components/Profile/BasicInfoForm';
import { PasswordChangeDialog } from '@/components/Profile/PasswordChangeDialog';
import { ThemeToggleSection } from '@/components/Profile/ThemeToggleSection';
import { PromotionalBannerSection } from '@/components/Profile/PromotionalBannerSection';

const formSchema = z.object({
  name: z.string().min(2, 'Nome muito curto'),
  email: z.string().email('Email inválido'),
  language: z.enum(['pt-BR', 'en-US', 'es-ES']),
  currency: z.enum(['BRL', 'USD', 'EUR', 'GBP']),
  country_code: z.string().default('55'),
  phone: z.string().optional(),
  bio: z.string().optional(),
  whatsapp: z.string().optional(),
  instagram: z.string().optional(),
  location_url: z.string().url('URL inválida').optional().or(z.literal('')),
  slug: z.string().min(2, 'Link muito curto').max(50, 'Link muito longo')
    .regex(/^[a-z0-9-]+$/, 'Use apenas letras minúsculas, números e hífens'),
});

export function ProfileSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewCover, setPreviewCover] = useState<{ desktop: string | null; mobile: string | null }>({
    desktop: null,
    mobile: null
  });
  const [previewBanner, setPreviewBanner] = useState<{ desktop: string | null; mobile: string | null }>({
    desktop: null,
    mobile: null
  });
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [coverImagesOpen, setCoverImagesOpen] = useState(false);
  const [promotionalBannerOpen, setPromotionalBannerOpen] = useState(false);
  const { user, updateUser } = useAuth();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      language: 'pt-BR',
      currency: 'BRL',
      country_code: '55',
      phone: '',
      bio: '',
      whatsapp: '',
      instagram: '',
      location_url: '',
      slug: '',
    },
  });

  useEffect(() => {
    if (user) {
      setPreviewImage(user.avatar_url || null);
      setPreviewCover({
        desktop: user.cover_url_desktop || null,
        mobile: user.cover_url_mobile || null
      });
      setPreviewBanner({
        desktop: user.promotional_banner_url_desktop || null,
        mobile: user.promotional_banner_url_mobile || null
      });
      setIsDarkTheme(user.theme === 'dark');
      
      // Reset form with properly formatted values
      form.reset({
        name: user.name || '',
        email: user.email || '',
        language: user.language || 'pt-BR',
        currency: user.currency || 'BRL',
        country_code: user.country_code || '55',
        phone: user.phone ? user.phone.replace(/\D/g, '') : '', // Store only digits for editing
        bio: user.bio || '',
        whatsapp: user.whatsapp ? user.whatsapp.replace(/\D/g, '') : '', // Store only digits for editing
        instagram: user.instagram || '',
        location_url: user.location_url || '',
        slug: user.slug || '',
      });
      
      setLoading(false);
    }
  }, [user, form]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    form.setValue('name', name);
    
    if (!form.getValues('slug')) {
      const slug = name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      form.setValue('slug', slug);
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setSaving(true);

      // Check if email has changed
      const emailChanged = values.email !== user?.email;

      // Format phone number for storage (display format)
      let formattedPhone = null;
      if (values.phone) {
        const numbers = values.phone.replace(/\D/g, '');
        if (numbers.length === 11) {
          formattedPhone = `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
        } else if (numbers.length === 10) {
          formattedPhone = `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
        } else if (numbers.length > 0) {
          formattedPhone = numbers; // Store as digits if doesn't match pattern
        }
      }

      // Clean and validate WhatsApp number
      let cleanedWhatsApp = null;
      if (values.whatsapp) {
        // Store WhatsApp number as clean digits without automatic 9 addition
        cleanedWhatsApp = values.whatsapp.replace(/\D/g, '');
        console.log('WhatsApp processing:', {
          input: values.whatsapp,
          cleaned: cleanedWhatsApp
        });
      }

      // Format Instagram handle
      let formattedInstagram = null;
      if (values.instagram) {
        formattedInstagram = values.instagram.replace(/^@/, '');
      }

      // Check if slug is unique
      if (values.slug !== user?.slug) {
        const { data: existingUser, error: checkError } = await supabase
          .from('users')
          .select('id')
          .eq('slug', values.slug)
          .maybeSingle();

        if (checkError) {
          throw checkError;
        }

        if (existingUser) {
          throw new Error('Este link já está sendo usado por outro usuário');
        }
      }

      // Check if new email is already in use (only if email changed)
      if (emailChanged) {
        const { data: existingEmailUser, error: emailCheckError } = await supabase
          .from('users')
          .select('id')
          .eq('email', values.email)
          .neq('id', user?.id)
          .maybeSingle();

        if (emailCheckError && emailCheckError.code !== 'PGRST116') {
          throw emailCheckError;
        }

        if (existingEmailUser) {
          throw new Error('Este email já está sendo usado por outro usuário');
        }
      }
      const updateData = {
        name: values.name,
        email: values.email,
        language: values.language,
        currency: values.currency,
        country_code: values.country_code,
        phone: formattedPhone,
        bio: values.bio,
        whatsapp: cleanedWhatsApp,
        instagram: formattedInstagram,
        location_url: values.location_url || null,
        slug: values.slug,
      };

      console.log('Updating user with data:', updateData);

      // If email changed, update in Supabase Auth first
      if (emailChanged) {
        try {
          // Update email in Supabase Auth - this will send a confirmation email
          const { error: authError } = await supabase.auth.updateUser({
            email: values.email,
            options: {
              emailRedirectTo: `${window.location.origin}/dashboard/settings`
            }
          });

          if (authError) {
            // Handle specific auth errors
            throw new Error(getErrorMessage(authError));
          }

          console.log('Email update initiated in Supabase Auth');
        } catch (authError: any) {
          console.error('Auth update error:', authError);
          throw authError; // Re-throw the error to be handled by the outer catch
        }
      }

      // Always update the database with the new email
      // The auth system will handle the confirmation process
      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', user?.id);

      if (error) throw error;

      // Update user in context and local storage
      await updateUser(updateData);

      if (emailChanged) {
        toast.success('Perfil atualizado com sucesso! Um email de confirmação foi enviado para o novo endereço. Clique no link do email para confirmar a alteração. Até lá, continue usando o email atual para fazer login.');
      } else {
        toast.success('Perfil atualizado com sucesso');
      }
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error(error.message || 'Erro ao atualizar perfil');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Avatar Section */}
          <div className="flex flex-col items-center space-y-4 py-6">
            <AvatarSection
              user={user}
              previewImage={previewImage}
              setPreviewImage={setPreviewImage}
            />
          </div>

          <Separator />

          {/* Cover Images Section */}
          <Collapsible open={coverImagesOpen} onOpenChange={setCoverImagesOpen}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-between h-auto py-4 px-4 hover:bg-muted/50 rounded-lg border border-input"
                type="button"
              >
                <span className="font-medium">Imagens de Capa</span>
                <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${coverImagesOpen ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4">
              <CoverImageSection
                user={user}
                previewCover={previewCover}
                setPreviewCover={setPreviewCover}
              />
            </CollapsibleContent>
          </Collapsible>

          <Separator />

          {/* Promotional Banner Section */}
          <Collapsible open={promotionalBannerOpen} onOpenChange={setPromotionalBannerOpen}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-between h-auto py-4 px-4 hover:bg-muted/50 rounded-lg border border-input"
                type="button"
              >
                <span className="font-medium">Banner Promocional</span>
                <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${promotionalBannerOpen ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4">
              <PromotionalBannerSection
                user={user}
                previewBanner={previewBanner}
                setPreviewBanner={setPreviewBanner}
              />
            </CollapsibleContent>
          </Collapsible>

          <Separator />

          {/* Basic Information - Grid Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      onChange={handleNameChange}
                      placeholder="Nome do negócio"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input {...field} type="email" placeholder="seu@email.com" />
                  </FormControl>
                  <p className="text-xs text-muted-foreground mt-2">
                    Ao alterar o email, você receberá um link de confirmação no novo endereço. O login continuará funcionando com o email atual até que você confirme o novo email.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="language"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Idioma</FormLabel>
                  <FormControl>
                    <Input {...field} disabled placeholder="Português (Brasil)" />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Idioma da sua vitrine pública
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="currency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Moeda</FormLabel>
                  <FormControl>
                    <Input {...field} disabled placeholder="BRL - Real Brasileiro" />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Moeda para exibição de preços na vitrine
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefone</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="(00) 0000-0000"
                      maxLength={15}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="whatsapp"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>WhatsApp</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="(00) 0000-0000"
                      maxLength={15}
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Aceita números fixos (10 dígitos) e móveis (11 dígitos)
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="instagram"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Instagram</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="@seuinstagram"
                      maxLength={50}
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Digite apenas o nome de usuário, sem o '@' ou o link completo
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="location_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Link de Localização</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="https://maps.app.goo.gl/FtpwtPbZFrrsR5kQL8"
                      type="url"
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Link do Google Maps ou outro serviço de localização
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <Separator />

          {/* Link da Vitrine */}
          <FormField
            control={form.control}
            name="slug"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Link da Vitrine</FormLabel>
                <div className="flex gap-2">
                  <div className="flex-shrink-0 flex items-center px-3 rounded-md border border-input bg-muted text-muted-foreground text-sm">
                    vitrineturbo.com/
                  </div>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="kingstore"
                      className="flex-1"
                    />
                  </FormControl>
                </div>
                <p className="text-xs text-muted-foreground">
                  URL amigável para sua vitrine pública
                </p>
                <FormMessage />
              </FormItem>
            )}
          />

          <Separator />

          {/* Biografia */}
          <FormField
            control={form.control}
            name="bio"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Biografia</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="Bio ou descrição do seu negócio"
                    maxLength={200}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Separator />

          {/* Theme Toggle */}
          <ThemeToggleSection
            user={user}
            isDarkTheme={isDarkTheme}
            setIsDarkTheme={setIsDarkTheme}
          />

          <div className="flex flex-col sm:flex-row sm:justify-end gap-3 sm:gap-4 pt-6">
            <PasswordChangeDialog
              user={user}
              open={showPasswordDialog}
              onOpenChange={setShowPasswordDialog}
            />

            <Button
              type="submit"
              disabled={saving}
              size="lg"
              className="w-full sm:w-auto"
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Alterações
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}