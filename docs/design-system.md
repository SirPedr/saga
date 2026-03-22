# Saga Design System

## Core Aesthetic

**Cathedral Gothic** — cold stone surfaces, stained glass purples, midnight blues, deep crimson accents.
Typography is the primary design tool. Dark mode is canonical.

## Color Tokens

All values use oklch() format. Hex approximations shown for reference.

### Dark Mode (canonical)

```
--stone:         oklch(0.08 0.005 280)   near-black midnight page background
--stone-2:       oklch(0.12 0.01 280)    elevated surface
--stone-3:       oklch(0.16 0.012 280)   card / panel
--silver:        oklch(0.83 0.012 280)   primary text
--silver-soft:   oklch(0.57 0.02 280)    secondary text
--silver-faint:  oklch(0.33 0.025 280)   placeholder / disabled
--crimson:       oklch(0.45 0.18 20)     primary accent (blood)
--crimson-deep:  oklch(0.38 0.16 18)     accent hover / pressed
--arcane:        oklch(0.35 0.09 300)    secondary accent (stained glass purple)
--arcane-soft:   oklch(0.30 0.08 298)    arcane hover
--line:          oklch(0.83 0.012 280 / 0.08)   borders / dividers
--blood:         oklch(0.48 0.19 22)     destructive / danger
--glint:         oklch(0.85 0.02 250 / 0.03)    cold moonlight inset
```

### Light Mode (cold stone, NOT tropical)

```
--stone:         oklch(0.93 0.01 280)    cold off-white
--stone-2:       oklch(0.89 0.015 280)   elevated surface
--stone-3:       oklch(0.84 0.018 280)   card / panel
--silver:        oklch(0.12 0.01 280)    primary text
--silver-soft:   oklch(0.30 0.02 280)    secondary text
--silver-faint:  oklch(0.62 0.025 280)   placeholder / disabled
--crimson:       oklch(0.38 0.16 18)     primary accent
--crimson-deep:  oklch(0.32 0.14 16)     accent hover / pressed
--arcane:        oklch(0.22 0.08 296)    secondary accent
--arcane-soft:   oklch(0.18 0.07 294)    arcane hover
--line:          oklch(0.12 0.01 280 / 0.10)   borders / dividers
--blood:         oklch(0.44 0.17 20)     destructive / danger
--glint:         oklch(1 0 0 / 0.65)     warm inset
```

## Typography

| Role             | Font                | Weight  | Notes                                         |
| ---------------- | ------------------- | ------- | --------------------------------------------- |
| Display / H1     | Cinzel (serif)      | 500–700 | Chiseled, monumental — cathedral inscriptions |
| Body / UI        | Crimson Pro (serif) | 400–700 | Elegant readability, gothic warmth            |
| Labels / kickers | Crimson Pro         | 700     | Uppercase, wide letter-spacing                |
| Code / IDs       | ui-monospace        | 400     | System monospace stack                        |

## Component Guidelines

- Cards: `--stone-3` bg, `--line` border, cold inner shadow (no glass-morphism)
- Buttons primary: `--crimson` bg, `--stone` text
- Buttons secondary/outline: `--line` border, `--silver` text, `--stone-3` hover bg
- Dividers: thin, `--line` color — cold stone-stroke style
- Hover: crimson glow or border brightening — never jarring color shifts
- Shadows: cold-dark with blue undertone (not warm/sepia)

## Anti-Patterns

NEVER use:

- Tropical colors (lagoon, palm, sand — fully retired)
- Warm/amber/gold accents (replaced by crimson)
- Glass-morphism on primary content areas
- Neon / cyberpunk accents
- Gamification chrome (XP bars, badges, etc.)
- Warm-toned shadows
- Generic SaaS color-blocking

## Design Principles

1. Typography First — hierarchy through type before color
2. Atmospheric but Functional — mood without sacrificing usability
3. Stone Over Chrome — crafted depth, not rendered glass
4. Dark Mode is Canon — design dark-first
5. Quiet Reverence — minimal motion, no gamification
