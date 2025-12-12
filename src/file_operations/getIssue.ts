import JiraPlugin from "../main";
import {JiraIssue} from "../interfaces";
import {ensureIssuesFolder} from "../tools/filesUtils";
import {sanitizeFileName} from "../tools/sanitizers";
import {updateJiraToLocal} from "../tools/mapObsidianJiraFields";
import {Notice, TFile, TFolder} from "obsidian";
import {defaultTemplate} from "../default/defaultTemplate";
import { debugLog } from "src/tools/debugLogging";

function generateFilenameFromTemplate(template: string, issue: JiraIssue): string {
	let filename = template;

	// Replace {summary} with sanitized summary
	const summary = issue.fields?.summary || "";
	const sanitizedSummary = sanitizeFileName(summary);
	filename = filename.replace(/\{summary\}/g, sanitizedSummary);

	// Replace {key} with issue key
	const key = issue.key || "";
	filename = filename.replace(/\{key\}/g, key);

	// Sanitize the entire filename to remove any prohibited characters
	filename = sanitizeFileName(filename);

	// Fallback if the result is empty or only whitespace
	if (!filename || filename.trim() === "") {
		// Use key if available, otherwise use a default
		if (key) {
			filename = key;
		} else if (sanitizedSummary) {
			filename = sanitizedSummary;
		} else {
			filename = "jira-issue";
		}
	}

	return filename.trim();
}

export async function createOrUpdateIssueNote(plugin: JiraPlugin, issue: JiraIssue, filePath?: string): Promise<void> {
	try {
		await ensureIssuesFolder(plugin);

		let targetFile: TFile | null = null;
		let targetPath: string = "";

		if (filePath) {
			targetPath = filePath;
			targetFile = plugin.app.vault.getFileByPath(filePath);
		} else {
			// First, try to find the file using cache
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

			// If not found in cache or file doesn't exist, fallback to search
			if (!targetFile) {
				debugLog(`Issue ${issue.key} not in cache, searching filesystem...`);
				targetFile = await findFileByIssueKey(plugin, issue.key);
				if (targetFile) {
					targetPath = targetFile.path;
					// Add to cache for future use
					plugin.setFilePathForIssueKey(issue.key, targetPath);
					debugLog(`Found issue ${issue.key} via search, added to cache: ${targetPath}`);
				}
			}

			// If still not found, create new file
			if (!targetFile) {
				const template = plugin.settings.fetchIssue.filenameTemplate || "{summary} ({key})";
				const filename = generateFilenameFromTemplate(template, issue);
				targetPath = `${plugin.settings.global.issuesFolder}/${filename}.md`;
				debugLog(`Issue ${issue.key} not found in cache or filesystem, creating new file: ${targetPath}`);
			}
		}

		if (targetFile) {
			await updateJiraToLocal(plugin, targetFile, issue)
			await plugin.app.workspace.openLinkText(targetFile.path, "");
		} else {
			const newFile = await createNewIssueFile(plugin, targetPath);
			await updateJiraToLocal(plugin, newFile, issue)
			await plugin.app.workspace.openLinkText(newFile.path, "");
			// Add new file to cache
			plugin.setFilePathForIssueKey(issue.key, newFile.path);
		}
		new Notice(`Issue ${issue.key} imported successfully`);
	} catch (error) {
		new Notice("Error creating issue note: " + (error.message || "Unknown error"));
		console.error(error);
	}
}


async function createNewIssueFile(
	plugin: JiraPlugin,
	filePath: string
): Promise<TFile> {
	let initialContent = "";


	let templatePath = plugin.settings.global.templatePath
	if (templatePath && !templatePath.endsWith(".md")) {
		templatePath += ".md";
	}
	if (templatePath && templatePath.trim() !== "") {
		const templateFile = plugin.app.vault.getFileByPath(templatePath);
		if (templateFile) {
			// Use the template as initial content
			initialContent = await plugin.app.vault.read(templateFile);
		} else {
			new Notice(`Template file not found: ${templatePath}, using default template`);
		}
	}
	if (initialContent === "") initialContent = defaultTemplate

	// Create the file with initial content
	await plugin.app.vault.create(filePath, initialContent);

	// Get file reference and update frontmatter
	const newFile = plugin.app.vault.getFileByPath(filePath);
	if (!newFile) {
		throw new Error("Could not create file");
	}
	return newFile
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
