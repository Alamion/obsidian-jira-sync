import {setIcon} from "obsidian";
import JiraPlugin from "../main";
import { SettingsComponent } from "../interfaces/settingsTypes";
import { debugLog } from "../tools/debugLogging";
import {CollapsedSections} from "./default";

export class CollapsibleSection {
	private containerEl: HTMLDivElement;
	private contentEl: HTMLElement;
	private child: SettingsComponent;
	private isOpen = false;
	private headerText: string;
	private saveStateKey?: string;
	private plugin: JiraPlugin;

	constructor(
		plugin: JiraPlugin,
		parentEl: HTMLElement,
		child: SettingsComponent,
		headerText: string,
		isOpenByDefault = false,
		saveStateKey?: string
	) {
		this.plugin = plugin;
		this.child = child;
		this.headerText = headerText;
		this.isOpen = isOpenByDefault;
		this.saveStateKey = saveStateKey;

		// Create the container div for the entire collapsible section
		this.containerEl = parentEl.createDiv({
			cls: "jira-collapsible-section",
		});

		// Create the header element
		const headerEl = this.containerEl.createDiv({
			cls: "jira-collapsible-header",
			text: headerText,
		});
		headerEl.style.cursor = "pointer";
		headerEl.addEventListener("click", async () => {
			await this.toggle();
		});

		const chevron = headerEl.createEl('span', {
			cls: 'jira-collapse-icon',
		});
		setIcon(chevron, "chevron-down");

		// Content wrapper
		this.contentEl = this.containerEl.createDiv({
			cls: "jira-collapsible-content",
		});

		this.child.render(this.contentEl);

		if (!this.isOpen) {
			this.contentEl.hide();
			this.containerEl.addClass("collapsed");
		}

		debugLog("Rendered", this.saveStateKey || this.headerText, "as", this.isOpen);
	}

	public getContentContainer(): HTMLElement {
		return this.contentEl;
	}

	private async toggle() {
		this.isOpen = !this.isOpen;
		debugLog("Toggled", this.saveStateKey || this.headerText, "to", this.isOpen);

		// Rebuild or update the toggle button if needed
		// Or store a reference to the button and just update its properties

		if (this.isOpen) {
			this.contentEl.show();
			this.containerEl.removeClass("collapsed");
		} else {
			this.contentEl.hide();
			this.containerEl.addClass("collapsed");
		}

		if (this.saveStateKey && this.plugin) {
			this.plugin.settings.collapsedSections[this.saveStateKey as keyof CollapsedSections] = this.isOpen;
			await this.plugin.saveSettings();
		}
	}
}
