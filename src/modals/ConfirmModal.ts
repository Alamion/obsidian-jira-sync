import { App, Modal, Setting } from 'obsidian';

export class ConfirmModal extends Modal {
	private message: string;
	private onConfirm: () => void;
	private onCancel: () => void;

	constructor(app: App, message: string, onConfirm: () => void, onCancel: () => void) {
		super(app);
		this.message = message;
		this.onConfirm = onConfirm;
		this.onCancel = onCancel;
	}

	onOpen() {
		this.contentEl.createEl('h2', { text: this.message });

		new Setting(this.contentEl)
			.addButton((btn) =>
				btn
					.setButtonText('Yes')
					.setCta()
					.onClick(() => {
						this.close();
						this.onConfirm();
					}),
			)
			.addButton((btn) =>
				btn.setButtonText('No').onClick(() => {
					this.close();
					this.onCancel();
				}),
			);
	}

	onClose() {
		this.contentEl.empty();
	}
}
