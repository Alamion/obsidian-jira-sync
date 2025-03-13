import {App, SuggestModal} from "obsidian";
import {JiraIssueType} from "../interfaces";

/**
 * Modal for selecting an issue type
 */
export class IssueTypeModal extends SuggestModal<JiraIssueType> {
	private onSubmit: (result: string) => void;
	private issueTypes: JiraIssueType[];

	constructor(app: App, issueTypes: JiraIssueType[], onSubmit: (result: string) => void) {
		super(app);
		this.onSubmit = onSubmit;
		this.issueTypes = issueTypes;
		this.setPlaceholder("Search for an issue type...");
	}

	getSuggestions(query: string): JiraIssueType[] {
		return this.issueTypes.filter((type) =>
			type.name.toLowerCase().includes(query.toLowerCase())
		);
	}

	renderSuggestion(type: JiraIssueType, el: HTMLElement) {
		el.createEl("div", {text: type.name});
	}

	onChooseSuggestion(type: JiraIssueType) {
		this.onSubmit(type.name);
	}
}
