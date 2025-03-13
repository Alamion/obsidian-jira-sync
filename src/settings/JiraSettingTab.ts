import {App, PluginSettingTab, setIcon, Setting} from "obsidian";
import JiraPlugin from "../main";
import {FieldMapping, fieldMappings} from "../tools/mappingObsidianJiraFields";
import {functionToArrowString, safeStringToFunction} from "../tools/convertFunctionString";
import {JiraIssue} from "../interfaces";

/**
 * Settings tab for the plugin
 */
export class JiraSettingTab extends PluginSettingTab {
	private plugin: JiraPlugin;

	constructor(app: App, plugin: JiraPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();
		containerEl.createEl("h2", { text: "Jira Integration Settings" });

		new Setting(containerEl)
			.setName("Jira Username")
			.setDesc("Your Jira username or email")
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
			.setName("Jira Password or API Token")
			.setDesc("Your Jira password or API token")
			.addText((text) => {
				text.inputEl.type = "password";
				text
					.setPlaceholder("Password")
					.setValue(this.plugin.settings.password)
					.onChange(async (value) => {
						this.plugin.settings.password = value;
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName("Jira URL")
			.setDesc("Your Jira instance URL (e.g., https://yourcompany.atlassian.net)")
			.addText((text) =>
				text
					.setPlaceholder("URL")
					.setValue(this.plugin.settings.jiraUrl)
					.onChange(async (value) => {
						this.plugin.settings.jiraUrl = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Issues Folder")
			.setDesc("Folder where Jira issues will be stored")
			.addText((text) =>
				text
					.setPlaceholder("jira-issues")
					.setValue(this.plugin.settings.issuesFolder)
					.onChange(async (value) => {
						this.plugin.settings.issuesFolder = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Session Cookie Name")
			.setDesc("The name of the session cookie used by your Jira instance")
			.addText((text) =>
				text
					.setPlaceholder("JSESSIONID")
					.setValue(this.plugin.settings.sessionCookieName)
					.onChange(async (value) => {
						this.plugin.settings.sessionCookieName = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Template path")
			.setDesc("The path of used template for creating Jira tasks (with or without .md extension)")
			.addText((text) =>
				text
					.setPlaceholder("templates/template1")
					.setValue(this.plugin.settings.templatePath)
					.onChange(async (value) => {
						// Normalize path - ensure it has .md extension
						if (value && !value.toLowerCase().endsWith('.md')) {
							value = value + '.md';
						}
						this.plugin.settings.templatePath = value;
						await this.plugin.saveSettings();
					})
			);

		// Add Jira-Obsidian Mapping setting
		containerEl.createEl("h3", { text: "Jira-Obsidian Field Mapping" });

		// Create Field Mappings UI
		const mappingSection = containerEl.createDiv({ cls: "jira-field-mappings" });

		// Add field mapping explanation
		mappingSection.createEl("p", {
			text: "Configure how fields are mapped between Obsidian and Jira. Each field requires both a toJira and fromJira transformation function."
		});

		// Create a list container for field mappings
		const fieldsList = mappingSection.createDiv({ cls: "field-mappings-list" });

		// Function to add a new field mapping UI
		const addFieldMapping = (fieldName = "", toJira = "", fromJira = "") => {
			const fieldContainer = fieldsList.createDiv({ cls: "field-mapping-item" });

			// Field name input
			const fieldNameContainer = fieldContainer.createDiv({ cls: "field-name-container" });
			fieldNameContainer.createEl("span", { text: "Field Name:", cls: "field-mapping-label" });
			const fieldNameInput = fieldNameContainer.createEl("input", {
				type: "text",
				value: fieldName,
				cls: "field-name-input"
			});

			// toJira function input
			const toJiraContainer = fieldContainer.createDiv({ cls: "to-jira-container" });
			toJiraContainer.createEl("span", { text: "toJira:", cls: "field-mapping-label" });
			const toJiraInput = toJiraContainer.createEl("input", {
				type: "text",
				value: toJira,
				placeholder: "(value) => value",
				cls: "to-jira-input"
			});

			// fromJira function input
			const fromJiraContainer = fieldContainer.createDiv({ cls: "from-jira-container" });
			fromJiraContainer.createEl("span", { text: "fromJira:", cls: "field-mapping-label" });
			const fromJiraInput = fromJiraContainer.createEl("input", {
				type: "text",
				value: fromJira,
				placeholder: "(issue) => issue.fields.fieldName",
				cls: "from-jira-input"
			});

			// Add remove button
			const removeBtn = fieldContainer.createEl("button", {
				text: "✕",
				cls: "remove-field-btn"
			});

			// Handle field removal
			removeBtn.addEventListener("click", () => {
				fieldContainer.remove();
				saveFieldMappings();
			});

			// Add change listeners to update settings
			[fieldNameInput, toJiraInput, fromJiraInput].forEach(input => {
				input.addEventListener("change", () => {
					saveFieldMappings();
				});
			});

			return { fieldNameInput, toJiraInput, fromJiraInput, container: fieldContainer };
		};

		// Function to save all field mappings
		const saveFieldMappings = async () => {
			const mappings: Record<string, { toJira: string; fromJira: string }> = {};
			const fieldItems = fieldsList.querySelectorAll(".field-mapping-item");

			fieldItems.forEach(item => {
				const fieldNameInput = item.querySelector(".field-name-input");
				const toJiraInput = item.querySelector(".to-jira-input");
				const fromJiraInput = item.querySelector(".from-jira-input");
				if (!fieldNameInput || !toJiraInput || !fromJiraInput) {
					return;
				}

				// @ts-ignore
				const fieldName = fieldNameInput.value.trim();
				// @ts-ignore
				const toJira = toJiraInput.value.trim();
				// @ts-ignore
				const fromJira = fromJiraInput.value.trim();

				// Only save valid mappings with all fields filled
				if (fieldName && toJira && fromJira) {
					mappings[fieldName] = {
						toJira: toJira,
						fromJira: fromJira
					};
				}
			});

			const transformedMappings: Record<string, FieldMapping> = {};
			for (const [fieldName, { toJira, fromJira }] of Object.entries(mappings)) {
				const toJiraFn = safeStringToFunction(toJira);
				const fromJiraFn = safeStringToFunction(fromJira);

				if (toJiraFn && fromJiraFn) {
					transformedMappings[fieldName] = {
						toJira: toJiraFn as (value: any) => any,
						fromJira: fromJiraFn as (issue: JiraIssue, data_source: Record<string, any>) => any,
					};
				} else {
					console.warn(`Invalid function in field: ${fieldName}`);
				}
			}

			// Save as stringified JSON
			this.plugin.settings.fieldMappings = transformedMappings;
			await this.plugin.saveSettings();
		};

		const buttonView = mappingSection.createDiv({ cls: "button-view" });

		// Add button to add new field mapping
		const addFieldBtn = buttonView.createEl("button", {
			text: "",
			cls: "add-field-mapping-btn"
		});
		setIcon(addFieldBtn, "circle-plus")

		addFieldBtn.addEventListener("click", () => {
			addFieldMapping();
		});

		const resetBtn = buttonView.createEl("button", {
			text: "",
			cls: "reset-field-mappings-btn"
		})
		setIcon(resetBtn, "refresh-cw")

		resetBtn.addEventListener("click", () => {
			this.plugin.settings.fieldMappings = fieldMappings;
			loadExistingMappings();
		})

		// Load existing mappings if available
		const loadExistingMappings = () => {
			if (this.plugin.settings.fieldMappings) {
				try {
					fieldsList.innerHTML = "";
					const existingMappings = this.plugin.settings.fieldMappings;
					for (const [fieldName, mapping] of Object.entries(existingMappings)) {
						if (mapping && typeof mapping === 'object' && 'toJira' in mapping && 'fromJira' in mapping) {
							addFieldMapping(
								fieldName,
								functionToArrowString(mapping.toJira),
								functionToArrowString(mapping.fromJira)
							);
						}
					}
				} catch (e) {
					console.error("Failed to parse existing field mappings", e);
				}
			}
		}
		loadExistingMappings()

		// Add example mappings section
		const examplesSection = mappingSection.createDiv({ cls: "mapping-examples" });
		examplesSection.createEl("h4", { text: "Example Field Mappings" });

		const examplesList = examplesSection.createEl("ul");

		[
			{
				name: "summary",
				toJira: "(value) => value",
				fromJira: "(issue) => issue.fields.summary"
			},
			{
				name: "description",
				toJira: "(value) => markdownToJira(value)",
				fromJira: "(issue) => jiraToMarkdown(issue.fields.description)"
			},
			{
				name: "project",
				toJira: "(value) => ({ key: value })",
				fromJira: "(issue) => issue.fields.project ? issue.fields.project.key : \"\""
			}
		].forEach(example => {
			const item = examplesList.createEl("li");
			item.createEl("strong", { text: example.name });
			// Add button to use this example
			const useBtn = item.createEl("button", {
				text: "Use",
				cls: "use-example-btn"
			});
			item.createEl("br");
			item.createSpan({ text: `toJira: ${example.toJira}` });
			item.createEl("br");
			item.createSpan({ text: `fromJira: ${example.fromJira}` });


			useBtn.addEventListener("click", () => {
				addFieldMapping(example.name, example.toJira, example.fromJira);
			});
		});

		// Add security notice
		const securityNote = containerEl.createEl("div", { cls: "setting-item-description" });
		securityNote.createEl("strong", { text: "⚠️ Security Note: " });
		securityNote.createSpan({ text: "Field mapping uses JavaScript function strings. Validate any shared mappings to prevent security issues." });
	}
}
