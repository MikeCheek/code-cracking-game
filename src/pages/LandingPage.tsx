type LandingPageProps = {
  onStartPlaying: () => void
  onTryDemo: () => void
  onSetUpProfile: () => void
}

const navItems = [
  { label: 'Core', href: '#core' },
  { label: 'Modes', href: '#modes' },
  { label: 'Social', href: '#social' },
  { label: 'Flow', href: '#flow' },
]

const featureColumns = [
  {
    title: 'Play your way',
    items: ['Anonymous sessions', 'Optional Google login', 'Mobile-first PWA install'],
  },
  {
    title: 'Match systems',
    items: ['RPS for first turn', 'Lie detection and penalties', 'Room history and rejoin'],
  },
  {
    title: 'Multiplayer tools',
    items: ['Invite links', 'Telegram and WhatsApp sharing', 'Spectator mode and replay'],
  },
]

const modeCards = [
  {
    title: 'Numbers mode',
    eyebrow: 'Classic deduction',
    text: 'Create a numeric code, guess positions, and use strikes and balls to narrow the solution fast.',
    bullets: ['Code length from 1 to 5', 'Optional duplicate digits', 'Fastest route to a pure logic match'],
  },
  {
    title: 'Words mode',
    eyebrow: 'Language challenge',
    text: 'Swap digits for words and keep the same deduction loop with a different mental rhythm.',
    bullets: ['English, Italian, Spanish, and French', 'Word length from 1 to 10', 'Great for players who want a broader challenge'],
  },
]

const socialSteps = [
  {
    step: '1. Share instantly',
    text: 'Send an invite link, Telegram message, WhatsApp share, or native share sheet in one tap.',
  },
  {
    step: '2. Play together',
    text: 'Use public rooms, private rooms, spectators, or same-phone hotseat play when you are with someone in person.',
  },
  {
    step: '3. Continue the story',
    text: 'Replay, review history, rejoin a broken match, and keep the room alive instead of starting over.',
  },
]

const statPills = [
  { label: 'Rounds', value: 'Fast' },
  { label: 'Modes', value: '2' },
  { label: 'Language', value: '4' },
  { label: 'Replay', value: 'Instant' },
]

const guessFeedback = [
  { label: 'Strikes', value: 2, className: 'bg-emerald-400/15 text-emerald-200 border-emerald-300/20' },
  { label: 'Balls', value: 1, className: 'bg-cyan-400/15 text-cyan-100 border-cyan-300/20' },
  { label: 'Misses', value: 1, className: 'bg-rose-400/15 text-rose-200 border-rose-300/20' },
]

export function LandingPage({ onStartPlaying, onTryDemo, onSetUpProfile }: LandingPageProps) {
  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-2 pb-8 sm:px-0">
      <header className="sticky top-4 z-10 rounded-full border border-white/10 bg-slate-950/50 px-4 py-3 backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img
              src="/codecracking.png"
              alt="Code Cracking logo"
              className="h-10 w-10 rounded-2xl border border-white/15 object-cover"
            />
            <div>
              <p className="text-sm font-black text-white">Code Cracking</p>
              <p className="text-xs text-slate-400">Realtime code deduction game</p>
            </div>
          </div>

          <nav className="flex flex-wrap items-center gap-2">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-white/10"
              >
                {item.label}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <article className="overflow-hidden rounded-[2.25rem] border border-white/10 bg-gradient-to-br from-slate-950 via-slate-950 to-fuchsia-950/60 p-5 sm:p-7 lg:p-8">
        <div className="grid gap-8 lg:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.34em] text-cyan-200/80">Play the game</p>
            <h1 className="mt-3 max-w-2xl text-4xl font-black leading-[0.92] text-white sm:text-6xl">
              Crack secret codes. See the logic. Bring friends into the match.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-200 sm:text-lg">
              Code Cracking is a social deduction game built for quick invite-driven sessions. It explains itself as you play: numbers or words, one opponent, clear feedback, and a strong replay loop.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={onStartPlaying}
                className="rounded-2xl bg-gradient-to-r from-fuchsia-300 via-violet-300 to-purple-400 px-5 py-3 text-sm font-black text-slate-950 transition hover:brightness-110"
              >
                Start playing
              </button>
              <button
                type="button"
                onClick={onTryDemo}
                className="rounded-2xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Try the demo
              </button>
              <button
                type="button"
                onClick={onSetUpProfile}
                className="rounded-2xl border border-white/10 bg-transparent px-5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/5"
              >
                Set up profile
              </button>
            </div>

            <div className="mt-6 flex flex-wrap gap-2 text-xs text-slate-300">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">No account required</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Invite by link</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Telegram and WhatsApp share</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Installable PWA</span>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-cyan-200/80">Core loop</p>
                <div className="flex gap-1.5">
                  {statPills.map((item) => (
                    <span key={item.label} className="rounded-full border border-white/10 bg-slate-950/50 px-2.5 py-1 text-[10px] font-semibold text-slate-300">
                      {item.label}: {item.value}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-4 rounded-[1.75rem] border border-white/10 bg-slate-950/55 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Secret code</p>
                    <p className="mt-1 font-mono text-3xl font-black tracking-[0.24em] text-white">4 8 1 6</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-2xl border border-emerald-300/20 bg-emerald-400/10 px-3 py-2 text-center">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-emerald-100/80">Strikes</p>
                      <p className="text-xl font-black text-emerald-100">2</p>
                    </div>
                    <div className="rounded-2xl border border-cyan-300/20 bg-cyan-400/10 px-3 py-2 text-center">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-cyan-100/80">Balls</p>
                      <p className="text-xl font-black text-cyan-100">1</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <div className="h-2.5 flex-1 rounded-full bg-white/8">
                    <div className="h-2.5 w-[68%] rounded-full bg-gradient-to-r from-fuchsia-300 via-violet-300 to-cyan-300" />
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold text-slate-300">3 of 4 digits found</span>
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  {guessFeedback.map((item) => (
                    <div key={item.label} className={`rounded-2xl border px-3 py-3 text-center ${item.className}`}>
                      <p className="text-[10px] uppercase tracking-[0.18em] opacity-80">{item.label}</p>
                      <p className="mt-1 text-2xl font-black">{item.value}</p>
                    </div>
                  ))}
                </div>

                <p className="mt-4 text-sm text-slate-300">
                  Every turn narrows the code, then hands the move to the other player.
                </p>
              </div>
            </div>

            <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-fuchsia-400/10 via-violet-400/10 to-cyan-300/10 p-4 sm:p-5">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-fuchsia-200/80">Social play</p>
              <div className="mt-4 grid gap-3">
                <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-400/15 text-xl">🔗</div>
                    <div>
                      <p className="text-sm font-semibold text-white">Invite a friend fast</p>
                      <p className="text-sm text-slate-300">Share the room link, launch Telegram or WhatsApp, or use native sharing on mobile.</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-400/15 text-xl">👥</div>
                    <div>
                      <p className="text-sm font-semibold text-white">Play together or watch</p>
                      <p className="text-sm text-slate-300">Public rooms, private rooms, spectator mode, and same-phone hotseat all fit the same flow.</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-400/15 text-xl">♻</div>
                    <div>
                      <p className="text-sm font-semibold text-white">Keep the room alive</p>
                      <p className="text-sm text-slate-300">Replay instantly, review history, and rejoin if somebody leaves mid-match.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </article>

      <article id="core" className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="glass-panel rounded-3xl p-4 sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-cyan-200/80">What makes it work</p>
          <h2 className="mt-2 text-2xl font-black text-white">The code-cracking core is simple and readable.</h2>
          <div className="mt-4 space-y-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm font-bold text-white">Strikes and balls do the teaching</p>
              <p className="mt-1 text-sm text-slate-300">Players immediately understand when a guess is correct, near, or completely off.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm font-bold text-white">Bluffing adds tension</p>
              <p className="mt-1 text-sm text-slate-300">The lie system turns each round into a small mind game, not just a puzzle.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm font-bold text-white">Replays are part of the product</p>
              <p className="mt-1 text-sm text-slate-300">The game is built to keep the room active and make the next round effortless.</p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-slate-950/40 p-4 sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-fuchsia-200/80">Feature map</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {featureColumns.map((group) => (
              <div key={group.title} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-300">{group.title}</p>
                <ul className="mt-3 space-y-2 text-sm text-slate-200">
                  {group.items.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="mt-1 h-2 w-2 rounded-full bg-cyan-300" aria-hidden="true" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-[1.5rem] border border-white/10 bg-gradient-to-br from-slate-950 to-slate-900 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-amber-200/80">Room view preview</p>
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200">
                  <span>Room name</span>
                  <span className="font-semibold text-white">Nebula Vault</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200">
                  <span>Mode</span>
                  <span className="font-semibold text-white">Numbers</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200">
                  <span>Privacy</span>
                  <span className="font-semibold text-white">Private invite</span>
                </div>
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-white/10 bg-gradient-to-br from-fuchsia-400/15 via-violet-400/10 to-cyan-300/15 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-200/80">Replay loop</p>
              <div className="mt-3 flex items-center justify-center gap-2">
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-200">Guess</span>
                <span className="text-white/70">→</span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-200">Answer</span>
                <span className="text-white/70">→</span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-200">Rematch</span>
              </div>
              <div className="mt-4 h-28 rounded-[1.5rem] border border-white/10 bg-slate-950/50 p-3">
                <div className="flex h-full items-end gap-2">
                  <div className="h-[40%] flex-1 rounded-t-2xl bg-emerald-400/60" />
                  <div className="h-[75%] flex-1 rounded-t-2xl bg-fuchsia-400/60" />
                  <div className="h-[52%] flex-1 rounded-t-2xl bg-violet-400/60" />
                  <div className="h-[88%] flex-1 rounded-t-2xl bg-cyan-400/60" />
                </div>
              </div>
              <p className="mt-3 text-sm text-slate-200">The room keeps moving from match to match instead of resetting the social context.</p>
            </div>
          </div>
        </div>
      </article>

      <article id="modes" className="grid gap-4 lg:grid-cols-2">
        {modeCards.map((mode) => (
          <div key={mode.title} className="overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/45 p-5 sm:p-6">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-cyan-200/80">{mode.eyebrow}</p>
            <h3 className="mt-2 text-2xl font-black text-white">{mode.title}</h3>
            <p className="mt-3 text-sm leading-6 text-slate-300">{mode.text}</p>

            <div className="mt-4 rounded-[1.75rem] border border-white/10 bg-slate-950/55 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-[0.22em] text-slate-400">Input style</span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold text-slate-300">{mode.title === 'Numbers mode' ? 'Digits' : 'Words'}</span>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <div className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-center font-mono text-lg tracking-[0.3em] text-white">
                  {mode.title === 'Numbers mode' ? '8 1 4 2' : 'c o d e'}
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {mode.bullets.map((bullet) => (
                <div key={bullet} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-400/15 text-cyan-100">•</span>
                  <span>{bullet}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </article>

      <article id="social" className="grid gap-4 lg:grid-cols-[1.02fr_0.98fr]">
        <div className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-fuchsia-400/10 via-violet-400/10 to-cyan-300/10 p-5 sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-fuchsia-200/80">Social experience</p>
          <h2 className="mt-2 text-2xl font-black text-white">Designed to spread through groups, not just individual play.</h2>
          <div className="mt-4 space-y-3">
            {socialSteps.map((item) => (
              <div key={item.step} className="rounded-2xl border border-white/10 bg-slate-950/45 p-4">
                <p className="text-sm font-bold text-white">{item.step}</p>
                <p className="mt-1 text-sm text-slate-300">{item.text}</p>
              </div>
            ))}
          </div>
        </div>

        <div id="flow" className="grid gap-4">
          <div className="glass-panel rounded-3xl p-4 sm:p-6">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-amber-200/80">Player flow</p>
            <div className="mt-4 grid gap-3">
              {[
                { label: '1. Open the room', value: 'Create public or private sessions with room names and passwords.' },
                { label: '2. Choose the mode', value: 'Start with numbers or words, plus optional duplicates and language selection.' },
                { label: '3. Share the invite', value: 'Use the built-in social share tools for the fastest possible handoff.' },
                { label: '4. Finish strong', value: 'Review results, vote to replay, and keep your room rolling.' },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-sm font-bold text-white">{item.label}</p>
                  <p className="mt-1 text-sm text-slate-300">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-panel rounded-3xl p-4 sm:p-6">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-300">Entry points</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <button type="button" onClick={onStartPlaying} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm font-semibold text-white transition hover:bg-white/10">Play now</button>
              <button type="button" onClick={onTryDemo} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm font-semibold text-white transition hover:bg-white/10">Try demo</button>
              <button type="button" onClick={onSetUpProfile} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm font-semibold text-white transition hover:bg-white/10">Set profile</button>
            </div>
          </div>
        </div>
      </article>
    </section>
  )
}