import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error(
    'Supabase not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env and restart.',
  )
}

/** Single shared Supabase client for the app (auth and future sync). */
export const supabase = createClient(url, anonKey, {
  auth: {
    // Automatically refresh the access token before it expires
    autoRefreshToken: true,
    // Save the session to localStorage so users stay signed in across reloads
    persistSession: true,
    // Read the #access_token=... from the URL after OAuth redirect and store it
    detectSessionInUrl: true,
    },
})
