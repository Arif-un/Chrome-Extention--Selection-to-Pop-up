import { useTheme, type Theme } from '../lib/theme'
import { Segmented } from './ui/Segmented'

const OPTIONS: { value: Theme; label: string }[] = [
  { value: 'system', label: 'Auto' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]

/** System / Light / Dark segmented control. Persists to localStorage; applies instantly. */
export function ThemeToggle() {
  const [theme, setTheme] = useTheme()
  return <Segmented value={theme} options={OPTIONS} onChange={setTheme} />
}
