// Ported from Cult UI "copy-button" (cult-ui.com/r/copy-button.json): shadcn Button → plain button, lucide → react-icons.
import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { BsCheck2, BsCopy } from 'react-icons/bs';

function legacyCopy(value) {
  const ta = document.createElement('textarea');
  ta.value = value;
  ta.setAttribute('readonly', '');
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try { ok = document.execCommand('copy'); } catch { ok = false; }
  document.body.removeChild(ta);
  return ok;
}

export async function copyToClipboard(value) {
  if (!value) return false;
  if (navigator.clipboard?.writeText) {
    try { await navigator.clipboard.writeText(value); return true; } catch { return legacyCopy(value); }
  }
  return legacyCopy(value);
}

export function CopyButton({ value, label = 'Copy', className = '', children }) {
  const [copied, setCopied] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  const iconMotion = reduceMotion
    ? { initial: false, transition: { duration: 0 } }
    : {
        initial: { opacity: 0, scale: 0.25, filter: 'blur(4px)' },
        animate: { opacity: 1, scale: 1, filter: 'blur(0px)' },
        exit: { opacity: 0, scale: 0.25, filter: 'blur(4px)' },
        transition: { type: 'spring', duration: 0.3, bounce: 0 },
      };

  return (
    <button
      type="button"
      aria-label={copied ? 'Copied to clipboard' : label}
      title={label}
      data-copied={copied}
      onClick={async () => { if (await copyToClipboard(value)) setCopied(true); }}
      className={`inline-flex items-center gap-1.5 rounded text-muted transition-colors hover:text-ink motion-safe:active:scale-[0.96] ${className}`}
    >
      {children}
      <span aria-live="polite" aria-atomic="true" className="sr-only">{copied ? 'Copied' : ''}</span>
      <span aria-hidden="true" className="relative inline-flex h-3.5 w-3.5 items-center justify-center">
        <AnimatePresence initial={false} mode="sync">
          <motion.span key={copied ? 'check' : 'copy'} className="absolute inset-0 flex items-center justify-center" {...iconMotion}>
            {copied ? <BsCheck2 className="text-ok" /> : <BsCopy />}
          </motion.span>
        </AnimatePresence>
      </span>
    </button>
  );
}
