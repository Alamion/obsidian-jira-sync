const fs = require('fs-extra');
const path = require('path');
const chokidar = require('chokidar');

const COMPILED_DIR = path.join(__dirname, 'compiled');
const SRC_DIR = path.join(__dirname, '../../src');

function getAllKeys(obj, prefix = '', result = new Set()) {
	for (const key in obj) {
		const fullKey = prefix ? `${prefix}.${key}` : key;
		if (typeof obj[key] === 'string') {
			result.add(fullKey);
		} else if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
			getAllKeys(obj[key], fullKey, result);
		}
	}
	return result;
}

function keyExists(obj, keyPath) {
	const parts = keyPath.split('.');
	let current = obj;
	for (const part of parts) {
		if (current[part] === undefined) return false;
		current = current[part];
	}
	return true;
}

function getValue(obj, keyPath) {
	const parts = keyPath.split('.');
	let current = obj;
	for (const part of parts) {
		if (current[part] === undefined) return undefined;
		current = current[part];
	}
	return current;
}

function findTranslationsInTsFiles() {
	const usedKeys = new Set();
	const files = [];

	function walkDir(dir) {
		const items = fs.readdirSync(dir);
		for (const item of items) {
			const fullPath = path.join(dir, item);
			const stat = fs.statSync(fullPath);
			if (stat.isDirectory()) {
				walkDir(fullPath);
			} else if (item.endsWith('.ts')) {
				files.push(fullPath);
			}
		}
	}

	walkDir(SRC_DIR);

	const useTranslationsRegex = /const\s+t\s*=\s*useTranslations\(["']([^"']+)["']\)\.t\s*;/g;
	const tCallRegex = /(?<!\w)t\(["']([^"']+)["']\)/g;

	for (const file of files) {
		try {
			const content = fs.readFileSync(file, 'utf8');
			const relativePath = path.relative(SRC_DIR, file);

			let match;
			let prefix = null;

			useTranslationsRegex.lastIndex = 0;
			while ((match = useTranslationsRegex.exec(content)) !== null) {
				prefix = match[1];
			}

			if (prefix) {
				tCallRegex.lastIndex = 0;
				while ((match = tCallRegex.exec(content)) !== null) {
					const key = match[1];
					const fullKey = `${prefix}.${key}`;
					usedKeys.add(fullKey);
				}
			}
		} catch (err) {
			console.error(`Error reading ${file}:`, err.message);
		}
	}

	return usedKeys;
}

function validateTranslations() {
	console.log('🔍 Validating translation files...');

	const files = fs.readdirSync(COMPILED_DIR).filter((file) => file.endsWith('.json'));

	if (files.length === 0) {
		console.log('⚠️  No compiled translation files found');
		return;
	}

	console.log('\n📊 Scanning .ts files for used translation keys...');
	const usedKeys = findTranslationsInTsFiles();
	console.log(`📝 Found ${usedKeys.size} translation keys used in code`);

	const translations = {};
	for (const file of files) {
		const locale = path.basename(file, '.json');
		const filePath = path.join(COMPILED_DIR, file);
		translations[locale] = fs.readJsonSync(filePath);
	}

	const locales = Object.keys(translations);
	console.log(`📁 Found ${locales.length} locales: ${locales.join(', ')}`);

	if (locales.length < 2) {
		console.log('⚠️  Need at least 2 locales to compare');
		return;
	}

	const referenceLocale = locales[0];
	console.log(`🔑 Using ${referenceLocale} as reference locale`);

	const referenceKeys = getAllKeys(translations[referenceLocale]);
	console.log(`🔢 Reference locale has ${referenceKeys.size} unique keys`);

	const stats = {
		missingKeys: {},
		extraKeys: {},
		usedButNotInLocale: {},
		inLocaleButNotUsed: {},
	};

	for (const locale of locales) {
		if (locale !== referenceLocale) {
			stats.missingKeys[locale] = [];
			stats.extraKeys[locale] = [];
			stats.usedButNotInLocale[locale] = [];
			stats.inLocaleButNotUsed[locale] = [];
		}
	}
	stats.inLocaleButNotUsed[referenceLocale] = [];
	stats.usedButNotInLocale[referenceLocale] = [];

	for (const locale of locales) {
		const localeKeys = getAllKeys(translations[locale]);

		for (const refKey of referenceKeys) {
			if (!keyExists(translations[locale], refKey)) {
				stats.missingKeys[locale].push(refKey);
			}
		}

		for (const locKey of localeKeys) {
			if (!keyExists(translations[referenceLocale], locKey)) {
				stats.extraKeys[locale].push(locKey);
			}
		}

		for (const usedKey of usedKeys) {
			if (!keyExists(translations[locale], usedKey)) {
				stats.usedButNotInLocale[locale].push(usedKey);
			}
		}

		for (const locKey of localeKeys) {
			if (!usedKeys.has(locKey)) {
				stats.inLocaleButNotUsed[locale].push(locKey);
			}
		}
	}

	let hasIssues = false;

	for (const locale in stats.missingKeys) {
		const missing = stats.missingKeys[locale];
		if (missing.length > 0) {
			hasIssues = true;
			console.log(`\n❌ ${locale} is missing ${missing.length} keys from reference:`);
			missing.forEach((key) => console.log(`   - ${key}`));
		}
	}

	for (const locale in stats.extraKeys) {
		const extra = stats.extraKeys[locale];
		if (extra.length > 0) {
			hasIssues = true;
			console.log(`\n⚠️  ${locale} has ${extra.length} extra keys not in reference:`);
			extra.forEach((key) => console.log(`   - ${key}`));
		}
	}

	for (const locale in stats.usedButNotInLocale) {
		const missing = stats.usedButNotInLocale[locale];
		if (missing.length > 0) {
			hasIssues = true;
			console.log(`\n🚨 ${locale}: ${missing.length} keys are used in code but NOT in localization:`);
			missing.forEach((key) => console.log(`   - ${key}`));
		}
	}

	for (const locale in stats.inLocaleButNotUsed) {
		const unused = stats.inLocaleButNotUsed[locale];
		if (unused.length > 0) {
			console.log(`\n💡 ${locale}: ${unused.length} keys are in localization but NOT used in code:`);
			unused.forEach((key) => console.log(`   - ${key}`));
		}
	}

	console.log('\n📊 Checking for empty values...');
	for (const locale of locales) {
		checkEmptyValues(translations[locale], locale);
	}

	if (!hasIssues) {
		console.log('\n✅ All locales have consistent structure and all used keys are defined!');
	}

	return hasIssues;
}

function checkEmptyValues(obj, locale, prefix = '') {
	for (const key in obj) {
		const fullKey = prefix ? `${prefix}.${key}` : key;
		const value = obj[key];

		if (value === '') {
			console.log(`⚠️  ${locale} has empty string at ${fullKey}`);
		} else if (value === null) {
			console.log(`⚠️  ${locale} has null value at ${fullKey}`);
		} else if (typeof value === 'object' && !Array.isArray(value)) {
			checkEmptyValues(value, locale, fullKey);
		}
	}
}

function main() {
	fs.ensureDirSync(COMPILED_DIR);
	validateTranslations();
}

if (process.argv.includes('--watch')) {
	console.log('👀 Watching for changes...');
	let debounceTimer;
	const debounceDelay = 100;

	clearTimeout(debounceTimer);
	debounceTimer = setTimeout(() => main(), debounceDelay);

	chokidar
		.watch([COMPILED_DIR, SRC_DIR], {
			ignoreInitial: true,
			ignored: /.*~$/,
		})
		.on('all', (event, path) => {
			if (event === 'change' || event === 'add' || event === 'unlink') {
				clearTimeout(debounceTimer);
				debounceTimer = setTimeout(() => {
					console.log(`\n🔁 Detected changes in ${path} (${event}), revalidating...`);
					main();
				}, debounceDelay);
			}
		});
} else {
	main();
}
