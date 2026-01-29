import React from 'react';
import { Input } from '@/components/ui/input';

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value?: number | string;
  onChange?: (value: number) => void;
}

export function CurrencyInput({
  value,
  onChange,
  ...props
}: CurrencyInputProps) {
  const formatValue = (val: number | string | undefined): string => {
    if (val === undefined || val === null || val === '') return '';

    const numValue = typeof val === 'string' ? parseFloat(val) : val;

    if (isNaN(numValue)) return '';

    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numValue);
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    let newValue = event.target.value;

    // Remove any existing formatting
    newValue = newValue.replace(/[^\d]/g, '');

    // Convert to number
    if (newValue) {
      const number = parseInt(newValue, 10);
      if (!isNaN(number) && onChange) {
        onChange(number / 100);
      }
    } else if (onChange) {
      onChange(0);
    }
  };

  return (
    <Input
      {...props}
      value={formatValue(value)}
      onChange={handleChange}
      inputMode="numeric"
    />
  );
}