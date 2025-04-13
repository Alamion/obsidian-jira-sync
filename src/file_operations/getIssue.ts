import JiraPlugin from "../main";
import {JiraIssue} from "../interfaces";
import {ensureIssuesFolder} from "../tools/filesUtils";
import {sanitizeFileName} from "../tools/sanitizers";
import {updateJiraToLocal} from "../tools/mapObsidianJiraFields";
import {Notice, TFile} from "obsidian";

export async function createOrUpdateIssueNote(plugin: JiraPlugin, issue: JiraIssue, filePath?: string): Promise<void> {
	try {
		await ensureIssuesFolder(plugin);

		const sanitizedSummary = sanitizeFileName(issue.fields.summary);
		filePath = filePath || `${plugin.settings.issuesFolder}/${sanitizedSummary}.md`;

		const existingFile = plugin.app.vault.getFileByPath(filePath);

		if (existingFile) {
			await updateJiraToLocal(plugin, existingFile, issue)

			// Open the file
			await plugin.app.workspace.openLinkText(existingFile.path, "");
		} else {
			// File doesn't exist, create it
			const newFile = await createNewIssueFile(plugin, filePath);

			// Update it
			await updateJiraToLocal(plugin, newFile, issue)

			// Open the file
			await plugin.app.workspace.openLinkText(newFile.path, "");
		}
		new Notice(`Issue ${issue.key} imported successfully`);
	} catch (error) {
		new Notice("Error creating issue note: " + (error.message || "Unknown error"));
	}
}

async function createNewIssueFile(
	plugin: JiraPlugin,
	filePath: string
): Promise<TFile> {
	let initialContent = "";

	const hardcodedTemplate =
`---
key: 
summary: 
status: 
assignee: 
tags: 
description: 
---

`;
	let templatePath = plugin.settings.templatePath
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
	if (initialContent === "") initialContent = hardcodedTemplate

	// Create the file with initial content
	await plugin.app.vault.create(filePath, initialContent);

	// Get file reference and update frontmatter
	const newFile = plugin.app.vault.getFileByPath(filePath);
	if (!newFile) {
		throw new Error("Could not create file");
	}
	return newFile
}


