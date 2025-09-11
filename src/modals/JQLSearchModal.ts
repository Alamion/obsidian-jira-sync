import {App, Modal, Setting} from "obsidian";
import {useTranslations} from "../localization/translator";
import JiraPlugin from "../main";
import {JQLPreview} from "../settings/components/JQLPreview";

const t = useTranslations("modals.jql_search").t;

/**
 * Modal for searching issues by JQL query
 */
export class JQLSearchModal extends Modal {
	private onSubmit: (jql: string) => void;
	private plugin: JiraPlugin;
	private jql: string = "";
	private previewEl?: HTMLElement;
	private preview?: JQLPreview;
	private debounceTimer?: number;

	constructor(app: App, plugin: JiraPlugin, onSubmit: (jql: string) => void) {
		super(app);
		this.plugin = plugin;
		this.onSubmit = onSubmit;
	}

	onOpen() {
		this.contentEl.createEl("h2", {text: t("desc")});

		new Setting(this.contentEl)
			.setName(t("jql.name"))
			.setDesc(t("jql.desc"))
			.addTextArea((text) => {
				text
					.setPlaceholder(t("jql.placeholder"))
					.setValue(this.jql)
					.onChange((value) => {
						this.jql = value;
						this.schedulePreview();
					});
				text.inputEl.style.height = "100px";
			});

		// Create preview container and initialize preview component
		this.previewEl = this.contentEl.createDiv();
		this.preview = new JQLPreview(this.plugin, this.previewEl, 5);
		this.preview.loadPreview("")

		new Setting(this.contentEl)
			.addButton((btn) =>
				btn
					.setButtonText(t("submit"))
					.setCta()
					.onClick(() => {
						if (this.jql.trim()) {
							this.close();
							this.onSubmit(this.jql.trim());
						}
					})
			);

		// Handle Enter key (Ctrl+Enter for textarea)
		this.contentEl.addEventListener("keydown", (event) => {
			if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
				event.preventDefault();
				if (this.jql.trim()) {
					this.close();
					this.onSubmit(this.jql.trim());
				}
			}
		});
	}

	private schedulePreview() {
		if (this.debounceTimer) {
			window.clearTimeout(this.debounceTimer);
		}

		// Show loading immediately if there's text
		if (this.jql.trim() && this.preview) {
			this.preview.showLoading();
		}

		this.debounceTimer = window.setTimeout(() => {
			if (this.preview) {
				this.preview.loadPreview(this.jql).catch(() => {
					// Error handling is done within the preview component
				});
			}
		}, 600);
	}

	onClose() {
		if (this.debounceTimer) {
			window.clearTimeout(this.debounceTimer);
		}
	}
}
