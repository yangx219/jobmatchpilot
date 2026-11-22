# Languages and public homepage

Supported interface locales: French (`fr`, default), English (`en`) and
Simplified Chinese (`zh`).

- Shared catalogs: `src/lib/i18n/messages.ts` and `ui-messages.ts`.
- Cookie: `jobmatchpilot-language`, one-year lifetime, same-site Lax. The cookie is
  read by the server for initial HTML and metadata and by the assistant route
  for its default response-language instruction.
- `LanguageProvider` updates client UI and refreshes server components after a
  selection. It updates the document's `lang` attribute. No model or external
  translation service is involved in switching interface language.
- Landing, auth, workspace and navigation use the shared locale. Common labels
  across job, resume, task, monitoring and settings screens are catalogued.
- Application-owned strings can use `useI18n().t` in client components,
  `getI18n()` on the server or `UiText` for static application labels.
- User-entered job titles, companies, descriptions, CV content, saved notes,
  existing AI output and provider errors are not automatically translated.
  Historical model output remains in the language in which it was generated.
- Some advanced upstream explanatory text and runtime error strings still use
  their original language. Uncatalogued text falls back to the source string;
  this is not a claim of an exhaustive translation of every upstream screen.

`/` now displays a public product homepage, for visitors and signed-in users.
It does not query the user count or redirect first-time visitors to signup.
The signed-in call to action opens the workspace. `/signin` and `/signup` remain
explicit routes; `/dashboard` and user-data APIs retain authentication checks.
The homepage preview uses clearly labelled fictional job examples and makes no
claims about real customers, hiring probabilities or complete web coverage.

Checks:

    npm test -- __tests__/i18n.spec.tsx
    node scripts/smoke-multilingual.mjs
    node --env-file=.env scripts/smoke-workspace.mjs

Browser checks require a running local server and installed Google Chrome.
The workspace script creates and cleans its own temporary test account.
