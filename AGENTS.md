# Jira Issue Manager — Agent guide

## Project facts

- **Plugin ID**: `jira-sync`, display name: "Jira Issue Manager"
- **Entry**: `src/main.ts` → `main.js` (bundled via esbuild)
- **Package manager**: yarn (required)
- **Author**: Alamion, min App Version: 1.10.1, mobile-compatible

## Known bugs

- `src/tools/debugLogging.ts:1` — `process.env.NODE_ENV` is always `undefined` in Obsidian (no Node.js). Logging is **always on**. Uses `console.log('[DEBUG]', ...)` etc.

## Quick reference

| Concern        | Location                                                                               |
| -------------- | -------------------------------------------------------------------------------------- |
| Commands       | `src/commands/*.ts` — 10 commands, each in `register*Command(plugin)`                  |
| API requests   | `src/api/base.ts` — `baseRequest(plugin, method, path)`                                |
| Settings       | `src/settings/default.ts` — `JiraSettingsInterface`, persisted via `loadData/saveData` |
| Modals         | `src/modals/*.ts` — search, JQL, worklog, project/type/status selectors                |
| Cache          | `Map<string, string>` in `JiraPlugin`, persisted in `settings.issueKeyToFilePathCache` |
| i18n           | `src/localization/` — YAML sources → compiled JSON, auto-detect locale                 |
| Field mappings | JS arrow-function strings in `fieldMappingsStrings`, validated with `acorn`            |
| View markers   | `` `jira-sync-section-*` ``, `` `jira-sync-line-*` ``, `` `jira-sync-inline-*` ``      |

## Important patterns

- Commands use `checkCallback` (except `add-comment-jira` which uses `editorCheckCallback`, and `rebuild-issue-cache` which uses `callback`)
- Always use `this.register*` helpers for listeners/events — never leak
- Use `this.getCurrentConnection()` to access active Jira connection
- Cache is maintained via vault `rename`/`delete` event listeners
- Migration check runs in `loadSettings()` — `checkMigrateSettings()` handles old single-connection → multi-connection migration

## Directory structure

```
src/
├── main.ts              # lifecycle, cache, registration
├── api/                 # Jira REST API layer
├── commands/            # user commands
├── modals/              # UI dialogs
├── settings/            # settings tab + components
├── file_operations/     # note read/write
├── tools/               # utilities
├── postprocessing/      # view rendering (Live Preview + Reading)
├── default/             # defaults (template, mock issue, field mappings)
├── interfaces/          # TypeScript types
└── localization/        # i18n
```

For general Obsidian plugin development conventions and project-specific details, see `.opencode/skills/`.
