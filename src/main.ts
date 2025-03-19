import { Plugin } from "obsidian";
import { JiraSettingTab } from "./settings/JiraSettingTab";
import { JiraIssueType, JiraProject, JiraSettings } from "./interfaces";
import { DEFAULT_SETTINGS } from "./settings/default";
import {
	registerUpdateIssueCommand,
	registerGetIssueCommand,
	registerCreateIssueCommand, registerGetIssueCommandWithKey, registerUpdateIssueStatusCommand
} from "./commands";
import {registerUpdateWorkLogCommand} from "./commands/addWorkLog";
import {transform_string_to_functions_mappings} from "./tools/convertFunctionString";

/**
 * Main plugin class
 */
export default class JiraPlugin extends Plugin {
	settings: JiraSettings;
	projects: JiraProject[] = [];
	issueTypes: JiraIssueType[] = [];

	async onload() {
		await this.loadSettings();

		// // Add ribbon icon to export  issues
		// this.addRibbonIcon(
		// 	"book-up",
		// 	"Push current Kanban issues statuses to Jira",
		// 	() => {
		// 		// Use the getIssue command's functionality
		// 		// @ts-ignore
		// 		const getIssuesCommand = this.app.commands.commands["jira-plugin:push-all-issues"];
		// 		if (getIssuesCommand) {
		// 			getIssuesCommand.callback();
		// 		}
		// 	}
		// );
		//
		// // Add ribbon icon to import issues
		// this.addRibbonIcon(
		// 	"book-down",
		// 	"Pull Jira all issues statuses + sync statuses of Kanban",
		// 	() => {
		// 		// Use the getIssue command's functionality
		// 		// @ts-ignore
		// 		const getIssuesCommand = this.app.commands.commands["jira-plugin:pull-all-issues"];
		// 		if (getIssuesCommand) {
		// 			getIssuesCommand.callback();
		// 		}
		// 	}
		// );

		// Register all commands
		registerUpdateIssueCommand(this);
		registerUpdateIssueStatusCommand(this);
		registerGetIssueCommand(this);
		registerGetIssueCommandWithKey(this);
		registerCreateIssueCommand(this);

		registerUpdateWorkLogCommand(this);

		// Add settings tab
		this.addSettingTab(new JiraSettingTab(this.app, this));
	}

	/**
	 * Load plugin settings
	 */
	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
		this.settings.fieldMappings = await transform_string_to_functions_mappings(this.settings.fieldMappingsStrings);
	}

	/**
	 * Save plugin settings
	 */
	async saveSettings() {
		await this.saveData(this.settings);
	}
}
