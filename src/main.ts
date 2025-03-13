import { Plugin } from "obsidian";
import { JiraSettingTab } from "./settings/JiraSettingTab";
import { JiraIssueType, JiraProject, JiraSettings } from "./interfaces";
import { DEFAULT_SETTINGS } from "./settings/default";
import {
	registerUpdateIssueCommand,
	registerGetIssueCommand,
	registerCreateIssueCommand, registerGetIssueCommandWithKey, registerUpdateIssueStatusCommand
} from "./commands";

/**
 * Main plugin class
 */
export default class JiraPlugin extends Plugin {
	settings: JiraSettings;
	projects: JiraProject[] = [];
	issueTypes: JiraIssueType[] = [];

	async onload() {
		await this.loadSettings();

		// Add ribbon icon to import issues
		this.addRibbonIcon(
			"file-check",
			"pulls all user issues from Jira",
			() => {
				// Use the getIssue command's functionality
				// @ts-ignore
				const getIssuesCommand = this.app.commands.commands["jira-plugin:get-all-issues"];
				if (getIssuesCommand) {
					getIssuesCommand.callback();
				}
			}
		);

		// Register all commands
		registerUpdateIssueCommand(this);
		registerUpdateIssueStatusCommand(this);
		registerGetIssueCommand(this);
		registerGetIssueCommandWithKey(this);
		registerCreateIssueCommand(this);

		// Add settings tab
		this.addSettingTab(new JiraSettingTab(this.app, this));
	}

	/**
	 * Load plugin settings
	 */
	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	/**
	 * Save plugin settings
	 */
	async saveSettings() {
		await this.saveData(this.settings);
	}
}
