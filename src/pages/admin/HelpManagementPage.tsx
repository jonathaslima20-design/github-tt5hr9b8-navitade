import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function HelpManagementPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Gestão da Central de Ajuda</h1>
        <p className="text-muted-foreground">Gerencie artigos e categorias da central de ajuda</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Central de Ajuda</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            A gestão da central de ajuda estará disponível em breve.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
