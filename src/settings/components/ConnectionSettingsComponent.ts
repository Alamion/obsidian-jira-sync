import { Setting } from "obsidian";
import { SettingsComponent, SettingsComponentProps } from "../../interfaces/settingsTypes";

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
			.setName("Jira URL")
			.setDesc("Your Jira instance URL")
			.addText((text) =>
				text
					.setPlaceholder("https://yourcompany.atlassian.net")
					.setValue(plugin.settings.jiraUrl)
					.onChange(async (value) => {
						plugin.settings.jiraUrl = value;
						await plugin.saveSettings();
					})
			);

		// Auth Method Select
		const authMethodSetting = new Setting(containerEl)
			.setName("Authentication method")
			.setDesc("Choose how to authenticate with Jira")
			.addDropdown((cb) =>
				cb
					.addOption("bearer", "Bearer Token (PAT)")
					.addOption("basic", "Basic Auth (Username + PAT)")
					.addOption("session", "Session Cookie (Username + Password)")
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
			.setName("Jira PAT")
			.setDesc("Personal Access Token")
			.addText((text) => {
				text.inputEl.type = "password";
				text
					.setPlaceholder("NjM5MDI5MzQ0NT...")
					.setValue(plugin.settings.apiToken)
					.onChange(async (value) => {
						plugin.settings.apiToken = value;
						await plugin.saveSettings();
					});
			});
		this.settingElements.set("pat", patSetting.settingEl);

		// Jira username
		const usernameSetting = new Setting(containerEl)
			.setName("Jira username")
			.setDesc("Your Jira username")
			.addText((text) =>
				text
					.setPlaceholder("admin")
					.setValue(plugin.settings.username)
					.onChange(async (value) => {
						plugin.settings.username = value;
						await plugin.saveSettings();
					})
			);
		this.settingElements.set("username", usernameSetting.settingEl);

		// Jira username
		const emailSetting = new Setting(containerEl)
			.setName("Jira email")
			.setDesc("Your Jira email")
			.addText((text) =>
				text
					.setPlaceholder("admin@gmail.com")
					.setValue(plugin.settings.email)
					.onChange(async (value) => {
						plugin.settings.email = value;
						await plugin.saveSettings();
					})
			);
		this.settingElements.set("email", emailSetting.settingEl);

		// Jira password
		const passwordSetting = new Setting(containerEl)
			.setName("Jira password")
			.setDesc("Your Jira password")
			.addText((text) => {
				text.inputEl.type = "password";
				text
					.setPlaceholder("qwerty")
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

		// Initial visibility
		this.updateVisibility();
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
