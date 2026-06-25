import JiraPlugin from '../main';
import { JiraIssue } from '../interfaces';
import { ensureIssuesFolder } from '../tools/filesUtils';
import { sanitizeFileName } from '../tools/sanitizers';
import { updateJiraToLocal } from '../tools/mapObsidianJiraFields';
import { Notice, TFile, TFolder } from 'obsidian';
import { defaultTemplate } from '../default/defaultTemplate';
import { debugLog } from '../tools/debugLogging';

export function generateFilenameFromTemplate(
	template: string,
	issue: { key: string; fields?: { summary?: string } },
): string {
	let filename = template;
	const summary = issue.fields?.summary || '';
	const sanitizedSummary = sanitizeFileName(summary);
	filename = filename.replace(/\{summary\}/g, sanitizedSummary);
	const key = issue.key || '';
	filename = filename.replace(/\{key\}/g, key);
	filename = sanitizeFileName(filename);
	if (!filename || filename.trim() === '') {
		if (key) {
			filename = key;
		} else if (sanitizedSummary) {
			filename = sanitizedSummary;
		} else {
			filename = 'jira-issue';
		}
	}
	return filename.trim();
}

export async function renameExistingIssueFiles(plugin: JiraPlugin): Promise<{ renamed: number; errors: string[] }> {
	const cacheMap = plugin.getAllIssueKeysMap();
	const template = plugin.settings.fetchIssue.filenameTemplate || '{summary} ({key})';
	const issuesFolder = plugin.settings.global.issuesFolder;
	let renamed = 0;
	const errors: string[] = [];

	for (const [issueKey, currentPath] of cacheMap.entries()) {
		try {
			const file = plugin.app.vault.getFileByPath(currentPath);
			if (!file) {
				errors.push(`${issueKey}: file not found at ${currentPath}`);
				continue;
			}

			let summary = '';
			const metadata = plugin.app.metadataCache.getFileCache(file);
			const cachedSummary = metadata?.frontmatter?.summary;
			if (cachedSummary && typeof cachedSummary === 'string') {
				summary = cachedSummary;
			}

			const newFilename = generateFilenameFromTemplate(template, { key: issueKey, fields: { summary } });
			const newPath = `${issuesFolder}/${newFilename}.md`;

			if (newPath === currentPath) continue;

			const existingFile = plugin.app.vault.getFileByPath(newPath);
			if (existingFile) {
				errors.push(`${issueKey}: target path already exists: ${newPath}`);
				continue;
			}

			await plugin.app.vault.rename(file, newPath);
			await plugin.setFilePathForIssueKey(issueKey, newPath);
			renamed++;
		} catch (error) {
			errors.push(`${issueKey}: ${(error as Error).message}`);
		}
	}

	return { renamed, errors };
}

export async function createOrUpdateIssueNote(plugin: JiraPlugin, issue: JiraIssue, filePath?: string): Promise<void> {
	try {
		await ensureIssuesFolder(plugin);

		let targetFile: TFile | null = null;
		let targetPath: string = '';

		if (filePath) {
			targetPath = filePath;
			targetFile = plugin.app.vault.getFileByPath(filePath);
		} else {
			const cachedPath = plugin.getFilePathForIssueKey(issue.key);
			if (cachedPath) {
				targetFile = plugin.app.vault.getFileByPath(cachedPath);
				if (targetFile) {
					targetPath = cachedPath;
					debugLog(`Found issue ${issue.key} in cache: ${cachedPath}`);
				} else {
					debugLog(`Cached path for ${issue.key} no longer exists: ${cachedPath}`);
				}
			}

			if (!targetFile) {
				debugLog(`Issue ${issue.key} not in cache, searching filesystem...`);
				targetFile = await findFileByIssueKey(plugin, issue.key);
				if (targetFile) {
					targetPath = targetFile.path;
					await plugin.setFilePathForIssueKey(issue.key, targetPath);
					debugLog(`Found issue ${issue.key} via search, added to cache: ${targetPath}`);
				}
			}

			if (!targetFile) {
				const template = plugin.settings.fetchIssue.filenameTemplate || '{summary} ({key})';
				const filename = generateFilenameFromTemplate(template, issue);
				targetPath = `${plugin.settings.global.issuesFolder}/${filename}.md`;
				debugLog(`Issue ${issue.key} not found in cache or filesystem, creating new file: ${targetPath}`);
			}
		}

		if (targetFile) {
			await updateJiraToLocal(plugin, targetFile, issue);
			await plugin.app.workspace.openLinkText(targetFile.path, '');
			await plugin.setFilePathForIssueKey(issue.key, targetFile.path);
		} else {
			const newFile = await createNewIssueFile(plugin, targetPath);
			await updateJiraToLocal(plugin, newFile, issue);
			await plugin.app.workspace.openLinkText(newFile.path, '');
			await plugin.setFilePathForIssueKey(issue.key, newFile.path);
		}
		new Notice(`Issue ${issue.key} imported successfully`);
	} catch (error: unknown) {
		new Notice('Error creating issue note: ' + ((error as Error).message || 'Unknown error'));
		console.error(error);
	}
}

async function createNewIssueFile(plugin: JiraPlugin, filePath: string): Promise<TFile> {
	let initialContent = '';

	let templatePath = plugin.settings.global.templatePath;
	if (templatePath && !templatePath.endsWith('.md')) {
		templatePath += '.md';
	}
	if (templatePath && templatePath.trim() !== '') {
		const templateFile = plugin.app.vault.getFileByPath(templatePath);
		if (templateFile) {
			initialContent = await plugin.app.vault.read(templateFile);
		} else {
			new Notice(`Template file not found: ${templatePath}, using default template`);
		}
	}
	if (initialContent === '') initialContent = defaultTemplate;

	await plugin.app.vault.create(filePath, initialContent);

	const newFile = plugin.app.vault.getFileByPath(filePath);
	if (!newFile) {
		throw new Error('Could not create file');
	}
	return newFile;
}

async function findFileByIssueKey(plugin: JiraPlugin, issueKey: string): Promise<TFile | null> {
	const issuesFolder = plugin.app.vault.getAbstractFileByPath(plugin.settings.global.issuesFolder);
	if (!issuesFolder || !(issuesFolder instanceof TFolder)) {
		return null;
	}
	return await searchFolderForIssueKey(plugin, issuesFolder, issueKey);
}

async function searchFolderForIssueKey(plugin: JiraPlugin, folder: TFolder, issueKey: string): Promise<TFile | null> {
	for (const child of folder.children) {
		if (child instanceof TFile && child.extension === 'md') {
			const metadata = plugin.app.metadataCache.getFileCache(child);
			const foundIssueKey = metadata?.frontmatter?.key;
			if (foundIssueKey === issueKey) {
				return child;
			}
		} else if (child instanceof TFolder) {
			const found = await searchFolderForIssueKey(plugin, child, issueKey);
			if (found) {
				return found;
			}
		}
	}
	return null;
}
