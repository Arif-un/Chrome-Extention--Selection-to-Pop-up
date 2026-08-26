import { useEffect, useState } from 'preact/hooks'

export type Theme = 'system' | 'light' | 'dark'

const KEY = 'stp-theme'
const mq = () => matchMedia('(prefers-color-scheme: dark)')

/** Pure mapping: should the effective theme be dark? */
export function resolveDark(theme: Theme, systemPrefersDark: boolean): boolean {
  return theme === 'dark' || (theme === 'system' && systemPrefersDark)
}

export function getTheme(): Theme {
  const t = localStorage.getItem(KEY)
  return t === 'light' || t === 'dark' ? t : 'system'
}

/** Toggle the `.dark` class on <html> to match the effective theme. */
export function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle('dark', resolveDark(theme, mq().matches))
}

export function setTheme(theme: Theme): void {
  if (theme === 'system') localStorage.removeItem(KEY)
  else localStorage.setItem(KEY, theme)
  applyTheme(theme)
}

/** [theme, setTheme] with live OS-preference tracking while in `system`. */
export function useTheme(): [Theme, (t: Theme) => void] {
  const [theme, set] = useState<Theme>(getTheme)
  useEffect(() => {
    applyTheme(theme)
    // Re-sync when another same-origin page (other options tab) changes the choice.
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY || e.key === null) set(getTheme())
    }
    addEventListener('storage', onStorage)
    if (theme !== 'system') return () => removeEventListener('storage', onStorage)
    const m = mq()
    const onChange = () => applyTheme('system')
    m.addEventListener('change', onChange)
    return () => {
      removeEventListener('storage', onStorage)
      m.removeEventListener('change', onChange)
    }
  }, [theme])
  return [
    theme,
    (t: Theme) => {
      setTheme(t)
      set(t)
    },
  ]
}
