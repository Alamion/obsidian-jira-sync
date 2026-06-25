import { Notice, Setting } from 'obsidian';
import { SettingsComponent, SettingsComponentProps } from '../../interfaces/settingsTypes';
import { fetchIssue, validateSettings } from '../../api';
import { renameExistingIssueFiles } from '../../file_operations/getIssue';
import { ConfirmModal } from '../../modals/ConfirmModal';
import debounce from 'lodash/debounce';
import hljs from 'highlight.js';
import { useTranslations } from '../../localization/translator';
import { setupArrayTextSetting } from '../tools/setupArrayTextString';

const t = useTranslations('settings.fetch_issue').t;
export class FetchIssueComponent implements SettingsComponent {
	private props: SettingsComponentProps;
	private issueDataContainer: HTMLElement | null = null;
	private debouncedFetch: ReturnType<typeof debounce>;
	private currentIssueData: any = null;
	private currentIssueKey: string = '';
	public onIssueDataChange?: () => void;

	constructor(props: SettingsComponentProps) {
		this.props = props;
		this.debouncedFetch = debounce(this.fetchIssueData.bind(this), 500);
	}

	render(containerEl: HTMLElement): void {
		const { plugin } = this.props;

		const filenameTemplateSetting = new Setting(containerEl)
			.setName(t('filenameTemplate.name'))
			.setDesc(t('filenameTemplate.desc'));

		filenameTemplateSetting.addText((text) => {
			text.setPlaceholder(t('filenameTemplate.placeholder'))
				.setValue(plugin.settings.fetchIssue.filenameTemplate || '')
				.onChange(async (value) => {
					plugin.settings.fetchIssue.filenameTemplate = value;
					await plugin.saveSettings();
				});
		});

		filenameTemplateSetting.addButton((btn) =>
			btn.setButtonText(t('rename_files')).onClick(async () => {
				if (!validateSettings(plugin)) return;

				const cacheSize = plugin.getAllIssueKeysMap().size;
				if (cacheSize === 0) {
					new Notice(t('no_files_to_rename'));
					return;
				}

				new ConfirmModal(
					plugin.app,
					t('rename_confirm', { count: cacheSize.toString() }),
					async () => {
						const result = await renameExistingIssueFiles(plugin);
						if (result.renamed > 0) {
							new Notice(t('rename_success', { count: result.renamed.toString() }));
						}
						if (result.errors.length > 0) {
							new Notice(
								t('rename_errors', { count: result.errors.length.toString() }) +
									': ' +
									result.errors.slice(0, 3).join(', '),
							);
						}
						if (result.renamed === 0 && result.errors.length === 0) {
							new Notice(t('rename_no_changes'));
						}
					},
					() => {},
				).open();
			}),
		);

		const link =
			plugin.getCurrentConnection()?.apiVersion === '3'
				? 'https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-search/#api-rest-api-3-search-jql-post'
				: 'https://developer.atlassian.com/cloud/jira/platform/rest/v2/api-group-issue-search/#api-rest-api-2-search-jql-post';

		const securityNote = containerEl.createEl('p');
		securityNote.createEl('strong', {
			text: t('note.desc0'),
		});
		securityNote.createSpan({
			text: t('note.desc1'),
		});
		securityNote.createEl('br');
		securityNote.createEl('br');
		securityNote.createSpan({
			text: t('note.desc2'),
		});
		securityNote.createEl('a', {
			text: t('note.link_label'),
			href: link,
			cls: 'external-link',
		});
		securityNote.createSpan({
			text: t('note.desc3'),
		});

		new Setting(containerEl)
			.setName(t('fields.name'))
			.setDesc(t('fields.desc'))
			.addText((text) => {
				text.setPlaceholder(t('fields.def'));
				setupArrayTextSetting(text, plugin.settings.fetchIssue.fields, async (array) => {
					plugin.settings.fetchIssue.fields = array;
					this.rerenderIssueData();
					await plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName(t('expand.name'))
			.setDesc(t('expand.desc'))
			.addText((text) => {
				text.setPlaceholder(t('expand.def'));
				setupArrayTextSetting(text, plugin.settings.fetchIssue.expand, async (array) => {
					plugin.settings.fetchIssue.expand = array;
					this.rerenderIssueData();
					await plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName(t('key.name'))
			.setDesc(t('key.desc'))
			.addText((text) =>
				text.setPlaceholder('PROJ-123').onChange((value) => {
					this.currentIssueKey = value;
					this.rerenderIssueData();
				}),
			);

		this.issueDataContainer = containerEl.createDiv({
			cls: 'jira-raw-issue-container',
		});
	}

	private rerenderIssueData() {
		if (this.currentIssueKey) {
			this.debouncedFetch(this.currentIssueKey);
		} else {
			this.clearIssueData();
		}
	}

	public getCurrentIssue(): any {
		return this.currentIssueData;
	}

	private async fetchIssueData(value: string): Promise<void> {
		try {
			const issueData = await fetchIssue(this.props.plugin, value);
			this.currentIssueData = issueData;
			this.displayIssueData(issueData);
		} catch (error: unknown) {
			new Notice(`Failed to fetch issue: ${(error as Error).message}`);
			this.clearIssueData();
		}
		if (this.onIssueDataChange) {
			this.onIssueDataChange();
		}
	}

	private displayIssueData(issueData: any): void {
		if (!this.issueDataContainer) return;

		this.issueDataContainer.empty();

		const pre = this.issueDataContainer.createEl('pre', {
			cls: 'jira-copyable',
		});

		const code = pre.createEl('code', {
			cls: 'language-json',
		});

		const jsonString = JSON.stringify(issueData, null, 2);
		code.setText(jsonString);
		hljs.highlightElement(code);
	}

	private clearIssueData(): void {
		if (this.issueDataContainer) {
			this.issueDataContainer.empty();
		}
		this.currentIssueData = null;
	}

	hide(): void {
		this.clearIssueData();
		this.debouncedFetch.cancel();
	}
}
