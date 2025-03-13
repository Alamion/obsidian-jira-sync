import JiraPlugin from "../main";
import {JiraIssue} from "../interfaces";
import {ensureIssuesFolder} from "../tools/filesUtils";
import {sanitizeFileName} from "../tools/sanitizers";
import {updateLocalFromJira} from "../tools/mappingObsidianJiraFields";
import {Notice, TFile} from "obsidian";

/**
 * Create or update an issue note in Obsidian
 * @param plugin The plugin instance
 * @param issue The issue data from Jira
 * @param filePath The file path to create or update
 */
export async function createOrUpdateIssueNote(plugin: JiraPlugin, issue: JiraIssue, filePath?: string): Promise<void> {
	try {
		// Ensure the issues folder exists
		await ensureIssuesFolder(plugin);

		// Sanitize summary for file name
		const sanitizedSummary = sanitizeFileName(issue.fields.summary);
		filePath = filePath || `${plugin.settings.issuesFolder}/${sanitizedSummary}.md`;

		// Check if file exists
		const existingFile = plugin.app.vault.getFileByPath(filePath);

		if (existingFile) {
			// File exists, update it
			await updateLocalFromJira(plugin, existingFile, issue)

			// Open the file
			await plugin.app.workspace.openLinkText(existingFile.path, "");
		} else {
			// File doesn't exist, create it
			const newFile = await createNewIssueFile(plugin, filePath);

			// Update it
			await updateLocalFromJira(plugin, newFile, issue)

			// Open the file
			await plugin.app.workspace.openLinkText(newFile.path, "");
		}
		new Notice(`Issue ${issue.key} imported successfully`);
	} catch (error) {
		new Notice("Error creating issue note: " + (error.message || "Unknown error"));
	}
}


/**
 * Create a new issue file
 */
async function createNewIssueFile(
	plugin: JiraPlugin,
	filePath: string
): Promise<TFile> {
	let initialContent = "";

	// Check if a template should be used
	if (plugin.settings.templatePath && plugin.settings.templatePath.trim() !== "") {
		const templateFile = plugin.app.vault.getFileByPath(plugin.settings.templatePath);
		if (templateFile) {
			// Use the template as initial content
			initialContent = await plugin.app.vault.read(templateFile);
		} else {
			new Notice(`Template file not found: ${plugin.settings.templatePath}`);
		}
	}

	// Create the file with initial content
	await plugin.app.vault.create(filePath, initialContent);

	// Get file reference and update frontmatter
	const newFile = plugin.app.vault.getFileByPath(filePath);
	if (!newFile) {
		throw new Error("Could not create file");
	}
	return newFile
}


