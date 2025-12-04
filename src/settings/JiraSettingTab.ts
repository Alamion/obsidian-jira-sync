import { App, PluginSettingTab } from "obsidian";
import JiraPlugin from "../main";
import { SettingsComponentProps } from "../interfaces/settingsTypes";
import { ConnectionSettingsComponent } from "./components/ConnectionSettingsComponent";
import { GeneralSettingsComponent } from "./components/GeneralSettingsComponent";
import { FieldMappingsComponent } from "./components/FieldMappingsComponent";
import { FetchIssueComponent } from "./components/FetchIssueComponent";
import { TestFieldMappingsComponent } from "./components/TestFieldMappingsComponent";
import { debugLog } from "../tools/debugLogging";
import { CollapsibleSection } from "./CollapsibleSection";
import {useTranslations} from "../localization/translator";
import {TimekeepSettingsComponent} from "./components/TimekeepSettingsComponent";

const t = useTranslations("settings").t;
/**
 * Settings tab for the Jira plugin
 * Orchestrates all components and manages the overall settings UI
 */
export class JiraSettingTab extends PluginSettingTab {
	private plugin: JiraPlugin;
	private connectionSettings: ConnectionSettingsComponent;
	private generalSettings: GeneralSettingsComponent;
	private fieldMappingsSettings: FieldMappingsComponent;
	private fetchIssue: FetchIssueComponent;
	private testFieldMappings: TestFieldMappingsComponent;
	private timekeepSettings: TimekeepSettingsComponent;

	constructor(app: App, plugin: JiraPlugin) {
		super(app, plugin);
		this.plugin = plugin;

		// Create shared props for all components
		const componentProps: SettingsComponentProps = {
			app,
			plugin,
			onSettingsChange: this.handleSettingsChange.bind(this)
		};

		// Initialize all settings components
		this.connectionSettings = new ConnectionSettingsComponent(componentProps);
		this.generalSettings = new GeneralSettingsComponent(componentProps);
		this.fieldMappingsSettings = new FieldMappingsComponent(componentProps);
		this.fetchIssue = new FetchIssueComponent(componentProps);
		this.testFieldMappings = new TestFieldMappingsComponent({ ...componentProps, getCurrentIssue: () => this.fetchIssue.getCurrentIssue() });
		this.fetchIssue.onIssueDataChange = () => this.testFieldMappings.setCurrentIssue(this.fetchIssue.getCurrentIssue());
		this.timekeepSettings = new TimekeepSettingsComponent(componentProps);
	}

	/**
	 * Handle settings changes from any component
	 * This can be used for cross-component updates or validation
	 */
	private async handleSettingsChange(): Promise<void> {
		debugLog("Settings changed, handling updates");
		await this.plugin.saveSettings();
	}

	/**
	 * Display the settings UI
	 */
	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		// remember to add collapsable section name ("connection", "general", etc.) in settings/default.ts in order to be able to save last state

		new CollapsibleSection(this.plugin, containerEl, this.connectionSettings, t("connection.title"),
			this.plugin.settings.collapsedSections.connection, "connection").getContentContainer();

		new CollapsibleSection(this.plugin, containerEl, this.generalSettings, t("general.title"),
			this.plugin.settings.collapsedSections.general, "general").getContentContainer();

		new CollapsibleSection(this.plugin, containerEl, this.fieldMappingsSettings, t("fm.title"),
			this.plugin.settings.collapsedSections.fieldMappings, "fieldMappings").getContentContainer();

		new CollapsibleSection(this.plugin, containerEl, this.fetchIssue, t("fetch_issue.title"),
			this.plugin.settings.collapsedSections.fetchIssue, "fetchIssue").getContentContainer();

		new CollapsibleSection(this.plugin, containerEl, this.testFieldMappings, t("tfm.title"),
			this.plugin.settings.collapsedSections.testFieldMappings, "testFieldMappings").getContentContainer();

		new CollapsibleSection(this.plugin, containerEl, this.timekeepSettings, t("statistics.title"),
			this.plugin.settings.collapsedSections.statistics, "statistics").getContentContainer();
	}

	/**
	 * Called when the settings tab is hidden
	 */
	hide(): void {
		// Call hide on components that need cleanup
		if (this.fieldMappingsSettings.hide) {
			this.fieldMappingsSettings.hide();
		}
		if (this.fetchIssue.hide) {
			this.fetchIssue.hide();
		}
		if (this.testFieldMappings.hide) {
			this.testFieldMappings.hide();
		}

		super.hide();
	}
}
