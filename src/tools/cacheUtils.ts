import JiraPlugin from "../main";
import { TFile, TFolder } from "obsidian";

/**
 * Utility functions for managing the issue key to file path cache
 */

/**
 * Build cache by scanning all markdown files in the issues folder
 * This is useful for initial cache population or cache rebuilding
 */
export async function buildCacheFromFilesystem(plugin: JiraPlugin): Promise<void> {
	const issuesFolder = plugin.app.vault.getAbstractFileByPath(plugin.settings.issuesFolder);
	
	if (!issuesFolder || !(issuesFolder instanceof TFolder)) {
		return;
	}

	await scanFolderForIssueKeys(plugin, issuesFolder);
}

/**
 * Recursively scan folder for markdown files with issue keys in frontmatter
 */
async function scanFolderForIssueKeys(plugin: JiraPlugin, folder: TFolder): Promise<void> {
	for (const child of folder.children) {
		if (child instanceof TFile && child.extension === 'md') {
			const metadata = plugin.app.metadataCache.getFileCache(child);
			const issueKey = metadata?.frontmatter?.key;
			if (issueKey && typeof issueKey === 'string') {
				plugin.setFilePathForIssueKey(issueKey, child.path);
			}
		} else if (child instanceof TFolder) {
			await scanFolderForIssueKeys(plugin, child);
		}
	}
}

/**
 * Validate cache entries by checking if files still exist
 * Remove entries for files that no longer exist
 */
export async function validateCache(plugin: JiraPlugin): Promise<void> {
	const entriesToRemove: string[] = [];
	
	for (const [issueKey, filePath] of plugin.getAllIssueKeysMap().entries()) {
		const file = plugin.app.vault.getFileByPath(filePath);
		if (!file) {
			entriesToRemove.push(issueKey);
		}
	}
	
	// Remove invalid entries
	entriesToRemove.forEach(issueKey => {
		plugin.removeIssueKeyFromCache(issueKey);
	});
}
