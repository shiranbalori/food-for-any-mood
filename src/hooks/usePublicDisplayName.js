import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../i18n/useLanguage'
import { resolvePublicDisplayName } from '../utils/displayName'

export function usePublicDisplayName() {
  const { profile } = useAuth()
  const { language } = useLanguage()
  return resolvePublicDisplayName(profile?.display_name, language)
}
