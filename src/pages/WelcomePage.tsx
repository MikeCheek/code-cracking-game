import { useState } from 'react'
import { AVATARS } from '../constants'
import { generateRandomUsername } from '../utils/profile'
import type { UserProfile } from '../types'

type WelcomePageProps = {
  user: UserProfile | null
  username: string
  avatar: string
  isFirstVisit: boolean
  onUsernameChange: (value: string) => void
  onAvatarChange: (value: string) => void
  onSetAudioEnabled: (enabled: boolean) => void
  onAudioConsentDone: () => void
  onEnterLobby: () => void
  onUseSavedProfile: () => void
}

export function WelcomePage({
  user,
  username,
  avatar,
  isFirstVisit,
  onUsernameChange,
  onAvatarChange,
  onSetAudioEnabled,
  onAudioConsentDone,
  onEnterLobby,
  onUseSavedProfile,
}: WelcomePageProps) {
  const [consentShown, setConsentShown] = useState(!isFirstVisit)
  return (
    <>
      {isFirstVisit && !consentShown && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-fuchsia-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-fuchsia-200 bg-white p-6 shadow-2xl">
            <h3 className="text-2xl font-black text-fuchsia-950">Enable Audio?</h3>
            <p className="mt-2 text-sm text-fuchsia-800/90">
              Mindbreaker has background music and sound effects to enhance gameplay. Would you like them enabled?
            </p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  onSetAudioEnabled(false)
                  setConsentShown(true)
                  onAudioConsentDone()
                }}
                className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
              >
                Keep Muted
              </button>
              <button
                type="button"
                onClick={() => {
                  onSetAudioEnabled(true)
                  setConsentShown(true)
                  onAudioConsentDone()
                }}
                className="flex-1 rounded-lg bg-gradient-to-r from-fuchsia-600 to-violet-500 px-4 py-2 text-sm font-semibold text-white hover:brightness-110"
              >
                Enable Audio
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="grid gap-6 md:grid-cols-[2fr_1fr]">
      <article className="rounded-3xl border border-violet-200 bg-white p-6 shadow-xl">
        <h2 className="text-2xl font-black text-fuchsia-900">Welcome To Mindbreaker</h2>
        <p className="mt-2 text-sm text-fuchsia-800/80">
          Confirm your player info, change it if you want, then enter the game rooms.
        </p>

        {user && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
            Saved profile: {user.avatar} {user.username}
          </div>
        )}

        <label className="mt-4 block text-sm font-semibold text-fuchsia-900">Username</label>
        <div className="mt-1 flex gap-2">
          <input
            value={username}
            onChange={(event) => onUsernameChange(event.target.value)}
            placeholder="Username"
            className="flex-1 rounded-xl border border-violet-300 bg-violet-50 px-3 py-2 outline-none focus:border-fuchsia-500"
          />
          <button
            type="button"
            onClick={() => onUsernameChange(generateRandomUsername())}
            className="rounded-xl bg-violet-200 px-3 py-2 text-xs font-semibold text-violet-900 hover:bg-violet-300"
            title="Generate random username"
          >
            🎲
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {AVATARS.map((item) => (
            <button
              type="button"
              key={item}
              onClick={() => onAvatarChange(item)}
              className={`h-11 w-11 rounded-xl text-2xl transition ${
                avatar === item ? 'bg-fuchsia-600 text-white shadow-md' : 'bg-violet-100 hover:bg-violet-200'
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={onEnterLobby}
            className="rounded-2xl bg-gradient-to-r from-fuchsia-600 to-violet-500 px-8 py-3 font-semibold text-white shadow-lg transition hover:scale-[1.02]"
          >
            Enter Rooms {avatar}
          </button>
          {user && (
            <button
              onClick={onUseSavedProfile}
              className="rounded-2xl border border-emerald-300 bg-emerald-50 px-5 py-3 text-sm font-bold text-emerald-900 hover:bg-emerald-100"
            >
              Use Saved And Enter
            </button>
          )}
        </div>
      </article>

      <article className="rounded-3xl border border-violet-200 bg-white p-6 shadow-xl">
        <h3 className="text-lg font-extrabold text-fuchsia-900">How It Works</h3>
        <p className="mt-2 text-sm text-fuchsia-800/80">1. Choose profile.</p>
        <p className="text-sm text-fuchsia-800/80">2. Enter rooms page.</p>
        <p className="text-sm text-fuchsia-800/80">3. Create or join a room.</p>
        <p className="text-sm text-fuchsia-800/80">4. Duel starts after setup phases.</p>

        <div className="mt-4 rounded-xl bg-fuchsia-50 p-3 text-xs text-fuchsia-900">
          <p className="font-bold">Quick rules</p>
          <p className="mt-1">Bulls: correct digit in the correct position.</p>
          <p>Cows: correct digit but in the wrong position.</p>
          <p className="mt-1">Wrong bulls/cows answer counts as a lie and adds a penalty.</p>
        </div>
      </article>
    </section>
    </>
  )
}
