import { useEffect, useState } from 'preact/hooks'
import { getSettings } from './settings'
import type { Settings } from './types'

/** Load settings once into local state; returns the editable [value, setter] pair. */
export function useSettings(): [Settings | null, (s: Settings) => void] {
  const [settings, setSettings] = useState<Settings | null>(null)
  useEffect(() => {
    void getSettings().then(setSettings)
  }, [])
  return [settings, setSettings]
}
