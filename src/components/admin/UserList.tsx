import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import type { User } from '@/types';
import { UserListItem } from './UserListItem';

interface UserListProps {
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

export function UserList({
  users,
  selectedUsers,
  onSelectUser,
  onSelectAll,
  onToggleBlock,
  onDeleteUser,
  loading,
  currentUserRole,
  showSelection
}: UserListProps) {
  const allSelected = users.length > 0 && users.every(user => selectedUsers.has(user.id));
  const someSelected = selectedUsers.size > 0 && !allSelected;

  if (loading) {
    return (
      <Card>
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Card>
    );
  }

  if (users.length === 0) {
    return (
      <Card className="p-12">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">Nenhum usuário encontrado</h3>
          <p className="text-muted-foreground">
            Não há usuários que correspondam aos filtros selecionados.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      {/* Header with select all */}
      <div className="flex items-center gap-3 p-4 border-b bg-muted/30">
        <Checkbox
          checked={allSelected}
          onCheckedChange={onSelectAll}
          aria-label="Selecionar todos"
          className={someSelected ? "data-[state=checked]:bg-primary" : ""}
        />
        <span className="text-sm font-medium">
          {selectedUsers.size > 0
            ? `${selectedUsers.size} ${selectedUsers.size === 1 ? 'usuário selecionado' : 'usuários selecionados'}`
            : `${users.length} ${users.length === 1 ? 'usuário' : 'usuários'}`
          }
        </span>
      </div>

      {/* User List */}
      <div className="divide-y">
        {users.map((user) => (
          <UserListItem
            key={user.id}
            user={user}
            selected={selectedUsers.has(user.id)}
            onSelect={(checked) => onSelectUser(user.id, checked)}
            onToggleBlock={() => onToggleBlock(user.id, user.is_blocked)}
            onDelete={() => onDeleteUser(user.id)}
            currentUserRole={currentUserRole}
          />
        ))}
      </div>
    </Card>
  );
}
