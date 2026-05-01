import React, { useState, useRef, useEffect, useCallback } from 'react';

interface SearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  className?: string;
  /** API endpoint to POST new items to (e.g. '/api/master/clans') */
  createEndpoint?: string;
  /** Auth token for API calls */
  token?: string;
  /** Callback after a new item is created — use to refetch master data */
  onCreated?: () => void;
  disabled?: boolean;
}

/**
 * A searchable select that lets users type to filter existing options,
 * press Enter to select a single match, or auto-create a new entry
 * via the master data API if it doesn't exist.
 */
export default function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = 'Search...',
  className = '',
  createEndpoint,
  token,
  onCreated,
  disabled = false,
}: SearchableSelectProps) {
  const [query, setQuery] = useState(value || '');
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Sync query when value changes externally
  useEffect(() => { setQuery(value || ''); }, [value]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Deduplicated + filtered
  const unique = Array.from(new Set(options));
  const filtered = query
    ? unique.filter(o => o.toLowerCase().includes(query.toLowerCase()))
    : unique;

  const select = useCallback((val: string) => {
    setQuery(val);
    onChange(val);
    setOpen(false);
  }, [onChange]);

  const create = useCallback(async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed || adding) return;
    // If it already exists, just select it
    const existing = unique.find(o => o.toLowerCase() === trimmed.toLowerCase());
    if (existing) { select(existing); return; }
    if (!createEndpoint || !token) { select(trimmed); return; }

    setAdding(true);
    try {
      await fetch(createEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: trimmed }),
      });
      // Notify parent to refetch master data
      onCreated?.();
      select(trimmed);
    } catch (err) {
      console.error('Failed to create:', err);
      select(trimmed); // Still select the typed value
    } finally {
      setAdding(false);
    }
  }, [unique, adding, createEndpoint, token, onCreated, select]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      if (filtered.length === 1) {
        select(filtered[0]);
      } else if (query.trim()) {
        create(query);
      }
    }
  };

  const isNew = query.trim() && !unique.some(o => o.toLowerCase() === query.trim().toLowerCase());

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <input
        type="text"
        className={className || undefined}
        style={!className ? {
          width: '100%', height: 36, padding: '0 10px', borderRadius: 8,
          border: '1.5px solid var(--border, #d9cfc5)', background: '#FAFAF9',
          fontSize: 13, color: 'var(--ink, #1a150e)', outline: 'none',
          boxSizing: 'border-box' as const, transition: 'border-color .15s',
        } : undefined}
        value={query}
        disabled={disabled}
        onChange={e => {
          setQuery(e.target.value);
          setOpen(true);
          if (!e.target.value) onChange('');
        }}
        onFocus={e => { setOpen(true); if (!className) e.currentTarget.style.borderColor = 'var(--saffron, #f97316)'; }}
        onBlur={e => { if (!className) e.currentTarget.style.borderColor = 'var(--border, #d9cfc5)'; }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
      />
      {open && !disabled && (
        <div style={{
          position: 'absolute', zIndex: 50, left: 0, right: 0, top: 'calc(100% + 4px)',
          background: '#fff', border: '1.5px solid #E6D8CE', borderRadius: 6,
          boxShadow: '0 12px 40px rgba(28,21,16,0.14)', maxHeight: 220, overflowY: 'auto',
        }}>
          {filtered.map(opt => (
            <div
              key={opt}
              onClick={() => select(opt)}
              style={{
                padding: '8px 12px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid #E6D8CE',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#FFF4EC')}
              onMouseLeave={e => (e.currentTarget.style.background = '')}
            >
              {opt}
            </div>
          ))}
          {isNew && (
            <div
              onClick={() => create(query)}
              style={{
                padding: '8px 12px', cursor: 'pointer', fontSize: 13, color: '#15803D',
                display: 'flex', alignItems: 'center', gap: 6, borderTop: filtered.length ? '1px solid #E6D8CE' : 'none',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#F0FDF4')}
              onMouseLeave={e => (e.currentTarget.style.background = '')}
            >
              {adding ? '⏳ Adding...' : `＋ Add "${query.trim()}"`}
            </div>
          )}
          {!query && filtered.length === 0 && (
            <div style={{ padding: '12px', textAlign: 'center', fontSize: 12, color: '#B8A89F' }}>
              Type to search...
            </div>
          )}
        </div>
      )}
    </div>
  );
}
