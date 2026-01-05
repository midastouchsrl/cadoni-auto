'use client';

/**
 * SearchableSelect Component
 * Searchable dropdown with type-to-filter functionality
 * Supports flexible option formats
 */

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';

type OptionValue = string | number;

interface SearchableSelectProps<T extends OptionValue> {
  options: Array<{ value: T; label: string }>;
  value: T | '';
  onChange: (value: T | '') => void;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  loadingText?: string;
  disabledText?: string;
  id?: string;
}

export default function SearchableSelect<T extends OptionValue>({
  options,
  value,
  onChange,
  placeholder = 'Seleziona...',
  disabled = false,
  loading = false,
  loadingText = 'Caricamento...',
  disabledText,
  id,
}: SearchableSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Get selected option label
  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === value),
    [options, value]
  );

  // Sort and filter options alphabetically
  const filteredOptions = useMemo(() => {
    const sorted = [...options].sort((a, b) =>
      a.label.localeCompare(b.label, 'it', { sensitivity: 'base' })
    );

    if (!search.trim()) return sorted;

    const searchLower = search.toLowerCase().trim();
    return sorted.filter((opt) =>
      opt.label.toLowerCase().includes(searchLower)
    );
  }, [options, search]);

  // Reset highlighted index when options change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [filteredOptions]);

  // Scroll highlighted option into view
  useEffect(() => {
    if (isOpen && listRef.current) {
      const highlightedEl = listRef.current.children[highlightedIndex] as HTMLElement;
      if (highlightedEl) {
        highlightedEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = useCallback(
    (option: { value: T; label: string }) => {
      onChange(option.value);
      setIsOpen(false);
      setSearch('');
    },
    [onChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled || loading) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          if (!isOpen) {
            setIsOpen(true);
          } else {
            setHighlightedIndex((prev) =>
              prev < filteredOptions.length - 1 ? prev + 1 : prev
            );
          }
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (isOpen && filteredOptions[highlightedIndex]) {
            handleSelect(filteredOptions[highlightedIndex]);
          } else {
            setIsOpen(true);
          }
          break;
        case 'Escape':
          setIsOpen(false);
          setSearch('');
          break;
        case 'Tab':
          if (isOpen) {
            setIsOpen(false);
            setSearch('');
          }
          break;
      }
    },
    [disabled, loading, isOpen, filteredOptions, highlightedIndex, handleSelect]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    if (!isOpen) setIsOpen(true);
  };

  const handleInputFocus = () => {
    if (!disabled && !loading) {
      setIsOpen(true);
    }
  };

  const displayValue = useMemo(() => {
    if (loading) return loadingText;
    if (disabled && disabledText) return disabledText;
    if (isOpen) return search;
    return selectedOption?.label || '';
  }, [loading, loadingText, disabled, disabledText, isOpen, search, selectedOption]);

  const showPlaceholder = !displayValue && !isOpen;

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={displayValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          disabled={disabled || loading}
          placeholder={showPlaceholder ? placeholder : ''}
          autoComplete="off"
          className={`
            w-full pr-10
            ${value && !isOpen ? 'text-[var(--text-primary)]' : 'text-[var(--text-placeholder)]'}
            ${disabled || loading ? 'cursor-not-allowed opacity-60' : 'cursor-text'}
          `}
        />

        {/* Dropdown arrow / Loading spinner */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          {loading ? (
            <svg
              className="animate-spin h-4 w-4 text-blue-400"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          ) : (
            <svg
              className={`w-4 h-4 text-[var(--text-muted)] transition-transform duration-200 ${
                isOpen ? 'rotate-180' : ''
              }`}
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          )}
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && !disabled && !loading && (
        <ul
          ref={listRef}
          className="absolute z-50 w-full mt-1 max-h-60 overflow-auto rounded-xl
            bg-[var(--obsidian-800)] border border-[var(--obsidian-600)]
            shadow-lg shadow-black/20 py-1"
        >
          {filteredOptions.length === 0 ? (
            <li className="px-4 py-3 text-sm text-[var(--text-muted)] text-center">
              Nessun risultato per &quot;{search}&quot;
            </li>
          ) : (
            filteredOptions.map((option, index) => (
              <li
                key={String(option.value)}
                onClick={() => handleSelect(option)}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={`
                  px-4 py-2.5 text-sm cursor-pointer transition-colors
                  ${index === highlightedIndex
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'text-[var(--text-primary)] hover:bg-[var(--obsidian-700)]'
                  }
                  ${option.value === value ? 'font-medium' : ''}
                `}
              >
                {option.label}
                {option.value === value && (
                  <svg
                    className="inline-block w-4 h-4 ml-2 text-blue-400"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                )}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

// Helper to convert id/name format to value/label format
export function toSelectOptions<T extends OptionValue>(
  items: Array<{ id: T; name: string }>
): Array<{ value: T; label: string }> {
  return items.map((item) => ({ value: item.id, label: item.name }));
}
