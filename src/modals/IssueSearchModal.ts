import { App, Modal, Setting } from 'obsidian';
import { useTranslations } from '../localization/translator';
import { JQLPreview } from '../settings/components/JQLPreview';
import JiraPlugin from '../main';

const t = useTranslations('modals.search').t;
/**
 * Modal for searching issues by key
 */
export class IssueSearchModal extends Modal {
	private onSubmit: (result: string) => void;
	private plugin: JiraPlugin;
	private issueKey: string = '';
	private previewEl?: HTMLElement;
	private preview?: JQLPreview;
	private debounceTimer?: number;

	constructor(app: App, plugin: JiraPlugin, onSubmit: (result: string) => void) {
		super(app);
		this.plugin = plugin;
		this.onSubmit = onSubmit;
	}

	onOpen() {
		this.contentEl.createEl('h2', { text: t('desc') });

		new Setting(this.contentEl)
			.setName(t('key.name'))
			.setDesc(t('key.desc'))
			.addText((text) =>
				text.setPlaceholder(t('key.placeholder')).onChange((value) => {
					this.issueKey = value;
					this.schedulePreview();
				}),
			);

		this.previewEl = this.contentEl.createDiv();
		this.preview = new JQLPreview(this.plugin, this.previewEl, 1, false);
		this.preview.loadPreview('');

		new Setting(this.contentEl).addButton((btn) =>
			btn
				.setButtonText(t('submit'))
				.setCta()
				.onClick(() => {
					this.close();
					this.onSubmit(this.issueKey);
				}),
		);

		// Handle Enter key
		this.contentEl.addEventListener('keydown', (event) => {
			if (event.key === 'Enter') {
				event.preventDefault();
				this.close();
				this.onSubmit(this.issueKey);
			}
		});
	}

	private schedulePreview() {
		if (this.debounceTimer) {
			window.clearTimeout(this.debounceTimer);
		}

		// Show loading immediately if there's text
		if (this.issueKey.trim() && this.preview) {
			this.preview.showLoading();
		}

		this.debounceTimer = window.setTimeout(() => {
			if (this.preview) {
				this.preview.loadPreview(this.issueKey ? 'key = ' + this.issueKey : '').catch(() => {
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
