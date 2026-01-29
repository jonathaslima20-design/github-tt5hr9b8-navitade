import React, { useState, useEffect } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface Country {
  code: string;
  name: string;
  ddi: string;
  flag: string;
  format: string;
  placeholder: string;
  minLength: number;
  maxLength: number;
}

interface PhoneInputWithCountryProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value?: string;
  onChange?: (data: { country: Country; ddi: string; phone: string; full: string }) => void;
  defaultCountry?: string;
  showFlag?: boolean;
  className?: string;
}

const COUNTRIES: Country[] = [
  {
    code: 'BR',
    name: 'Brasil',
    ddi: '+55',
    flag: '🇧🇷',
    format: '(XX) XXXXX-XXXX',
    placeholder: '(11) 98765-4321',
    minLength: 10,
    maxLength: 11,
  },
  {
    code: 'US',
    name: 'Estados Unidos',
    ddi: '+1',
    flag: '🇺🇸',
    format: '(XXX) XXX-XXXX',
    placeholder: '(202) 555-0173',
    minLength: 10,
    maxLength: 10,
  },
  {
    code: 'AR',
    name: 'Argentina',
    ddi: '+54',
    flag: '🇦🇷',
    format: '(XX) XXXX-XXXX',
    placeholder: '(011) 4567-8900',
    minLength: 9,
    maxLength: 10,
  },
  {
    code: 'PT',
    name: 'Portugal',
    ddi: '+351',
    flag: '🇵🇹',
    format: 'XXX XXX XXX',
    placeholder: '213 456 789',
    minLength: 9,
    maxLength: 9,
  },
  {
    code: 'MX',
    name: 'México',
    ddi: '+52',
    flag: '🇲🇽',
    format: 'XX XXXX-XXXX',
    placeholder: '55 1234-5678',
    minLength: 10,
    maxLength: 10,
  },
  {
    code: 'ES',
    name: 'Espanha',
    ddi: '+34',
    flag: '🇪🇸',
    format: 'XXX XXX XXX',
    placeholder: '912 345 678',
    minLength: 9,
    maxLength: 9,
  },
  {
    code: 'FR',
    name: 'França',
    ddi: '+33',
    flag: '🇫🇷',
    format: 'X XX XX XX XX',
    placeholder: '1 23 45 67 89',
    minLength: 9,
    maxLength: 9,
  },
  {
    code: 'DE',
    name: 'Alemanha',
    ddi: '+49',
    flag: '🇩🇪',
    format: 'XXX XXXXXXX',
    placeholder: '030 12345678',
    minLength: 9,
    maxLength: 11,
  },
  {
    code: 'IT',
    name: 'Itália',
    ddi: '+39',
    flag: '🇮🇹',
    format: 'XX XXXX XXXX',
    placeholder: '06 1234 5678',
    minLength: 9,
    maxLength: 10,
  },
  {
    code: 'GB',
    name: 'Reino Unido',
    ddi: '+44',
    flag: '🇬🇧',
    format: 'XXXX XXX XXXX',
    placeholder: '2079 460 958',
    minLength: 10,
    maxLength: 11,
  },
  {
    code: 'CA',
    name: 'Canadá',
    ddi: '+1',
    flag: '🇨🇦',
    format: '(XXX) XXX-XXXX',
    placeholder: '(416) 555-0173',
    minLength: 10,
    maxLength: 10,
  },
  {
    code: 'AU',
    name: 'Austrália',
    ddi: '+61',
    flag: '🇦🇺',
    format: 'XX XXXX XXXX',
    placeholder: '02 1234 5678',
    minLength: 9,
    maxLength: 9,
  },
  {
    code: 'JP',
    name: 'Japão',
    ddi: '+81',
    flag: '🇯🇵',
    format: 'XX-XXXX-XXXX',
    placeholder: '90-1234-5678',
    minLength: 9,
    maxLength: 10,
  },
  {
    code: 'CN',
    name: 'China',
    ddi: '+86',
    flag: '🇨🇳',
    format: 'XXX XXXX XXXX',
    placeholder: '010 1234 5678',
    minLength: 10,
    maxLength: 11,
  },
  {
    code: 'IN',
    name: 'Índia',
    ddi: '+91',
    flag: '🇮🇳',
    format: 'XXXXX XXXXX',
    placeholder: '98765 43210',
    minLength: 10,
    maxLength: 10,
  },
];

function formatPhoneNumber(phone: string, country: Country): string {
  const numbers = phone.replace(/\D/g, '');

  if (!numbers) return '';

  const format = country.format;
  let result = '';
  let numberIndex = 0;

  for (let i = 0; i < format.length && numberIndex < numbers.length; i++) {
    if (format[i] === 'X') {
      result += numbers[numberIndex];
      numberIndex++;
    } else {
      result += format[i];
    }
  }

  return result;
}

function extractCleanNumbers(formatted: string): string {
  return formatted.replace(/\D/g, '');
}

export const PhoneInputWithCountry = React.forwardRef<
  HTMLInputElement,
  PhoneInputWithCountryProps
>(
  (
    {
      value = '',
      onChange,
      defaultCountry = 'BR',
      showFlag = true,
      className,
      ...props
    },
    ref
  ) => {
    const [open, setOpen] = useState(false);
    const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
    const [displayValue, setDisplayValue] = useState('');
    const [manualDdi, setManualDdi] = useState('');
    const [editingDdi, setEditingDdi] = useState(false);

    useEffect(() => {
      const defaultCountryObj = COUNTRIES.find((c) => c.code === defaultCountry);
      if (defaultCountryObj) {
        setSelectedCountry(defaultCountryObj);
      }
    }, [defaultCountry]);

    useEffect(() => {
      if (value && selectedCountry) {
        const cleanValue = extractCleanNumbers(value);
        const formatted = formatPhoneNumber(cleanValue, selectedCountry);
        setDisplayValue(formatted);
      }
    }, [value, selectedCountry]);

    const handleCountrySelect = (country: Country) => {
      setSelectedCountry(country);
      setManualDdi('');
      setEditingDdi(false);
      setOpen(false);
      setDisplayValue('');
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      const cleanNumbers = extractCleanNumbers(inputValue);

      if (!selectedCountry) return;

      const limited = cleanNumbers.slice(0, selectedCountry.maxLength);
      const formatted = formatPhoneNumber(limited, selectedCountry);

      setDisplayValue(formatted);

      if (onChange) {
        const currentDdi = editingDdi && manualDdi ? manualDdi : selectedCountry.ddi;
        onChange({
          country: selectedCountry,
          ddi: currentDdi,
          phone: limited,
          full: `${currentDdi}${limited}`,
        });
      }
    };

    const handleDdiChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let value = e.target.value;

      if (!value.startsWith('+') && value.length > 0) {
        value = '+' + value;
      }

      setManualDdi(value);

      const matchedCountry = COUNTRIES.find((c) => c.ddi === value);
      if (matchedCountry) {
        setSelectedCountry(matchedCountry);
        setEditingDdi(false);
      } else {
        setEditingDdi(true);
      }
    };

    const handleDdiBlur = () => {
      if (!manualDdi || manualDdi === '+') {
        setManualDdi('');
        setEditingDdi(false);
      }
    };

    const currentDdi = editingDdi && manualDdi ? manualDdi : selectedCountry?.ddi || '+55';
    const displayCountryName = selectedCountry?.name || 'Selecione país';
    const displayFlag = showFlag && selectedCountry ? selectedCountry.flag : '';

    return (
      <div className={cn('flex gap-1.5 sm:gap-2', className)}>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-16 sm:w-20 md:w-[140px] justify-center sm:justify-between px-2 sm:px-3"
            >
              <span className="flex items-center gap-1 sm:gap-2 w-full">
                {displayFlag && <span className="flex-shrink-0">{displayFlag}</span>}
                <span className="hidden sm:inline truncate text-sm">{displayCountryName}</span>
                <ChevronsUpDown className="ml-auto h-3 w-3 sm:h-4 sm:w-4 shrink-0 opacity-50" />
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[300px] p-0">
            <Command>
              <CommandInput placeholder="Buscar país..." />
              <CommandEmpty>Nenhum país encontrado.</CommandEmpty>
              <CommandGroup className="max-h-64 overflow-auto">
                {COUNTRIES.map((country) => (
                  <CommandItem
                    key={country.code}
                    value={country.code}
                    onSelect={() => handleCountrySelect(country)}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        selectedCountry?.code === country.code
                          ? 'opacity-100'
                          : 'opacity-0'
                      )}
                    />
                    <span className="mr-2">{country.flag}</span>
                    <span className="flex-1">{country.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {country.ddi}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </Command>
          </PopoverContent>
        </Popover>

        <div className="flex gap-1 flex-1">
          <Input
            value={currentDdi}
            onChange={handleDdiChange}
            onFocus={() => setEditingDdi(true)}
            onBlur={handleDdiBlur}
            placeholder="+55"
            className="w-14 sm:w-20"
            disabled={props.disabled}
          />
          <Input
            ref={ref}
            {...props}
            type="text"
            value={displayValue}
            onChange={handlePhoneChange}
            placeholder={selectedCountry?.placeholder || '(XX) XXXXX-XXXX'}
            disabled={!selectedCountry || props.disabled}
            className="flex-1 text-sm sm:text-base"
          />
        </div>
      </div>
    );
  }
);

PhoneInputWithCountry.displayName = 'PhoneInputWithCountry';

export { COUNTRIES, type Country };
