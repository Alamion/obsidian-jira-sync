import {
	App,
	MarkdownView,
	Modal,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	requestUrl,
	SuggestModal,
} from "obsidian";
// Remember to rename these classes and interfaces!
interface MyPluginSettings {
	username: string;
	password: string;
	jiraUrl: string;
}

interface project {
	name: string;
	id: string;
}
interface type {
	name: string;
}
let ALL_PROJECTS: any[] = [];
let ALL_TYPES: any[] = [];
export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;
	async onload() {
		await this.loadSettings();
		// Start the local proxy server
		// This creates an icon in the left ribbon.
		this.addRibbonIcon(
			"file-down",
			"Import issue from Jira",
			(evt: MouseEvent) => {
				// Called when the user clicks the icon.
				this.openIssue()
			}
		);

		// This adds a update command that can be triggered anywhere
		this.addCommand({
			id: "update-issue-jira",
			name: "Update issue to Jira",
			callback: async () => {
				try {
					if (this.settings.username && this.settings.password && this.settings.jiraUrl) {
						const response = await requestUrl({
							url: this.settings.jiraUrl + "/rest/auth/1/session",
							method: "post",
							body: JSON.stringify({
								username: this.settings.username,
								password: this.settings.password,
							}),
							contentType: "application/json",
							headers: {
								"Content-type": "application/json",
								Origin: this.settings.jiraUrl
							},
						});

						localStorage.setItem("cookie", response.json.session.value);
						const file = this.app.workspace.getActiveFile();
						let issueKey = ''
						let issueSummary = ''
						let priority = ''
						if (file) {
							this.app.fileManager.processFrontMatter(file, (frontmatter) => {
								issueKey = frontmatter['key']
								issueSummary = frontmatter['summary']
								if (frontmatter['priority']) {
									priority = frontmatter['priority'].charAt(0).toUpperCase() + frontmatter['priority'].slice(1).toLowerCase();
								}
							}).then(async () => {
								const view = this.app.workspace.getActiveViewOfType(MarkdownView);
								const issueDescription = view?.getViewData().replace(/---.*?---/gs, "").trim()
								await requestUrl({
									url: this.settings.jiraUrl + "/rest/api/2/issue/" + issueKey,
									method: "put",
									headers: { Cookie: "JSESSIONID=" + localStorage.getItem("cookie"), contentType: "application/json", Origin: "http://cm.amplia.es" },
									contentType: "application/json",
									body: JSON.stringify({
										fields: {
											description: markdownToJira(issueDescription || ''),
											summary: issueSummary,
											priority: {
												name: priority
											}
										}
									})
								});

							}
							)
						}

						new Notice("Issue updated successfully");
					} else {
						new Notice("Please configure Jira username, password and url in plugin settings");
					}

				} catch {
					new Notice("Error updating issue");
				}
			},
		});
		this.addCommand({
			id: "get-issue-jira",
			name: "Get issue from Jira",
			callback: async () => {
				this.openIssue()
			},
		});
		this.addCommand({
			id: "create-issue-jira",
			name: "Create issue in Jira",
			callback: async () => {
				try {
					if (this.settings.username && this.settings.password && this.settings.jiraUrl) {
						const response = await requestUrl({
							url: this.settings.jiraUrl + "/rest/auth/1/session",
							method: "post",
							body: JSON.stringify({
								username: this.settings.username,
								password: this.settings.password,
							}),
							contentType: "application/json",
							headers: {
								"Content-type": "application/json",
								Origin: this.settings.jiraUrl
							},
						});

						localStorage.setItem("cookie", response.json.session.value);
						const file = this.app.workspace.getActiveFile();
						let issueSummary = ''
						if (file) {
							this.app.fileManager.processFrontMatter(file, (frontmatter) => {
								issueSummary = frontmatter['summary']
							}).then(async () => {
								if (issueSummary) {
									const view = this.app.workspace.getActiveViewOfType(MarkdownView);
									const projects = await requestUrl({
										url: this.settings.jiraUrl + "/rest/api/2/project",
										method: "get",
										headers: { Cookie: "JSESSIONID=" + localStorage.getItem("cookie"), contentType: "application/json", Origin: this.settings.jiraUrl },
									});
									ALL_PROJECTS = projects.json.map((project: { key: any; name: any; }) => {
										return {
											id: project.key,
											name: project.name
										}
									})
									await new ProjectModal(this.app, async (project) => {
										const types = await requestUrl({
											url: this.settings.jiraUrl + "/rest/api/2/issue/createmeta/" + project + '/issuetypes',
											method: "get",
											headers: { Cookie: "JSESSIONID=" + localStorage.getItem("cookie"), contentType: "application/json", Origin: this.settings.jiraUrl },
										});
										ALL_TYPES = types.json.values.map((type: { name: any; }) => {
											return {
												name: type.name
											}

										})
										await new TypeModal(this.app, (type) => {
											try {
												const file = this.app.workspace.getActiveFile();
												let issueSummary = ''
												let priority = ''
												if (file) {
													this.app.fileManager.processFrontMatter(file, (frontmatter) => {
														issueSummary = frontmatter['summary']
														if (frontmatter['priority']) {
															priority = frontmatter['priority'].charAt(0).toUpperCase() + frontmatter['priority'].slice(1).toLowerCase();
														}
													}).then(async () => {
														try {
															const issueDescription = view?.getViewData().replace(/---.*?---/gs, "").trim()
															const response = await requestUrl({
																url: this.settings.jiraUrl + "/rest/api/2/issue/",
																method: "post",
																headers: { Cookie: "JSESSIONID=" + localStorage.getItem("cookie"), contentType: "application/json", Origin: this.settings.jiraUrl },
																contentType: "application/json",
																body: JSON.stringify({
																	fields: {
																		description: markdownToJira(issueDescription || ''),
																		summary: issueSummary,
																		project: {
																			key: project
																		},
																		issuetype: {
																			name: type
																		}, priority: {
																			name: priority
																		}
																	}

																})
															});
															this.app.fileManager.processFrontMatter(file, (frontmatter) => {
																frontmatter['key'] = response.json.key
															})
															new Notice("Issue create successfully");
														} catch (err) {
															new Notice("Error creating issue");
														}
													}
													)
												} else {

												}

											} catch (err) {
												new Notice("Error creating issue");
											}
										}).open();
									}).open();
								} else {
									new Notice("Please set a summary in the frontMatter for the task");
								}

							}
							)
						}

					} else {
						new Notice("Please configure Jira username, password and url in settings");
					}

				} catch {
					new Notice("Error updating issue");
				}
			},
		});
		this.addSettingTab(new JiraSettingTab(this.app, this));

	}
	openIssue() {
		new selectIssueModal(this.app, async (issue) => {
			try {
				if (this.settings.username && this.settings.password && this.settings.jiraUrl) {
					const response = await requestUrl({
						url: this.settings.jiraUrl + "/rest/auth/1/session",
						method: "post",
						body: JSON.stringify({
							username: this.settings.username,
							password: this.settings.password,
						}),
						contentType: "application/json",
						headers: {
							"Content-type": "application/json",
							Origin: this.settings.jiraUrl
						},
					});
					localStorage.setItem("cookie", response.json.session.value);
					const responseIssue = await requestUrl({
						url: this.settings.jiraUrl + "/rest/api/2/issue/" + issue,
						headers: { Cookie: "JSESSIONID=" + localStorage.getItem("cookie") },
					});
					const folder = await this.app.vault.getFolderByPath('jira-issues')
					const route = 'jira-issues/' + responseIssue.json.fields.summary + '.md'
					if (!folder) {
						await this.app.vault.createFolder('jira-issues')
					}
					const file = await this.app.vault.getFileByPath(route)
					if (file) {
						await this.app.vault.delete(file)
					}
					await this.app.vault.create(route, '')
					await this.app.workspace.openLinkText(route, "")
					const view = this.app.workspace.getActiveViewOfType(MarkdownView);
					if (responseIssue.json.fields.description !== null) {
						const mk = jiraToMarkdown(responseIssue.json.fields.description)
						view?.setViewData(mk, false)
					} else {
						view?.setViewData('', false)
					}
					if (view && view.file) {
						await this.app.fileManager.processFrontMatter(view.file, (frontmatter) => {
							frontmatter['key'] = issue
							frontmatter['summary'] = responseIssue.json.fields.summary
							frontmatter['priority'] = responseIssue.json.fields.priority.name
						})
						const contenido = await this.app.vault.read(view.file);
						const partes = contenido.split(/^---\n([\s\S]*?)\n---\n/m);
						let nuevoTexto;
						let nuevoContenido;
						if (responseIssue.json.fields.description !== null) {
							nuevoContenido = jiraToMarkdown(responseIssue.json.fields.description)
						} else {
							nuevoContenido = ''
						}
						if (partes.length > 1) {
							// Tiene frontmatter
							const frontmatter = `---\n${partes[1]}\n---\n`;
							const cuerpo = partes[2] || "";
							nuevoTexto = frontmatter + nuevoContenido; // Mantén el frontmatter intacto y actualiza el cuerpo
						} else {
							// No tiene frontmatter, reemplaza todo
							nuevoTexto = nuevoContenido;
						}

						view.editor.setValue(nuevoTexto)
					}



				} else {
					new Notice("Please configure Jira username, password and url in plugin settings");
				}

			} catch {
				new Notice("Error retrieving issue");
			}
		}).open();
	}
	onunload() { }

	async loadSettings() {
		this.settings = Object.assign(
			{},
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class selectIssueModal extends Modal {
	constructor(app: App, onSubmit: (result: string) => void) {
		super(app);
		this.setTitle('Search issue for key');

		let name = '';
		new Setting(this.contentEl)
			.setName('Key')
			.addText((text) =>
				text.onChange((value) => {
					name = value;
				}));

		new Setting(this.contentEl)
			.addButton((btn) =>
				btn.
					setButtonText('Search')
					.setCta()
					.onClick(() => {
						this.close();
						onSubmit(name);
					})
			);
		this.contentEl.addEventListener("keydown", (event) => {
			if (event.key === "Enter") {
				event.preventDefault(); // Previene comportamiento por defecto si es necesario
				onSubmit(name);
				this.close();
			}
		})

	}
}
class ProjectModal extends SuggestModal<project> {
	onSubmit: (result: string) => void;
	constructor(app: App, onSubmit: (result: string) => void) {
		super(app);
		this.onSubmit = onSubmit;
	}
	// Returns all available suggestions.
	getSuggestions(query: string): project[] {
		return ALL_PROJECTS.filter((project) =>
			project.id.toLowerCase().includes(query.toLowerCase()) || project.name.toLowerCase().includes(query.toLowerCase())
		);
	}

	// Renders each suggestion item.
	renderSuggestion(project: project, el: HTMLElement) {
		el.createEl('div', { text: project.name });
		el.createEl('small', { text: project.id });
	}

	// Perform action on the selected suggestion.
	async onChooseSuggestion(project: project, evt: MouseEvent | KeyboardEvent) {
		this.onSubmit(project.id);
	}
}
class TypeModal extends SuggestModal<type> {
	onSubmit: (result: string) => void;
	constructor(app: App, onSubmit: (result: string) => void) {
		super(app);
		this.onSubmit = onSubmit;
	}
	renderSuggestion(type: type, el: HTMLElement) {
		el.createEl('div', { text: type.name });
	}

	// Returns all available suggestions.
	getSuggestions(query: string): type[] {
		return ALL_TYPES.filter((type) =>
			type.name.toLowerCase().includes(query.toLowerCase())
		);
	}

	// Renders each suggestion item.

	// Perform action on the selected suggestion.
	async onChooseSuggestion(type: type, evt: MouseEvent | KeyboardEvent) {
		this.onSubmit(type.name)
	}
}
class JiraSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName("Jira Username")
			.addText((text) =>
				text
					.setPlaceholder("Username")
					.setValue(this.plugin.settings.username)
					.onChange(async (value) => {
						this.plugin.settings.username = value;
						await this.plugin.saveSettings();
					})
			);
		new Setting(containerEl)
			.setName("Jira Password")
			.addText((text) => {
				text.inputEl.type = "password";
				text
					.setPlaceholder("Password")
					.setValue(this.plugin.settings.password)
					.onChange(async (value) => {
						this.plugin.settings.password = value;
						await this.plugin.saveSettings();
					})

			}
			);
		new Setting(containerEl)
			.setName("Jira url")
			.addText((text) =>
				text
					.setPlaceholder("Url")
					.setValue(this.plugin.settings.jiraUrl)
					.onChange(async (value) => {
						this.plugin.settings.jiraUrl = value;
						await this.plugin.saveSettings();
					})
			);
	}
}
function markdownToJira(str: string) {
	const map: Object = {
		// cite: '??',
		del: "-",
		ins: "+",
		sup: "^",
		sub: "~",
	};

	return (
		str
			// Tables
			.replace(
				/^(\|[^\n]+\|\r?\n)((?:\|\s*:?[-]+:?\s*)+\|)(\n(?:\|[^\n]+\|\r?\n?)*)?$/gm,
				(
					match: any,
					headerLine: string,
					separatorLine: string,
					rowstr: string
				) => {
					const headers = headerLine.match(/[^|]+(?=\|)/g) || [];
					const separators =
						separatorLine.match(/[^|]+(?=\|)/g) || [];
					if (headers.length !== separators.length) return match;

					const rows = rowstr.split("\n");
					if (rows.length === 2 && headers.length === 1)
						// Panel
						return `{panel:title=${headers[0].trim()}}\n${rowstr
							.replace(/^\|(.*)[ \t]*\|/, "$1")
							.trim()}\n{panel}\n`;

					return `||${headers.join("||")}||${rowstr}`;
				}
			)
			// Bold, Italic, and Combined (bold+italic)
			.replace(
				/([*_]+)(\S.*?)\1/g,
				(match: any, wrapper: string | any[], content: any) => {
					switch (wrapper.length) {
						case 1:
							return `_${content}_`;
						case 2:
							return `*${content}*`;
						case 3:
							return `_*${content}*_`;
						default:
							return wrapper + content + wrapper;
					}
				}
			)
			// All Headers (# format)
			.replace(
				/^([#]+)(.*?)$/gm,
				(match: any, level: string | any[], content: any) => {
					return `h${level.length}.${content}`;
				}
			)
			// Headers (H1 and H2 underlines)
			.replace(
				/^(.*?)\n([=-]+)$/gm,
				(match: any, content: any, level: string[]) => {
					return `h${level[0] === "=" ? 1 : 2}. ${content}`;
				}
			)
			// Ordered lists
			.replace(
				/^([ \t]*)\d+\.\s+/gm,
				(match: any, spaces: string | any[]) => {
					return `${Array(Math.floor(spaces.length / 3) + 1)
						.fill("#")
						.join("")} `;
				}
			)
			// Un-Ordered Lists
			.replace(
				/^([ \t]*)\*\s+/gm,
				(match: any, spaces: string | any[]) => {
					return `${Array(Math.floor(spaces.length / 2 + 1))
						.fill("*")
						.join("")} `;
				}
			)
			// Headers (h1 or h2) (lines "underlined" by ---- or =====)
			// Citations, Inserts, Subscripts, Superscripts, and Strikethroughs
			.replace(
				new RegExp(`<(${Object.keys(map).join("|")})>(.*?)</\\1>`, "g"),
				(match: any, from: string | number, content: any) => {
					const to = map[from as keyof Object];
					return to + content + to;
				}
			)
			// Other kind of strikethrough
			.replace(/(\s+)~~(.*?)~~(\s+)/g, "$1-$2-$3")
			// Named/Un-Named Code Block
			.replace(
				/```(.+\n)?((?:.|\n)*?)```/g,
				(match: any, synt: string, content: any) => {
					let code = "{code}";
					if (synt) {
						code = `{code:${synt.replace(/\n/g, "")}}\n`;
					}
					return `${code}${content}{code}`;
				}
			)
			// Inline-Preformatted Text
			.replace(/`([^`]+)`/g, "{{$1}}")
			// Images
			.replace(/!\[[^\]]*\]\(([^)]+)\)/g, "!$1!")
			// Named Link
			.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "[$1|$2]")
			// Un-Named Link
			.replace(/<([^>]+)>/g, "[$1]")
			// Single Paragraph Blockquote
			.replace(/^>/gm, "bq.")
	);
}
function jiraToMarkdown(str: string) {
	return (
		str
			// Un-Ordered Lists
			.replace(/^[ \t]*(\*+)\s+/gm, (match: any, stars: any) => {
				return `${Array(stars.length).join('  ')}* `;
			})
			// Ordered lists
			.replace(/^[ \t]*(#+)\s+/gm, (match: any, nums: any) => {
				return `${Array(nums.length).join('   ')}1. `;
			})
			// Headers 1-6
			.replace(/^h([0-6])\.(.*)$/gm, (match: any, level: any, content: any) => {
				return Array(parseInt(level, 10) + 1).join('#') + content;
			})
			// Bold
			.replace(/\*(\S.*)\*/g, '**$1**')
			// Italic
			.replace(/_(\S.*)_/g, '*$1*')
			// Monospaced text
			.replace(/\{\{([^}]+)\}\}/g, '`$1`')
			// Citations (buggy)
			// .replace(/\?\?((?:.[^?]|[^?].)+)\?\?/g, '<cite>$1</cite>')
			// Inserts
			.replace(/\+([^+]*)\+/g, '<ins>$1</ins>')
			// Superscript
			.replace(/\^([^^]*)\^/g, '<sup>$1</sup>')
			// Subscript
			.replace(/~([^~]*)~/g, '<sub>$1</sub>')
			// Strikethrough
			.replace(/(\s+)-(\S+.*?\S)-(\s+)/g, '$1~~$2~~$3')
			// Code Block
			.replace(
				/\{code(:([a-z]+))?([:|]?(title|borderStyle|borderColor|borderWidth|bgColor|titleBGColor)=.+?)*\}([^]*?)\n?\{code\}/gm,
				'```$2$5\n```'
			)
			// Pre-formatted text
			.replace(/{noformat}/g, '```')
			// Un-named Links
			.replace(/\[([^|]+?)\]/g, '<$1>')
			// Images
			.replace(/!(.+)!/g, '![]($1)')
			// Named Links
			.replace(/\[(.+?)\|(.+?)\]/g, '[$1]($2)')
			// Single Paragraph Blockquote
			.replace(/^bq\.\s+/gm, '> ')
			// Remove color: unsupported in md
			.replace(/\{color:[^}]+\}([^]*?)\{color\}/gm, '$1')
			// panel into table
			.replace(/\{panel:title=([^}]*)\}\n?([^]*?)\n?\{panel\}/gm, '\n| $1 |\n| --- |\n| $2 |')
			// table header
			.replace(/^[ \t]*((?:\|\|.*?)+\|\|)[ \t]*$/gm, (match: any, headers: any) => {
				const singleBarred = headers.replace(/\|\|/g, '|');
				return `${singleBarred}\n${singleBarred.replace(/\|[^|]+/g, '| --- ')}`;
			})
			// remove leading-space of table headers and rows
			.replace(/^[ \t]*\|/gm, '|')
	);
	// // remove unterminated inserts across table cells
	// .replace(/\|([^<]*)<ins>(?![^|]*<\/ins>)([^|]*)\|/g, (_, preceding, following) => {
	//     return `|${preceding}+${following}|`;
	// })
	// // remove unopened inserts across table cells
	// .replace(/\|(?<![^|]*<ins>)([^<]*)<\/ins>([^|]*)\|/g, (_, preceding, following) => {
	//     return `|${preceding}+${following}|`;
	// });
};
