import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface GenderSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export function GenderSelector({ value, onChange }: GenderSelectorProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder="Selecione o gênero" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="Masculino">Masculino</SelectItem>
        <SelectItem value="Feminino">Feminino</SelectItem>
        <SelectItem value="Unissex">Unissex</SelectItem>
      </SelectContent>
    </Select>
  );
}
