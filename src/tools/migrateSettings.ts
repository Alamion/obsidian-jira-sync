import {
	ConnectionSettingsInterface,
	FieldMappingSettingsInterface,
	GlobalSettingsInterface,
	TimekeepSettingsInterface
} from "../settings/default";

export function checkMigrateSettings(data: any, saveSettings: ()=>void): any {
	if (!data || typeof data !== 'object') return data;

	const result = { ...data };
	let data_changed = false;

	// Migrate root-level connection fields
	const connectionFields: (keyof ConnectionSettingsInterface)[] = [
		'jiraUrl', 'apiVersion', 'authMethod', 'apiToken', 'username', 'email', 'password'
	];
	for (const field of connectionFields) {
		if (field in result) {
			if (!result.connection) result.connection = {};
			result.connection[field] = result[field];
			delete result[field];
			data_changed = true;
		}
	}

	// Migrate root-level global fields
	const globalFields: (keyof GlobalSettingsInterface)[] = ['issuesFolder', 'templatePath'];
	for (const field of globalFields) {
		if (field in result) {
			if (!result.global) result.global = {};
			result.global[field] = result[field];
			delete result[field];
			data_changed = true;
		}
	}

	// Migrate root-level field mapping fields
	const fieldMappingFields: (keyof FieldMappingSettingsInterface)[] = [
		'fieldMappings', 'fieldMappingsStrings', 'enableFieldValidation'
	];
	for (const field of fieldMappingFields) {
		if (field in result) {
			if (!result.fieldMapping) result.fieldMapping = {};
			result.fieldMapping[field] = result[field];
			delete result[field];
			data_changed = true;
		}
	}

	// Migrate root-level timekeep fields
	const timekeepFields: (keyof TimekeepSettingsInterface)[] = [
		'sendComments', 'statisticsTimeType', 'maxItemsToShow', 'customDateRange'
	];
	for (const field of timekeepFields) {
		if (field in result) {
			if (!result.timekeep) result.timekeep = {};
			result.timekeep[field] = result[field];
			delete result[field];
			data_changed = true;
		}
	}

	if (data_changed) {
		saveSettings();
	}

	return result;
}
