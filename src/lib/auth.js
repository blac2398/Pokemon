import { supabase } from './supabase'

/**
 * Starts Google sign-in via OAuth redirect. The browser leaves the app until
 * Google and Supabase finish; when successful, the user returns with a session.
 */
export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' })
  if (error) {
    throw error
  }
}

/**
 * Signs the user out locally and on the server so the app treats them as logged out.
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) {
    throw error
  }
}

/**
 * Returns the current user from Supabase (validated with the server), or null if nobody is signed in.
 */
export async function getCurrentUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error) {
    throw error
  }
  return user ?? null
}

/**
 * Returns the active session (access token, user, expiry, etc.), or null if there is no session.
 */
export async function getCurrentSession() {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession()
  if (error) {
    throw error
  }
  return session ?? null
}

/**
 * Subscribes to login, logout, and token refresh events. The callback receives the Supabase
 * event name and the new session (or null). Returns a function to call to stop listening.
 */
export function onAuthStateChange(callback) {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session)
  })
  return () => subscription.unsubscribe()
}
