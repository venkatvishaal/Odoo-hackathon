import React, { useEffect, useId, useRef, useState } from 'react';
import { BsThreeDots } from 'react-icons/bs';

// Overflow action menu (WAI-ARIA menu button pattern). items: [{ label, icon, onSelect, danger }]
export default function Menu({ items, label = 'More actions' }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const itemRefs = useRef([]);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    itemRefs.current[0]?.focus();
    const onPointer = (e) => { if (!rootRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('pointerdown', onPointer);
    return () => document.removeEventListener('pointerdown', onPointer);
  }, [open]);

  const close = () => { setOpen(false); buttonRef.current?.focus(); };

  const onKeyDown = (e) => {
    const els = itemRefs.current.filter(Boolean);
    const i = els.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); els[(i + 1) % els.length]?.focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); els[(i - 1 + els.length) % els.length]?.focus(); }
    else if (e.key === 'Home') { e.preventDefault(); els[0]?.focus(); }
    else if (e.key === 'End') { e.preventDefault(); els[els.length - 1]?.focus(); }
    else if (e.key === 'Escape') { e.preventDefault(); close(); }
    else if (e.key === 'Tab') setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        className="btn btn-ghost btn-sm"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => setOpen((o) => !o)}
      >
        <BsThreeDots aria-hidden="true" />
        <span className="hidden sm:inline" aria-hidden="true">More</span>
      </button>
      {open && (
        <div
          id={id}
          role="menu"
          aria-label={label}
          onKeyDown={onKeyDown}
          className="absolute right-0 top-full z-30 mt-1 min-w-[200px] rounded-panel border border-line bg-surface py-1 shadow-xl"
        >
          {items.map(({ label: itemLabel, icon: Icon, onSelect, danger }, idx) => (
            <button
              key={itemLabel}
              ref={(el) => { itemRefs.current[idx] = el; }}
              type="button"
              role="menuitem"
              tabIndex={-1}
              onClick={() => { setOpen(false); onSelect(); }}
              className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] outline-none hover:bg-paper focus-visible:bg-paper ${danger ? 'text-danger' : 'text-ink'}`}
            >
              {Icon && <Icon aria-hidden="true" className={`shrink-0 ${danger ? '' : 'text-muted'}`} />}
              {itemLabel}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
