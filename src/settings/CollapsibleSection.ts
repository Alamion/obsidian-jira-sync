import { ButtonComponent } from "obsidian";
import JiraPlugin from "../main";
import { SettingsComponent } from "../interfaces/settingsTypes";
import { debugLog } from "../tools/debugLogging";

export class CollapsibleSection {
	private containerEl: HTMLDivElement;
	private contentEl: HTMLElement;
	private child: SettingsComponent;
	private isOpen = false;
	private headerText: string;
	private saveStateKey?: string;
	private plugin: JiraPlugin;
	private toggleBtn: ButtonComponent;

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

		// Add toggle button to the header
		this.toggleBtn = new ButtonComponent(headerEl as any);
		this.toggleBtn.setIcon(this.isOpen ? "chevron-down" : "chevron-right")
			.setTooltip(this.isOpen ? "Collapse" : "Expand")

		// Content wrapper
		this.contentEl = this.containerEl.createDiv({
			cls: "jira-collapsible-content",
		});

		this.child.render(this.contentEl);

		if (!this.isOpen) {
			this.contentEl.hide();
		}

		// Optional: restore saved state
		// if (this.saveStateKey && this.plugin.settings.collapsedSections[this.saveStateKey] !== undefined) {
		// 	this.isOpen = !this.plugin.settings.collapsedSections[this.saveStateKey];
		// 	if (!this.isOpen) {
		// 		this.contentEl.hide();
		// 	}
		// }

		debugLog("Rendered", this.saveStateKey || this.headerText, "as", this.isOpen);
	}

	public getContentContainer(): HTMLElement {
		return this.contentEl;
	}

	private async toggle() {
		this.isOpen = !this.isOpen;
		debugLog("Toggled", this.saveStateKey || this.headerText, "to", this.isOpen);

		const icon = this.isOpen ? "chevron-down" : "chevron-right";
		const tooltip = this.isOpen ? "Collapse" : "Expand";

		// Rebuild or update the toggle button if needed
		// Or store a reference to the button and just update its properties

		if (this.isOpen) {
			this.contentEl.show();
		} else {
			this.contentEl.hide();
		}
		this.toggleBtn.setIcon(icon).setTooltip(tooltip);

		if (this.saveStateKey && this.plugin) {
			this.plugin.settings.collapsedSections[this.saveStateKey] = this.isOpen;
			await this.plugin.saveSettings();
		}
	}
}
