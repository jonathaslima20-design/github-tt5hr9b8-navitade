import { Badge } from '@/components/ui/badge';
import { Crown, AlertCircle, Ban } from 'lucide-react';
import type { PlanStatus } from '@/types';

interface PlanStatusBadgeProps {
  status?: PlanStatus;
  className?: string;
}

export default function PlanStatusBadge({ status, className }: PlanStatusBadgeProps) {
  switch (status) {
    case 'active':
      return (
        <Badge className={`bg-green-500 hover:bg-green-600 text-white ${className}`}>
          <Crown className="h-3 w-3 mr-1" />
          Plano Ativo
        </Badge>
      );
    case 'suspended':
      return (
        <Badge variant="destructive" className={className}>
          <Ban className="h-3 w-3 mr-1" />
          Plano Suspenso
        </Badge>
      );
    default:
      return (
        <Badge variant="secondary" className={className}>
          <AlertCircle className="h-3 w-3 mr-1" />
          Plano Inativo
        </Badge>
      );
  }
}