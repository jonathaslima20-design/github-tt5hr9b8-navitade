import { Link } from 'react-router-dom';
import { Eye, Ban, CircleCheck as CheckCircle, Copy, ExternalLink, ArrowRightLeft, MoveHorizontal as MoreHorizontal, Key } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Card, CardContent } from '@/components/ui/card';
import { getInitials, formatPhone, formatWhatsAppForDisplay } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import PlanStatusBadge from '@/components/subscription/PlanStatusBadge';
import type { User } from '@/types';
import { useState } from 'react';
import { ChangePasswordDialog } from './ChangePasswordDialog';
import { generateWhatsAppUrl } from '@/lib/utils';

interface UserTableMinimalProps {
  users: User[];
  selectedUsers: Set<string>;
  onSelectUser: (userId: string, checked: boolean) => void;
  onSelectAll: (checked: boolean) => void;
  onToggleBlock: (userId: string, currentBlocked: boolean) => Promise<void>;
  onDeleteUser: (userId: string) => Promise<void>;
  loading: boolean;
  currentUserRole: string;
  showSelection: boolean;
}

export function UserTableMinimal({
  users,
  selectedUsers,
  onSelectUser,
  onSelectAll,
  onToggleBlock,
  onDeleteUser,
  loading,
  currentUserRole,
  showSelection
}: UserTableMinimalProps) {
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [selectedUserForPassword, setSelectedUserForPassword] = useState<{ id: string; name: string } | null>(null);
  
  const allSelected = users.length > 0 && users.every(user => selectedUsers.has(user.id));
  const someSelected = selectedUsers.size > 0 && !allSelected;

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge className="bg-primary">Administrador</Badge>;
      case 'parceiro':
        return <Badge className="bg-blue-500">Parceiro</Badge>;
      case 'corretor':
        return <Badge variant="secondary">Vendedor</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  const handleCloneUser = (userId: string) => {
    const event = new CustomEvent('openCloneUserDialog', {
      detail: { targetUserId: userId }
    });
    window.dispatchEvent(event);
  };

  const handleCopyProducts = (userId: string) => {
    const event = new CustomEvent('openCopyProducts', {
      detail: { targetUserId: userId }
    });
    window.dispatchEvent(event);
  };

  const handleChangePassword = (userId: string, userName: string) => {
    setSelectedUserForPassword({ id: userId, name: userName });
    setShowPasswordDialog(true);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center min-h-[200px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (users.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <h3 className="text-lg font-semibold mb-2">Nenhum usuário encontrado</h3>
          <p className="text-muted-foreground">
            Não há usuários que correspondam aos filtros selecionados.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {(showSelection || selectedUsers.size > 0) && (
          <Card className="bg-muted/50">
            <CardContent className="py-3 px-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={onSelectAll}
                  aria-label="Selecionar todos"
                  className={someSelected ? "data-[state=checked]:bg-primary" : ""}
                />
                <span className="text-sm font-medium">
                  {selectedUsers.size > 0
                    ? `${selectedUsers.size} usuário${selectedUsers.size > 1 ? 's' : ''} selecionado${selectedUsers.size > 1 ? 's' : ''}`
                    : 'Selecionar todos'
                  }
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {users.map((user) => (
          <Card
            key={user.id}
            className={`transition-all hover:shadow-md ${selectedUsers.has(user.id) ? "ring-2 ring-primary" : ""}`}
            onMouseEnter={() => setHoveredRow(user.id)}
            onMouseLeave={() => setHoveredRow(null)}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                {(showSelection || selectedUsers.size > 0 || hoveredRow === user.id) && (
                  <Checkbox
                    checked={selectedUsers.has(user.id)}
                    onCheckedChange={(checked) => onSelectUser(user.id, checked as boolean)}
                    aria-label={`Selecionar ${user.name}`}
                    className="mt-1"
                  />
                )}

                <Avatar className="h-14 w-14 flex-shrink-0">
                  <AvatarImage src={user.avatar_url} alt={user.name} />
                  <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0 space-y-3">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-lg leading-tight">{user.name}</h3>
                        <p className="text-sm text-muted-foreground mt-0.5">{user.email}</p>
                        {user.slug && (
                          <p className="text-xs text-muted-foreground mt-1">
                            /{user.slug}
                          </p>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 flex-shrink-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link to={`/admin/users/${user.id}`}>
                              <Eye className="h-4 w-4 mr-2" />
                              Ver Perfil
                            </Link>
                          </DropdownMenuItem>

                          {user.slug && (
                            <DropdownMenuItem asChild>
                              <a
                                href={`/${user.slug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Ver Vitrine
                              </a>
                            </DropdownMenuItem>
                          )}

                          <DropdownMenuSeparator />

                          {currentUserRole === 'admin' && (
                            <>
                              <DropdownMenuItem onClick={() => handleChangePassword(user.id, user.name)}>
                                <Key className="h-4 w-4 mr-2" />
                                Alterar Senha
                              </DropdownMenuItem>

                              <DropdownMenuItem onClick={() => handleCopyProducts(user.id)}>
                                <ArrowRightLeft className="h-4 w-4 mr-2" />
                                Copiar Produtos
                              </DropdownMenuItem>

                              <DropdownMenuItem onClick={() => handleCloneUser(user.id)}>
                                <Copy className="h-4 w-4 mr-2" />
                                Clonar Usuário
                              </DropdownMenuItem>

                              <DropdownMenuSeparator />
                            </>
                          )}

                          <DropdownMenuItem
                            onClick={() => onToggleBlock(user.id, user.is_blocked)}
                            className={user.is_blocked ? "text-green-600" : "text-red-600"}
                          >
                            {user.is_blocked ? (
                              <>
                                <CheckCircle className="h-4 w-4 mr-2" />
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
                            <>
                              <DropdownMenuSeparator />
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem
                                    onSelect={(e) => e.preventDefault()}
                                    className="text-destructive focus:text-destructive"
                                  >
                                    <Ban className="h-4 w-4 mr-2" />
                                    Excluir Usuário
                                  </DropdownMenuItem>
                                </AlertDialogTrigger>
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
                                      onClick={() => onDeleteUser(user.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Excluir
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    {getRoleBadge(user.role)}
                    <PlanStatusBadge status={user.plan_status} />
                    {user.is_blocked ? (
                      <Badge variant="destructive">Bloqueado</Badge>
                    ) : (
                      <Badge className="bg-green-500">Ativo</Badge>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    {user.whatsapp && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 hover:bg-green-50 hover:text-green-700 hover:border-green-300"
                        asChild
                      >
                        <a
                          href={generateWhatsAppUrl(user.whatsapp, `Olá ${user.name}, sou da equipe VitrineTurbo. Como posso ajudar?`, user.country_code || '55')}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={`Conversar com ${user.name} no WhatsApp`}
                        >
                          <svg className="h-4 w-4 mr-1.5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                          </svg>
                          {formatWhatsAppForDisplay(user.whatsapp, user.country_code || '55')}
                        </a>
                      </Button>
                    )}
                    <span className="text-muted-foreground">
                      Cadastrado em {format(new Date(user.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <ChangePasswordDialog
        open={showPasswordDialog}
        onOpenChange={setShowPasswordDialog}
        userId={selectedUserForPassword?.id || ''}
        userName={selectedUserForPassword?.name || ''}
      />
    </>
  );
}