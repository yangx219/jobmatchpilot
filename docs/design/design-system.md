# V4 Design System — Light Professional

The source of truth for runtime tokens is `src/app/neutral.css`. Existing components continue using semantic Tailwind colors (`background`, `card`, `primary`, `muted`, `accent`, `border`) so the migration does not require a page rewrite.

## Principles

- Calm light surfaces; blue is reserved for primary actions and selection.
- Status colors communicate meaning, never decoration or hiring probability.
- Cards use a fine border, 14px radius and optional low-contrast shadow.
- Controls use a 9px radius and visible focus ring.
- Desktop content uses 24px outer spacing; mobile uses 16px.
- The expanded desktop rail is 240px; the collapsed rail remains 56px.

## Semantic tokens

| Purpose | Token | Value |
|---|---|---|
| App background | `--app-bg` | `#F6F8FC` |
| Surface | `--surface` | `#FFFFFF` |
| Muted surface | `--surface-muted` | `#F9FAFC` |
| Selected surface | `--surface-selected` | `#EDF4FF` |
| Primary text | `--text-primary` | `#17263C` |
| Secondary text | `--text-secondary` | `#607086` |
| Primary action | `--primary` | equivalent of `#356FE8` |
| Success | `--success` | `#16866B` |
| Warning | `--warning` | `#B87918` |
| Danger | `--danger` | `#CB4452` |

## Migration rules

1. Use semantic colors rather than page-specific hex values.
2. Do not remove dark-mode variables until product scope explicitly removes dark mode.
3. Do not rename routes as part of visual work.
4. New pages must implement loading, empty, error and normal states.
5. Navigation labels must exist in French, English and Chinese.
