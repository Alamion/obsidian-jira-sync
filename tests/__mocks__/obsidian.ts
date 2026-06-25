export class Plugin {
	app: App;
	settings: Record<string, any> = {};

	constructor() {
		this.app = new App();
	}

	async loadData(): Promise<any> {
		return {};
	}

	async saveData(data: any): Promise<void> {}

	addCommand(_cmd: any): void {}

	addSettingTab(_tab: any): void {}

	registerEvent(_event: any): void {}

	registerEditorExtension(_ext: any): void {}

	registerMarkdownPostProcessor(_proc: any): void {}

	registerInterval(_id: number): number {
		return 0;
	}
}

export class App {
	vault: Vault;
	workspace: Workspace;
	metadataCache: MetadataCache;
	fileManager: FileManager;
}

export class Vault {
	async read(_file: TFile): Promise<string> {
		return '';
	}
	async process(_file: TFile, _fn: (data: string) => string): Promise<string> {
		return '';
	}
	async create(_path: string, _content: string): Promise<TFile> {
		return new TFile();
	}
	async rename(_file: TFile, _newPath: string): Promise<void> {}
	getFileByPath(_path: string): TFile | null {
		return null;
	}
	getFolderByPath(_path: string): TFolder | null {
		return null;
	}
	async createFolder(_path: string): Promise<void> {}
}

export class TFile {
	path: string = '';
	extension: string = 'md';
	name: string = '';
	parent: TFolder | null = null;
	vault: Vault = new Vault();
}

export class TFolder {
	path: string = '';
	name: string = '';
	children: (TFile | TFolder)[] = [];
	isRoot(): boolean {
		return false;
	}
}

export class Workspace {
	on(_name: string, _cb: (...args: any[]) => any): void {}
	openLinkText(_path: string, _sourcePath?: string): Promise<void> {
		return Promise.resolve();
	}
}

export class MetadataCache {
	getFileCache(_file: TFile): any {
		return null;
	}
}

export class FileManager {
	async processFrontMatter(_file: TFile, _fn: (frontmatter: any) => void): Promise<void> {}
}

export class Modal {
	app: App;
	contentEl: HTMLElement;

	constructor(app: App) {
		this.app = app;
		this.contentEl = document.createElement('div');
	}

	open(): void {}
	close(): void {}
}

export class Setting {
	constructor(_containerEl: HTMLElement) {
		this.setName('');
		this.setDesc('');
	}
	setName(_name: string): this {
		return this;
	}
	setDesc(_desc: string): this {
		return this;
	}
	addText(_cb: (text: TextComponent) => any): this {
		return this;
	}
	addTextArea(_cb: (text: TextComponent) => any): this {
		return this;
	}
	addButton(_cb: (btn: ButtonComponent) => any): this {
		return this;
	}
	addDropdown(_cb: (dropdown: DropdownComponent) => any): this {
		return this;
	}
}

export class TextComponent {
	inputEl: HTMLInputElement;
	constructor() {
		this.inputEl = document.createElement('input');
	}
	setPlaceholder(_placeholder: string): this {
		return this;
	}
	setValue(_value: string): this {
		return this;
	}
	onChange(_cb: (value: string) => void): this {
		return this;
	}
}

export class ButtonComponent {
	buttonEl: HTMLButtonElement;
	constructor() {
		this.buttonEl = document.createElement('button');
	}
	setButtonText(_text: string): this {
		return this;
	}
	setCta(): this {
		return this;
	}
	onClick(_cb: () => void): this {
		return this;
	}
}

export class DropdownComponent {
	selectEl: HTMLSelectElement;
	constructor() {
		this.selectEl = document.createElement('select');
	}
	addOption(_value: string, _display: string): this {
		return this;
	}
	setValue(_value: string): this {
		return this;
	}
	onChange(_cb: (value: string) => void): this {
		return this;
	}
}

export class Notice {
	constructor(_message: string) {}
}

export function requestUrl(params: any): Promise<any> {
	return Promise.resolve({ status: 200, json: {}, text: '' });
}
