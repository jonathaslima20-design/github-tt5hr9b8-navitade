import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ReferralManagementPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Gestão de Indicações</h1>
        <p className="text-muted-foreground">Gerencie o programa de indicações e recompensas</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Programa de Indicações</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            As configurações do programa de indicações estarão disponíveis em breve.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
