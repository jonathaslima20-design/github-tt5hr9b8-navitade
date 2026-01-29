import ProductCategoriesManager from '@/components/dashboard/ProductCategoriesManager';

export default function CategoriesPage() {
  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Categorias</h1>
        <p className="text-muted-foreground">Organize seus produtos em categorias</p>
      </div>
      <ProductCategoriesManager />
    </div>
  );
}
