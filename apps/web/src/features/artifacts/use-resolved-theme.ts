import { useEffect, useState } from 'react'

export type ResolvedTheme = 'light' | 'dark'

function resolveTheme(): ResolvedTheme {
  if (typeof document === 'undefined') return 'light'
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

/**
 * Reads the `dark` class applied by ThemeProvider on <html>.
 * Syntax highlighters need a concrete theme object, not a CSS class,
 * so the modal has to know which one is active.
 */
export function useResolvedTheme(): ResolvedTheme {
  const [theme, setTheme] = useState<ResolvedTheme>(resolveTheme)

  useEffect(() => {
    const root = document.documentElement
    const observer = new MutationObserver(() => setTheme(resolveTheme()))
    observer.observe(root, { attributes: true, attributeFilter: ['class'] })

    return () => observer.disconnect()
  }, [])

  return theme
}
