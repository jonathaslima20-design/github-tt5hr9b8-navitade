import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { CurrencyInput } from '@/components/ui/currency-input';
import { DiscountPriceInput } from '@/components/ui/discount-price-input';
import { CategorySelector } from '@/components/ui/category-selector';
import { GenderSelector } from '@/components/ui/gender-selector';
import { SizesColorsSelector } from '@/components/ui/sizes-colors-selector';
import { TieredPricingManager } from '@/components/ui/tiered-pricing-manager';
import { PricingModeToggle } from '@/components/ui/pricing-mode-toggle';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import type { PriceTier } from '@/types';
import { ProductImageManager } from '@/components/product/ProductImageManager';
import {
  uploadProductImages,
  saveProductImages,
  fetchProductImages,
  deleteProductImages,
  updateImageOrder,
  updateFeaturedImage,
  checkRemainingImagesCount,
} from '@/lib/productImageService';
import { PromotionalPhraseSelector } from '@/components/ui/promotional-phrase-selector';

const productSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().min(1, 'Descrição é obrigatória'),
  short_description: z.string().optional(),
  price: z.number().min(0, 'Preço deve ser maior ou igual a zero'),
  is_starting_price: z.boolean().default(false),
  featured_offer_price: z.number().optional(),
  featured_offer_installment: z.number().optional(),
  featured_offer_description: z.string().optional(),
  status: z.enum(['disponivel', 'vendido', 'reservado']).default('disponivel'),
  category: z.array(z.string()).default([]),
  brand: z.string().optional(),
  model: z.string().optional(),
  condition: z.enum(['novo', 'usado', 'seminovo']).default('novo'),
  external_checkout_url: z.string().optional(),
  is_visible_on_storefront: z.boolean().default(true),
  colors: z.array(z.string()).default([]),
  sizes: z.array(z.string()).default([]),
  has_tiered_pricing: z.boolean().default(false),
});

type ProductFormData = z.infer<typeof productSchema>;

type ProductImage = {
  id: string;
  url: string;
  is_featured: boolean;
};

type MediaItem = {
  id: string;
  url: string;
  file?: File;
  isFeatured: boolean;
  mediaType: 'image';
  fileHash?: string;
  visualFingerprint?: string;
  blobUrl?: string;
};

export default function EditProductPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [pricingMode, setPricingMode] = useState<'simple' | 'tiered'>('simple');
  const [priceTiers, setPriceTiers] = useState<PriceTier[]>([]);
  const [isPriceTiersValid, setIsPriceTiersValid] = useState(true);
  const [isSizesColorsOpen, setIsSizesColorsOpen] = useState(false);
  const [images, setImages] = useState<MediaItem[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [initialImages, setInitialImages] = useState<MediaItem[]>([]);

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      title: '',
      description: '',
      short_description: '',
      price: 0,
      is_starting_price: false,
      featured_offer_price: undefined,
      featured_offer_installment: undefined,
      featured_offer_description: '',
      status: 'disponivel',
      category: [],
      brand: '',
      model: '',
      condition: 'novo',
      external_checkout_url: '',
      is_visible_on_storefront: true,
      colors: [],
      sizes: [],
      has_tiered_pricing: false,
    },
  });

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id || !user?.id) return;

      try {
        const { data: product, error: productError } = await supabase
          .from('products')
          .select('*')
          .eq('id', id)
          .eq('user_id', user.id)
          .maybeSingle();

        if (productError) throw productError;
        if (!product) {
          toast.error('Produto não encontrado');
          navigate('/dashboard/listings');
          return;
        }

        form.reset({
          title: product.title,
          description: product.description,
          short_description: product.short_description || '',
          price: product.price || 0,
          is_starting_price: product.is_starting_price || false,
          featured_offer_price: product.discounted_price ?? undefined,
          featured_offer_installment: product.featured_offer_installment ?? undefined,
          featured_offer_description: product.featured_offer_description || '',
          status: product.status,
          category: product.category || [],
          brand: product.brand || '',
          model: product.model || '',
          condition: product.condition,
          external_checkout_url: product.external_checkout_url || '',
          is_visible_on_storefront: product.is_visible_on_storefront,
          colors: product.colors || [],
          sizes: product.sizes || [],
          has_tiered_pricing: product.has_tiered_pricing || false,
        });

        setPricingMode(product.has_tiered_pricing ? 'tiered' : 'simple');

        if (product.has_tiered_pricing) {
          const { data: tiers, error: tiersError } = await supabase
            .from('product_price_tiers')
            .select('*')
            .eq('product_id', id)
            .order('min_quantity');

          if (tiersError) throw tiersError;
          if (tiers) {
            setPriceTiers(tiers.map(tier => ({
              id: tier.id,
              min_quantity: tier.min_quantity,
              max_quantity: tier.max_quantity,
              unit_price: parseFloat(tier.unit_price),
              discounted_unit_price: tier.discounted_unit_price ? parseFloat(tier.discounted_unit_price) : null,
            })));
          }
        }

        const existingImages = await fetchProductImages(id);
        const mediaItems: MediaItem[] = existingImages.map((img) => ({
          id: img.id,
          url: img.url,
          isFeatured: img.is_featured,
          mediaType: 'image',
        }));
        setImages(mediaItems);
        setInitialImages(mediaItems);
      } catch (error) {
        console.error('Error fetching product:', error);
        toast.error('Erro ao carregar produto');
      } finally {
        setFetching(false);
      }
    };

    fetchProduct();
  }, [id, user?.id, navigate, form]);

  const onSubmit = async (data: ProductFormData) => {
    console.log('onSubmit called with data:', data);
    if (!user?.id || !id) {
      console.error('Missing user ID or product ID');
      return;
    }

    if (images.length === 0) {
      toast.error('Adicione pelo menos uma imagem do produto');
      return;
    }

    const removedImages = initialImages.filter(
      (initial) => !images.find((img) => img.id === initial.id)
    );

    if (removedImages.length > 0 && images.length === 0) {
      toast.error('Você deve manter pelo menos uma imagem no produto');
      return;
    }

    if (pricingMode === 'tiered' && priceTiers.length === 0) {
      toast.error('Adicione pelo menos um nível de preço');
      return;
    }

    if (pricingMode === 'tiered' && !isPriceTiersValid) {
      toast.error('Por favor, corrija os erros nos níveis de preço antes de salvar');
      return;
    }

    setLoading(true);
    try {
      const productData = {
        title: data.title,
        description: data.description,
        short_description: data.short_description || '',
        price: pricingMode === 'simple' ? data.price : 0,
        discounted_price: data.featured_offer_price || null,
        is_starting_price: data.is_starting_price,
        featured_offer_price: data.featured_offer_price || null,
        featured_offer_installment: data.featured_offer_installment || null,
        featured_offer_description: data.featured_offer_description || '',
        status: data.status,
        category: data.category.length > 0 ? data.category : ['Sem Categoria'],
        brand: data.brand || '',
        model: data.model || '',
        condition: data.condition,
        featured_image_url: '',
        external_checkout_url: data.external_checkout_url || '',
        is_visible_on_storefront: data.is_visible_on_storefront,
        colors: data.colors,
        sizes: data.sizes,
        has_tiered_pricing: pricingMode === 'tiered',
      };

      const { error: productError } = await supabase
        .from('products')
        .update(productData)
        .eq('id', id)
        .eq('user_id', user.id);

      if (productError) throw productError;

      const removedImages = initialImages.filter(
        (initial) => !images.find((img) => img.id === initial.id)
      );
      const newImages = images.filter((img) => img.file);
      const reorderedImages = images.filter((img) => !img.file);

      if (removedImages.length > 0) {
        const removedIds = removedImages.map((img) => img.id);
        await deleteProductImages(removedIds, user.id);
      }

      if (newImages.length > 0) {
        setUploadingImages(true);
        const filesToUpload = newImages.map((img) => img.file as File);
        const uploadedImages = await uploadProductImages(
          filesToUpload,
          user.id,
          id
        );

        if (uploadedImages.length > 0) {
          const featuredImage = uploadedImages.find((img) => img.is_featured);
          if (featuredImage) {
            await updateFeaturedImage(id, featuredImage.url);
          }

          await saveProductImages(id, uploadedImages, user.id);
        }
        setUploadingImages(false);
      }

      if (reorderedImages.length > 0) {
        const allCurrentImages = [...reorderedImages, ...newImages];
        await updateImageOrder(id, allCurrentImages);
      }

      const featuredImage = images.find((img) => img.isFeatured);
      if (featuredImage && !featuredImage.file) {
        await updateFeaturedImage(id, featuredImage.url);
      }

      if (pricingMode === 'tiered') {
        const { error: deleteOldTiersError } = await supabase
          .from('product_price_tiers')
          .delete()
          .eq('product_id', id);

        if (deleteOldTiersError) throw deleteOldTiersError;

        if (priceTiers.length > 0) {
          const sortedTiers = [...priceTiers].sort((a, b) => a.min_quantity - b.min_quantity);

          const tierRecords = sortedTiers.map((tier, index, array) => {
            const isLastTier = index === array.length - 1;
            const nextTier = !isLastTier ? array[index + 1] : null;

            const maxQuantity = isLastTier
              ? null
              : nextTier
                ? nextTier.min_quantity - 1
                : null;

            return {
              product_id: id,
              min_quantity: tier.min_quantity,
              max_quantity: maxQuantity,
              unit_price: tier.unit_price,
              discounted_unit_price: tier.discounted_unit_price,
            };
          });

          const { error: tiersError } = await supabase
            .from('product_price_tiers')
            .insert(tierRecords);

          if (tiersError) throw tiersError;
        }
      } else {
        const { error: deleteAllTiersError } = await supabase
          .from('product_price_tiers')
          .delete()
          .eq('product_id', id);

        if (deleteAllTiersError) throw deleteAllTiersError;
      }

      toast.success('Produto atualizado com sucesso!');
      navigate('/dashboard/listings');
    } catch (error) {
      console.error('Error updating product:', error);
      toast.error('Erro ao atualizar produto');
    } finally {
      setLoading(false);
      setUploadingImages(false);
    }
  };

  if (fetching) {
    return (
      <div className="container mx-auto p-6 max-w-5xl">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-5xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Editar Produto</h1>
          <p className="text-muted-foreground">Atualize as informações do produto</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={(e) => {
          console.log('Form submit event triggered');
          console.log('Current form values:', form.getValues());
          console.log('Form errors:', form.formState.errors);
          form.handleSubmit(onSubmit, (errors) => {
            console.error('Form validation errors:', errors);
            toast.error('Por favor, corrija os erros no formulário');
          })(e);
        }} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informações Básicas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Produto *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Tênis Nike Air Max 90" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria</FormLabel>
                    <FormControl>
                      <CategorySelector
                        value={field.value}
                        onChange={field.onChange}
                        userId={user?.id}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="brand"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Marca</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Nike" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="model"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gênero</FormLabel>
                      <FormControl>
                        <GenderSelector
                          value={field.value || ''}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Collapsible open={isSizesColorsOpen} onOpenChange={setIsSizesColorsOpen}>
            <Card>
              <CollapsibleTrigger className="w-full">
                <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <CardTitle>Tamanhos e Cores</CardTitle>
                    <ChevronDown className={`h-5 w-5 transition-transform duration-200 ${isSizesColorsOpen ? 'transform rotate-180' : ''}`} />
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent>
                  <SizesColorsSelector
                    colors={form.watch('colors')}
                    onColorsChange={(colors) => form.setValue('colors', colors)}
                    sizes={form.watch('sizes')}
                    onSizesChange={(sizes) => form.setValue('sizes', sizes)}
                    userId={user?.id}
                  />
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          <Card>
            <CardHeader>
              <CardTitle>Preços</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <PricingModeToggle
                isTieredPricing={pricingMode === 'tiered'}
                onModeChange={(useTieredPricing) => {
                  setPricingMode(useTieredPricing ? 'tiered' : 'simple');
                  form.setValue('has_tiered_pricing', useTieredPricing);
                }}
                hasSinglePriceData={form.watch('price') > 0}
                hasTieredPriceData={priceTiers.length > 0}
              />

              {pricingMode === 'simple' ? (
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Preço original do produto *</FormLabel>
                        <FormControl>
                          <CurrencyInput
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="R$ 0,00"
                          />
                        </FormControl>
                        <FormDescription>
                          Preço de venda do produto
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="featured_offer_price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Preço promocional (deve ser menor que o preço original)</FormLabel>
                        <FormControl>
                          <DiscountPriceInput
                            value={field.value}
                            onChange={field.onChange}
                            originalPrice={form.watch('price')}
                            placeholder="R$ 0,00"
                          />
                        </FormControl>
                        <FormDescription className="text-muted-foreground">
                          Preço promocional opcional. Se preenchido, será exibido como oferta especial.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="is_starting_price"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Preço inicial</FormLabel>
                          <FormDescription>
                            Marque esta opção se o preço informado é um valor inicial ("A partir de")
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
              ) : (
                <TieredPricingManager
                  tiers={priceTiers}
                  onChange={setPriceTiers}
                  onValidationChange={setIsPriceTiersValid}
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Frase Promocional e Descrição</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="short_description"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <PromotionalPhraseSelector
                        value={field.value || ''}
                        onChange={field.onChange}
                        userId={user?.id}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição Completa *</FormLabel>
                    <FormControl>
                      <RichTextEditor
                        content={field.value}
                        onChange={field.onChange}
                        placeholder="Descreva seu produto em detalhes..."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Imagens do Produto</CardTitle>
            </CardHeader>
            <CardContent>
              <ProductImageManager
                images={images}
                onChange={setImages}
                maxImages={user?.max_images_per_product || 10}
                maxFileSize={5}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Configurações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="external_checkout_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Link Externo de Compra</FormLabel>
                    <FormControl>
                      <Input placeholder="https://..." {...field} />
                    </FormControl>
                    <FormDescription>
                      Se preenchido, o botão de compra redirecionará para este link externo
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="is_visible_on_storefront"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Visível na Vitrine</FormLabel>
                      <FormDescription>
                        Mostrar este produto na sua vitrine pública
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
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={loading || uploadingImages}
              onClick={(e) => {
                console.log('Button clicked', { loading, formValid: form.formState.isValid });
              }}
            >
              {loading || uploadingImages ? 'Salvando e atualizando imagens...' : 'Salvar Alterações'}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>
              Cancelar
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
