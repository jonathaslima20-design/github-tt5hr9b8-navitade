import React, { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sanitizeCategoryName, isValidCategoryName, categoriesEqual } from '@/lib/categoryUtils';

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
  maxTags?: number;
  className?: string;
  disabled?: boolean;
}

export function TagInput({
  value = [],
  onChange,
  suggestions = [],
  placeholder = 'Adicionar...',
  maxTags = 10,
  className,
  disabled = false,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [focusedSuggestionIndex, setFocusedSuggestionIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter suggestions based on input and exclude already selected tags
  const filteredSuggestions = suggestions.filter(suggestion => {
    const isAlreadySelected = value.some(tag => categoriesEqual(tag, suggestion));
    const matchesInput = suggestion.toLowerCase().includes(inputValue.toLowerCase());
    return !isAlreadySelected && (inputValue === '' || matchesInput);
  });

  // Show suggestions when clicking on the container or when there's input
  const shouldShowSuggestions = showSuggestions && filteredSuggestions.length > 0;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
        setFocusedSuggestionIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleContainerClick = () => {
    if (disabled) return;
    
    // Always show suggestions when clicking on the container
    setShowSuggestions(true);
    inputRef.current?.focus();
  };

  const handleInputFocus = () => {
    if (disabled) return;
    setShowSuggestions(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    
    const newValue = e.target.value;
    setInputValue(newValue);
    setShowSuggestions(true);
    setFocusedSuggestionIndex(-1);
  };

  const addTag = (tag: string) => {
    if (disabled || value.length >= maxTags) return;

    const sanitized = sanitizeCategoryName(tag);
    if (!sanitized || !isValidCategoryName(sanitized)) {
      return;
    }

    // Check for duplicates using normalized comparison
    const isDuplicate = value.some(existingTag => categoriesEqual(existingTag, sanitized));
    if (isDuplicate) {
      return;
    }

    onChange([...value, sanitized]);
    setInputValue('');
    setShowSuggestions(false);
    setFocusedSuggestionIndex(-1);
  };

  const removeTag = (indexToRemove: number) => {
    if (disabled) return;
    onChange(value.filter((_, index) => index !== indexToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (e.key === 'Enter') {
      e.preventDefault();
      
      if (focusedSuggestionIndex >= 0 && focusedSuggestionIndex < filteredSuggestions.length) {
        // Add focused suggestion
        addTag(filteredSuggestions[focusedSuggestionIndex]);
      } else if (inputValue.trim()) {
        // Only add if it's from suggestions - disable manual creation
        const exactMatch = filteredSuggestions.find(s => 
          s.toLowerCase() === inputValue.toLowerCase()
        );
        if (exactMatch) {
          addTag(exactMatch);
        }
      }
    } else if (e.key === 'Backspace' && inputValue === '' && value.length > 0) {
      // Remove last tag when backspace is pressed on empty input
      removeTag(value.length - 1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedSuggestionIndex(prev => 
        prev < filteredSuggestions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedSuggestionIndex(prev => 
        prev > 0 ? prev - 1 : filteredSuggestions.length - 1
      );
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setFocusedSuggestionIndex(-1);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    addTag(suggestion);
  };

  return (
    <div className={cn('relative', className)} ref={containerRef}>
      <div
        className={cn(
          'flex flex-wrap gap-2 p-3 border rounded-md bg-background min-h-[42px] cursor-text',
          'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
          disabled && 'opacity-50 cursor-not-allowed',
          className
        )}
        onClick={handleContainerClick}
      >
        {/* Render existing tags */}
        {value.map((tag, index) => (
          <Badge
            key={index}
            variant="secondary"
            className="flex items-center gap-1 px-2 py-1"
          >
            <span className="text-xs">{tag}</span>
            {!disabled && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-auto p-0 hover:bg-transparent"
                onClick={(e) => {
                  e.stopPropagation();
                  removeTag(index);
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </Badge>
        ))}

        {/* Input field */}
        {value.length < maxTags && !disabled && (
          <Input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onKeyDown={handleKeyDown}
            placeholder={value.length === 0 ? placeholder : ''}
            className="flex-1 border-0 bg-transparent p-0 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-0 min-w-[120px]"
            disabled={disabled}
          />
        )}
      </div>

      {/* Suggestions dropdown */}
      {shouldShowSuggestions && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-60 overflow-auto rounded-md border bg-popover p-1 shadow-md">
          {filteredSuggestions.length === 0 ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              {inputValue ? 'Nenhuma categoria encontrada' : 'Nenhuma categoria disponível'}
            </div>
          ) : (
            filteredSuggestions.map((suggestion, index) => (
              <button
                key={suggestion}
                type="button"
                className={cn(
                  'w-full text-left px-3 py-2 text-sm rounded-sm transition-colors',
                  'hover:bg-accent hover:text-accent-foreground',
                  index === focusedSuggestionIndex && 'bg-accent text-accent-foreground'
                )}
                onClick={() => handleSuggestionClick(suggestion)}
                onMouseEnter={() => setFocusedSuggestionIndex(index)}
              >
                {suggestion}
              </button>
            ))
          )}
        </div>
      )}

      {/* Helper text */}
      {value.length >= maxTags && (
        <p className="text-xs text-muted-foreground mt-1">
          Máximo de {maxTags} categorias atingido
        </p>
      )}
    </div>
  );
}