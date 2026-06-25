import { Notice } from 'obsidian';
import JiraPlugin from '../main';

export function registerRebuildCacheCommand(plugin: JiraPlugin): void {
	plugin.addCommand({
		id: 'rebuild-issue-cache',
		name: 'Rebuild issue file cache from filesystem',
		callback: async () => {
			await plugin.rebuildCache();
			new Notice('Issue cache rebuilt successfully');
		},
	});
}
