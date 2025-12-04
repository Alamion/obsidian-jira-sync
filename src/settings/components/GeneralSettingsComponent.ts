import { App, Setting, normalizePath } from "obsidian";
import { SettingsComponent, SettingsComponentProps } from "../../interfaces/settingsTypes";
import { TemplateSuggest } from "./TemplateSuggest";
import { FolderSuggest } from "./FolderSuggest";
import {useTranslations} from "../../localization/translator";

const t = useTranslations("settings.general").t;

interface TemplatePluginInfo {
	coreTemplatesEnabled: boolean;
	templaterEnabled: boolean;
	templateDirectory: string | null;
	warningMessage: string;
}

export class GeneralSettingsComponent implements SettingsComponent {
	private props: SettingsComponentProps;

	constructor(props: SettingsComponentProps) {
		this.props = props;
	}

	render(containerEl: HTMLElement): void {
		const { plugin } = this.props;

		// Issues folder setting with native search
		const folderSetting = new Setting(containerEl)
			.setName(t("folder.name"))
			.setDesc(t("folder.desc"));

		folderSetting.addSearch((search) => {
			const onChange = async (value: string) => {
				plugin.settings.global.issuesFolder = value;
				await plugin.saveSettings();
			}
			search
				.setPlaceholder(t("folder.placeholder"))
				.setValue(plugin.settings.global.issuesFolder)
				.onChange(onChange);
			new FolderSuggest(plugin.app, search.inputEl, onChange);
		});

		// Template path setting with native search
		const templateInfo = this.detectTemplatePlugins(plugin.app);

		const setting = new Setting(containerEl)
			.setName(t("template.name"))
			.setDesc(t("template.desc"));

		// Add warning if no template plugins are enabled
		if (templateInfo.warningMessage) {
			setting.descEl.createDiv({}, (div) => {
				div.createEl("small", {
					text: templateInfo.warningMessage,
					cls: "mod-warning"
				});
			});
		}

		// Create template search with native Obsidian API
		setting.addSearch((search) => {
			const onChange = async (value: string) => {
				plugin.settings.global.templatePath = value ? normalizePath(value) : '';
				await plugin.saveSettings();
			}
			search
				.setPlaceholder(t("template.selector.placeholder"))
				.setValue(plugin.settings.global.templatePath || "")
				.onChange(onChange);
			new TemplateSuggest(plugin.app, search.inputEl, templateInfo.templateDirectory, onChange);
		});
	}


	private detectTemplatePlugins(app: App): TemplatePluginInfo {
		const coreTemplates = (app as any).internalPlugins?.plugins?.templates;
		const templaterPlugin = (app as any).plugins?.plugins?.['templater-obsidian'];

		const coreTemplatesEnabled = coreTemplates?.enabled || false;
		const templaterEnabled = (app as any).plugins?.enabledPlugins?.has('templater-obsidian') || false;

		let templateDirectory: string | null = null;
		let warningMessage = "";

		if (coreTemplatesEnabled && coreTemplates.instance?.options?.folder) {
			templateDirectory = coreTemplates.instance.options.folder;
		} else if (templaterEnabled && templaterPlugin?.settings?.template_folder) {
			templateDirectory = templaterPlugin.settings.template_folder;
		}

		if (!coreTemplatesEnabled && !templaterEnabled) {
			warningMessage = t("template.warning");
		}

		return {
			coreTemplatesEnabled,
			templaterEnabled,
			templateDirectory,
			warningMessage
		};
	}
}
