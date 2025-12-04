import { App, AbstractInputSuggest, TFolder } from "obsidian";
import {debugLog} from "../../tools/debugLogging";

interface FolderOption {
	path: string;
	displayName: string;
}

/**
 * Input suggest for folders with caching for performance
 */
export class FolderSuggest extends AbstractInputSuggest<FolderOption> {
	private allFolders: FolderOption[] = [];
	private cacheValid: boolean = false;
	private onChange?: (value: string) => void;

	constructor(app: App, inputEl: HTMLInputElement, onChange?: (value: string) => void) {
		super(app, inputEl);
		this.onChange = onChange;
		this.loadFolders();
	}

	/**
	 * Load all folders from the vault (cached for performance)
	 */
	private loadFolders(): void {
		if (this.cacheValid) return;

		this.allFolders = [];
		this.scanFolderForFolders(this.app.vault.getRoot(), "");

		// Sort by display name
		this.allFolders.sort((a, b) => a.displayName.localeCompare(b.displayName));
		this.cacheValid = true;
	}

	/**
	 * Recursively scan vault for folders
	 */
	private scanFolderForFolders(folder: TFolder, prefix: string): void {
		// Add root folder
		if (prefix === "") {
			this.allFolders.push({
				path: "",
				displayName: "/ (root)"
			});
		}

		for (const child of folder.children) {
			if (child instanceof TFolder) {
				const displayName = prefix ? `${prefix}/${child.name}` : child.name;
				this.allFolders.push({
					path: child.path,
					displayName: displayName
				});
				// Recursively scan subfolders
				this.scanFolderForFolders(child, displayName);
			}
		}
	}

	/**
	 * Invalidate cache (call when vault structure changes)
	 */
	public invalidateCache(): void {
		this.cacheValid = false;
	}

	/**
	 * Reload folders (useful after vault changes)
	 */
	public reload(): void {
		this.invalidateCache();
		this.loadFolders();
	}

	getSuggestions(inputStr: string): FolderOption[] {
		const query = inputStr.toLowerCase().trim();

		if (!query) {
			return this.allFolders;
		}

		// Fast filtering - match both display name and path
		return this.allFolders.filter(option =>
			option.displayName.toLowerCase().includes(query) ||
			option.path.toLowerCase().includes(query)
		);
	}

	renderSuggestion(folder: FolderOption, el: HTMLElement): void {
		el.setText(folder.displayName);
		el.setAttr("title", folder.path || "Root folder");
	}

	selectSuggestion(folder: FolderOption): void {
		debugLog("selected Issues Folder", folder);
		this.setValue(folder.path);
		this.onChange && this.onChange(folder.path);
		this.close();
	}
}

