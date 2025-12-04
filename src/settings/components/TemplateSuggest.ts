import { App, AbstractInputSuggest, TFile, TFolder } from "obsidian";
import {debugLog} from "../../tools/debugLogging";

interface TemplateOption {
	path: string;
	displayName: string;
}

/**
 * Input suggest for template files with caching for performance
 */
export class TemplateSuggest extends AbstractInputSuggest<TemplateOption> {
	private allTemplates: TemplateOption[] = [];
	private templateDirectory: string | null = null;
	private cacheValid: boolean = false;
	private onChange?: (value: string) => void;

	constructor(app: App, inputEl: HTMLInputElement, templateDirectory: string | null = null, onChange?: (value: string) => void) {
		super(app, inputEl);
		this.templateDirectory = templateDirectory;
		this.onChange = onChange;
		this.loadTemplates();
	}

	/**
	 * Load all templates from the vault (cached for performance)
	 */
	private loadTemplates(): void {
		if (this.cacheValid) return;

		this.allTemplates = [];
		const searchFolder = this.templateDirectory
			? this.app.vault.getAbstractFileByPath(this.templateDirectory)
			: this.app.vault.getRoot();

		if (searchFolder instanceof TFolder) {
			this.scanFolderForTemplates(searchFolder, "");
		} else {
			this.scanFolderForTemplates(this.app.vault.getRoot(), "");
		}

		this.allTemplates.sort((a, b) => a.displayName.localeCompare(b.displayName));
		this.cacheValid = true;
	}

	/**
	 * Recursively scan folder for markdown template files
	 */
	private scanFolderForTemplates(folder: TFolder, prefix: string): void {
		for (const child of folder.children) {
			if (child instanceof TFile && child.extension === 'md') {
				const displayName = prefix ? `${prefix}/${child.basename}` : child.basename;
				this.allTemplates.push({
					path: child.path,
					displayName: displayName
				});
			} else if (child instanceof TFolder) {
				const newPrefix = prefix ? `${prefix}/${child.name}` : child.name;
				this.scanFolderForTemplates(child, newPrefix);
			}
		}
	}

	/**
	 * Invalidate cache when template directory changes
	 */
	public invalidateCache(): void {
		this.cacheValid = false;
	}

	/**
	 * Update template directory and reload
	 */
	public setTemplateDirectory(templateDirectory: string | null): void {
		this.templateDirectory = templateDirectory;
		this.invalidateCache();
		this.loadTemplates();
	}

	getSuggestions(inputStr: string): TemplateOption[] {
		const query = inputStr.toLowerCase().trim();

		if (!query) {
			return this.allTemplates;
		}

		// Fast filtering - only filter if we have a query
		return this.allTemplates.filter(option =>
			option.displayName.toLowerCase().includes(query) ||
			option.path.toLowerCase().includes(query)
		);
	}

	renderSuggestion(template: TemplateOption, el: HTMLElement): void {
		el.setText(template.displayName);
		el.setAttr("title", template.path);
	}

	selectSuggestion(template: TemplateOption): void {
		debugLog("selected Templates Folder", template);
		this.setValue(template.path);
		this.onChange && this.onChange(template.path);
		this.close();
	}
}

