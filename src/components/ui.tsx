import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { useEffect } from 'react'
import { X } from 'lucide-react'

/* ------------------------------- Card ------------------------------- */

export function Card({
  children,
  className = '',
  padded = true,
}: {
  children: ReactNode
  className?: string
  padded?: boolean
}) {
  return <section className={`card ${padded ? 'p-4 sm:p-5' : ''} ${className}`}>{children}</section>
}

export function PageHead({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle?: string
  action?: ReactNode
}) {
  return (
    <header className="mb-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-[1.65rem] leading-tight font-extrabold tracking-tight sm:text-3xl">
            {title}
          </h1>
          {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
        </div>
        {action}
      </div>
    </header>
  )
}

/* ------------------------------ Fields ------------------------------ */

type FieldWrapProps = { label?: string; required?: boolean; hint?: string; children: ReactNode }

export function Field({ label, required, hint, children }: FieldWrapProps) {
  return (
    <label className="block">
      {label && (
        <span className="label">
          {label}
          {required && <span className="text-rose-500"> *</span>}
          {hint && <span className="ml-1 font-normal text-slate-400">{hint}</span>}
        </span>
      )}
      {children}
    </label>
  )
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`field ${props.className ?? ''}`} />
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`field resize-y ${props.className ?? ''}`} />
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        {...props}
        className={`field appearance-none pr-9 ${props.className ?? ''}`}
      />
      <svg
        className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-slate-400"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </div>
  )
}

/* ------------------------------ Buttons ----------------------------- */

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'outline' | 'dark' | 'ghost' | 'danger'
  full?: boolean
  size?: 'sm' | 'md'
}

export function Btn({ variant = 'primary', full, size = 'md', className = '', ...rest }: BtnProps) {
  const v =
    variant === 'primary'
      ? 'btn-primary'
      : variant === 'outline'
        ? 'btn-outline'
        : variant === 'dark'
          ? 'btn-dark'
          : variant === 'danger'
            ? 'btn-danger'
            : 'btn-ghost'
  return (
    <button
      {...rest}
      className={`btn ${v} ${full ? 'w-full' : ''} ${size === 'sm' ? 'px-3 py-2 text-sm' : ''} ${className}`}
    />
  )
}

/* ------------------------------- Chips ------------------------------ */

export function Chip({
  active,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button {...rest} data-active={active ? 'true' : 'false'} className="chip">
      {children}
    </button>
  )
}

/* ------------------------------ Empty state ------------------------- */

export function EmptyState({
  icon,
  title,
  text,
  action,
}: {
  icon: ReactNode
  title: string
  text: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-300 bg-white/70 px-5 py-10 text-center">
      <div className="text-slate-300">{icon}</div>
      <h3 className="mt-4 text-lg font-extrabold text-slate-700">{title}</h3>
      <p className="mt-1 max-w-xs text-sm text-muted">{text}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

/* -------------------------------- Modal ----------------------------- */

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fade fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 backdrop-blur-[2px] sm:items-center"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="sheet flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-white sm:max-w-lg sm:rounded-3xl">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <h2 className="text-lg font-extrabold">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Funga"
            className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-slate-500 active:bg-slate-200"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="border-t border-slate-100 bg-slate-50 px-5 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

/** Asks before destructive actions. */
export function Confirm({
  open,
  title,
  text,
  confirmLabel = 'Ndio, futa',
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  text: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      footer={
        <div className="flex gap-2">
          <Btn variant="outline" full onClick={onCancel}>
            Ghairi
          </Btn>
          <Btn variant="danger" full onClick={onConfirm}>
            {confirmLabel}
          </Btn>
        </div>
      }
    >
      <p className="text-sm leading-relaxed text-slate-600">{text}</p>
    </Modal>
  )
}

/* ------------------------------ Toast ------------------------------- */

export function Toast({ msg }: { msg: string | null }) {
  if (!msg) return null
  return (
    <div className="no-print pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex justify-center px-6">
      <div className="fade rounded-full bg-slate-900/90 px-4 py-2.5 text-sm font-semibold text-white shadow-lg">
        {msg}
      </div>
    </div>
  )
}

/* ---------------------------- Search input -------------------------- */

export function Search({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
}) {
  return (
    <div className="relative">
      <svg
        className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.2-3.2" />
      </svg>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="field pl-9"
      />
    </div>
  )
}
