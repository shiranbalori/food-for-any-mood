import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient'
import {
  assertDisplayNameAvailableForSignup,
  ProfileUpdateError,
  updateUserDisplayName,
} from '../services/profileService'
import {
  needsDisplayNameSetup,
  normalizeDisplayNameInput,
  resolvePublicDisplayName,
  validateDisplayName,
} from '../utils/displayName'

const AuthContext = createContext(null)

async function fetchProfile(userId) {
  if (!supabase || !userId) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    console.error('[Auth] Profile fetch failed:', error)
    return null
  }

  return data
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [profileRevision, setProfileRevision] = useState(0)

  const refreshProfile = useCallback(async (userId) => {
    if (!userId) {
      setProfile(null)
      return null
    }
    const nextProfile = await fetchProfile(userId)
    setProfile(nextProfile)
    setProfileRevision((value) => value + 1)
    return nextProfile
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false)
      return undefined
    }

    let active = true

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) return
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id).then((p) => {
          if (active) setProfile(p)
        })
      }
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id).then(setProfile)
      } else {
        setProfile(null)
      }
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  const signUp = useCallback(async ({ email, password, displayName }) => {
    if (!supabase) throw new Error('SUPABASE_NOT_CONFIGURED')

    const validation = validateDisplayName(displayName)
    if (!validation.ok) {
      throw new ProfileUpdateError(validation.code)
    }

    await assertDisplayNameAvailableForSignup(validation.value)

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { display_name: validation.value },
      },
    })

    if (error) throw error
    return data
  }, [])

  const signIn = useCallback(async ({ email, password }) => {
    if (!supabase) throw new Error('SUPABASE_NOT_CONFIGURED')

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (error) throw error
    return data
  }, [])

  const signOut = useCallback(async () => {
    if (!supabase) return
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }, [])

  const updateDisplayName = useCallback(
    async (displayName) => {
      if (!user?.id) throw new ProfileUpdateError('REQUIRED')
      const updated = await updateUserDisplayName(user.id, displayName)
      setProfile(updated)
      setProfileRevision((value) => value + 1)
      return updated
    },
    [user?.id],
  )

  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
      isAuthenticated: Boolean(user),
      isSupabaseReady: isSupabaseConfigured,
      signUp,
      signIn,
      signOut,
      updateDisplayName,
      refreshProfile,
      profileRevision,
      needsDisplayNamePrompt: needsDisplayNameSetup(profile?.display_name),
      displayName: resolvePublicDisplayName(profile?.display_name),
      getPublicDisplayName: (language = 'he') =>
        resolvePublicDisplayName(profile?.display_name, language),
      rawDisplayName: normalizeDisplayNameInput(profile?.display_name),
    }),
    [user, profile, loading, signUp, signIn, signOut, updateDisplayName, refreshProfile, profileRevision],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export { ProfileUpdateError }
