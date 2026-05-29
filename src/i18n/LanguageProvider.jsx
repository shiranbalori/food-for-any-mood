import { useEffect, useState } from 'react'
import { LanguageContext } from './context'
import { translations, interpolate } from './translations'

const STORAGE_KEY = 'food-for-any-mood-lang'

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved === 'en' ? 'en' : 'he'
  })

  const isRtl = language === 'he'
  const dir = isRtl ? 'rtl' : 'ltr'

  useEffect(() => {
    document.documentElement.lang = language
    document.documentElement.dir = dir
    localStorage.setItem(STORAGE_KEY, language)
  }, [language, dir])

  const t = (key, vars) => {
    const keys = key.split('.')
    let value = translations[language]

    for (const k of keys) {
      value = value?.[k]
    }

    if (typeof value !== 'string') return key
    return vars ? interpolate(value, vars) : value
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRtl, dir }}>
      {children}
    </LanguageContext.Provider>
  )
}
