const fs = require('fs-extra');
const yaml = require('yaml');
const path = require('path');
const chokidar = require('chokidar');

const SOURCE_DIR = path.join(__dirname, 'source');
const COMPILED_DIR = path.join(__dirname, 'compiled');

// Компиляция всех языков
async function main() {
	try {
		const locales = fs.readdirSync(SOURCE_DIR);
		for (const locale of locales) {
			const localePath = path.join(SOURCE_DIR, locale);
			const stat = fs.statSync(localePath);
			if (stat.isDirectory()) {
				await compileLocale(locale);
			}
		}
		console.log('✅ All locales compiled');
	} catch (err) {
		console.error('❌ Error compiling all locales:', err.message);
	}
}

async function compileLocale(locale) {
	const localeDir = path.join(SOURCE_DIR, locale);
	const result = {};

	async function processDirectory(dirPath, parentKeys = []) {
		try {
			const items = fs.readdirSync(dirPath);

			for (const item of items) {
				// Пропускаем временные и скрытые файлы
				if (item.startsWith('.')) continue;

				const itemPath = path.join(dirPath, item);

				let stat;
				try {
					stat = fs.statSync(itemPath);
				} catch (err) {
					if (err.code === 'ENOENT') continue; // Файл был удален
					throw err;
				}

				if (stat.isDirectory()) {
					await processDirectory(itemPath, [...parentKeys, item]);
				} else if (item.endsWith('.yaml')) {
					try {
						const content = fs.readFileSync(itemPath, 'utf8');
						const data = yaml.parse(content);
						const fileNameWithoutExt = path.basename(item, '.yaml');

						const targetKeys = fileNameWithoutExt === 'index'
							? parentKeys
							: [...parentKeys, fileNameWithoutExt];

						let target = result;
						for (const key of targetKeys.slice(0, -1)) {
							target[key] = target[key] || {};
							target = target[key];
						}

						const finalKey = targetKeys[targetKeys.length - 1];
						target[finalKey] = deepMerge(target[finalKey] || {}, data);
					} catch (err) {
						console.error(`⚠️  Failed to process file ${itemPath}:`, err.message);
					}
				}
			}
		} catch (err) {
			console.error(`⚠️  Failed to process directory ${dirPath}:`, err.message);
		}
	}

	await processDirectory(localeDir);
	const outputPath = path.join(COMPILED_DIR, `${locale}.json`);
	await fs.ensureDir(COMPILED_DIR);
	await fs.writeJson(outputPath, result, { spaces: 2 });
}

function deepMerge(target, source) {
	for (const key in source) {
		if (source[key] instanceof Object && target[key]) {
			Object.assign(source[key], deepMerge(target[key], source[key]));
		}
	}
	return Object.assign(target || {}, source);
}


// Watch mode
if (process.argv.includes('--watch')) {
	console.log('👀 Watching for changes...');

	let debounceTimer;
	const debounceDelay = 100;

	// Initial validation
	clearTimeout(debounceTimer);
	debounceTimer = setTimeout(() => {
		main();
	}, debounceDelay);

	// Watch for changes in the compiled directory
	chokidar.watch(SOURCE_DIR, {
		ignoreInitial: true,
		ignored: /.*~$/, // Игнорировать скрытые файлы
	}).on('all', (event, path) => {
		if (event === 'change' || event === 'add' || event === 'unlink') {
			clearTimeout(debounceTimer);
			debounceTimer = setTimeout(() => {
				console.log(`🔁 Detected changes in ${path} (${event}), recompiling...`);
				main();
			}, debounceDelay);
		}
	});
} else {
	// Run once
	main();
}
