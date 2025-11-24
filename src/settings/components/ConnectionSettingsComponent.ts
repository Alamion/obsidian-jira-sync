import {Notice, Setting} from "obsidian";
import { useTranslations } from "src/localization/translator"
import { SettingsComponent, SettingsComponentProps } from "../../interfaces/settingsTypes";
import { fetchSelf } from "../../api";
import {debugLog} from "../../tools/debugLogging";

const t = useTranslations("settings.connection").t

/**
 * Component for Jira connection settings
 */
export class ConnectionSettingsComponent implements SettingsComponent {
	private props: SettingsComponentProps;
	private currentAuthMethod: "bearer" | "basic" | "session";
	private settingElements: Map<string, HTMLElement> = new Map();

	constructor(props: SettingsComponentProps) {
		this.props = props;
		this.currentAuthMethod = props.plugin.settings.authMethod || "bearer";
	}

	render(containerEl: HTMLElement): void {
		const { plugin } = this.props;

		// Always show: Jira URL
		new Setting(containerEl)
			.setName(t("url.title"))
			.setDesc(t("url.desc"))
			.addText((text) =>
				text
					.setPlaceholder(t("url.def"))
					.setValue(plugin.settings.jiraUrl)
					.onChange(async (value) => {
						plugin.settings.jiraUrl = value;
						await plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName(t("api_version.title"))
			.setDesc(t("api_version.desc"))
			.addDropdown((cb) =>
				cb
					.addOption("2", t("api_version.options.2"))
					.addOption("3", t("api_version.options.3"))
					.setValue(plugin.settings.apiVersion)
					.onChange(async (value: "2" | "3") => {
						plugin.settings.apiVersion = value;
						await plugin.saveSettings();
					})
			)

		// Auth Method Select
		new Setting(containerEl)
			.setName(t("auth.title"))
			.setDesc(t("auth.desc"))
			.addDropdown((cb) =>
				cb
					.addOption("bearer", t("auth.options.bearer"))
					.addOption("basic", t("auth.options.basic"))
					.addOption("session", t("auth.options.session"))
					.setValue(this.currentAuthMethod)
					.onChange(async (value: "bearer" | "basic" | "session") => {
						plugin.settings.authMethod = value;
						await plugin.saveSettings();
						this.currentAuthMethod = value;
						this.updateVisibility();
					})
			);

		// // Store reference for dynamic visibility control
		// this.settingElements.set("authMethod", authMethodSetting.settingEl);

		// Jira PAT
		const patSetting = new Setting(containerEl)
			.setName(t("pat.title"))
			.setDesc(t("pat.desc"))
			.addText((text) => {
				text.inputEl.type = "password";
				text
					.setPlaceholder(t("pat.def"))
					.setValue(plugin.settings.apiToken)
					.onChange(async (value) => {
						plugin.settings.apiToken = value;
						await plugin.saveSettings();
					});
			});
		this.settingElements.set("pat", patSetting.settingEl);

		// Jira username
		const usernameSetting = new Setting(containerEl)
			.setName(t("username.title"))
			.setDesc(t("username.desc"))
			.addText((text) =>
				text
					.setPlaceholder(t("username.def"))
					.setValue(plugin.settings.username)
					.onChange(async (value) => {
						plugin.settings.username = value;
						await plugin.saveSettings();
					})
			);
		this.settingElements.set("username", usernameSetting.settingEl);

		// Jira username
		const emailSetting = new Setting(containerEl)
			.setName(t("username.title"))
			.setDesc(t("username.desc"))
			.addText((text) =>
				text
					.setPlaceholder(t("username.def"))
					.setValue(plugin.settings.email)
					.onChange(async (value) => {
						plugin.settings.email = value;
						await plugin.saveSettings();
					})
			);
		this.settingElements.set("email", emailSetting.settingEl);

		// Jira password
		const passwordSetting = new Setting(containerEl)
			.setName(t("password.title"))
			.setDesc(t("password.desc"))
			.addText((text) => {
				text.inputEl.type = "password";
				text
					.setPlaceholder(t("password.def"))
					.setValue(plugin.settings.password)
					.onChange(async (value) => {
						plugin.settings.password = value;
						await plugin.saveSettings();
					});
			});
		this.settingElements.set("password", passwordSetting.settingEl);

		// // Session cookie name
		// const sessionCookieSetting = new Setting(containerEl)
		// 	.setName("Session cookie name")
		// 	.setDesc("Only needed for username+password authentication")
		// 	.addText((text) =>
		// 		text
		// 			.setPlaceholder("JSESSIONID")
		// 			.setValue(plugin.settings.sessionCookieName)
		// 			.onChange(async (value) => {
		// 				plugin.settings.sessionCookieName = value;
		// 				await plugin.saveSettings();
		// 			})
		// 	);
		// this.settingElements.set("sessionCookie", sessionCookieSetting.settingEl);

		// Ping button to test connection
		new Setting(containerEl)
			.setName(t("ping.title"))
			.setDesc(t("ping.desc"))
			.addButton((button) =>
				button
					.setButtonText(t("ping.button"))
					.setCta()
					.onClick(async () => {
						await this.testConnection();
					})
			);

		// Initial visibility
		this.updateVisibility();
	}

	private async testConnection(): Promise<void> {
		const { plugin } = this.props;

		try {
			const notice = new Notice("Testing connection to Jira...", 2);

			debugLog("Testing Jira connection...");

			const result = await fetchSelf(plugin);
			notice.hide();

			const successMessage = "Successfully connected to Jira";
			new Notice(successMessage);
			debugLog(successMessage, result);

		} catch (error) {
			const errorMessage = `Failed to connect to Jira: ${error.message}`;
			new Notice(errorMessage);
			console.error(errorMessage, error);
		}
	}

	private updateVisibility(): void {
		const method = this.currentAuthMethod;

		// // Show always
		// this.showElement("authMethod");

		// Show PAT if bearer or basic
		if (method === "bearer" || method === "basic") {
			this.showElement("pat");
		} else {
			this.hideElement("pat");
		}

		// Show username if basic or session
		if (method === "session") {
			this.showElement("username");
		} else {
			this.hideElement("username");
		}

		// Show email if basic or session
		if (method === "basic") {
			this.showElement("email");
		} else {
			this.hideElement("email");
		}

		// Show password only if session
		if (method === "session") {
			this.showElement("password");
		} else {
			this.hideElement("password");
		}

		// // Show session cookie only if session
		// if (method === "session") {
		// 	this.showElement("sessionCookie");
		// } else {
		// 	this.hideElement("sessionCookie");
		// }
	}

	private showElement(key: string): void {
		const el = this.settingElements.get(key);
		if (el) el.style.display = "";
	}

	private hideElement(key: string): void {
		const el = this.settingElements.get(key);
		if (el) el.style.display = "none";
	}
}
