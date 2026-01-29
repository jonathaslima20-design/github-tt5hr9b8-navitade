import React, { useState, useEffect } from 'react';
import { Input } from './input';
import { cn } from '@/lib/utils';

interface PhoneInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
}

export const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ className, value = '', onChange, ...props }, ref) => {
    const [displayValue, setDisplayValue] = useState('');

    // Format phone number for display
    const formatPhoneDisplay = (phone: string): string => {
      if (!phone) return '';
      
      // Remove all non-numeric characters
      const numbers = phone.replace(/\D/g, '');
      
      if (numbers.length === 0) return '';
      
      // Format based on length
      if (numbers.length <= 2) {
        return `(${numbers}`;
      } else if (numbers.length <= 6) {
        return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
      } else if (numbers.length <= 10) {
        // Format as landline: (XX) XXXX-XXXX
        return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
      } else if (numbers.length <= 11) {
        // Format as mobile: (XX) 9XXXX-XXXX
        return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
      } else {
        // Limit to 11 digits
        const limited = numbers.slice(0, 11);
        return `(${limited.slice(0, 2)}) ${limited.slice(2, 7)}-${limited.slice(7)}`;
      }
    };

    // Extract clean numbers from formatted display
    const extractCleanNumbers = (formatted: string): string => {
      return formatted.replace(/\D/g, '');
    };

    // Update display value when prop value changes
    useEffect(() => {
      if (value !== undefined) {
        const cleanValue = value.replace(/\D/g, '');
        setDisplayValue(formatPhoneDisplay(cleanValue));
      }
    }, [value]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      const cleanNumbers = extractCleanNumbers(inputValue);
      
      // Limit to 11 digits maximum
      const limitedNumbers = cleanNumbers.slice(0, 11);
      
      // Format for display
      const formatted = formatPhoneDisplay(limitedNumbers);
      setDisplayValue(formatted);
      
      // Call onChange with clean numbers only
      if (onChange) {
        onChange(limitedNumbers);
      }
    };

    return (
      <Input
        {...props}
        ref={ref}
        type="text"
        value={displayValue}
        onChange={handleInputChange}
        className={cn(className)}
        placeholder="(99) 99999-9999"
      />
    );
  }
);

PhoneInput.displayName = 'PhoneInput';