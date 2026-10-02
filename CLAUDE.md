@AGENTS.md

## Code standards

All code must meet industry-standard production quality. Concretely:

**General**
- Read the surrounding code first and match its structure, naming, and idioms; don't introduce a second way of doing something the codebase already does one way.
- Small, single-purpose functions and components; no dead code, commented-out code, or leftover debug logging.
- Descriptive names; no magic numbers or strings — lift them into named constants.
- Handle errors explicitly at boundaries (network, DB, user input); never silently swallow them unless it's intentional and commented (e.g. best-effort notification scheduling).
- Comments explain *why*, not *what*. Public helpers and non-obvious logic get a short docstring.
- Never commit secrets; config comes from env vars (`.env` / `.env.local` are git-ignored).
- Don't add a dependency when the platform or an existing dependency already covers it.
- A task is done only when the project's checks pass (below) — report failures, never hide them.

**App (TypeScript / Expo)**
- TypeScript `strict`; no `any`, no `@ts-ignore`/non-null `!` without a justifying comment.
- Function components + hooks only. Server state goes through React Query hooks in `src/api/hooks.ts` — no `fetch` in screens.
- Route files in `src/app/` contain screens only; reusable UI goes in `src/components/`, logic/helpers in `src/lib/`.
- Colors come only from `useTheme()` tokens (add a token to both `light` and `dark` in `theme.ts` if one is missing); layout gaps/padding/radii use `spacing`/`radius`.
- Follow React rules of hooks and the React Compiler lint rules (e.g. no reading refs during render).
- Accessibility: interactive elements are `Pressable`/`Button` with an accessible role/label; text respects the theme in light and dark mode.
- Prefer JS-only solutions; adding a native dependency requires a new APK, so call it out explicitly.
- Keep `src/api/types.ts` in sync with backend `schemas.py` in the same change.
- Checks (also run in CI before every OTA publish) — must pass with zero errors:
  `npm run lint && npm run typecheck`
