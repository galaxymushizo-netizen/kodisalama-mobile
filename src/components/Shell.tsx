import { useEffect, useState, type ReactNode } from 'react'
import {
  Building2,
  FileText,
  KeyRound,
  LayoutDashboard,
  Menu,
  MessageSquareText,
  Plus,
  Settings,
  Users,
  Wallet,
} from 'lucide-react'

export type TabId =
  | 'dashibodi'
  | 'vyumba'
  | 'wapangaji'
  | 'malipo'
  | 'sms'
  | 'mikataba'
  | 'mipangilio'

export const TABS: { id: TabId; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashibodi', label: 'Dashibodi', icon: LayoutDashboard },
  { id: 'vyumba', label: 'Vyumba', icon: Building2 },
  { id: 'wapangaji', label: 'Wapangaji', icon: Users },
  { id: 'malipo', label: 'Malipo', icon: Wallet },
  { id: 'sms', label: 'SMS', icon: MessageSquareText },
  { id: 'mikataba', label: 'Mikataba', icon: FileText },
  { id: 'mipangilio', label: 'Mipangilio', icon: Settings },
]

function MenuSheet({ open, onClose, onPick }: {
  open: boolean
  onClose: () => void
  onPick: (tab: TabId) => void
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fade fixed inset-0 z-50 bg-slate-900/50"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="sheet absolute top-0 right-0 h-full w-[82%] max-w-xs bg-white pt-[env(safe-area-inset-top,0px)] shadow-2xl">
        <div className="bg-brand-900 px-5 py-6 text-white">
          <div className="text-lg font-extrabold">KodiSalama</div>
          <div className="text-xs text-brand-100">Usimamizi wa Wapangaji</div>
        </div>
        <nav className="p-3">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                onPick(t.id)
                onClose()
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-bold text-slate-700 active:bg-slate-100"
            >
              <t.icon size={18} className="text-brand-700" />
              {t.label}
            </button>
          ))}
        </nav>
      </div>
    </div>
  )
}

export function Shell({
  tab,
  onTab,
  quickPay,
  children,
}: {
  tab: TabId
  onTab: (t: TabId) => void
  quickPay: () => void
  children: ReactNode
}) {
  const [menu, setMenu] = useState(false)

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col">
      <header className="no-print bg-brand-900 pt-[env(safe-area-inset-top,0px)] text-white">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-900 ring-1 ring-white/20">
            <KeyRound size={22} className="text-white" strokeWidth={2.4} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-lg font-extrabold leading-tight">KodiSalama</div>
            <div className="truncate text-xs text-brand-100/90">Usimamizi wa Wapangaji</div>
          </div>
          <button
            onClick={quickPay}
            className="btn btn-primary !bg-brand-600 !py-2 !px-3.5 !text-sm shadow-none"
          >
            <Plus size={16} />
            Lipa
          </button>
          <button
            onClick={() => setMenu(true)}
            aria-label="Menyu"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white/90 active:bg-white/10"
          >
            <Menu size={22} />
          </button>
        </div>
      </header>

      <main className="flex-1 px-4 pt-5 pb-4">{children}</main>

      <nav className="no-print sticky bottom-0 z-30 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur">
        <div className="grid grid-cols-7">
          {TABS.map((t) => {
            const active = t.id === tab
            return (
              <button
                key={t.id}
                onClick={() => onTab(t.id)}
                aria-current={active ? 'page' : undefined}
                className="flex min-w-0 flex-col items-center gap-1 py-2.5"
              >
                <t.icon
                  size={21}
                  className={active ? 'text-brand-700' : 'text-slate-400'}
                  strokeWidth={active ? 2.4 : 2}
                />
                <span
                  className={`max-w-full truncate px-0.5 text-[10.5px] leading-tight font-semibold ${
                    active ? 'text-brand-700' : 'text-slate-400'
                  }`}
                >
                  {t.label}
                </span>
                <span
                  className={`h-1 w-1 rounded-full ${active ? 'bg-brand-700' : 'bg-transparent'}`}
                />
              </button>
            )
          })}
        </div>
      </nav>

      <MenuSheet open={menu} onClose={() => setMenu(false)} onPick={onTab} />
    </div>
  )
}
