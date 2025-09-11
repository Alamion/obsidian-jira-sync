import JiraPlugin from "../main";
import {validateSettings} from "../api";
import {Notice} from "obsidian";
// import {debugLog} from "./debugLogging";

export function checkCommandCallback(
	plugin: JiraPlugin,
	checking: boolean,
	functionToExecute: (...args: any[]) => Promise<void>,
	frontmatterChecks: string[],
	functionArgs: string[] = []
): boolean {
	const settings_are_valid = validateSettings(plugin);
	const file = plugin.app.workspace.getActiveFile();

	if (!file) {
		// new Notice("No active file");
		return false;
	}

	const frontmatter = plugin.app.metadataCache.getFileCache(file)?.frontmatter;
	const hasChecks = frontmatterChecks.every(key => frontmatter?.[key] !== undefined && frontmatter?.[key] !== null && frontmatter?.[key] !== '');
	const functionArgsValues = functionArgs.map(arg => frontmatter?.[arg]);

	// debugLog('Function checked:', settings_are_valid && hasChecks,
	// 	'for function to execute:', functionToExecute.name,
	// 	'with args:', functionArgsValues,
	// 	'and frontmatter:', frontmatter);

	if (settings_are_valid && hasChecks) {
		if (!checking) {
			functionToExecute(plugin, file, ...functionArgsValues).catch(
				(error) => {
					new Notice(`Error when doing ${functionToExecute.name}: ` + (error.message || "Unknown error"));
					console.error(error);
				}
			);
		}
		return true;
	}

	return false;
}
