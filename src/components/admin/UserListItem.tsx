import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, Trash2, Ban, CircleCheck, Copy, ExternalLink, ArrowRightLeft, Key, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getInitials, formatWhatsAppForDisplay, generateWhatsAppUrl } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import PlanStatusBadge from '@/components/subscription/PlanStatusBadge';
import type { User } from '@/types';
import { ChangePasswordDialog } from './ChangePasswordDialog';

interface UserListItemProps {
  user: User;
  selected: boolean;
  onSelect: (checked: boolean) => void;
  onToggleBlock: () => Promise<void>;
  onDelete: () => Promise<void>;
  currentUserRole: string;
}

export function UserListItem({
  user,
  selected,
  onSelect,
  onToggleBlock,
  onDelete,
  currentUserRole
}: UserListItemProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge className="bg-primary text-xs">Admin</Badge>;
      case 'parceiro':
        return <Badge className="bg-blue-500 text-xs">Parceiro</Badge>;
      case 'corretor':
        return <Badge variant="secondary" className="text-xs">Vendedor</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">{role}</Badge>;
    }
  };

  const handleCloneUser = () => {
    const event = new CustomEvent('openCloneUserDialog', {
      detail: { targetUserId: user.id }
    });
    window.dispatchEvent(event);
  };

  const handleCopyProducts = () => {
    const event = new CustomEvent('openCopyProducts', {
      detail: { targetUserId: user.id }
    });
    window.dispatchEvent(event);
  };

  return (
    <>
      <div
        className={`
          flex items-center gap-3 p-4 border-b last:border-b-0
          hover:bg-muted/50 transition-colors
          ${selected ? 'bg-muted/30' : ''}
        `}
      >
        {/* Checkbox */}
        <div className="flex-shrink-0">
          <Checkbox
            checked={selected}
            onCheckedChange={onSelect}
            aria-label={`Selecionar ${user.name}`}
          />
        </div>

        {/* Avatar and Info */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Avatar className="h-12 w-12 flex-shrink-0 border-2 border-background shadow-sm">
            <AvatarImage src={user.avatar_url} alt={user.name} />
            <AvatarFallback className="text-sm font-semibold">{getInitials(user.name)}</AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-sm md:text-base truncate">{user.name}</h3>
              {getRoleBadge(user.role)}
              {user.is_blocked ? (
                <Badge variant="destructive" className="text-xs">Bloqueado</Badge>
              ) : (
                <Badge className="bg-green-500 text-xs">Ativo</Badge>
              )}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mt-1">
              <p className="text-xs md:text-sm text-muted-foreground truncate">{user.email}</p>
              {user.slug && (
                <span className="text-xs text-muted-foreground truncate">/{user.slug}</span>
              )}
            </div>

            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <PlanStatusBadge status={user.plan_status} />

              {user.whatsapp && (
                <a
                  href={generateWhatsAppUrl(user.whatsapp, `Olá ${user.name}, sou da equipe VitrineTurbo. Como posso ajudar?`, user.country_code || '55')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-green-600 hover:text-green-700 flex items-center gap-1"
                  title={`Conversar com ${user.name} no WhatsApp`}
                >
                  <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  {formatWhatsAppForDisplay(user.whatsapp, user.country_code || '55')}
                </a>
              )}

              <span className="text-xs text-muted-foreground">
                {format(new Date(user.created_at), 'dd/MM/yyyy', { locale: ptBR })}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Desktop: Show all buttons */}
          <div className="hidden lg:flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              asChild
              title="Ver perfil"
            >
              <Link to={`/admin/users/${user.id}`}>
                <Eye className="h-4 w-4" />
              </Link>
            </Button>

            {user.slug && (
              <Button
                variant="ghost"
                size="sm"
                asChild
                title="Ver vitrine"
              >
                <a
                  href={`/${user.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            )}

            {currentUserRole === 'admin' && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPasswordDialog(true)}
                  title="Alterar senha"
                >
                  <Key className="h-4 w-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyProducts}
                  title="Copiar produtos"
                >
                  <ArrowRightLeft className="h-4 w-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCloneUser}
                  title="Clonar usuário"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleBlock}
              className={user.is_blocked ? "text-green-600 hover:text-green-700" : "text-red-600 hover:text-red-700"}
              title={user.is_blocked ? "Desbloquear" : "Bloquear"}
            >
              {user.is_blocked ? (
                <CircleCheck className="h-4 w-4" />
              ) : (
                <Ban className="h-4 w-4" />
              )}
            </Button>

            {currentUserRole === 'admin' && user.role !== 'admin' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
                className="text-destructive hover:text-destructive"
                title="Excluir"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Mobile: Dropdown menu */}
          <div className="lg:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link to={`/admin/users/${user.id}`} className="flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Ver perfil
                  </Link>
                </DropdownMenuItem>

                {user.slug && (
                  <DropdownMenuItem asChild>
                    <a
                      href={`/${user.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Ver vitrine
                    </a>
                  </DropdownMenuItem>
                )}

                {currentUserRole === 'admin' && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setShowPasswordDialog(true)} className="flex items-center gap-2">
                      <Key className="h-4 w-4" />
                      Alterar senha
                    </DropdownMenuItem>

                    <DropdownMenuItem onClick={handleCopyProducts} className="flex items-center gap-2">
                      <ArrowRightLeft className="h-4 w-4" />
                      Copiar produtos
                    </DropdownMenuItem>

                    <DropdownMenuItem onClick={handleCloneUser} className="flex items-center gap-2">
                      <Copy className="h-4 w-4" />
                      Clonar usuário
                    </DropdownMenuItem>
                  </>
                )}

                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={onToggleBlock}
                  className={user.is_blocked ? "text-green-600" : "text-red-600"}
                >
                  {user.is_blocked ? (
                    <>
                      <CircleCheck className="h-4 w-4 mr-2" />
                      Desbloquear
                    </>
                  ) : (
                    <>
                      <Ban className="h-4 w-4 mr-2" />
                      Bloquear
                    </>
                  )}
                </DropdownMenuItem>

                {currentUserRole === 'admin' && user.role !== 'admin' && (
                  <DropdownMenuItem
                    onClick={() => setShowDeleteDialog(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o usuário "{user.name}"?
              Esta ação não pode ser desfeita e todos os dados do usuário serão removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDelete();
                setShowDeleteDialog(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Change Password Dialog */}
      <ChangePasswordDialog
        open={showPasswordDialog}
        onOpenChange={setShowPasswordDialog}
        userId={user.id}
        userName={user.name}
      />
    </>
  );
}
