import { useEffect, useState } from 'preact/hooks'
import type { Dispatch, StateUpdater } from 'preact/hooks'
import { getSettings } from './settings'
import type { Settings } from './types'

/** Load settings once into local state; returns the editable [value, setter] pair. */
export function useSettings(): [Settings | null, Dispatch<StateUpdater<Settings | null>>] {
  const [settings, setSettings] = useState<Settings | null>(null)
  useEffect(() => {
    void getSettings().then(setSettings)
  }, [])
  return [settings, setSettings]
}
