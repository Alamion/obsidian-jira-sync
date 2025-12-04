import JiraPlugin from "../main";

/**
 * Ensure the issues folder exists
 */
export async function ensureIssuesFolder(plugin: JiraPlugin): Promise<void> {
	const folderPath = plugin.settings.global.issuesFolder;
	const folder = plugin.app.vault.getFolderByPath(folderPath);
	if (!folder && folderPath) {
		await plugin.app.vault.createFolder(folderPath);
	}
}

/**
 * Capitalize the first letter of a string
 * @param str The string to capitalize
 * @returns The capitalized string
 */
export function capitalizeFirstLetter(str: string): string {
	return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}
