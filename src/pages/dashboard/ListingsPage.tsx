import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { ListingsHeader } from '@/components/dashboard/ListingsHeader';
import { ListingsFilters } from '@/components/dashboard/ListingsFilters';
import { ListingsStatusBar } from '@/components/dashboard/ListingsStatusBar';
import { ProductGrid } from '@/components/dashboard/ProductGrid';
import { BulkActionsPanel } from '@/components/dashboard/BulkActionsPanel';
import { useProductListManagement } from '@/hooks/useProductListManagement';

export default function ListingsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const {
    products,
    filteredProducts,
    loading,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    categoryFilter,
    setCategoryFilter,
    availableCategories,
    updatingProductId,
    reordering,
    isReorderModeActive,
    setIsReorderModeActive,
    selectedProducts,
    setSelectedProducts,
    bulkActionLoading,
    canReorder,
    allSelected,
    someSelected,
    toggleProductVisibility,
    handleSelectProduct,
    handleSelectAll,
    handleBulkVisibilityToggle,
    handleBulkCategoryChange,
    handleBulkBrandChange,
    handleBulkDelete,
    handleBulkImageCompression,
    handleDragEnd,
    refreshProducts
  } = useProductListManagement({ userId: user?.id });

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-6 space-y-6">
      <ListingsHeader
        canReorder={canReorder}
        isReorderModeActive={isReorderModeActive}
        reordering={reordering}
        allSelected={allSelected}
        filteredProductsLength={filteredProducts.length}
        onToggleReorderMode={() => setIsReorderModeActive(!isReorderModeActive)}
        onSelectAll={handleSelectAll}
      />

      <ListingsFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        categoryFilter={categoryFilter}
        onCategoryFilterChange={setCategoryFilter}
        availableCategories={availableCategories}
      />

      <ListingsStatusBar
        totalCount={products.length}
        filteredCount={filteredProducts.length}
        selectedCount={selectedProducts.size}
        allSelected={allSelected}
        onSelectAll={handleSelectAll}
      />

      {selectedProducts.size > 0 && (
        <BulkActionsPanel
          selectedCount={selectedProducts.size}
          onBulkVisibilityToggle={handleBulkVisibilityToggle}
          onBulkCategoryChange={handleBulkCategoryChange}
          onBulkBrandChange={handleBulkBrandChange}
          onBulkDelete={handleBulkDelete}
          onBulkImageCompression={handleBulkImageCompression}
          onClearSelection={() => setSelectedProducts(new Set())}
          loading={bulkActionLoading}
          userId={user?.id}
        />
      )}

      <ProductGrid
        products={filteredProducts}
        isDragMode={isReorderModeActive}
        reordering={reordering}
        bulkActionLoading={bulkActionLoading}
        selectedProducts={selectedProducts}
        updatingProductId={updatingProductId}
        user={user}
        onSelectProduct={handleSelectProduct}
        onToggleVisibility={toggleProductVisibility}
        onDragEnd={handleDragEnd}
      />

      {!loading && filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">Nenhum produto encontrado</p>
          <Button onClick={() => navigate('/dashboard/products/new')}>
            <Plus className="h-4 w-4 mr-2" />
            Criar Primeiro Produto
          </Button>
        </div>
      )}
    </div>
  );
}
