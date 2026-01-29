import SubscriptionManagement from '@/components/admin/SubscriptionManagement';

export default function SubscriptionPlansPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Planos de Assinatura</h1>
        <p className="text-muted-foreground">Gerencie os planos e preços de assinatura</p>
      </div>
      <SubscriptionManagement />
    </div>
  );
}
