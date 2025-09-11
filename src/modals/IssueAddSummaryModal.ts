import {App, Modal, Setting} from "obsidian";
import {useTranslations} from "../localization/translator";

const t = useTranslations("modals.add_summary").t;
/**
 * Modal for searching issues by key
 */
export class IssueAddSummaryModal extends Modal {
	private onSubmit: (result: string) => void;
	private summary: string = "";

	constructor(app: App, onSubmit: (result: string) => void) {
		super(app);
		this.onSubmit = onSubmit;
	}

	onOpen() {
		this.contentEl.createEl("h2", {text: t("desc")});

		new Setting(this.contentEl)
			.setName(t("key.name"))
			.setDesc(t("key.desc"))
			.addText((text) =>
				text
					.setPlaceholder(t("key.placeholder"))
					.onChange((value) => {
						this.summary = value;
					})
			);

		new Setting(this.contentEl)
			.addButton((btn) =>
				btn
					.setButtonText(t("submit"))
					.setCta()
					.onClick(() => {
						this.close();
						this.onSubmit(this.summary);
					})
			);

		// Handle Enter key
		this.contentEl.addEventListener("keydown", (event) => {
			if (event.key === "Enter") {
				event.preventDefault();
				this.close();
				this.onSubmit(this.summary);
			}
		});
	}
}
