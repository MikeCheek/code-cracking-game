/**
 * REFACTORING EXAMPLES - How to use the new modular components
 *
 * This file shows practical examples of integrating the new components
 * into the GameplayPage without breaking existing functionality
 */

// ============================================================================
// Example 1: Using CodeDisplay + DigitPad for Secret Input
// ============================================================================

import { CodeDisplay, DigitPad } from './components'

// Before (inline JSX):
// <div className="w-full rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 
//        text-center font-mono text-2xl tracking-[0.35em] text-slate-100">
//   {(secretInput || '').padEnd(maxCodeLength, '•')}
// </div>
// <div className="grid grid-cols-5 gap-2">
//   {DIGIT_KEYS.map((digit) => (
//     <button
//       key={`secret-digit-${digit}`}
//       type="button"
//       onClick={() => onSecretInputChange(appendSymbol(secretInput, digit))}
//       disabled={secretLocked || secretInput.includes(digit)}
//       className="rounded-xl border border-white/10 bg-white/5 px-2 py-2 text-sm font-bold 
//                  text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-45"
//     >
//       {digit}
//     </button>
//   ))}
// </div>

// After (using components):
{
  <CodeDisplay 
    value={secretInput} 
    maxLength={maxCodeLength}
    label="Your Secret Code"
  />
  <DigitPad
    value={secretInput}
    onChange={(value) => onSecretInputChange(value)}
    disabled={secretLocked}
    onBackspace={() => onSecretInputChange(secretInput.slice(0, -1))}
    onClear={() => onSecretInputChange('')}
    showControls={true}
  />
}

// ============================================================================
// Example 2: Using the Emote System Hook
// ============================================================================

const GameplayPageExampleWithEmote = () => {
  const emote = useEmoteSystem(room.id, (emoteValue) => {
    // Callback when emote is sent
    onSendQuickEmote(emoteValue)
    // Add animation
    emote.addFlyingEmote(emoteValue)
  })

  // Now emote provides:
  // - showEmotePicker: boolean
  // - setShowEmotePicker: (boolean) => void
  // - selectedQuickEmote: string
  // - setSelectedQuickEmote: (string) => void
  // - emotesEnabled: boolean
  // - setEmotesEnabled: (boolean) => void
  // - emoteScale: number
  // - setEmoteScale: (number) => void
  // - flyingEmotes: FlyingEmote[]
  // - sendQuickEmote: (emote: string) => void
  // - addFlyingEmote: (emote: string) => void

  return ()
}

// ============================================================================
// Example 3: Using Emote Components Together
// ============================================================================

const EmoteSystemUsage = () => {
  const emote = useEmoteSystem(room.id, (emoteValue) => {
    onSendQuickEmote(emoteValue)
    emote.addFlyingEmote(emoteValue)
  })

  return (
    <>
      {/* Flying animations */}
      <FlyingEmotesContainer
        emotes={emote.flyingEmotes}
        enabled={emote.emotesEnabled}
        scale={emote.emoteScale}
      />

      {/* Emote menu and button */}
      <div className="fixed bottom-20 left-4 z-[990] flex flex-col items-start gap-2">
        <EmotePickerPanel
          isOpen={emote.showEmotePicker}
          emotesEnabled={emote.emotesEnabled}
          emoteScale={emote.emoteScale}
          onToggleEmotes={() => emote.setEmotesEnabled(!emote.emotesEnabled)}
          onScaleChange={emote.setEmoteScale}
          onEmoteSelect={(selectedEmote) => {
            emote.sendQuickEmote(selectedEmote)
            emote.setShowEmotePicker(false)
          }}
        />
        <EmoteMainButton
          selectedEmote={emote.selectedQuickEmote}
          isOpen={emote.showEmotePicker}
          onToggleMenu={() => emote.setShowEmotePicker(!emote.showEmotePicker)}
          onSendEmote={() => emote.sendQuickEmote(emote.selectedQuickEmote)}
        />
      </div>
    </>
  )
}

// ============================================================================
// Example 4: Integration in GameplayPage (Suggested)
// ============================================================================

export function GameplayPageRefactored({
  room,
  secretInput,
  onSecretInputChange,
  onSendQuickEmote,
  // ... other props
}: GameplayPageProps) {
  // Initialize emote system
  const emote = useEmoteSystem(room.id, (emoteValue) => {
    onSendQuickEmote(emoteValue)
    emote.addFlyingEmote(emoteValue)
  })

  return (
    <section>
      {/* Secret Code Setup */}
      <article>
        <CodeDisplay 
          value={secretInput} 
          maxLength={4}
          label="Secret Code"
        />
        <DigitPad
          value={secretInput}
          onChange={onSecretInputChange}
          onBackspace={() => onSecretInputChange(secretInput.slice(0, -1))}
          onClear={() => onSecretInputChange('')}
        />
      </article>

      {/* Emote System */}
      <FlyingEmotesContainer
        emotes={emote.flyingEmotes}
        enabled={emote.emotesEnabled}
        scale={emote.emoteScale}
      />
      <div className="fixed bottom-20 left-4 z-[990] flex flex-col items-start gap-2">
        <EmotePickerPanel
          isOpen={emote.showEmotePicker}
          emotesEnabled={emote.emotesEnabled}
          emoteScale={emote.emoteScale}
          onToggleEmotes={() => emote.setEmotesEnabled(!emote.emotesEnabled)}
          onScaleChange={emote.setEmoteScale}
          onEmoteSelect={(selectedEmote) => {
            emote.sendQuickEmote(selectedEmote)
            emote.setShowEmotePicker(false)
          }}
        />
        <EmoteMainButton
          selectedEmote={emote.selectedQuickEmote}
          isOpen={emote.showEmotePicker}
          onToggleMenu={() => emote.setShowEmotePicker(!emote.showEmotePicker)}
          onSendEmote={() => emote.sendQuickEmote(emote.selectedQuickEmote)}
        />
      </div>

      {/* Rest of UI... */}
    </section>
  )
}

// ============================================================================
// Component API Reference
// ============================================================================

/*
┌─ CodeDisplay ─────────────────────────────────────────────────────────────┐
│ Displays a masked code input using bullet points                          │
├─────────────────────────────────────────────────────────────────────────────┤
│ value: string              - Current code value                            │
│ maxLength: number          - Max length for padding                        │
│ label?: string             - Optional label                                │
└─────────────────────────────────────────────────────────────────────────────┘

┌─ DigitPad ────────────────────────────────────────────────────────────────┐
│ Reusable 0-9 digit input pad with backspace/clear                         │
├─────────────────────────────────────────────────────────────────────────────┤
│ value: string              - Current input value                           │
│ onChange: (value) => void  - Called when digit clicked                     │
│ disabled?: boolean         - Disable all buttons                           │
│ onBackspace?: () => void   - Backspace handler                             │
│ onClear?: () => void       - Clear handler                                 │
│ showControls?: boolean     - Show backspace/clear buttons                  │
└─────────────────────────────────────────────────────────────────────────────┘

┌─ useEmoteSystem Hook ─────────────────────────────────────────────────────┐
│ Manages all emote state and animations                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│ Returns:                                                                   │
│ - showEmotePicker: boolean                                                │
│ - setShowEmotePicker: (boolean) => void                                   │
│ - selectedQuickEmote: string                                              │
│ - setSelectedQuickEmote: (string) => void                                 │
│ - emotesEnabled: boolean                                                  │
│ - setEmotesEnabled: (boolean) => void                                     │
│ - emoteScale: number                                                      │
│ - setEmoteScale: (number) => void                                         │
│ - flyingEmotes: FlyingEmote[]                                             │
│ - sendQuickEmote: (emote: string) => void                                 │
│ - addFlyingEmote: (emote: string) => void                                 │
└─────────────────────────────────────────────────────────────────────────────┘

┌─ FlyingEmotesContainer ───────────────────────────────────────────────────┐
│ Renders animated flying emotes                                            │
├─────────────────────────────────────────────────────────────────────────────┤
│ emotes: FlyingEmote[]      - Animation data                                │
│ enabled: boolean           - Show/hide emotes                              │
│ scale: number              - Size multiplier (0.5-2)                       │
└─────────────────────────────────────────────────────────────────────────────┘

┌─ EmotePickerPanel ────────────────────────────────────────────────────────┐
│ Menu with emote grid and settings                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│ isOpen: boolean            - Menu visibility                               │
│ emotesEnabled: boolean     - On/Off toggle state                           │
│ emoteScale: number         - Current scale (0.5-2)                         │
│ onToggleEmotes: () => void - Toggle on/off                                 │
│ onScaleChange: (n) => void - Scale slider                                  │
│ onEmoteSelect: (s) => void - Emote clicked                                 │
└─────────────────────────────────────────────────────────────────────────────┘

┌─ EmoteMainButton ─────────────────────────────────────────────────────────┐
│ Main emote button with hold-press logic                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│ selectedEmote: string      - Icon to display                               │
│ isOpen: boolean            - Menu open state                               │
│ onToggleMenu: () => void   - Tap to toggle                                 │
│ onSendEmote: () => void    - Hold to send                                  │
└─────────────────────────────────────────────────────────────────────────────┘
*/
