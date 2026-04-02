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
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-xl">
          <div className="glass-panel-strong w-full max-w-md rounded-[1.75rem] p-6">
            <p className="text-xs font-bold uppercase tracking-[0.34em] text-fuchsia-300">Audio Prompt</p>
            <h3 className="mt-2 text-3xl font-bold text-white">Turn the sound on?</h3>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              This game uses sound cues for wins, lies, and turn changes. Enable audio for the full arcade feel.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  onSetAudioEnabled(false)
                  setConsentShown(true)
                  onAudioConsentDone()
                }}
                className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
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
                className="flex-1 rounded-2xl bg-gradient-to-r from-fuchsia-300 to-violet-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:brightness-110"
              >
                Enable Audio
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <article className="glass-panel-strong relative overflow-hidden rounded-[2rem] p-6 md:p-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,116,216,0.2),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(159,124,255,0.15),transparent_32%)]" />
          <div className="relative">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-2xl">
                <p className="text-xs font-bold uppercase tracking-[0.36em] text-fuchsia-300">Code Cracking Arena</p>
                <h2 className="mt-3 text-4xl font-bold tracking-tight text-white md:text-6xl">
                  Build a profile. Find a room. Start the duel.
                </h2>
                <p className="mt-4 max-w-xl text-sm leading-6 text-slate-300 md:text-base">
                  This is the fast lane into the match loop: set your identity, launch into the lobby, and get straight
                  to the guessing game.
                </p>
              </div>

              <div className="glass-panel rounded-[1.5rem] px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400">Player token</p>
                <p className="mt-2 text-3xl">{avatar}</p>
                <p className="text-sm font-semibold text-slate-100">{username || 'Choose a name'}</p>
              </div>
            </div>

            {user && (
              <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm text-emerald-100">
                <span className="h-2 w-2 rounded-full bg-emerald-300" />
                Saved profile ready: {user.avatar} {user.username}
              </div>
            )}

            <div className="mt-6 rounded-[1.25rem] border border-white/10 bg-white/5 p-4">
              <p className="text-sm font-semibold text-white">Quick start</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Choose a name and avatar, enter the lobby, then create or join a room. The setup is designed for fast, repeat play.
              </p>
            </div>
          </div>
        </article>

        <article className="space-y-4 rounded-[2rem] border border-white/8 bg-white/6 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.22)] backdrop-blur-xl">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.32em] text-fuchsia-300">Profile Console</p>
            <h3 className="mt-2 text-2xl font-bold text-white">Set your player identity</h3>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              One name, one avatar, and you are in. Everything here is optimized for quick re-entry.
            </p>
          </div>

          <label className="block text-sm font-semibold text-slate-100">Username</label>
          <div className="flex gap-2">
            <input
              value={username}
              onChange={(event) => onUsernameChange(event.target.value)}
              placeholder="Enter a username"
              className="w-full rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-fuchsia-300/60"
            />
            <button
              type="button"
              onClick={() => onUsernameChange(generateRandomUsername())}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 text-sm font-semibold text-fuchsia-200 transition hover:bg-white/10"
              title="Generate random username"
            >
              Random
            </button>
          </div>

          <div>
            <div className="flex items-center justify-between gap-3">
              <label className="text-sm font-semibold text-slate-100">Avatar</label>
              <span className="text-xs text-slate-400">Tap to choose</span>
            </div>
            <div className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-5 lg:grid-cols-5">
              {AVATARS.map((item) => (
                <button
                  type="button"
                  key={item}
                  onClick={() => onAvatarChange(item)}
                  className={`flex aspect-square items-center justify-center rounded-2xl text-2xl transition ${
                    avatar === item
                      ? 'border border-fuchsia-300/50 bg-fuchsia-300/20 shadow-[0_0_0_1px_rgba(255,116,216,0.25)] scale-105'
                      : 'border border-white/10 bg-white/5 hover:border-fuchsia-300/30 hover:bg-white/10'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3">
            <button
              onClick={onEnterLobby}
              className="rounded-2xl bg-gradient-to-r from-fuchsia-300 via-violet-300 to-purple-400 px-5 py-4 text-base font-bold text-slate-950 shadow-[0_18px_40px_rgba(255,116,216,0.2)] transition hover:brightness-110"
            >
              Enter Lobby
            </button>
            {user && (
              <button
                onClick={onUseSavedProfile}
                className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-5 py-4 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-400/15"
              >
                Use saved profile
              </button>
            )}
          </div>

          <div className="rounded-[1.5rem] border border-white/8 bg-slate-950/45 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400">Quick rules</p>
            <div className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
              <p>Bulls are exact digits in exact positions.</p>
              <p>Cows are correct digits in the wrong positions.</p>
              <p>A wrong answer during a challenge is treated as a lie and adds pressure.</p>
            </div>
          </div>
        </article>
      </section>
    </>
  )
}
