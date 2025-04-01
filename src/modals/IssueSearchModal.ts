import {App, Modal, Setting} from "obsidian";

/**
 * Modal for searching issues by key
 */
export class IssueSearchModal extends Modal {
	private onSubmit: (result: string) => void;
	private issueKey: string = "";

	constructor(app: App, onSubmit: (result: string) => void) {
		super(app);
		this.onSubmit = onSubmit;
	}

	onOpen() {
		this.contentEl.createEl("h2", {text: "Search issue by key"});

		new Setting(this.contentEl)
			.setName("Issue key")
			.setDesc("Enter the Jira issue key (e.g., PROJECT-123)")
			.addText((text) =>
				text
					.setPlaceholder("Issue key")
					.onChange((value) => {
						this.issueKey = value;
					})
			);

		new Setting(this.contentEl)
			.addButton((btn) =>
				btn
					.setButtonText("Search")
					.setCta()
					.onClick(() => {
						this.close();
						this.onSubmit(this.issueKey);
					})
			);

		// Handle Enter key
		this.contentEl.addEventListener("keydown", (event) => {
			if (event.key === "Enter") {
				event.preventDefault();
				this.close();
				this.onSubmit(this.issueKey);
			}
		});
	}
}
