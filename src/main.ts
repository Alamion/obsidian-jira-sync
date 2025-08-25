import { Plugin } from "obsidian";
import { JiraSettingTab } from "./settings/JiraSettingTab";
import { JiraIssueType, JiraProject } from "./interfaces";
import {DEFAULT_SETTINGS, JiraSettings} from "./settings/default";
import {
	registerUpdateIssueCommand, registerUpdateWorkLogManuallyCommand,
	registerGetIssueCommand, registerUpdateWorkLogBatchCommand,
	registerCreateIssueCommand, registerGetIssueCommandWithKey, registerUpdateIssueStatusCommand
} from "./commands";
import {transform_string_to_functions_mappings} from "./tools/convertFunctionString";

/**
 * Main plugin class
 */
export default class JiraPlugin extends Plugin {
	settings: JiraSettings;

	async onload() {
		await this.loadSettings();

		// // Add ribbon icon to export  issues
		// this.addRibbonIcon(
		// 	"book-up",
		// 	"Push current Kanban issues statuses to Jira",
		// 	() => {
		// 		// Use the getIssue command's functionality
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

		registerUpdateWorkLogManuallyCommand(this);
		registerUpdateWorkLogBatchCommand(this);

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
