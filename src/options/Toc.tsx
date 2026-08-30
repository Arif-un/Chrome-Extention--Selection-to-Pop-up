import { useEffect, useState } from 'preact/hooks'

type Entry = { id: string; title: string }

/**
 * Sticky sidebar table of contents. Builds itself from every
 * `[data-section-title]` on the page (see Section), smooth-scrolls on click, and
 * highlights the section currently in view via IntersectionObserver.
 * Hidden below `lg` — the options window is often too narrow for a sidebar.
 */
export function Toc() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [active, setActive] = useState<string>('')

  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>('[data-section-title]'))
    setEntries(els.map((el) => ({ id: el.id, title: el.dataset.sectionTitle ?? '' })))

    // rootMargin pulls the "trigger line" below the sticky header so the section
    // under it counts as active; -70% bottom keeps a single active at a time.
    const io = new IntersectionObserver(
      (obs) => {
        const visible = obs
          .filter((o) => o.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) setActive(visible[0].target.id)
      },
      { rootMargin: '-80px 0px -70% 0px' },
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])

  if (!entries.length) return null

  return (
    <nav class="hidden w-44 shrink-0 lg:block">
      <ul class="sticky top-20 space-y-0.5">
        {entries.map((e) => (
          <li key={e.id}>
            <a
              href={`#${e.id}`}
              onClick={(ev) => {
                ev.preventDefault()
                const sec = document.getElementById(e.id)
                sec?.scrollIntoView({ behavior: 'smooth' })
                history.replaceState(null, '', `#${e.id}`)
                // flash a sky-blue outline on the section card for 2s, then fade out
                const card = sec?.querySelector('[data-section-card]')
                if (card) {
                  card.classList.add('!outline-sky-400')
                  setTimeout(() => card.classList.remove('!outline-sky-400'), 2000)
                }
              }}
              class={
                'block rounded-md px-2 py-1 text-[13px] transition-colors ' +
                (active === e.id
                  ? 'bg-surface-hover font-medium text-ink'
                  : 'text-muted hover:text-ink')
              }
            >
              {e.title}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
