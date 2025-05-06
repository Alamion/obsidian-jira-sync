import { App } from "obsidian";
import JiraPlugin from "../main";

/**
 * Function type for field mappings
 */
export type JiraFieldMappingFunction = (...args: any[]) => any;

/**
 * Interface for field mappings between Obsidian and Jira
 */
export interface JiraFieldMapping {
	toJira: JiraFieldMappingFunction;
	fromJira: JiraFieldMappingFunction;
}

/**
 * Interface for string representation of field mappings
 */
export interface JiraFieldMappingString {
	toJira: string;
	fromJira: string;
}

/**
 * Base interface for settings components
 */
export interface SettingsComponent {
	render(containerEl: HTMLElement): void;
	hide?(): void;
}

/**
 * Props for settings components
 */
export interface SettingsComponentProps {
	app: App;
	plugin: JiraPlugin;
	onSettingsChange?: () => Promise<void>;
}

/**
 * Validation result interface
 */
export interface ValidationResult {
	isValid: boolean;
	errorMessage?: string;
}

/**
 * Interface for collapsed sections
 */
export interface CollapsedSections {
	connection: boolean;
	general: boolean;
	fieldMappings: boolean;
	rawIssueViewer: boolean;
	testFieldMappings: boolean;
}
