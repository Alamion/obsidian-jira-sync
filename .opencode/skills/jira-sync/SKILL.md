---
name: jira-sync
description: >-
    Project-specific knowledge for the Jira Issue Manager plugin.
    Covers architecture, known bugs, commands, cache, localization,
    field mapping, indicator system, build/test commands, and release process.
    Use this skill when implementing features, fixing bugs, or
    navigating the codebase.
license: MIT
compatibility: opencode
metadata:
    plugin-id: jira-sync
    display-name: Jira Issue Manager
    entry: src/main.ts
---

# Jira Sync — Project-specific knowledge

## Architecture

- **Plugin ID**: `jira-sync`, display name: "Jira Issue Manager"
- **Entry**: `src/main.ts` → `JiraPlugin extends Plugin`
- **10 commands** registered via `register*Command` wrappers in `src/commands/`
- **Settings**: `src/settings/default.ts` — `JiraSettingsInterface` with connections, field mappings, cache
- **API layer**: `src/api/base.ts` — `baseRequest(plugin, method, path)` constructs `{jiraUrl}/rest/api/{version}{path}`
- **Multi-connection**: `settings.connections[]`, `currentConnectionIndex`

## Known bugs

- `src/tools/debugLogging.ts:1` — `process.env.NODE_ENV` is always `undefined` in Obsidian (no Node.js runtime). Logging is **always on** in both dev and production. Prefix: `[DEBUG]`, `[DEBUG WARNING]`, `[DEBUG ERROR]`.

## Directory structure

```
src/
├── main.ts                 # Plugin lifecycle, cache init, command/settings registration
├── api/                    # Jira REST API (base, auth, issues, projects, self)
├── commands/               # 10 user-facing commands
├── modals/                 # UI dialogs (search, JQL, worklog, project/type/status selectors)
├── settings/               # Settings tab + components (connection, field mapping, timekeep)
├── file_operations/        # File read/write for issue notes
├── tools/                  # Utilities (logging, cache, files, field mapping, sanitizers, etc.)
├── postprocessing/         # Live Preview (CM6) + Reading mode hide-jira-markers
├── default/                # Default template, mock issue, built-in field mappings
├── interfaces/             # TypeScript types
└── localization/           # i18n (en/ru YAML sources → compiled JSON)
```

## Commands

| ID                              | Name                                     |
| ------------------------------- | ---------------------------------------- |
| `get-issue-jira`                | Get current issue from Jira              |
| `get-issue-jira-key`            | Get issue from Jira with custom key      |
| `create-issue-jira`             | Create issue in Jira                     |
| `update-issue-jira`             | Update issue in Jira                     |
| `update-issue-status-jira`      | Update issue status in Jira              |
| `update-work-log-jira-manually` | Update work log manually                 |
| `update-work-log-jira-batch`    | Update work log by batch                 |
| `batch-fetch-issues-jira`       | Batch Fetch Issues by JQL                |
| `add-comment-jira`              | Add comment to Jira                      |
| `rebuild-issue-cache`           | Rebuild issue file cache from filesystem |

## Cache system

- In-memory `Map<string, string>` in `JiraPlugin` instance
- Persisted in `settings.issueKeyToFilePathCache`
- Vault event listeners for maintenance: `rename` updates path, `delete` removes entry
- `rebuildCache()` scans issues folder, reads frontmatter `key` fields

## Localization

- Sources: `src/localization/source/{lang}/*.yaml` → compiled to `src/localization/compiled/{lang}.json`
- Locale auto-detected from `window.localStorage.getItem('language')`, falls back to `en`
- Build commands: `yarn run compile_locale_once`, `yarn run validate_locale_once`

## Field mapping system

- User-defined JS arrow-functions stored as strings in `fieldMappingsStrings`
- Validated via `acorn` parser, evaluated via `new Function()` with sandboxed context
- Helpers available: `jiraToMarkdown`, `markdownToJira`, `markdownToAdf`, `adfToMarkdown`, `JSON`, `Math`, `Date`
- Built-in mappings in `src/default/obsidianJiraFieldsMapping.ts`

## Indicator system

Three marker types in notes (hidden in both Live Preview and Reading mode):

- **Section**: `` `jira-sync-section-fieldname` `` — content until next heading
- **Line**: `` `jira-sync-line-fieldname` `` — content on same line
- **Inline**: `` `jira-sync-inline-start-fieldname` content `jira-sync-end` ``

## Build commands

```bash
yarn install              # Install
yarn run dev              # Watch mode
yarn run build            # Production (compile_locale → tsc check → esbuild)
yarn run format           # Prettier
yarn run lint:fix         # ESLint autofix
yarn run test             # Vitest unit tests
yarn run test:int         # API integration tests
```

## Pre-commit hooks (husky)

Currently runs `node check-version.js` — validates version consistency across files.

## Versioning

- `yarn run version` bumps via `version-bump.mjs` (syncs `package.json` → `manifest.json` + `versions.json`)
- GitHub release tag = version string (no leading `v`)
- Attach: `main.js`, `manifest.json`, `styles.css` (if present)

## Testing

- `yarn run test` — Vitest, config at `tests/vitest.config.ts`
- `yarn run test:int` — API integration tests at `tests/__tests__/api/`
- Manual: copy `main.js`, `manifest.json`, `styles.css` to `<vault>/.obsidian/plugins/jira-sync/`
