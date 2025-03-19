import {App, normalizePath, Notice, PluginSettingTab, setIcon, Setting} from "obsidian";
import JiraPlugin from "../main";
import {fieldMappings} from "../tools/mappingObsidianJiraFields";
import {
	functionToExpressionString, transform_string_to_functions_mappings, validateFunctionString
} from "../tools/convertFunctionString";
import {debugLog} from "../tools/debugLogging";

/**
 * Settings tab for the plugin
 */
export class JiraSettingTab extends PluginSettingTab {
	private plugin: JiraPlugin;

	constructor(app: App, plugin: JiraPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	// Function to save all field mappings
	async saveStringFieldMappings (element: HTMLDivElement) {
		debugLog(`From strings ${JSON.stringify(this.plugin.settings.fieldMappingsStrings)}\nand funcs ${JSON.stringify(this.plugin.settings.fieldMappings)}`)
		const mappings: Record<string, { toJira: string; fromJira: string }> = {};
		const fieldItems = element.querySelectorAll(".field-mapping-item");

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
			if (fieldName) {
				mappings[fieldName] = {
					toJira: toJira,
					fromJira: fromJira
				};
			}
		});

		debugLog(`Mappings: ${JSON.stringify(mappings)}`)

		this.plugin.settings.fieldMappingsStrings = mappings;
		this.plugin.settings.fieldMappings = await transform_string_to_functions_mappings(mappings,
			this.plugin.settings.enableFieldValidation);

		// Save the functional mappings
		debugLog(`To strings ${JSON.stringify(this.plugin.settings.fieldMappingsStrings)}\nand funcs ${JSON.stringify(this.plugin.settings.fieldMappings)}`)
		await this.plugin.saveSettings();
	};


	display(): void {
		const { containerEl } = this;

		containerEl.empty();
		containerEl.createEl("h2", { text: "Jira integration settings" });

		new Setting(containerEl)
			.setName("Jira username")
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
			.setName("Jira password or API token")
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
			.setName("Issues folder")
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
			.setName("Session cookie name")
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
						value = normalizePath(value);
						this.plugin.settings.templatePath = value;
						await this.plugin.saveSettings();
					})
			);

		// Add Jira-Obsidian Mapping setting
		containerEl.createEl("h3", { text: "Jira-Obsidian field mapping" });

		// Create Field Mappings UI
		const mappingSection = containerEl.createDiv({ cls: "jira-field-mappings" });

		// Add field mapping explanation
		mappingSection.createEl("p", {
			text: "Configure how fields are mapped between Obsidian and Jira. Each field requires both a toJira and fromJira transformation function."
		});

		new Setting(mappingSection)
			.setName('Enable Field validation')
			.setDesc('Check fields before saving as functions')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableFieldValidation)
				.onChange(async (value) => {
					this.plugin.settings.enableFieldValidation = value;
					await this.plugin.saveSettings();
					const fieldItems = fieldsList.querySelectorAll(".field-mapping-item");

					fieldItems.forEach(async item => {
						const fieldNameInput = item.querySelector(".field-name-input");
						const toJiraInput = item.querySelector(".to-jira-input");
						const fromJiraInput = item.querySelector(".from-jira-input");
						if (fieldNameInput) await fieldValidation(fieldNameInput as HTMLInputElement, value, 'string');
						if (fieldNameInput) await fieldValidation(toJiraInput as HTMLInputElement, value, 'function', ['value']);
						if (fieldNameInput) await fieldValidation(fromJiraInput as HTMLInputElement, value, 'function', ['issue', 'data_source']);
					});
				}));

		// Add change listeners to update settings
		const pointInvalidField = (validation: { isValid: boolean; errorMessage?: string }, element: HTMLInputElement | HTMLTextAreaElement, console_output: boolean) => {
			if (!validation.isValid) {
				element.classList.add("invalid");
				if (console_output) {
					console.warn(`${validation.errorMessage}`);
					new Notice(`${validation.errorMessage}`);
				}
			} else {
				element.classList.remove("invalid");
			}
		}

		async function fieldValidation(input: HTMLInputElement | HTMLTextAreaElement, requireValidating: boolean = true, type: string = 'string', validateParams: Array<string> = []) {
			const validatorFunction = async (event?: Event)=> {
				const console_output = !!event;
				let validation;
				switch(type) {
					case 'string':
						validation = input.value.length === 0? { isValid: false, errorMessage: "Field name cannot be empty" } : { isValid: true };
						break;
					case 'function':
						validation = await validateFunctionString(input.value, validateParams);
						break;
					default:
						validation = { isValid: true };
						break;
				}
				pointInvalidField(validation, input, console_output);
			}
			if (!input.hasOwnProperty('_validatorFunction')) {
				Object.defineProperty(input, '_validatorFunction', {
					value: validatorFunction,
					writable: true,
					configurable: true
				});
			} else {
				// @ts-ignore
				input.removeEventListener("change", input._validatorFunction);
				// @ts-ignore
				input._validatorFunction = validatorFunction;
			}

			if (requireValidating) {
				// @ts-ignore
				input.addEventListener("change", input._validatorFunction);
				await validatorFunction(); // Run initial validation
			} else {
				// @ts-ignore
				input.removeEventListener("change", input._validatorFunction);
				pointInvalidField({ isValid: true}, input, false); // Clear any validation errors
			}
		}



		// Create a list container for field mappings
		const fieldsList = mappingSection.createDiv({ cls: "field-mappings-list" });

		// Function to add a new field mapping UI
		const addFieldMapping = async (fieldName = "", toJira = "", fromJira = "") => {
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
			const toJiraInput = toJiraContainer.createEl("textarea", {
				value: toJira,
				placeholder: "(value) => null",
				cls: "to-jira-input"
			});
			toJiraInput.rows = 1;

			// fromJira function input
			const fromJiraContainer = fieldContainer.createDiv({ cls: "from-jira-container" });
			fromJiraContainer.createEl("span", { text: "fromJira:", cls: "field-mapping-label" });
			const fromJiraInput = fromJiraContainer.createEl("textarea", {
				value: fromJira,
				placeholder: "(issue, data_source) => null",
				cls: "from-jira-input"
			});
			fromJiraInput.rows = 1;

			// Add remove button
			const removeBtn = fieldContainer.createEl("button", {
				text: "✕",
				cls: "remove-field-btn"
			});

			// Handle field removal
			removeBtn.addEventListener("click", () => {
				fieldContainer.remove();
				// saveFieldMappings();
			});

			await fieldValidation(fieldNameInput, this.plugin.settings.enableFieldValidation, 'string');
			await fieldValidation(toJiraInput, this.plugin.settings.enableFieldValidation, 'function', ['value']);
			await fieldValidation(fromJiraInput, this.plugin.settings.enableFieldValidation, 'function', ['issue', 'data_source']);

			return { fieldNameInput, toJiraInput, fromJiraInput, container: fieldContainer };
		};

		const buttonView = mappingSection.createDiv({ cls: "button-view" });

		// Add button to add new field mapping
		const addFieldBtn = buttonView.createEl("button", {
			text: "",
			cls: "add-field-mapping-btn"
		});
		setIcon(addFieldBtn, "circle-plus")

		addFieldBtn.addEventListener("click", async () => {
			await addFieldMapping();
		});

		const resetBtn = buttonView.createEl("button", {
			text: "",
			cls: "reset-field-mappings-btn"
		})
		setIcon(resetBtn, "refresh-cw")
		resetBtn.addEventListener("click", async () => {
			this.plugin.settings.fieldMappings = {};
			this.plugin.settings.fieldMappingsStrings = {};
			await loadExistingMappings();
			await this.plugin.saveSettings();
		});

		const reloadBtn = buttonView.createEl("button", {
			text: "",
			cls: "reset-field-mappings-btn"
		})
		setIcon(reloadBtn, "list-restart")
		reloadBtn.addEventListener("click", async () => {
			this.plugin.settings.fieldMappings = fieldMappings;

			// Also reset the string representations with default values
			const defaultMappingsStrings: Record<string, { toJira: string; fromJira: string }> = {};
			for (const [fieldName, mapping] of Object.entries(fieldMappings)) {
				defaultMappingsStrings[fieldName] = {
					toJira: functionToExpressionString(mapping.toJira),
					fromJira: functionToExpressionString(mapping.fromJira)
				};
			}
			this.plugin.settings.fieldMappingsStrings = defaultMappingsStrings;

			await loadExistingMappings();
			await this.plugin.saveSettings();
		});

		// Load existing mappings if available
		const loadExistingMappings = async () => {
			debugLog(`Loading mapping settings`)
			// Clear existing field list
			fieldsList.empty();

			// If we have string representations stored, use those
			if (this.plugin.settings.fieldMappingsStrings &&
				Object.keys(this.plugin.settings.fieldMappingsStrings).length > 0) {

				const savedMappings = this.plugin.settings.fieldMappingsStrings;
				for (const [fieldName, mapping] of Object.entries(savedMappings)) {
					if (mapping && typeof mapping === 'object' && 'toJira' in mapping && 'fromJira' in mapping) {
						await addFieldMapping(
							fieldName,
							mapping.toJira,
							mapping.fromJira
						);
					}
				}
				this.plugin.settings.fieldMappings = await transform_string_to_functions_mappings(
					this.plugin.settings.fieldMappingsStrings, this.plugin.settings.enableFieldValidation);
			}
			// Otherwise, try to use the function mappings and convert them to strings
			else if (this.plugin.settings.fieldMappings &&
				Object.keys(this.plugin.settings.fieldMappings).length > 0) {

				const existingMappings = this.plugin.settings.fieldMappings;
				for (const [fieldName, mapping] of Object.entries(existingMappings)) {
					if (mapping && typeof mapping === 'object' && 'toJira' in mapping && 'fromJira' in mapping) {
						await addFieldMapping(
							fieldName,
							functionToExpressionString(mapping.toJira),
							functionToExpressionString(mapping.fromJira)
						);
					}
				}

				// Create the string representations for future use
				await this.saveStringFieldMappings(fieldsList);
			}
		};

		// Make sure to call this function after it's defined
		loadExistingMappings();

		// Add example mappings section
		const examplesSection = mappingSection.createDiv({ cls: "mapping-examples" });
		examplesSection.createEl("h4", { text: "Example field mappings" });

		const examplesList = examplesSection.createEl("ul");

		[
			{
				name: "summary",
				toJira: "value",
				fromJira: "issue.fields.summary"
			},
			{
				name: "reporter",
				toJira: "null",
				fromJira: "issue.fields.reporter.name"
			},
			{
				name: "project",
				toJira: "({ key: value })",
				fromJira: "issue.fields.project ? issue.fields.project.key : \"\""
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


			useBtn.addEventListener("click", async () => {
				await addFieldMapping(example.name, example.toJira, example.fromJira);
			});
		});

		// Add security notice
		const securityNote = containerEl.createEl("div", { cls: "setting-item-description" });
		securityNote.createEl("strong", { text: "⚠️ Security Note: " });
		securityNote.createSpan({ text: "Field mapping uses JavaScript function strings. Validate any shared mappings to prevent security issues." });
	}

	hide() {
		const fieldsList = this.containerEl.querySelector(".field-mappings-list");
		if (fieldsList) {
			this.saveStringFieldMappings(fieldsList as HTMLDivElement);
		}
		super.hide();
	}
}
