'use client';

import { useState, useRef, useEffect } from 'react';

interface AccordionProps {
  title: string;
  badge?: string | number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export default function Accordion({
  title,
  badge,
  defaultOpen = false,
  children,
}: AccordionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState<number>(0);

  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight);
    }
  }, [children, isOpen]);

  return (
    <div className="rounded-xl border border-[var(--obsidian-500)] bg-[var(--obsidian-700)]/50 overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3.5 text-left
          hover:bg-[var(--obsidian-600)]/50 transition-colors duration-200"
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-[var(--text-primary)]">
            {title}
          </span>
          {badge !== undefined && badge !== '' && badge !== 0 && (
            <span className="px-2 py-0.5 text-xs font-medium rounded-full
              bg-blue-500/20 text-blue-400">
              {badge}
            </span>
          )}
        </div>

        <svg
          className={`w-5 h-5 text-[var(--text-muted)] transition-transform duration-300
            ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      <div
        className="transition-all duration-300 ease-out overflow-hidden"
        style={{
          maxHeight: isOpen ? `${contentHeight}px` : '0px',
          opacity: isOpen ? 1 : 0,
        }}
      >
        <div ref={contentRef} className="px-4 pb-4 pt-2">
          {children}
        </div>
      </div>
    </div>
  );
}
