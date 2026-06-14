import { useEffect, useState } from 'react'

/** Matches RecipeForm.css mobile rules (`max-width: 767px`). */
export const MOBILE_LAYOUT_MAX_WIDTH_PX = 767

export function useIsMobileLayout() {
  const query = `(max-width: ${MOBILE_LAYOUT_MAX_WIDTH_PX}px)`

  const [isMobileLayout, setIsMobileLayout] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia(query).matches
  })

  useEffect(() => {
    const mediaQuery = window.matchMedia(query)
    const sync = () => setIsMobileLayout(mediaQuery.matches)
    sync()
    mediaQuery.addEventListener('change', sync)
    return () => mediaQuery.removeEventListener('change', sync)
  }, [query])

  return isMobileLayout
}
