import { useState } from 'react'
import { signInWithGoogle } from '../lib/auth'

function GoogleGLogo({ className }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      className={className}
      aria-hidden="true"
    >
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6C44.98 37.98 46.98 31.69 46.98 24.55z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
      <path fill="none" d="M0 0h48v48H0z" />
    </svg>
  )
}

export default function SignInScreen() {
  const [isSigningIn, setIsSigningIn] = useState(false)

  async function handleSignIn() {
    if (isSigningIn) {
      return
    }
    setIsSigningIn(true)
    try {
      await signInWithGoogle()
    } catch (error) {
      console.error('Sign-in failed', error)
      setIsSigningIn(false)
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-red-50 px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-pokedex-cream-dark/40 bg-pokedex-cream/80 p-8 shadow-lg backdrop-blur-sm">
        <div className="flex flex-col items-center text-center">
          <img
            src="/icons/icon-192.png"
            alt=""
            width={96}
            height={96}
            className="mb-4 h-24 w-24 drop-shadow-md"
          />
          <h1 className="font-display text-4xl font-black uppercase tracking-wider text-pokedex-red">
            POKÉDEX
          </h1>
          <p className="mt-1 font-display text-sm font-bold uppercase tracking-[0.35em] text-pokedex-charcoal/80">
            TRACKER
          </p>
          <p className="mt-6 font-body text-sm leading-relaxed text-pokedex-charcoal/70">
            Your personal Pokémon TCG collection, on every device you own.
          </p>

          <div className="mt-6 w-full rounded-md border-2 border-pokedex-lcd-dark/30 bg-pokedex-lcd px-4 py-3 font-mono shadow-[inset_0_1px_2px_rgba(0,0,0,0.15)]">
            <div className="flex items-center justify-center gap-2 text-xs uppercase tracking-widest text-pokedex-lcd-dark">
              <span
                className="h-2 w-2 shrink-0 animate-led-pulse rounded-full bg-pokedex-led shadow-[0_0_8px_rgba(74,222,128,0.9)]"
                aria-hidden="true"
              />
              AUTHENTICATION REQUIRED
            </div>
          </div>

          <button
            type="button"
            onClick={handleSignIn}
            disabled={isSigningIn}
            className="mt-8 inline-flex w-full max-w-sm items-center justify-center gap-3 rounded-full border-2 border-pokedex-cream-dark bg-white px-6 py-3 font-display text-sm uppercase tracking-wider text-pokedex-charcoal shadow-md transition-all hover:bg-pokedex-cream-dark/10 active:scale-95 disabled:cursor-not-allowed disabled:opacity-80"
          >
            <GoogleGLogo className="h-6 w-6 shrink-0" />
            {isSigningIn ? 'Signing in...' : 'Sign in with Google'}
          </button>

          <p className="mt-8 font-body text-xs leading-relaxed text-pokedex-charcoal/40">
            We only use your Google email to identify your account. We don&apos;t
            post anything or read your Google data.
          </p>
        </div>
      </div>
    </main>
  )
}
