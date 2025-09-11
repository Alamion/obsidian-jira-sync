import {Plugin } from "obsidian";
import { JiraSettingTab } from "./settings/JiraSettingTab";
import {DEFAULT_SETTINGS, JiraSettings} from "./settings/default";
import {
	registerUpdateIssueCommand, registerUpdateWorkLogManuallyCommand,
	registerGetCurrentIssueCommand, registerUpdateWorkLogBatchCommand,
	registerCreateIssueCommand, registerGetIssueCommandWithCustomKey, registerUpdateIssueStatusCommand,
	registerBatchFetchIssuesCommand
} from "./commands";
import {transform_string_to_functions_mappings} from "./tools/convertFunctionString";
import {createJiraSyncExtension} from "./postprocessing/livePreview";
import {hideJiraPointersReading} from "./postprocessing/reading";
import { buildCacheFromFilesystem, validateCache } from "./tools/cacheUtils";

export default class JiraPlugin extends Plugin {
	settings: JiraSettings;
	
	// In-memory cache for instant access during synchronization
	private issueKeyToFilePathCache: Map<string, string> = new Map();

	async onload() {
		await this.loadSettings();
		
		// validate cache from settings
		this.initializeCache();
		await validateCache(this);

		// Register all commands
		registerUpdateIssueCommand(this);
		registerUpdateIssueStatusCommand(this);
		registerGetCurrentIssueCommand(this);
		registerGetIssueCommandWithCustomKey(this);
		registerCreateIssueCommand(this);
		registerBatchFetchIssuesCommand(this);

		registerUpdateWorkLogManuallyCommand(this);
		registerUpdateWorkLogBatchCommand(this);

		// Add settings tab
		this.addSettingTab(new JiraSettingTab(this.app, this));

		// Handle Reading mode (post-processor for rendered markdown)
		this.registerMarkdownPostProcessor(hideJiraPointersReading.bind(this));

		// Handle Live Preview/Edit mode (CodeMirror extension)
		this.registerEditorExtension(createJiraSyncExtension(this));

		// Register vault event listeners for cache maintenance
		this.registerVaultEventListeners();

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
		this.settings.fieldMappings = await transform_string_to_functions_mappings(this.settings.fieldMappingsStrings);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	private initializeCache() {
		this.issueKeyToFilePathCache.clear();
		Object.entries(this.settings.issueKeyToFilePathCache).forEach(([key, path]) => {
			this.issueKeyToFilePathCache.set(key, path);
		});
	}

	getAllIssueKeysMap(): Map<string, string> {
		return this.issueKeyToFilePathCache
	}

	getFilePathForIssueKey(issueKey: string): string | undefined {
		return this.issueKeyToFilePathCache.get(issueKey);
	}

	setFilePathForIssueKey(issueKey: string, filePath: string) {
		this.issueKeyToFilePathCache.set(issueKey, filePath);
		this.settings.issueKeyToFilePathCache[issueKey] = filePath;
		this.saveSettings();
	}

	removeIssueKeyFromCache(issueKey: string) {
		this.issueKeyToFilePathCache.delete(issueKey);
		delete this.settings.issueKeyToFilePathCache[issueKey];
		this.saveSettings();
	}

	clearCache() {
		this.issueKeyToFilePathCache.clear();
		this.settings.issueKeyToFilePathCache = {};
		this.saveSettings();
	}

	async rebuildCache() {
		this.clearCache();
		await buildCacheFromFilesystem(this);
	}

	private registerVaultEventListeners() {

		// Handle file renames
		this.registerEvent(
			this.app.vault.on('rename', (file, oldPath) => {
				for (const [issueKey, cachedPath] of this.issueKeyToFilePathCache.entries()) {
					if (cachedPath === oldPath) {
						this.setFilePathForIssueKey(issueKey, file.path);
						break;
					}
				}
			})
		);

		// Handle file deletions
		this.registerEvent(
			this.app.vault.on('delete', (file) => {
				for (const [issueKey, cachedPath] of this.issueKeyToFilePathCache.entries()) {
					if (cachedPath === file.path) {
						this.removeIssueKeyFromCache(issueKey);
						break;
					}
				}
			})
		);
	}
}
