import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase'
import {
  clearLocalUserData,
  clearSyncMeta,
  hydrateFromRemote,
  installSyncHooks,
  runSync,
  startSyncAutopilot,
} from '@/lib/sync'

interface AuthContextValue {
  configured: boolean
  loading: boolean
  session: Session | null
  user: User | null
  signInWithEmail: (email: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = isSupabaseConfigured()
  const [loading, setLoading] = useState(configured)
  const [session, setSession] = useState<Session | null>(null)
  const sessionRef = useRef<Session | null>(null)
  sessionRef.current = session

  useEffect(() => {
    installSyncHooks()
  }, [])

  useEffect(() => {
    if (!configured) {
      setLoading(false)
      return
    }
    const supabase = getSupabase()
    if (!supabase) {
      setLoading(false)
      return
    }

    let cancelled = false
    void supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return
      setSession(data.session)
      setLoading(false)
      if (data.session) {
        void hydrateFromRemote(data.session)
          .then(() => runSync(data.session).catch(() => {}))
          .catch(() => {})
      }
    })

    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next)
      if (event === 'SIGNED_IN' && next) {
        void hydrateFromRemote(next)
          .then(() => runSync(next).catch(() => {}))
          .catch(() => {})
      }
      if (event === 'SIGNED_OUT') {
        clearSyncMeta()
        void clearLocalUserData()
      }
    })

    const stop = startSyncAutopilot(() => sessionRef.current)
    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
      stop()
    }
  }, [configured])

  const signInWithEmail = useCallback(async (email: string) => {
    const supabase = getSupabase()
    if (!supabase) throw new Error('Supabase не настроен')
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/account` },
    })
    if (error) throw error
  }, [])

  const signOut = useCallback(async () => {
    const supabase = getSupabase()
    if (!supabase) return
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    await clearLocalUserData()
    setSession(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      configured,
      loading,
      session,
      user: session?.user ?? null,
      signInWithEmail,
      signOut,
    }),
    [configured, loading, session, signInWithEmail, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
