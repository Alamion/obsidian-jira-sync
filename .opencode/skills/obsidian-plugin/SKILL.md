---
name: obsidian-plugin
description: >-
    General Obsidian plugin development conventions — bundling with esbuild,
    manifest structure, plugin lifecycle (onload/onunload), settings persistence,
    and coding patterns for community plugins. Use when writing or modifying
    any Obsidian plugin.
license: MIT
compatibility: opencode
---

# Obsidian Plugin Development

## Plugin anatomy

- `Plugin` class from `obsidian` package with `onload()` / `onunload()` lifecycle
- Entry: `src/main.ts`, output: `main.js` (bundled via esbuild)
- Required artifacts: `main.js`, `manifest.json`, optional `styles.css`
- Settings: `this.loadData()` / `this.saveData()` (JSON persisted by Obsidian)

## Bundling

- **esbuild**: bundles all source + runtime deps into single `main.js`
- Externals: `obsidian`, `electron`, `@codemirror/*`, `@lezer/*`, built-in Node modules
- Format: CJS, target: ES2018
- Sourcemaps in dev only

## Manifest (`manifest.json`)

```json
{
	"id": "stable-id", // Never change after release
	"name": "Display Name",
	"version": "x.y.z", // SemVer
	"minAppVersion": "1.x.x",
	"description": "...",
	"author": "...",
	"isDesktopOnly": false
}
```

## Cleanup

- Use `this.register*` helpers (`registerEvent`, `registerDomEvent`, `registerInterval`, `registerEditorExtension`) for automatic cleanup on unload
- Never leak event listeners or intervals

## Code conventions

- TypeScript with `strict: true`
- `src/main.ts` minimal — delegate to modules
- `async/await` over promises
- No comments unless explicitly requested
- Bundle all deps — no unbundled runtime dependencies
- Prefer `checkCallback` for commands (cleaner UX)
