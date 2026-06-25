import { Plugin } from 'obsidian';
import { JiraSettingTab } from './settings/JiraSettingTab';
import { ConnectionSettingsInterface, DEFAULT_SETTINGS, JiraSettingsInterface } from './settings/default';
import {
	registerUpdateIssueCommand,
	registerUpdateWorkLogManuallyCommand,
	registerGetCurrentIssueCommand,
	registerUpdateWorkLogBatchCommand,
	registerCreateIssueCommand,
	registerGetIssueCommandWithCustomKey,
	registerUpdateIssueStatusCommand,
	registerBatchFetchIssuesCommand,
	registerAddCommentCommand,
	registerRebuildCacheCommand,
} from './commands';
import { transform_string_to_functions_mappings } from './tools/convertFunctionString';
import { createJiraSyncExtension } from './postprocessing/livePreview';
import { hideJiraPointersReading } from './postprocessing/reading';
import { buildCacheFromFilesystem } from './tools/cacheUtils';
import { checkMigrateSettings } from './tools/migrateSettings';

export default class JiraPlugin extends Plugin {
	settings!: JiraSettingsInterface;

	// In-memory cache for instant access during synchronization
	private issueKeyToFilePathCache: Map<string, string> = new Map();

	async onload() {
		await this.loadSettings();

		// initialize cache from settings
		this.initializeCache();

		// Register all commands
		registerUpdateIssueCommand(this);
		registerUpdateIssueStatusCommand(this);
		registerGetCurrentIssueCommand(this);
		registerGetIssueCommandWithCustomKey(this);
		registerCreateIssueCommand(this);
		registerBatchFetchIssuesCommand(this);

		registerUpdateWorkLogManuallyCommand(this);
		registerUpdateWorkLogBatchCommand(this);
		registerAddCommentCommand(this);
		registerRebuildCacheCommand(this);

		// Add settings tab
		this.addSettingTab(new JiraSettingTab(this.app, this));

		// Handle Reading mode (post-processor for rendered markdown)
		this.registerMarkdownPostProcessor(hideJiraPointersReading());

		// Handle Live Preview/Edit mode (CodeMirror extension)
		this.registerEditorExtension(createJiraSyncExtension(this));

		// Register vault event listeners for cache maintenance
		this.registerVaultEventListeners();
	}

	async loadSettings() {
		const old_data = await this.loadData();

		// TODO: Cancel and delete migration check in future (approximately 2026-2027)
		const { result: migratedData, changed: migrationChanged } = checkMigrateSettings(old_data);

		this.settings = {
			...DEFAULT_SETTINGS,
			...migratedData,
			fieldMapping: {
				...DEFAULT_SETTINGS.fieldMapping,
				...(migratedData?.fieldMapping || {}),
			},
		};

		this.settings.fieldMapping.fieldMappings = await transform_string_to_functions_mappings(
			this.settings.fieldMapping.fieldMappingsStrings,
		);

		if (migrationChanged) {
			await this.saveSettings();
		}
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
		return this.issueKeyToFilePathCache;
	}

	getFilePathForIssueKey(issueKey: string): string | undefined {
		return this.issueKeyToFilePathCache.get(issueKey);
	}

	getCurrentConnection(): ConnectionSettingsInterface | null {
		if (!this.settings.connections || this.settings.connections.length === 0) {
			return null;
		}
		return this.settings.connections[this.settings.currentConnectionIndex];
	}

	async setFilePathForIssueKey(issueKey: string, filePath: string) {
		this.issueKeyToFilePathCache.set(issueKey, filePath);
		this.settings.issueKeyToFilePathCache[issueKey] = filePath;
		await this.saveSettings();
	}

	async removeIssueKeyFromCache(issueKey: string) {
		this.issueKeyToFilePathCache.delete(issueKey);
		delete this.settings.issueKeyToFilePathCache[issueKey];
		await this.saveSettings();
	}

	async clearCache() {
		this.issueKeyToFilePathCache.clear();
		this.settings.issueKeyToFilePathCache = {};
		await this.saveSettings();
	}

	async rebuildCache() {
		await this.clearCache();
		await buildCacheFromFilesystem(this);
	}

	private registerVaultEventListeners() {
		// Handle file renames
		this.registerEvent(
			this.app.vault.on('rename', async (file, oldPath) => {
				for (const [issueKey, cachedPath] of this.issueKeyToFilePathCache.entries()) {
					if (cachedPath === oldPath) {
						await this.setFilePathForIssueKey(issueKey, file.path);
						break;
					}
				}
			}),
		);

		// Handle file deletions
		this.registerEvent(
			this.app.vault.on('delete', async (file) => {
				for (const [issueKey, cachedPath] of this.issueKeyToFilePathCache.entries()) {
					if (cachedPath === file.path) {
						await this.removeIssueKeyFromCache(issueKey);
						break;
					}
				}
			}),
		);
	}
}
