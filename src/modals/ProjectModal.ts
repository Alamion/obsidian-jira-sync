import {App, SuggestModal} from "obsidian";
import {JiraProject} from "../interfaces";
import {useTranslations} from "../localization/translator";

const t = useTranslations("modals.project").t;

/**
 * Modal for selecting a project
 */
export class ProjectModal extends SuggestModal<JiraProject> {
	private onSubmit: (result: string) => void;
	private projects: JiraProject[];

	constructor(app: App, projects: JiraProject[], onSubmit: (result: string) => void) {
		super(app);
		this.onSubmit = onSubmit;
		this.projects = projects;
		this.setPlaceholder(t("placeholder"));
	}

	getSuggestions(query: string): JiraProject[] {
		return this.projects.filter(
			(project) =>
				project.id.toLowerCase().includes(query.toLowerCase()) ||
				project.name.toLowerCase().includes(query.toLowerCase())
		);
	}

	renderSuggestion(project: JiraProject, el: HTMLElement) {
		el.createEl("div", {text: project.name});
		el.createEl("small", {text: project.id});
	}

	onChooseSuggestion(project: JiraProject) {
		this.onSubmit(project.id);
	}
}
