import { ReactNode, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Check, X } from 'lucide-react';

/*
 * Meridian UI kit.
 *
 * Every screen is assembled from these few pieces so the product reads as one
 * surface: one card, one field, one status mark, one dialog. Nothing here
 * knows about the API — they take content and render it calmly.
 */

const reduced = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// ── Surfaces ────────────────────────────────────────────────────────────────

export const Card = ({
  children,
  className = '',
  hover = false,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}) => <section className={`card ${hover ? 'card-hover' : ''} ${className}`}>{children}</section>;

export const SectionHead = ({
  eyebrow,
  title,
  note,
  action,
}: {
  eyebrow?: string;
  title: string;
  note?: string;
  action?: ReactNode;
}) => (
  <header className="flex items-start justify-between gap-6 mb-6">
    <div className="min-w-0">
      {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
      <h2 className="section-title">{title}</h2>
      {note && <p className="section-note mt-2 max-w-2xl">{note}</p>}
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </header>
);

// ── Status ──────────────────────────────────────────────────────────────────

const TONES: Record<string, string> = {
  ACTIVE: 'tag-green',
  APPROVED: 'tag-green',
  COMPLETED: 'tag-green',
  SUBMITTED: 'tag-blue',
  PENDING_APPROVAL: 'tag-blue',
  NEEDS_REVIEW: 'tag-amber',
  REJECTED: 'tag-red',
  OFFBOARDED: 'tag-gray',
  INACTIVE: 'tag-gray',
  DRAFT: 'tag-gray',
};

export const Tag = ({ status, className = '' }: { status: string; className?: string }) => (
  <span className={`${TONES[status] ?? 'tag-gray'} ${className}`}>
    {status.replace(/_/g, ' ').toLowerCase()}
  </span>
);

// ── Identity ────────────────────────────────────────────────────────────────

const AVATAR_TONES = [
  'from-pine-600 to-pine-800',
  'from-[#3C6180] to-[#22415A]',
  'from-[#8A6A2E] to-[#5B4419]',
  'from-[#7A4A3E] to-[#4E2C24]',
  'from-[#4A5A4E] to-[#2C3830]',
];

export const Avatar = ({
  name,
  size = 40,
  className = '',
}: {
  name: string;
  size?: number;
  className?: string;
}) => {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
  const tone = AVATAR_TONES[name.charCodeAt(0) % AVATAR_TONES.length];
  return (
    <span
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      className={`shrink-0 grid place-items-center rounded-full bg-gradient-to-br ${tone} text-white font-semibold shadow-hair ${className}`}
    >
      {initials || '—'}
    </span>
  );
};

// ── Feedback ────────────────────────────────────────────────────────────────

export const ErrorNote = ({ text }: { text: string }) =>
  text ? (
    <div className="animate-scale-in mb-5 flex items-start gap-3 rounded-2xl border border-clay/20 bg-clay/[.05] px-4 py-3">
      <AlertTriangle size={16} className="mt-0.5 shrink-0 text-clay" />
      <p className="text-sm leading-relaxed text-clay">{text}</p>
    </div>
  ) : null;

export const Hint = ({ children }: { children: ReactNode }) => (
  <p className="text-xs leading-relaxed text-honey">{children}</p>
);

export const EmptyState = ({ title, note }: { title: string; note?: string }) => (
  <div className="animate-fade-in flex flex-col items-center justify-center px-6 py-16 text-center">
    <svg width="112" height="72" viewBox="0 0 112 72" fill="none" aria-hidden className="mb-6">
      <rect x="14" y="16" width="84" height="46" rx="8" stroke="#E4E1D9" strokeWidth="1.5" />
      <rect x="14" y="16" width="84" height="12" rx="8" fill="#F6F5F1" />
      <path d="M14 28h84" stroke="#E4E1D9" strokeWidth="1.5" />
      <rect x="26" y="38" width="30" height="4" rx="2" fill="#EFEDE7" />
      <rect x="26" y="48" width="52" height="4" rx="2" fill="#EFEDE7" />
      <circle cx="86" cy="14" r="9" fill="#EFF5F1" stroke="#B6D2C3" strokeWidth="1.5" />
      <path d="M83 14h6M86 11v6" stroke="#568F76" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
    <p className="text-base font-medium text-ink-700">{title}</p>
    {note && <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-400">{note}</p>}
  </div>
);

export const Skeleton = ({ className = '' }: { className?: string }) => (
  <div className={`skeleton rounded-xl ${className}`} />
);

// ── Numbers ─────────────────────────────────────────────────────────────────

/** Counts a metric up on mount — a small, once-only flourish, never a loop. */
export function useCountUp(target: number, duration = 900) {
  const [value, setValue] = useState(reduced() ? target : 0);
  const frame = useRef(0);

  useEffect(() => {
    if (reduced() || !Number.isFinite(target)) {
      setValue(target);
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 4);
      setValue(target * eased);
      if (t < 1) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [target, duration]);

  const whole = Number.isInteger(target);
  return whole ? Math.round(value) : Math.round(value * 10) / 10;
}

// ── Photography ─────────────────────────────────────────────────────────────

/** Remote imagery is decoration, never information — it fades in and, if the
 *  network drops it, quietly leaves the underlying wash in place. */
export const Photo = ({
  src,
  alt,
  className = '',
}: {
  src: string;
  alt: string;
  className?: string;
}) => {
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading');
  if (state === 'failed') return null;
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      onLoad={() => setState('ready')}
      onError={() => setState('failed')}
      style={{ opacity: state === 'ready' ? 1 : 0 }}
      className={`transition-opacity duration-[1200ms] ease-smooth ${className}`}
    />
  );
};

// ── Dialogs ─────────────────────────────────────────────────────────────────

export function Modal({
  open,
  onClose,
  title,
  note,
  children,
  width = 'max-w-lg',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  note?: string;
  children: ReactNode;
  width?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5">
      <div
        onClick={onClose}
        className="animate-fade-in absolute inset-0 bg-ink-950/45 backdrop-blur-[3px]"
      />
      <div
        role="dialog"
        aria-modal="true"
        className={`animate-scale-in relative w-full ${width} overflow-hidden rounded-3xl border border-white/50 bg-white shadow-deep`}
      >
        <header className="flex items-start justify-between gap-4 px-7 pt-7">
          <div>
            <h3 className="display text-2xl text-ink-900">{title}</h3>
            {note && <p className="mt-2 text-sm leading-relaxed text-ink-500">{note}</p>}
          </div>
          <button onClick={onClose} className="btn-quiet -mr-2 -mt-1 rounded-full" aria-label="Close">
            <X size={17} />
          </button>
        </header>
        <div className="px-7 pb-7 pt-6">{children}</div>
      </div>
    </div>
  );
}

export type ConfirmSpec = {
  title: string;
  note?: string;
  confirmLabel?: string;
  tone?: 'default' | 'danger';
  onConfirm: () => void;
};

/** A designed stand-in for window.confirm — same one-decision contract. */
export function ConfirmDialog({
  spec,
  onClose,
}: {
  spec: ConfirmSpec | null;
  onClose: () => void;
}) {
  return (
    <Modal open={!!spec} onClose={onClose} title={spec?.title ?? ''} note={spec?.note} width="max-w-md">
      <div className="flex justify-end gap-3">
        <button className="btn-ghost" onClick={onClose}>
          Cancel
        </button>
        <button
          className={spec?.tone === 'danger' ? 'btn btn-primary !bg-clay hover:!bg-[#8E3626]' : 'btn-primary'}
          onClick={() => {
            spec?.onConfirm();
            onClose();
          }}
        >
          <Check size={15} />
          {spec?.confirmLabel ?? 'Confirm'}
        </button>
      </div>
    </Modal>
  );
}

/** Wires the ConfirmDialog up in one line: `const [ask, confirmUi] = useConfirm()`. */
export function useConfirm(): [(spec: ConfirmSpec) => void, ReactNode] {
  const [spec, setSpec] = useState<ConfirmSpec | null>(null);
  return [setSpec, <ConfirmDialog key="confirm" spec={spec} onClose={() => setSpec(null)} />];
}
