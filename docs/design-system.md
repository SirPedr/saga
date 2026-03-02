# Saga Design System

## Core Aesthetic

**Arcane Grimoire** — dark vellum backgrounds, aged-ink text, amber candlelight accents.
Typography is the primary design tool. Dark mode is canonical.

## Color Tokens

### Dark Mode (canonical)

```
--vellum:       #0f0d0a   page background
--vellum-2:     #17140f   elevated surface
--vellum-3:     #1e1a14   card / panel
--ink:          #e8ddc8   primary text
--ink-soft:     #a08c6e   secondary text
--ink-faint:    #5a4e3a   placeholder / disabled
--amber:        #d4a348   primary accent / interactive
--amber-deep:   #b8862c   accent hover / pressed
--arcane:       #4a6e8a   secondary accent (cool magical)
--arcane-soft:  #3a5a74   arcane hover
--line:         rgba(232,221,200,0.10)   borders / dividers
--crimson:      #c43030   destructive / danger
--glint:        rgba(255,240,200,0.04)   inset highlight
```

### Light Mode (aged parchment, NOT tropical)

```
--vellum:       #f5f0e8
--vellum-2:     #ede6d6
--vellum-3:     #e5dcc6
--ink:          #1a1510
--ink-soft:     #4a3f2e
--ink-faint:    #9a8e78
--amber:        #b8862c
--amber-deep:   #9a6e1e
--arcane:       #2a4e6a
--arcane-soft:  #1e3e54
--line:         rgba(26,21,16,0.12)
--crimson:      #a02020
--glint:        rgba(255,255,255,0.70)
```

## Typography

| Role             | Font             | Weight  | Notes                             |
| ---------------- | ---------------- | ------- | --------------------------------- |
| Display / H1     | Fraunces (serif) | 500–700 | Earns every use; editorial anchor |
| Body / UI        | Manrope (sans)   | 400–700 | Precise but warm                  |
| Labels / kickers | Manrope          | 700     | Uppercase, wide letter-spacing    |
| Code / IDs       | ui-monospace     | 400     | System monospace stack            |

## Component Guidelines

- Cards: `--vellum-3` bg, `--line` border, warm inner shadow (no glass-morphism)
- Buttons primary: `--amber` bg, `--vellum` text
- Buttons secondary/outline: `--line` border, `--ink` text, `--vellum-3` hover bg
- Dividers: thin, `--line` color — ink-stroke style
- Hover: amber glow or border brightening — never jarring color shifts
- Shadows: warm-dark (not cool/blue-gray)

## Anti-Patterns

NEVER use:

- Tropical colors (lagoon, palm, sand — fully retired)
- Glass-morphism on primary content areas
- Neon / cyberpunk accents
- Gamification chrome (XP bars, badges, etc.)
- Blue-gray or cool-toned shadows
- Generic SaaS color-blocking

## Design Principles

1. Typography First — hierarchy through type before color
2. Atmospheric but Functional — mood without sacrificing usability
3. Ink Over Chrome — crafted depth, not rendered glass
4. Dark Mode is Canon — design dark-first
5. Quiet Confidence — minimal motion, no gamification
