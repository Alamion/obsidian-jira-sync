import { App, PluginSettingTab } from "obsidian";
import JiraPlugin from "../main";
import { SettingsComponentProps } from "../interfaces/settingsTypes";
import { ConnectionSettingsComponent } from "./components/ConnectionSettingsComponent";
import { GeneralSettingsComponent } from "./components/GeneralSettingsComponent";
import { FieldMappingsComponent } from "./components/FieldMappingsComponent";
import { RawIssueViewerComponent } from "./components/RawIssueViewerComponent";
import { TestFieldMappingsComponent } from "./components/TestFieldMappingsComponent";
import { debugLog } from "../tools/debugLogging";
import { CollapsibleSection } from "./CollapsibleSection";

/**
 * Settings tab for the Jira plugin
 * Orchestrates all components and manages the overall settings UI
 */
export class JiraSettingTab extends PluginSettingTab {
	private plugin: JiraPlugin;
	private connectionSettings: ConnectionSettingsComponent;
	private generalSettings: GeneralSettingsComponent;
	private fieldMappingsSettings: FieldMappingsComponent;
	private rawIssueViewer: RawIssueViewerComponent;
	private testFieldMappings: TestFieldMappingsComponent;

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
		this.rawIssueViewer = new RawIssueViewerComponent(componentProps);
		this.testFieldMappings = new TestFieldMappingsComponent({ ...componentProps, getCurrentIssue: () => this.rawIssueViewer.getCurrentIssue() });
		this.rawIssueViewer.onIssueDataChange = () => this.testFieldMappings.setCurrentIssue(this.rawIssueViewer.getCurrentIssue());
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

		new CollapsibleSection(this.plugin, containerEl, this.connectionSettings, "Connection settings",
			this.plugin.settings.collapsedSections.connection, "connection").getContentContainer();

		new CollapsibleSection(this.plugin, containerEl, this.generalSettings, "General settings",
			this.plugin.settings.collapsedSections.general, "general").getContentContainer();

		new CollapsibleSection(this.plugin, containerEl, this.fieldMappingsSettings, "Field mappings",
			this.plugin.settings.collapsedSections.fieldMappings, "fieldMappings").getContentContainer();

		new CollapsibleSection(this.plugin, containerEl, this.rawIssueViewer, "Raw issue viewer",
			this.plugin.settings.collapsedSections.rawIssueViewer, "rawIssueViewer").getContentContainer();

		new CollapsibleSection(this.plugin, containerEl, this.testFieldMappings, "Test field mappings",
			this.plugin.settings.collapsedSections.testFieldMappings, "testFieldMappings").getContentContainer();
	}

	/**
	 * Called when the settings tab is hidden
	 */
	hide(): void {
		// Call hide on components that need cleanup
		if (this.fieldMappingsSettings.hide) {
			this.fieldMappingsSettings.hide();
		}
		if (this.rawIssueViewer.hide) {
			this.rawIssueViewer.hide();
		}
		if (this.testFieldMappings.hide) {
			this.testFieldMappings.hide();
		}

		super.hide();
	}
}
