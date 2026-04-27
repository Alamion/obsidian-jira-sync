import {App, Modal, Notice, Setting, TextAreaComponent} from "obsidian";
import {useTranslations} from "../localization/translator";

const t = useTranslations("modals.comment").t;

/**
 * Modal for adding a comment to a Jira issue.
 * Pre-populated with any text that was selected in the editor when the command was invoked.
 */
export class IssueCommentModal extends Modal {
	private onSubmit: (commentText: string) => void;
	private commentText: string;

	constructor(app: App, initialText: string, onSubmit: (commentText: string) => void) {
		super(app);
		this.commentText = initialText;
		this.onSubmit = onSubmit;
	}

	onOpen() {
		new Setting(this.contentEl).setName(t("name")).setHeading();

		const textarea = new TextAreaComponent(this.contentEl)
			.setPlaceholder(t("body.placeholder"))
			.setValue(this.commentText)
			.onChange((value) => {
				this.commentText = value;
			});
		textarea.inputEl.rows = 10;
		textarea.inputEl.style.width = "100%";
		textarea.inputEl.style.marginBottom = "0.75em";
		textarea.inputEl.addEventListener("keydown", (e) => {
			if (e.ctrlKey && e.key === "Enter") {
				e.preventDefault();
				this.submit();
			}
		});

		new Setting(this.contentEl)
			.addButton((btn) =>
				btn
					.setButtonText(t("submit"))
					.setCta()
					.onClick(() => this.submit())
			);
	}

	private submit() {
		if (!this.commentText.trim()) {
			new Notice(t("warns.empty"));
			return;
		}
		this.close();
		this.onSubmit(this.commentText);
	}
}
