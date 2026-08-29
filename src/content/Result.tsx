import { Select } from '../components/Select'
import { LANGS, CURRENCIES } from '../lib/langs'
import { store } from './store'
import type { ResultView } from './store'

export function Result({ result, translateTo }: { result: ResultView; translateTo: string }) {
  if (result.kind === 'translate') {
    const d = result.data
    return (
      <div class="space-y-1">
        <div class="stp-muted flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide">
          <span>{d.from}</span>
          <span>→</span>
          <Select value={translateTo} onChange={(v) => store.setTranslateLang(v)}>
            {LANGS.map((l) => (
              <option key={l.code} value={l.code}>
                {l.name}
              </option>
            ))}
          </Select>
        </div>
        <div class="text-sm leading-snug">{d.translation}</div>
        <a
          class="stp-accent-text inline-block text-[11px] hover:underline"
          href={`https://translate.google.com/?sl=auto&tl=${translateTo}&text=${encodeURIComponent(store.getSnapshot().text)}&op=translate`}
          target="_blank"
          rel="noopener noreferrer"
          onMouseDown={(e) => e.preventDefault()}
        >
          Open in Google Translate
        </a>
      </div>
    )
  }
  if (result.kind === 'currency') {
    const d = result.data
    return (
      <div class="space-y-1">
        <div class="stp-muted flex items-center gap-1 text-[11px]">
          <Select value={d.from} onChange={(v) => store.setCurrency({ base: v })}>
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
          <span>→</span>
          <Select value={d.to} onChange={(v) => store.setCurrency({ target: v })}>
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>
        <div class="text-sm font-semibold">
          {d.converted.toLocaleString(undefined, { maximumFractionDigits: 2 })} {d.to}
        </div>
        <div class="stp-muted text-[11px]">
          {d.amount} {d.from} · 1 {d.from} = {d.rate} {d.to}
          {d.date ? ` · ${d.date}` : ''}
        </div>
      </div>
    )
  }
  if (result.kind === 'dictionary') {
    const d = result.data
    return (
      <div class="space-y-1.5">
        <div class="flex items-baseline gap-2">
          <span class="text-sm font-semibold">{d.word}</span>
          {d.phonetic && <span class="stp-muted text-[11px]">{d.phonetic}</span>}
        </div>
        <ol class="space-y-1.5">
          {d.senses.map((s, i) => (
            <li key={i} class="text-xs leading-snug">
              {s.partOfSpeech && <span class="stp-muted mr-1 italic">{s.partOfSpeech}</span>}
              {s.definition}
              {s.synonyms.length > 0 && (
                <div class="stp-accent-text mt-0.5 text-[11px]">syn: {s.synonyms.join(', ')}</div>
              )}
            </li>
          ))}
        </ol>
      </div>
    )
  }
  // text
  return (
    <div class="space-y-1">
      {result.title && (
        <div class="stp-muted text-[11px] font-medium uppercase tracking-wide">{result.title}</div>
      )}
      {result.body && <div class="whitespace-pre-wrap text-sm">{result.body}</div>}
    </div>
  )
}
