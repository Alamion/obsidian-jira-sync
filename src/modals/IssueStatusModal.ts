import {App, SuggestModal} from "obsidian";
import {JiraTransitionType} from "../interfaces";
import {useTranslations} from "../localization/translator";

const t = useTranslations("modals.status").t;

/**
 * Modal for selecting an issue status
 */
export class IssueStatusModal extends SuggestModal<JiraTransitionType> {
	private onSubmit: (result: JiraTransitionType) => void;
	private issueTransitions: JiraTransitionType[];

	constructor(app: App, issueTransitions: JiraTransitionType[], onSubmit: (result: JiraTransitionType) => void) {
		super(app);
		this.onSubmit = onSubmit;
		this.issueTransitions = issueTransitions;
		this.setPlaceholder(t("placeholder"));
	}

	getSuggestions(query: string): JiraTransitionType[] {
		return this.issueTransitions.filter((transition) =>
			transition.status && transition.status.toLowerCase().includes(query.toLowerCase()) ||
			transition.action && transition.action.toLowerCase().includes(query.toLowerCase())
		);
	}

	renderSuggestion(type: JiraTransitionType, el: HTMLElement) {
		let result = "";
		if (type.action && type.status) {
			if (type.action === type.status) {
				result = type.action;
			} else {
				result = `${type.action} (${type.status})`;
			}
		} else if (type.action) {
			result = type.action;
		} else if (type.status) {
			result = type.status;
		}
		el.createEl("div", {text: result});
	}

	onChooseSuggestion(type: JiraTransitionType) {
		this.onSubmit(type);
	}
}
