import renderMathInElement from 'katex/contrib/auto-render'

const DELIMITERS = [
  { left: '$$', right: '$$', display: true  },
  { left: '$',  right: '$',  display: false },
  { left: '\\[', right: '\\]', display: true  },
  { left: '\\(', right: '\\)', display: false },
]

export function renderMath(el: HTMLElement | null) {
  if (!el) return
  try {
    renderMathInElement(el, { delimiters: DELIMITERS, throwOnError: false })
  } catch { /* ignore */ }
}

const ESC: Record<string, string> = {
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}
export function esc(s: string): string {
  return String(s ?? '').replace(/[&<>"']/g, c => ESC[c])
}

export function rich(s: string | undefined): string {
  if (!s) return ''
  return String(s)
    .split(/(<img\s[^>]*>)/i)
    .map(part =>
      /^<img\s/i.test(part)
        ? part
        : esc(part).replace(/\n/g, '<br/>')
    )
    .join('')
}
