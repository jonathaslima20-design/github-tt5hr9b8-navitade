import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { syncUserCategoriesWithStorefrontSettings } from '@/lib/utils';
import { db } from '@/lib/db';
import type { Product } from '@/types';
import { getCroppedImg } from '@/lib/image';

interface UseProductListManagementProps {
  userId?: string;
}

interface UseProductListManagementReturn {
  products: Product[];
  filteredProducts: Product[];
  loading: boolean;
  searchQuery: string;
  statusFilter: string;
  categoryFilter: string;
  availableCategories: string[];
  updatingProductId: string | null;
  reordering: boolean;
  isReorderModeActive: boolean;
  selectedProducts: Set<string>;
  bulkActionLoading: boolean;
  canReorder: boolean;
  allSelected: boolean;
  someSelected: boolean;
  setSearchQuery: (query: string) => void;
  setStatusFilter: (status: string) => void;
  setCategoryFilter: (category: string) => void;
  setIsReorderModeActive: (active: boolean) => void;
  setSelectedProducts: (products: Set<string>) => void;
  toggleProductVisibility: (productId: string, currentVisibility: boolean) => Promise<void>;
  handleSelectProduct: (productId: string, checked: boolean) => void;
  handleSelectAll: (checked: boolean) => void;
  handleBulkVisibilityToggle: (visible: boolean) => Promise<void>;
  handleBulkCategoryChange: (newCategories: string[]) => Promise<void>;
  handleBulkBrandChange: (newBrand: string) => Promise<void>;
  handleBulkDelete: () => Promise<void>;
  handleBulkImageCompression: () => Promise<void>;
  handleDragEnd: (result: any) => Promise<void>;
  refreshProducts: () => Promise<void>;
}

export function useProductListManagement({ userId }: UseProductListManagementProps): UseProductListManagementReturn {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [categoryFilter, setCategoryFilter] = useState('todas');
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [updatingProductId, setUpdatingProductId] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);
  const [isReorderModeActive, setIsReorderModeActive] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // Derived states
  const canReorder = categoryFilter !== 'todas' && filteredProducts.length > 1;
  const allSelected = filteredProducts.length > 0 && filteredProducts.every(p => selectedProducts.has(p.id));
  const someSelected = selectedProducts.size > 0;

  // Fetch products
  const fetchProducts = async () => {
    if (!userId) return;

    try {
      const { data, error } = await db.fetch(
        supabase
          .from('products')
          .select(`
            *,
            colors,
            sizes
          `)
          .eq('user_id', userId)
          .order('display_order', { ascending: true, nullsLast: true })
          .order('created_at', { ascending: false })
      );

      if (error) throw error;
      setProducts(data || []);

      // Extract unique categories
      const categories = new Set<string>();
      data?.forEach(product => {
        if (product.category && Array.isArray(product.category)) {
          product.category.forEach(cat => categories.add(cat));
        }
      });
      setAvailableCategories(Array.from(categories).sort());
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Erro ao carregar produtos. Tentando novamente...');
      
      // Retry after a delay
      setTimeout(() => fetchProducts(), 2000);
    } finally {
      setLoading(false);
    }
  };

  // Filter products based on current filters
  const filterProducts = () => {
    let filtered = [...products];

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(product =>
        product.title.toLowerCase().includes(query) ||
        product.description.toLowerCase().includes(query) ||
        (product.category && product.category.some(cat => 
          cat.toLowerCase().includes(query)
        )) ||
        (product.brand && product.brand.toLowerCase().includes(query))
      );
    }

    // Filter by status
    if (statusFilter !== 'todos') {
      if (statusFilter === 'visiveis') {
        filtered = filtered.filter(product => product.is_visible_on_storefront);
      } else if (statusFilter === 'ocultos') {
        filtered = filtered.filter(product => !product.is_visible_on_storefront);
      }
    }

    // Filter by category
    if (categoryFilter !== 'todas') {
      filtered = filtered.filter(product => 
        product.category && product.category.includes(categoryFilter)
      );
      
      // Sort by display_order when filtering by category
      filtered.sort((a, b) => {
        const orderA = a.display_order ?? 999999;
        const orderB = b.display_order ?? 999999;
        return orderA - orderB;
      });
    }

    setFilteredProducts(filtered);
  };

  // Toggle product visibility
  const toggleProductVisibility = async (productId: string, currentVisibility: boolean) => {
    try {
      setUpdatingProductId(productId);

      const { error } = await supabase
        .from('products')
        .update({ is_visible_on_storefront: !currentVisibility })
        .eq('id', productId)
        .eq('user_id', userId);

      if (error) throw error;

      // Update local state
      setProducts(prev => prev.map(product => 
        product.id === productId 
          ? { ...product, is_visible_on_storefront: !currentVisibility }
          : product
      ));

      toast.success(
        !currentVisibility 
          ? 'Produto ativado na vitrine' 
          : 'Produto removido da vitrine'
      );
    } catch (error) {
      console.error('Error updating product visibility:', error);
      toast.error('Erro ao atualizar visibilidade do produto');
    } finally {
      setUpdatingProductId(null);
    }
  };

  // Handle product selection
  const handleSelectProduct = (productId: string, checked: boolean) => {
    setSelectedProducts(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(productId);
      } else {
        newSet.delete(productId);
      }
      return newSet;
    });
  };

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedProducts(new Set(filteredProducts.map(p => p.id)));
    } else {
      setSelectedProducts(new Set());
    }
  };

  // Bulk visibility toggle
  const handleBulkVisibilityToggle = async (visible: boolean) => {
    try {
      setBulkActionLoading(true);
      const selectedIds = Array.from(selectedProducts);

      const { error } = await supabase
        .from('products')
        .update({ is_visible_on_storefront: visible })
        .in('id', selectedIds)
        .eq('user_id', userId);

      if (error) throw error;

      // Update local state
      setProducts(prev => prev.map(product => 
        selectedIds.includes(product.id) 
          ? { ...product, is_visible_on_storefront: visible }
          : product
      ));

      setSelectedProducts(new Set());
      
      // Force sync categories after bulk visibility change
      if (userId) {
        try {
          await syncUserCategoriesWithStorefrontSettings(userId);
        } catch (syncError) {
          console.warn('Category sync warning:', syncError);
        }
      }
      
      toast.success(`${selectedIds.length} produtos ${visible ? 'ativados' : 'ocultados'} na vitrine`);
    } catch (error) {
      console.error('Error updating bulk visibility:', error);
      toast.error('Erro ao atualizar visibilidade dos produtos');
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Bulk category change
  const handleBulkCategoryChange = async (newCategories: string[]) => {
    try {
      setBulkActionLoading(true);
      const selectedIds = Array.from(selectedProducts);

      const { error } = await supabase
        .from('products')
        .update({ category: newCategories })
        .in('id', selectedIds)
        .eq('user_id', userId);

      if (error) throw error;

      // Update local state
      setProducts(prev => prev.map(product => 
        selectedIds.includes(product.id) 
          ? { ...product, category: newCategories }
          : product
      ));

      setSelectedProducts(new Set());
      toast.success(`Categoria atualizada para ${selectedIds.length} produtos`);
    } catch (error) {
      console.error('Error updating bulk category:', error);
      toast.error('Erro ao atualizar categoria dos produtos');
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Bulk brand change
  const handleBulkBrandChange = async (newBrand: string) => {
    try {
      setBulkActionLoading(true);
      const selectedIds = Array.from(selectedProducts);

      const { error } = await supabase
        .from('products')
        .update({ brand: newBrand })
        .in('id', selectedIds)
        .eq('user_id', userId);

      if (error) throw error;

      // Update local state
      setProducts(prev => prev.map(product => 
        selectedIds.includes(product.id) 
          ? { ...product, brand: newBrand }
          : product
      ));

      setSelectedProducts(new Set());
      toast.success(`Marca atualizada para ${selectedIds.length} produtos`);
    } catch (error) {
      console.error('Error updating bulk brand:', error);
      toast.error('Erro ao atualizar marca dos produtos');
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Bulk delete
  const handleBulkDelete = async () => {
    try {
      setBulkActionLoading(true);
      const selectedIds = Array.from(selectedProducts);

      // Get products to delete (to remove images from storage)
      const productsToDelete = products.filter(p => selectedIds.includes(p.id));

      // Delete images from storage
      for (const product of productsToDelete) {
        const { data: images } = await supabase
          .from('product_images')
          .select('url')
          .eq('product_id', product.id);

        if (images) {
          for (const image of images) {
            const fileName = image.url.split('/').pop();
            if (fileName) {
              await supabase.storage
                .from('public')
                .remove([`products/${fileName}`]);
            }
          }
        }
      }

      // Delete products
      const { error } = await supabase
        .from('products')
        .delete()
        .in('id', selectedIds)
        .eq('user_id', userId);

      if (error) throw error;

      // Update local state
      setProducts(prev => prev.filter(product => !selectedIds.includes(product.id)));
      setSelectedProducts(new Set());
      
      toast.success(`${selectedIds.length} produtos excluídos com sucesso`);
    } catch (error) {
      console.error('Error deleting products:', error);
      toast.error('Erro ao excluir produtos');
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Bulk image compression
  const handleBulkImageCompression = async () => {
    try {
      setBulkActionLoading(true);
      const selectedIds = Array.from(selectedProducts);
      let compressedCount = 0;
      let errorCount = 0;

      toast.success(`Iniciando compressão de imagens para ${selectedIds.length} produtos...`);

      for (const productId of selectedIds) {
        try {
          // Get all images for this product
          const { data: productImages, error: imagesError } = await supabase
            .from('product_images')
            .select('*')
            .eq('product_id', productId);

          if (imagesError) {
            console.error(`Error fetching images for product ${productId}:`, imagesError);
            errorCount++;
            continue;
          }

          if (!productImages || productImages.length === 0) {
            continue;
          }

          // Process each image
          for (const image of productImages) {
            try {
              // Check current image size
              const response = await fetch(image.url);
              const blob = await response.blob();
              
              // If image is already under 400KB, skip compression
              if (blob.size <= 400 * 1024) {
                console.log(`Image ${image.id} already optimized (${(blob.size / 1024).toFixed(1)}KB)`);
                continue;
              }

              console.log(`Compressing image ${image.id} from ${(blob.size / 1024).toFixed(1)}KB`);

              // Create canvas from image
              const img = new Image();
              img.crossOrigin = 'anonymous';
              
              await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
                img.src = image.url;
              });

              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');
              
              if (!ctx) {
                throw new Error('Could not get canvas context');
              }

              // Set canvas dimensions to image dimensions
              canvas.width = img.width;
              canvas.height = img.height;

              // Draw image on canvas
              ctx.drawImage(img, 0, 0);

              // Use the existing optimization function
              const optimizedBlob = await optimizeImageSize(canvas, 400 * 1024);

              // Upload optimized image
              const fileName = `${productId}-optimized-${Date.now()}.jpg`;
              const filePath = `products/${fileName}`;

              const { error: uploadError } = await supabase.storage
                .from('public')
                .upload(filePath, optimizedBlob);

              if (uploadError) {
                throw uploadError;
              }

              const { data: { publicUrl } } = supabase.storage
                .from('public')
                .getPublicUrl(filePath);

              // Update image URL in database
              const { error: updateError } = await supabase
                .from('product_images')
                .update({ url: publicUrl })
                .eq('id', image.id);

              if (updateError) {
                throw updateError;
              }

              // If this is the featured image, update product's featured image URL
              if (image.is_featured) {
                const { error: productUpdateError } = await supabase
                  .from('products')
                  .update({ featured_image_url: publicUrl })
                  .eq('id', productId);

                if (productUpdateError) {
                  console.error('Error updating product featured image:', productUpdateError);
                }
              }

              // Delete old image from storage
              const oldFileName = image.url.split('/').pop();
              if (oldFileName) {
                await supabase.storage
                  .from('public')
                  .remove([`products/${oldFileName}`]);
              }

              compressedCount++;
              console.log(`✅ Image ${image.id} compressed successfully to ${(optimizedBlob.size / 1024).toFixed(1)}KB`);

            } catch (imageError) {
              console.error(`Error compressing image ${image.id}:`, imageError);
              errorCount++;
            }
          }

        } catch (productError) {
          console.error(`Error processing product ${productId}:`, productError);
          errorCount++;
        }
      }

      // Update local state to reflect changes
      await refreshProducts();
      setSelectedProducts(new Set());

      if (compressedCount > 0) {
        toast.success(`${compressedCount} imagens comprimidas com sucesso!`);
      }
      
      if (errorCount > 0) {
        toast.warning(`${errorCount} imagens não puderam ser comprimidas. Verifique o console para detalhes.`);
      }

      if (compressedCount === 0 && errorCount === 0) {
        toast.success('Todas as imagens já estão otimizadas (≤ 400KB)');
      }

    } catch (error) {
      console.error('Error in bulk image compression:', error);
      toast.error('Erro ao comprimir imagens');
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Helper function to optimize image size (extracted from image.ts logic)
  const optimizeImageSize = async (canvas: HTMLCanvasElement, maxSizeBytes: number): Promise<Blob> => {
    const MAX_QUALITY = 0.95;
    const MIN_QUALITY = 0.1;
    const QUALITY_STEP = 0.05;
    
    let quality = MAX_QUALITY;
    let blob: Blob | null = null;
    
    while (quality >= MIN_QUALITY) {
      blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(
          (result) => resolve(result),
          'image/jpeg',
          quality
        );
      });
      
      if (!blob) {
        throw new Error('Failed to create blob from canvas');
      }
      
      if (blob.size <= maxSizeBytes) {
        return blob;
      }
      
      quality -= QUALITY_STEP;
    }
    
    // If we couldn't get under the size limit, return the last blob
    if (blob) {
      return blob;
    }
    
    throw new Error('Failed to optimize image');
  };

  // Handle drag and drop reordering
  const handleDragEnd = async (result: any) => {
    if (!result.destination) {
      console.log('🚫 Drag cancelled - no destination');
      return;
    }

    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;

    if (sourceIndex === destinationIndex) {
      console.log('🚫 Drag cancelled - same position');
      return;
    }

    console.log('🧩 SLIDING PUZZLE REORDER:', {
      sourceIndex,
      destinationIndex,
      productId: result.draggableId,
      direction: sourceIndex < destinationIndex ? 'moving down' : 'moving up',
      filteredProductsCount: filteredProducts.length
    });

    try {
      setReordering(true);

      // Step 1: Create optimistic update for immediate UI feedback
      const reorderedFilteredProducts = Array.from(filteredProducts);
      // 🧩 SLIDING PUZZLE LOGIC: Reorder only within the filtered list
      // This creates a sliding puzzle effect where products shift to fill gaps
      
      // Step 1: Create the new order within filtered products (sliding puzzle effect)
      const reorderedFiltered = Array.from(filteredProducts);
      const [draggedProduct] = reorderedFiltered.splice(sourceIndex, 1);
      reorderedFiltered.splice(destinationIndex, 0, draggedProduct);
      
      // Step 2: Update display_order only for the filtered products
      // This maintains the sliding puzzle behavior within the current view
      const updatePromises = reorderedFiltered.map((product, index) => {
        const newDisplayOrder = index;
        console.log(`🧩 Updating ${product.title}: position ${index}`);
        
        return supabase
          .from('products')
          .update({ display_order: newDisplayOrder })
          .eq('id', product.id)
          .eq('user_id', userId);
      });

      // Step 3: Execute all updates in parallel
      const retryPromises = updatePromises.map(promise => 
        db.retry(() => promise)
      );
      const results = await Promise.allSettled(retryPromises);
      const failures = results.filter(result => result.status === 'rejected');
      
      if (failures.length > 0) {
        console.error('❌ Some sliding puzzle updates failed:', failures);
        throw new Error(`Falha ao atualizar ${failures.length} de ${reorderedFiltered.length} produtos`);
      }

      // Step 4: Update local state to reflect the new sliding puzzle order
      setFilteredProducts(reorderedFiltered);
      
      // Update the main products array with new display_order values
      setProducts(prev => prev.map(product => {
        const reorderedProduct = reorderedFiltered.find(rp => rp.id === product.id);
        if (reorderedProduct) {
          const newIndex = reorderedFiltered.findIndex(rp => rp.id === product.id);
          return { ...product, display_order: newIndex };
        }
        return product;
      }));

      console.log('✅ SLIDING PUZZLE REORDER SUCCESS');
      console.log('✅ REORDENAÇÃO CONCLUÍDA COM SUCESSO');
      toast.success(`"${draggedProduct.title}" movido para posição ${destinationIndex + 1}`);
      
    } catch (error) {
      console.error('❌ Erro na reordenação de produtos:', error);
      toast.error('Erro ao reordenar produtos. Tentando novamente...');
      
      // Revert to original state on error
      await refreshProducts();
    } finally {
      setReordering(false);
    }
  };

  // Enhanced refresh function
  const refreshProducts = async () => {
    setLoading(true);
    await fetchProducts();
    setLoading(false);
  };

  // Effects
  useEffect(() => {
    if (userId) {
      fetchProducts();
    }
  }, [userId]);

  useEffect(() => {
    filterProducts();
  }, [products, searchQuery, statusFilter, categoryFilter]);

  // Reset reorder mode when filters change
  useEffect(() => {
    setIsReorderModeActive(false);
    setSelectedProducts(new Set()); // Clear selections when filters change
  }, [categoryFilter, searchQuery, statusFilter]);

  return {
    products,
    filteredProducts,
    loading,
    searchQuery,
    statusFilter,
    categoryFilter,
    availableCategories,
    updatingProductId,
    reordering,
    isReorderModeActive,
    selectedProducts,
    bulkActionLoading,
    canReorder,
    allSelected,
    someSelected,
    setSearchQuery,
    setStatusFilter,
    setCategoryFilter,
    setIsReorderModeActive,
    setSelectedProducts,
    toggleProductVisibility,
    handleSelectProduct,
    handleSelectAll,
    handleBulkVisibilityToggle,
    handleBulkCategoryChange,
    handleBulkBrandChange,
    handleBulkDelete,
    handleBulkImageCompression,
    handleDragEnd,
    refreshProducts,
  };
}