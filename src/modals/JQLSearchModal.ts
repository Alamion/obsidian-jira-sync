import { App, Modal, Setting, DropdownComponent } from 'obsidian';
import { useTranslations } from '../localization/translator';
import JiraPlugin from '../main';
import { JQLPreview } from '../settings/components/JQLPreview';
import { JQLPreset } from '../settings/default';

const t = useTranslations('modals.jql_search').t;

export class JQLSearchModal extends Modal {
	private onSubmit: (jql: string) => void;
	private plugin: JiraPlugin;
	private jql: string = '';
	private previewEl?: HTMLElement;
	private preview?: JQLPreview;
	private debounceTimer?: number;
	private presetName: string = '';
	private presetDropdown?: DropdownComponent;

	constructor(app: App, plugin: JiraPlugin, onSubmit: (jql: string) => void) {
		super(app);
		this.plugin = plugin;
		this.onSubmit = onSubmit;
	}

	onOpen() {
		const conn = this.plugin.getCurrentConnection();
		if (conn?.lastJqlQuery) {
			this.jql = conn.lastJqlQuery;
			this.schedulePreview();
		}

		this.contentEl.createEl('h2', { text: t('desc') });

		const presetSetting = new Setting(this.contentEl).setName(t('presets.load')).setDesc(t('presets.load_desc'));

		presetSetting.addDropdown((dropdown) => {
			this.presetDropdown = dropdown;
			this.populateDropdown(dropdown);
			dropdown.onChange((value) => {
				if (value) {
					const preset = this.getPresets().find((p) => p.name === value);
					if (preset) {
						this.jql = preset.query;
						const textarea = this.contentEl.querySelector('textarea');
						if (textarea) {
							textarea.value = preset.query;
						}
						this.schedulePreview();
					}
				}
			});
		});

		presetSetting.addButton((btn) =>
			btn.setButtonText(t('presets.delete')).onClick(() => {
				const selectedName = this.presetDropdown?.getValue();
				if (selectedName) {
					this.deletePreset(selectedName);
					if (this.presetDropdown) {
						this.populateDropdown(this.presetDropdown);
					}
				}
			}),
		);

		new Setting(this.contentEl)
			.setName(t('presets.save'))
			.setDesc(t('presets.save_desc'))
			.addText((text) =>
				text.setPlaceholder(t('presets.save_hint')).onChange((value) => {
					this.presetName = value;
				}),
			)
			.addButton((btn) =>
				btn.setButtonText(t('presets.save_btn')).onClick(() => {
					if (this.jql.trim() && this.presetName.trim()) {
						this.savePreset(this.presetName.trim(), this.jql.trim());
						this.presetName = '';
						const nameInput = this.contentEl.querySelectorAll('input')[1];
						if (nameInput) nameInput.value = '';
						if (this.presetDropdown) {
							this.populateDropdown(this.presetDropdown);
						}
					}
				}),
			);

		new Setting(this.contentEl)
			.setName(t('jql.name'))
			.setDesc(t('jql.desc'))
			.addTextArea((text) => {
				text.setPlaceholder(t('jql.placeholder'))
					.setValue(this.jql)
					.onChange((value) => {
						this.jql = value;
						this.schedulePreview();
					});
				text.inputEl.style.height = '100px';
			});

		this.previewEl = this.contentEl.createDiv();
		this.preview = new JQLPreview(this.plugin, this.previewEl, 5);
		this.preview.loadPreview('');

		new Setting(this.contentEl).addButton((btn) =>
			btn
				.setButtonText(t('submit'))
				.setCta()
				.onClick(() => {
					if (this.jql.trim()) {
						this.saveLastQuery(this.jql.trim());
						this.close();
						this.onSubmit(this.jql.trim());
					}
				}),
		);

		this.contentEl.addEventListener('keydown', (event) => {
			if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
				event.preventDefault();
				if (this.jql.trim()) {
					this.saveLastQuery(this.jql.trim());
					this.close();
					this.onSubmit(this.jql.trim());
				}
			}
		});
	}

	private populateDropdown(dropdown: DropdownComponent) {
		dropdown.selectEl.empty();
		dropdown.addOption('', '— ' + t('presets.select') + ' —');
		for (const preset of this.getPresets()) {
			dropdown.addOption(preset.name, preset.name);
		}
	}

	private getPresets(): JQLPreset[] {
		const conn = this.plugin.getCurrentConnection();
		return conn?.jqlPresets || [];
	}

	private savePreset(name: string, query: string) {
		const conn = this.plugin.getCurrentConnection();
		if (!conn) return;

		const existingIndex = conn.jqlPresets.findIndex((p) => p.name === name);
		if (existingIndex >= 0) {
			conn.jqlPresets[existingIndex].query = query;
		} else {
			conn.jqlPresets.push({ name, query });
		}
		this.plugin.saveSettings();
	}

	private deletePreset(name: string) {
		const conn = this.plugin.getCurrentConnection();
		if (!conn) return;
		conn.jqlPresets = conn.jqlPresets.filter((p) => p.name !== name);
		this.plugin.saveSettings();
	}

	private saveLastQuery(jql: string) {
		const conn = this.plugin.getCurrentConnection();
		if (!conn) return;
		conn.lastJqlQuery = jql;
		this.plugin.saveSettings();
	}

	private schedulePreview() {
		if (this.debounceTimer) {
			window.clearTimeout(this.debounceTimer);
		}
		if (this.jql.trim() && this.preview) {
			this.preview.showLoading();
		}
		this.debounceTimer = window.setTimeout(() => {
			if (this.preview) {
				this.preview.loadPreview(this.jql).catch(() => {});
			}
		}, 600);
	}

	onClose() {
		if (this.debounceTimer) {
			window.clearTimeout(this.debounceTimer);
		}
	}
}
