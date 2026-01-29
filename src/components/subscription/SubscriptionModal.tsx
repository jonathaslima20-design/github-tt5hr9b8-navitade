import { useState, useEffect } from 'react';
import { Check, ExternalLink, Crown, Zap, Star, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import type { SubscriptionPlan } from '@/types';

interface SubscriptionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isForced?: boolean;
}

export default function SubscriptionModal({ open, onOpenChange, isForced = false }: SubscriptionModalProps) {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
  };

  useEffect(() => {
    if (open) {
      fetchPlans();
    }
  }, [open]);

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setPlans(data || []);
    } catch (error) {
      console.error('Error fetching plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPlanIcon = (duration: string) => {
    switch (duration) {
      case 'Trimestral':
        return <Zap className="h-6 w-6 text-blue-500" />;
      case 'Semestral':
        return <Star className="h-6 w-6 text-purple-500" />;
      case 'Anual':
        return <Crown className="h-6 w-6 text-yellow-500" />;
      default:
        return <Check className="h-6 w-6 text-green-500" />;
    }
  };

  const getPlanColor = (duration: string) => {
    switch (duration) {
      case 'Trimestral':
        return 'border-blue-200 hover:border-blue-300 bg-blue-50/50';
      case 'Semestral':
        return 'border-purple-200 hover:border-purple-300 bg-purple-50/50';
      case 'Anual':
        return 'border-yellow-200 hover:border-yellow-300 bg-yellow-50/50';
      default:
        return 'border-gray-200 hover:border-gray-300';
    }
  };

  const getPopularBadge = (duration: string) => {
    if (duration === 'Anual') {
      return (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-3 py-1">
            Mais Popular
          </Badge>
        </div>
      );
    }
    return null;
  };

  const features = [
    'Catálogo Digital via Link',
    'Painel Administrativo',
    'Cadastro ilimitado de produtos',
    'Funcionalidade de carrinho de compras',
    'Configuração de links externos',
    'Integração com Meta Pixel e Google Tag',
    'Programa de Indicação ("Indique e Ganhe")',
  ];

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        if (!isForced) {
          onOpenChange(newOpen);
        }
      }}
    >
      <DialogContent
        className="max-w-4xl max-h-[90vh] overflow-y-auto"
        onPointerDownOutside={(e) => {
          if (isForced) {
            e.preventDefault();
          }
        }}
        onEscapeKeyDown={(e) => {
          if (isForced) {
            e.preventDefault();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            {user?.plan_status === 'active' ? 'Gerenciar Plano' : 'Escolha seu Plano'}
          </DialogTitle>
          <DialogDescription className="text-center">
            {user?.plan_status === 'active'
              ? 'Seu plano está ativo. Você tem acesso completo à plataforma VitrineTurbo'
              : 'Ative sua conta e tenha acesso completo à plataforma VitrineTurbo'}
          </DialogDescription>
        </DialogHeader>

        {isForced && user?.plan_status !== 'active' && (
          <Alert className="bg-blue-50 border-blue-200">
            <AlertDescription className="text-blue-800">
              Para utilizar a plataforma, você precisa ativar um plano de assinatura.
            </AlertDescription>
          </Alert>
        )}

        {user?.plan_status === 'active' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-600" />
              <span className="text-green-800 font-medium">
                Seu plano está ativo! Você já tem acesso completo à plataforma.
              </span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          {loading ? (
            <div className="col-span-3 flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : plans.length === 0 ? (
            <div className="col-span-3 text-center py-8">
              <p className="text-muted-foreground">Nenhum plano disponível no momento</p>
            </div>
          ) : (
          <>
            {plans.map((plan) => (
            <Card 
              key={plan.id} 
              className={`relative transition-all duration-300 hover:shadow-lg ${getPlanColor(plan.duration)}`}
            >
              {getPopularBadge(plan.duration)}
              
              <CardHeader className="text-center pb-4">
                <div className="flex justify-center mb-3">
                  {getPlanIcon(plan.duration)}
                </div>
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <div className="text-3xl font-bold text-primary">
                  {formatCurrency(plan.price, user?.currency || 'BRL', user?.language || 'pt-BR')}
                </div>
                <p className="text-sm text-muted-foreground">
                  Pagamento único por {plan.duration.toLowerCase()}
                </p>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm">Recursos incluídos:</h4>
                  <ul className="space-y-2">
                    {features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-4">
                  {plan.checkout_url ? (
                    <Button 
                      className="w-full" 
                      size="lg"
                      asChild
                    >
                      <a 
                        href={plan.checkout_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Assinar Agora
                      </a>
                    </Button>
                  ) : (
                    <Button 
                      className="w-full" 
                      size="lg"
                      variant="outline"
                      disabled
                    >
                      Em Breve
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
            ))}
          </>
          )}
        </div>

        <div className="mt-8 p-6 bg-muted/50 rounded-lg">
          <h3 className="font-semibold mb-3">Por que escolher o VitrineTurbo?</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <p className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                Interface moderna e responsiva
              </p>
              <p className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                Suporte técnico especializado
              </p>
              <p className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                Atualizações constantes
              </p>
            </div>
            <div className="space-y-2">
              <p className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                Segurança e confiabilidade
              </p>
              <p className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                Analytics e relatórios detalhados
              </p>
              <p className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                Ganhe dinheiro indicando amigos
              </p>
            </div>
          </div>
        </div>

        {/* Support Section */}
        <div className="mt-8 p-6 bg-card border rounded-lg shadow-sm">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-2">
              <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-primary-foreground" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-foreground">Precisa de Ajuda?</h3>
            </div>

            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              Em caso de dúvidas sobre os planos ou funcionalidades, nossa equipe de suporte está pronta para ajudar você.
            </p>

            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Button
                variant="outline"
                className="bg-background hover:bg-muted border-border"
                asChild
              >
                <a
                  href="https://wa.me/5591982465495?text=Olá! Tenho dúvidas sobre os planos do VitrineTurbo e gostaria de falar com o suporte."
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  Falar com Suporte
                </a>
              </Button>

              {isForced && (
                <Button
                  variant="outline"
                  className="border-red-200 hover:bg-red-50 text-red-700"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sair da Conta
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}