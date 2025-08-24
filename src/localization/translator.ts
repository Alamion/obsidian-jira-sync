import * as en from './compiled/en.json';
import * as ru from './compiled/ru.json';

export const defaultLocale = 'en';

const locales: Record<string, any> = {
	en,
	ru,
};

const getCurrentLocale = (): string => {
	const stored = window.localStorage.getItem('language');
	return stored && locales[stored] ? stored : defaultLocale;
};

const getNestedValue = (obj: any, path: string): any => {
	return path.split('.').reduce((current, key) => {
		return current && current[key] !== undefined ? current[key] : null;
	}, obj);
};

function replacePlaceholders(template: string, dict: Record<string, unknown>): string {
	return template.replace(/{([^{}]+)}/g, (match, key) => {
		// Trim the key in case there's whitespace inside the braces
		const trimmedKey = key.trim();
		return dict.hasOwnProperty(trimmedKey) ? String(dict[trimmedKey]) : match;
	});
}

export const t = (key: string, prefix?: string, dict?: Record<string, unknown>): string => {
	const currentLocale = getCurrentLocale();
	const fullPath = prefix ? `${prefix}.${key}` : key;

	const currentDict = locales[currentLocale];
	const defaultDict = locales[defaultLocale];

	let value = getNestedValue(currentDict, fullPath);

	if (value === null && currentLocale !== defaultLocale) {
		value = getNestedValue(defaultDict, fullPath);
	}

	if (value === null) {
		console.warn(`Translation key not found: "${fullPath}" in locales: ${currentLocale}, ${defaultLocale}`);
		return fullPath;
	}

	// Only process dictionary replacements if we have a dict and the value isn't the fallback path
	if (dict && typeof value === 'string' && value !== fullPath) {
		return replacePlaceholders(value, dict);
	}

	return value;
};

export const useTranslations = (prefix?: string) => {
	const currentLocale = getCurrentLocale();

	const translate = (key: string, dict?: Record<string, unknown>): string => {
		return t(key, prefix, dict);
	};

	return {
		t: translate,
		locale: currentLocale,
		setPrefix: (newPrefix: string) => useTranslations(newPrefix)
	};
};
