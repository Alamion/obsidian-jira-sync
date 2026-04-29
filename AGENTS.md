# Obsidian Jira Sync - Community plugin for Obsidian

## Project overview

- **Plugin ID**: `jira-sync`
- **Name**: Jira Issue Manager
- **Target**: Obsidian Community Plugin (TypeScript → bundled JavaScript)
- **Entry point**: `main.ts` compiled to `main.js` and loaded by Obsidian
- **Required release artifacts**: `main.js`, `manifest.json`, and optional `styles.css`
- **Min App Version**: 1.10.1
- **Author**: Alamion
- **Mobile compatible**: Yes (`isDesktopOnly: false`)

## Environment & tooling

- Node.js: use current LTS (Node 18+ recommended)
- **Package manager: yarn** (required - `package.json` defines yarn scripts)
- **Bundler: esbuild** (required - `esbuild.config.mjs` and build scripts depend on it)
- Types: `obsidian` type definitions

### Install

```bash
yarn install
```

### Dev (watch)

```bash
yarn run dev
```

### Production build

```bash
yarn run build
```

### Localization

```bash
yarn run validate_locale_once  # Validate YAML source files
yarn run compile_locale_once  # Compile YAML to JSON
```

## Linting

All three commands must pass without errors:

1. `yarn run format` - No Prettier errors
2. `yarn run lint:fix` - No ESLint errors
3. `yarn run build` - No TypeScript/build errors
4. `yarn run validate_locale_once` - No localization errors

## File & folder conventions

- **Source lives in `src/`**. Keep `main.ts` small and focused on plugin lifecycle.
- **Do not commit build artifacts**: Never commit `node_modules/`, `main.js`, or other generated files.
- Generated output should be placed at the plugin root. Release artifacts must end up at the top level of the plugin folder in the vault.

### Directory structure (`src/`)

| Directory          | Purpose                   | Key Files                                                                                                                                  |
| ------------------ | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `commands/`        | User commands             | `getIssue.ts`, `createIssue.ts`, `updateIssue.ts`, `updateStatus.ts`, `addWorkLogBatch.ts`, `addWorkLogManually.ts`, `batchFetchIssues.ts` |
| `api/`             | Jira REST API             | `base.ts` (core HTTP), `auth.ts`, `issues.ts`, `projects.ts`, `self.ts`                                                                    |
| `settings/`        | Settings tab & components | `default.ts` (defaults), `JiraSettingTab.ts`, `components/*`                                                                               |
| `modals/`          | UI dialogs                | `IssueSearchModal.ts`, `JQLSearchModal.ts`, `IssueWorkLogModal.ts`, `ProjectModal.ts`, `IssueTypeModal.ts`, `IssueStatusModal.ts`          |
| `file_operations/` | File read/write           | `getIssue.ts`, `createUpdateIssue.ts`, `commonPrepareData.ts`                                                                              |
| `tools/`           | Utilities                 | `debugLogging.ts`, `cacheUtils.ts`, `filesUtils.ts`, `convertFunctionString.ts`, `sanitizers.ts`, `asyncLimiter.ts`                        |
| `postprocessing/`  | Live Preview/Reading      | `livePreview.ts`, `reading.ts`                                                                                                             |
| `default/`         | Defaults                  | `defaultTemplate.ts`, `defaultIssue.ts`, `obsidianJiraFieldsMapping.ts`                                                                    |
| `interfaces/`      | TypeScript types          | `settingsTypes.ts`, `index.ts`                                                                                                             |
| `localization/`    | i18n                      | `translator.ts`, `compiled/*.json`, `source/*.yaml`                                                                                        |

## Packages used

| Package        | Purpose           | Usage                                                  |
| -------------- | ----------------- | ------------------------------------------------------ |
| `obsidian`     | Obsidian API      | Core plugin, `requestUrl`, `TFile`, `Plugin` etc.      |
| `esbuild`      | Bundler           | `esbuild.config.mjs` - bundles all deps into `main.js` |
| `typescript`   | Type safety       | TypeScript 4.7.4                                       |
| `fs-extra`     | File operations   | `src/tools/filesUtils.ts`                              |
| `yaml`         | YAML parsing      | Settings validation, field mapping config              |
| `highlight.js` | Code highlighting | `src/tools/markdownHtml.ts`                            |
| `chokidar`     | File watching     | Localization compiler watch mode                       |

## Logging

- Location: `src/tools/debugLogging.ts:1-19`
- **IMPORTANT BUG**: Uses `process.env.NODE_ENV` which is always `undefined` in Obsidian (no Node.js runtime) - logging is **always on** in both dev and production
- Exports: `debugLog`, `debugWarn`, `debugError`
- Used in: `src/api/base.ts` for API request/response logging
- Prefix format: `[DEBUG]`, `[DEBUG WARNING]`, `[DEBUG ERROR]`

```typescript
import { debugLog, debugWarn, debugError } from './tools/debugLogging';
debugLog('Request:', { url, method });
debugWarn('Missing field:', fieldName);
debugError('Failed to fetch:', error);
```

## Cache system

- Maps Jira issue keys to local file paths
- In-memory cache: `issueKeyToFilePathCache` (Map in plugin instance)
- Persisted in settings: `settings.issueKeyToFilePathCache`
- Vault event listeners for maintenance (`main.ts:105-130`):
    - `rename`: updates cache when file is moved
    - `delete`: removes from cache when file is deleted

## Localization (i18n)

- Source files: `src/localization/source/{lang}/*.yaml`
- Compiled to: `src/localization/compiled/{lang}.json`
- Auto-detects locale from `window.localStorage.getItem('language')`
- Falls back to `en` if not found
- Build-time compilation: `src/localization/compiler.js`

## Pre-commit hooks

- Uses husky (`.husky/pre-commit`)
- Current check: `node check-version.js`
- `version-bump.mjs` - syncs version from `package.json` to `manifest.json` and `versions.json`

```bash
# Runs on every commit:
node check-version.js
```

- **Note**: Future pre-commit upgrades may include linting and type checking

## Manifest rules

- Must include:
    - `id` (stable - never change after release)
    - `name`
    - `version` (Semantic Versioning x.y.z)
    - `minAppVersion`
    - `description`
    - `isDesktopOnly` (boolean)
- Keep `minAppVersion` accurate when using newer APIs

## Testing

- Manual install for testing: copy `main.js`, `manifest.json`, `styles.css` to:
    ```
    <Vault>/.obsidian/plugins/<plugin-id>/
    ```
- Reload Obsidian and enable in **Settings → Community plugins**

## Commands & settings

- Commands added via `this.addCommand(...)` in `src/commands/`
- Settings persisted with `this.loadData()` / `this.saveData()`
- Use stable command IDs - avoid renaming after release
- All commands wrapped in `register*Command` functions

## Versioning & releases

- Bump version in `manifest.json` (SemVer) and update `versions.json`
- Run `yarn version` to auto-bump via `version-bump.mjs`
- Create GitHub release with tag matching `manifest.json` version (no leading `v`)
- Attach: `manifest.json`, `main.js`, `styles.css` (if present)

## Security, privacy, and compliance

- Default to local/offline operation. Only make network requests when essential.
- No hidden telemetry.
- Never execute remote code, fetch and eval scripts.
- Minimize scope: read/write only what's necessary inside the vault.
- Use `register*` helpers for all listeners to ensure proper cleanup on unload.

## Performance

- Keep startup light - defer heavy work until needed
- Batch disk access, avoid excessive vault scans
- Debounce/throttle operations in response to file system events

## Coding conventions

- TypeScript with `"strict": true` preferred
- Keep `main.ts` minimal - delegate feature logic to separate modules
- Split large files (~200-300+ lines) into smaller focused modules
- Bundle everything into `main.js` (no unbundled runtime deps)
- Prefer `async/await` over promise chains
- Handle errors gracefully
- **Do not add comments unless explicitly requested**

## Agent do/don't

**Do**

- Add commands with stable IDs (don't rename after release)
- Provide defaults and validation in settings
- Write idempotent code paths
- Use `this.register*` helpers for cleanup

**Don't**

- Introduce network calls without user-facing reason and documentation
- Ship features requiring cloud services without opt-in
- Store or transmit vault contents unless essential

## Common tasks

### Add a command

```typescript
export function registerMyCommand(plugin: JiraPlugin): void {
	plugin.addCommand({
		id: 'my-command',
		name: t('name'),
		checkCallback: (checking: boolean) => {
			const valid = validateSettings(plugin);
			if (!checking && valid) doSomething(plugin);
			return valid;
		},
	});
}
```

### Make API request

```typescript
import { baseRequest } from './api/base';
const issue = await baseRequest(plugin, 'GET', `/issue/${issueKey}`);
```

### Persist settings

```typescript
await this.saveData(this.settings);
```

### Register listeners safely

```typescript
this.registerEvent(
	this.app.workspace.on('file-open', (f) => {
		/* ... */
	}),
);
this.registerDomEvent(window, 'resize', () => {
	/* ... */
});
this.registerInterval(
	window.setInterval(() => {
		/* ... */
	}, 1000),
);
```

## Troubleshooting

- Plugin doesn't load: ensure `main.js` and `manifest.json` at top level of plugin folder
- Build issues: run `yarn run dev` or `yarn run build` to compile
- Commands not appearing: verify `addCommand` runs after `onload` and IDs are unique
- Settings not persisting: ensure `loadData`/`saveData` are awaited

## References

- Obsidian plugin docs: https://docs.obsidian.md
- Plugin guidelines: https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines
- Style guide: https://help.obsidian.md/style-guide
