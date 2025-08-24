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
		el.createEl("div", {text: type.action && type.status ? `${type.action} -> ${type.status}` :
		type.action ? `${type.action}` : `${type.status}`});
	}

	onChooseSuggestion(type: JiraTransitionType) {
		this.onSubmit(type);
	}
}
