## Mimoe — Level-Based Progression (Revised)

### Structure

Keep the **Vocabulary / Phrases** tab system. Within each tab, cards are grouped into levels. All levels are freely accessible (no locking).

```text
Vocabulary:
  Level 1: Greetings    — Bonjour, Au revoir, Oui, Non, Merci
  Level 2: Essentials   — S'il vous plaît, L'eau, Aide, Ami, Demain
  Level 3: Daily Life   — Maison, Travail, L'argent, La nourriture, Aujourd'hui

Phrases:
  Level 1: Basics       — Comment allez-vous?, Je m'appelle..., Bonjour, Bonne nuit
  Level 2: Getting Around — Où sont les toilettes?, Combien ça coûte?, Je voudrais..., À bientôt
  Level 3: Conversations — Je ne comprends pas, Parlez plus lentement..., J'apprends le français, Pouvez-vous m'aider?
```

### UI Flow

1. **Tab bar** stays at top (Vocabulary / Phrases)
2. Below tabs: **Level Select grid** — shows all levels for that tab. Each level card shows title, card count, and a checkmark if completed. All levels are tappable.
3. Tapping a level enters the **flashcard session** scoped to that level's cards.
4. **Completion screen** shows both "Practice Again" and "Next Level" buttons. If on the last level, only "Practice Again".
5. A back arrow on the flashcard screen returns to level select.
6. Each level should have atleast 15 words/phrases. Look for words/phrases appropriate for a certain level fill them up to make 15. User still has the option to add more words/phrases in a level.
7. The "listening" part should be tappable to stop listening or resume it

### Technical Changes

1. `**src/lib/flashcardData.ts**` — Add a `Level` type (`id`, `title`, `cards`). Export `vocabularyLevels: Level[]` and `phraseLevels: Level[]` using existing card data grouped as above. Keep `FlashcardItem` interface.
2. `**src/components/LevelSelect.tsx**` (new) — Grid of level cards. Props: `levels`, `completedLevelIds`, `onSelectLevel`. Shows checkmark on completed levels. No lock icons.
3. `**src/components/FlashcardApp.tsx**` — Keep tab state. Add `selectedLevel: string | null` state. When null, show LevelSelect; when set, show flashcard session. Track `completedVocabLevels` and `completedPhraseLevels` in localStorage. On completion, mark level done and show both buttons.
4. `**src/components/Flashcard.tsx**` — Add optional `onNextLevel` and `onBack` props. Completion screen renders both "Practice Again" and "Next Level" buttons. Add back arrow header.