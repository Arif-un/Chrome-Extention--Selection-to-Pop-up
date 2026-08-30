/** Ready-made AI prompt templates. `{selection}` is replaced with the text. */
export interface AiPreset {
  id: string
  label: string
  template: string
}

export const AI_PRESETS: AiPreset[] = [
  { id: 'none', label: 'None', template: '{selection}' },
  {
    id: 'proofread',
    label: 'Proofread',
    template:
      'Proofread and fix any spelling or grammar mistakes, keep the meaning:\n\n{selection}',
  },
  {
    id: 'rewrite',
    label: 'Rewrite',
    template: 'Rewrite the following to improve clarity and flow:\n\n{selection}',
  },
  {
    id: 'concise',
    label: 'Concise',
    template: 'Make the following more concise while keeping the meaning:\n\n{selection}',
  },
  {
    id: 'professional',
    label: 'Professional',
    template: 'Rewrite the following in a professional tone:\n\n{selection}',
  },
  {
    id: 'human',
    label: 'Human tone',
    template: 'Rewrite the following to sound natural and human:\n\n{selection}',
  },
  {
    id: 'slack',
    label: 'Slack way',
    template: 'Rewrite the following as a casual Slack message:\n\n{selection}',
  },
]

/** Preset id whose template matches `template`, or 'custom' if none. */
export const presetIdFor = (template: string): string =>
  AI_PRESETS.find((p) => p.template === template)?.id ?? 'custom'
