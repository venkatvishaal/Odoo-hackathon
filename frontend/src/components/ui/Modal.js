import React, { useEffect, useRef } from 'react';
import { BsX } from 'react-icons/bs';

// Native <dialog> gives focus trapping, Escape handling, top-layer stacking and focus return for free.
export default function Modal({ isOpen, onClose, title, description, size = 'md', children }) {
  const ref = useRef(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  const width = size === 'lg' ? 'max-w-2xl' : 'max-w-md';

  return (
    <dialog
      ref={ref}
      aria-labelledby="modal-title"
      onCancel={(e) => { e.preventDefault(); onClose(); }}
      onClick={(e) => { if (e.target === ref.current) onClose(); }}
      className={`w-[calc(100%-2rem)] ${width} max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-panel border border-line bg-surface p-0 text-ink shadow-2xl`}
    >
      {isOpen && (
        <>
          <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-4">
            <div>
              <h2 id="modal-title" className="text-lg font-semibold">{title}</h2>
              {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
            </div>
            <button type="button" onClick={onClose} className="btn-icon -mr-2" aria-label="Close dialog">
              <BsX className="text-xl" />
            </button>
          </div>
          <div className="px-6 py-5">{children}</div>
        </>
      )}
    </dialog>
  );
}
