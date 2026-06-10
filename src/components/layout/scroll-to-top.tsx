import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/** Resets scroll position to the top on every route (pathname) change. */
export function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}
