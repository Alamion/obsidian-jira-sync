# Contributing

## Development setup

```bash
yarn install
```

## Commands

```bash
yarn run dev              # Watch mode (esbuild + localization)
yarn run build            # Production build
yarn run format           # Prettier formatting
yarn run lint:fix         # ESLint autofix
yarn run test             # Unit tests (Vitest)
yarn run test:int         # API integration tests
yarn run validate_locale_once  # Validate translation keys
yarn run compile_locale_once   # Compile YAML -> JSON
```

## Guidelines

- **Source in `src/`**, keep `main.ts` focused on lifecycle
- **No comments** in code unless the logic is non-obvious
- **Bundle everything** — no unbundled runtime dependencies
- **Use `this.register*`** helpers for all listeners and intervals
- **Stable command IDs** — never rename after release
- **Follow existing patterns** — look at similar files first
- **Prefer `checkCallback`** for commands (cleaner UX)
- **Async/await** over promise chains
- **Handle errors gracefully** — no silent failures

## Pre-commit checks

The repo uses husky. Currently runs `node check-version.js` to validate version consistency across `package.json`, `manifest.json`, and `versions.json`.

## Versioning

Run `yarn run version` to bump — this syncs `package.json` → `manifest.json` + `versions.json` via `version-bump.mjs`. Semantic versioning (x.y.z).

## Release

1. Bump version
2. Build: `yarn run build`
3. Create GitHub release with tag matching `manifest.json` version (no leading `v`)
4. Attach: `main.js`, `manifest.json`, `styles.css` (if changed)

## Testing

- Unit tests: `yarn run test`
- Integration tests: `yarn run test:int` (requires a running Jira instance)
- Manual test: copy `main.js`, `manifest.json`, `styles.css` to `<vault>/.obsidian/plugins/jira-sync/` and reload Obsidian

## Translation / i18n

- Source files: `src/localization/source/{lang}/*.yaml` (one YAML per component)
- Compile: `yarn run compile_locale_once`
- Validate: `yarn run validate_locale_once` (checks all keys exist and are referenced in code)
- Locale is auto-detected from `window.localStorage.getItem('language')`, falls back to `en`

## Getting help

Open an issue on GitHub for bugs, feature requests, or questions.
