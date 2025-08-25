# Jira syncthing plugin

Tired of Jira plugins that only give you basic issue links and descriptions? This one's different. It brings **your entire Jira workflow into Obsidian** with customizable templates and deep field mapping—including all those custom fields your team added over the years.

Originally forked from [obsidian-to-jira](https://github.com/angelperezasenjo/obsidian-to-jira), but now packed with features you won't find elsewhere.

## Why this plugin exists

Other plugins treat Jira issues as read-only reference material. This one lets you:
- **Build full-featured issue templates** that mirror your Jira workflow
- **Sync ANY field**—even custom ones from plugins like ScriptRunner or Insight
- **Create new fields** with dynamic field mapping (e.g. auto-generate browse URLs from `issue.self + issue.key` from API response)

> **Pro Tip**: While TypeScript skills help for advanced mappings, we include ready-made mappings for 90% of basic use cases.

## Killer features

### 🧩 Your Jira, your template
Create Obsidian notes that look exactly like your team's Jira workflow. Pull in:
- Standard fields (status, assignee)
- Custom fields (progress bars, sprint IDs)
- Plugin fields (ScriptRunner outputs, Insight assets)

```markdown
---
key: JIR-1
status: In Progress   <!-- Built-in field -->
priority: Medium      <!-- Another built-in field -->
sprint: Mobile-Q2-24  <!-- Custom field -->
epic: API-Overhaul    <!-- Another Custom field -->
link: http://jira.local:8000/browse/JIR-1  <!-- Built-in auto-generated link -->
---

### Customer Impact  
`jira-sync-section-customfield_10842`  <!-- From your CRM plugin -->
```

### 🔄 Two-way sync that doesn't fight you
- **Smart conflict resolution** when notes change locally while syncing
- **Partial updates**—edit just the fields you care about
- **Worklog batching** push a week's worth of time entries at once

### ⚙️ Field mapping kitchen
We include mappings for:
- Basic fields (like status, priority)
- Temporal fields (created, updated)
- Calculated fields (progress %, time estimates)
- **Bring your own** for custom integrations

## Quick start

1. **Install**: Community plugins → Search "Jira Issue Manager"
2. **Connect**: Settings → Add your Jira URL + credentials
3. **Go**:
	- `Get issue from Jira with custom key` from command palette
	- Edit like any note
	- When you are ready -> `Update issue in Jira` - changes sync back.

## Real-world template

```markdown
---
key: DEV-42
status: In Progress
priority: Medium
progress: 75%
epic: API-Overhaul  <!-- Custom field -->
risk: Medium        <!-- Another custom field -->
updated: 2025-01-01T00:00:00.000+0000
---

`jira-sync-section-description`
The auth middleware needs to...

`jira-sync-section-customfield_30122`
@alice @bob  <!-- Custom user picker field -->

<!-- Auto-generated link -->
`jira-sync-line-openLink` [Open in Jira](http://jira/browse/DEV-42)
```



Docs with more detailed info and examples: [GitHub](https://github.com/Alamion/obsidian-jira-sync/tree/master/docs)
