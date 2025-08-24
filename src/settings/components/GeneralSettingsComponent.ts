import { App, TFile, TFolder, Setting, normalizePath } from "obsidian";
import { SettingsComponent, SettingsComponentProps } from "../../interfaces/settingsTypes";
import { SuggestSelectComponent, SuggestSelectOption } from "./SuggestSelectComponent";
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
	private templateSelector: SuggestSelectComponent | null = null;

	constructor(props: SettingsComponentProps) {
		this.props = props;
	}

	render(containerEl: HTMLElement): void {
		const { plugin } = this.props;

		// Issues folder setting
		new Setting(containerEl)
			.setName(t("folder.name"))
			.setDesc(t("folder.desc"))
			.addText((text) =>
				text
					.setPlaceholder("jira-issues")
					.setValue(plugin.settings.issuesFolder)
					.onChange(async (value) => {
						plugin.settings.issuesFolder = value;
						await plugin.saveSettings();
					})
			);

		// Template path setting with selector
		this.createTemplateSelector(containerEl);
	}

	private createTemplateSelector(containerEl: HTMLElement): void {
		const { plugin } = this.props;
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

		// Create template selector
		this.templateSelector = new SuggestSelectComponent({
			placeholder: t("template.selector.placeholder"),
			emptyOptionText: t("template.selector.empty"),
			searchEnabled: true,
		});

		// Render selector in the setting control
		this.templateSelector.render(setting.controlEl);

		// Load template options
		const templateOptions = this.loadTemplateOptions(templateInfo);
		this.templateSelector.setOptions(templateOptions);

		// Set current value
		if (plugin.settings.templatePath) {
			this.templateSelector.setValue(plugin.settings.templatePath);
		}

		// Handle changes
		this.templateSelector.onChange(async (selectedPath) => {
			plugin.settings.templatePath = selectedPath ? normalizePath(selectedPath) : '';
			await plugin.saveSettings();
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

	private loadTemplateOptions(templateInfo: TemplatePluginInfo): SuggestSelectOption[] {
		const templateOptions: SuggestSelectOption[] = [];

		// Get templates from specified folder or vault root
		const searchFolder = templateInfo.templateDirectory
			? this.props.plugin.app.vault.getAbstractFileByPath(templateInfo.templateDirectory)
			: this.props.plugin.app.vault.getRoot();

		if (searchFolder instanceof TFolder) {
			this.scanFolderForTemplates(searchFolder, "", templateOptions);
		} else {
			// Fallback to root if specified folder doesn't exist
			this.scanFolderForTemplates(this.props.plugin.app.vault.getRoot(), "", templateOptions);
		}

		// Sort templates alphabetically
		templateOptions.sort((a, b) => a.label.localeCompare(b.label));

		return templateOptions;
	}

	private scanFolderForTemplates(folder: TFolder, prefix: string, templateOptions: SuggestSelectOption[]): void {
		for (const child of folder.children) {
			if (child instanceof TFile && child.extension === 'md') {
				const displayName = prefix ? `${prefix}/${child.basename}` : child.basename;
				templateOptions.push({
					value: child.path,
					label: displayName
				});
			} else if (child instanceof TFolder) {
				const newPrefix = prefix ? `${prefix}/${child.name}` : child.name;
				this.scanFolderForTemplates(child, newPrefix, templateOptions);
			}
		}
	}
}
