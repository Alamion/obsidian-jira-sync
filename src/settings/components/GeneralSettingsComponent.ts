import { normalizePath, Setting } from "obsidian";
import { SettingsComponent, SettingsComponentProps } from "../../interfaces/settingsTypes";

/**
 * Component for general plugin settings
 */
export class GeneralSettingsComponent implements SettingsComponent {
	private props: SettingsComponentProps;

	constructor(props: SettingsComponentProps) {
		this.props = props;
	}

	render(containerEl: HTMLElement): void {
		const { plugin } = this.props;

		// Issues folder setting
		new Setting(containerEl)
			.setName("Issues folder")
			.setDesc("Folder where Jira issues will be stored")
			.addText((text) =>
				text
					.setPlaceholder("jira-issues")
					.setValue(plugin.settings.issuesFolder)
					.onChange(async (value) => {
						plugin.settings.issuesFolder = value;
						await plugin.saveSettings();
					})
			);

		// Template path setting
		new Setting(containerEl)
			.setName("Template path")
			.setDesc("The path of used template for creating Jira tasks (with or without .md extension)")
			.addText((text) =>
				text
					.setPlaceholder("templates/template1")
					.setValue(plugin.settings.templatePath)
					.onChange(async (value) => {
						value = normalizePath(value);
						plugin.settings.templatePath = value;
						await plugin.saveSettings();
					})
			);
	}
}
