import { Notice, Setting } from 'obsidian';
import { useTranslations } from '../../localization/translator';
import { SettingsComponent, SettingsComponentProps } from '../../interfaces/settingsTypes';
import { fetchSelf } from '../../api';
import { debugLog } from '../../tools/debugLogging';

const t = useTranslations('settings.connection').t;

/**
 * Component for Jira connection settings
 */
export class ConnectionSettingsComponent implements SettingsComponent {
	private props: SettingsComponentProps;
	private currentAuthMethod: 'bearer' | 'basic' | 'session';
	private settingElements: Map<string, HTMLElement> = new Map();
	private connectionDropdown: any;
	private fieldsContainer!: HTMLElement;

	constructor(props: SettingsComponentProps) {
		this.props = props;
		const currentConn = this.getCurrentConnection();
		this.currentAuthMethod = currentConn?.authMethod || 'bearer';
	}

	private getCurrentConnection() {
		const { plugin } = this.props;
		if (!plugin.settings.connections || plugin.settings.connections.length === 0) {
			return null;
		}
		return plugin.settings.connections[plugin.settings.currentConnectionIndex];
	}

	private getNextConnectionName(): string {
		const { plugin } = this.props;
		const count = plugin.settings.connections?.length || 0;
		return `Connection ${count + 1}`;
	}

	render(containerEl: HTMLElement): void {
		const { plugin } = this.props;

		// Connection selector dropdown and add button
		new Setting(containerEl)
			.setName(t('select_connection'))
			.addDropdown((cb) => {
				this.connectionDropdown = cb;
				this.populateConnectionDropdown(cb);
				cb.onChange(async (value) => {
					const index = parseInt(value, 10);
					plugin.settings.currentConnectionIndex = index;
					await plugin.saveSettings();
					this.refreshFields();
				});
			})
			.addButton((button) => {
				button
					.setButtonText('+')
					.setTooltip(t('add_connection'))
					.onClick(async () => {
						const newConnection = {
							name: this.getNextConnectionName(),
							authMethod: 'bearer' as const,
							apiToken: '',
							username: '',
							email: '',
							password: '',
							jiraUrl: '',
							apiVersion: '2' as const,
						};
						plugin.settings.connections.push(newConnection);
						plugin.settings.currentConnectionIndex = plugin.settings.connections.length - 1;
						await plugin.saveSettings();
						this.populateConnectionDropdown(this.connectionDropdown);
						this.refreshFields();
					});
			});

		// Container for connection fields
		this.fieldsContainer = containerEl.createDiv();
		this.fieldsContainer.addClass('connection-fields-container');
		this.renderConnectionFields(this.fieldsContainer);
	}

	private populateConnectionDropdown(cb: any): void {
		const { plugin } = this.props;
		cb.selectEl.innerHTML = '';
		plugin.settings.connections.forEach((conn, index) => {
			cb.addOption(index.toString(), conn.name || `Connection ${index + 1}`);
		});
		cb.setValue(plugin.settings.currentConnectionIndex.toString());
	}

	private renderConnectionFields(containerEl: HTMLElement): void {
		const { plugin } = this.props;
		containerEl.empty();
		this.settingElements.clear();

		const currentConn = this.getCurrentConnection();
		if (!currentConn) {
			containerEl.createDiv({ text: t('no_connection') });
			return;
		}

		new Setting(containerEl)
			.setName(t('name.title'))
			.setDesc(t('name.desc'))
			.addText((text) =>
				text
					.setPlaceholder(t('name.def'))
					.setValue(currentConn.name)
					.onChange(async (value) => {
						currentConn.name = value;
						await plugin.saveSettings();
						this.populateConnectionDropdown(this.connectionDropdown);
					}),
			);

		// Always show: Jira URL
		new Setting(containerEl)
			.setName(t('url.title'))
			.setDesc(t('url.desc'))
			.addText((text) =>
				text
					.setPlaceholder(t('url.def'))
					.setValue(currentConn.jiraUrl)
					.onChange(async (value) => {
						currentConn.jiraUrl = value;
						await plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName(t('api_version.title'))
			.setDesc(t('api_version.desc'))
			.addDropdown((cb) =>
				cb
					.addOption('2', t('api_version.options.2'))
					.addOption('3', t('api_version.options.3'))
					.setValue(currentConn.apiVersion)
					.onChange(async (value: string) => {
						currentConn.apiVersion = value as '2' | '3';
						await plugin.saveSettings();
					}),
			);

		// Auth Method Select
		new Setting(containerEl)
			.setName(t('auth.title'))
			.setDesc(t('auth.desc'))
			.addDropdown((cb) =>
				cb
					.addOption('bearer', t('auth.options.bearer'))
					.addOption('basic', t('auth.options.basic'))
					.addOption('session', t('auth.options.session'))
					.setValue(this.currentAuthMethod)
					.onChange(async (value: string) => {
						currentConn.authMethod = value as 'bearer' | 'basic' | 'session';
						await plugin.saveSettings();
						this.currentAuthMethod = value as 'bearer' | 'basic' | 'session';
						this.updateVisibility();
					}),
			);

		// Jira PAT
		const patSetting = new Setting(containerEl)
			.setName(t('pat.title'))
			.setDesc(t('pat.desc'))
			.addText((text) => {
				text.inputEl.type = 'password';
				text.setPlaceholder(t('pat.def'))
					.setValue(currentConn.apiToken)
					.onChange(async (value) => {
						currentConn.apiToken = value;
						await plugin.saveSettings();
					});
			});
		this.settingElements.set('pat', patSetting.settingEl);

		// Jira username
		const usernameSetting = new Setting(containerEl)
			.setName(t('username.title'))
			.setDesc(t('username.desc'))
			.addText((text) =>
				text
					.setPlaceholder(t('username.def'))
					.setValue(currentConn.username)
					.onChange(async (value) => {
						currentConn.username = value;
						await plugin.saveSettings();
					}),
			);
		this.settingElements.set('username', usernameSetting.settingEl);

		// Jira email
		const emailSetting = new Setting(containerEl)
			.setName(t('email.title'))
			.setDesc(t('email.desc'))
			.addText((text) =>
				text
					.setPlaceholder(t('email.def'))
					.setValue(currentConn.email)
					.onChange(async (value) => {
						currentConn.email = value;
						await plugin.saveSettings();
					}),
			);
		this.settingElements.set('email', emailSetting.settingEl);

		// Jira password
		const passwordSetting = new Setting(containerEl)
			.setName(t('password.title'))
			.setDesc(t('password.desc'))
			.addText((text) => {
				text.inputEl.type = 'password';
				text.setPlaceholder(t('password.def'))
					.setValue(currentConn.password)
					.onChange(async (value) => {
						currentConn.password = value;
						await plugin.saveSettings();
					});
			});
		this.settingElements.set('password', passwordSetting.settingEl);

		// Ping button to test connection
		new Setting(containerEl)
			.setName(t('ping.title'))
			.setDesc(t('ping.desc'))
			.addButton((button) =>
				button
					.setButtonText(t('ping.button'))
					.setCta()
					.onClick(async () => {
						await this.testConnection();
					}),
			);

		// Initial visibility
		this.updateVisibility();
	}

	private refreshFields(): void {
		const currentConn = this.getCurrentConnection();
		if (currentConn) {
			this.currentAuthMethod = currentConn.authMethod;
		}
		this.renderConnectionFields(this.fieldsContainer);
	}

	private async testConnection(): Promise<void> {
		const { plugin } = this.props;

		try {
			const notice = new Notice('Testing connection to Jira...', 2);

			debugLog('Testing Jira connection...');

			const result = await fetchSelf(plugin);
			notice.hide();

			const successMessage = 'Successfully connected to Jira';
			new Notice(successMessage);
			debugLog(successMessage, result);
		} catch (error: unknown) {
			const errorMessage = `Failed to connect to Jira: ${(error as Error).message}`;
			new Notice(errorMessage);
			console.error(errorMessage, error);
		}
	}

	private updateVisibility(): void {
		const method = this.currentAuthMethod;

		if (method === 'bearer' || method === 'basic') {
			this.showElement('pat');
		} else {
			this.hideElement('pat');
		}

		if (method === 'session') {
			this.showElement('username');
		} else {
			this.hideElement('username');
		}

		if (method === 'basic') {
			this.showElement('email');
		} else {
			this.hideElement('email');
		}

		if (method === 'session') {
			this.showElement('password');
		} else {
			this.hideElement('password');
		}
	}

	private showElement(key: string): void {
		const el = this.settingElements.get(key);
		if (el) el.style.display = '';
	}

	private hideElement(key: string): void {
		const el = this.settingElements.get(key);
		if (el) el.style.display = 'none';
	}
}
