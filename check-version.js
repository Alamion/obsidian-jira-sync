#!/usr/bin/env node

const { execSync } = require('child_process');

const stagedFiles = execSync('git diff --cached --name-only', { encoding: 'utf-8' })
	.trim()
	.split('\n')
	.filter(Boolean);

const hasCodeChanges = stagedFiles.some(file =>
	file.endsWith('.ts') ||
	file.endsWith('.tsx')
);

const manifestChanged = stagedFiles.includes('manifest.json');

if (hasCodeChanges && !manifestChanged) {
	console.error('\x1b[33m⚠️  You have changed the code but have not updated manifest.json.\x1b[0m');
	console.error('\x1b[33m    Have you forgotten to update the plugin version?\x1b[0m');
	console.error('');
	console.error('If you are sure that the version does not need to be changed, use:');
	console.error('  git commit --no-verify');
	console.error('');
	process.exit(1);
}

if (manifestChanged && hasCodeChanges) {
	try {
		const manifestDiff = execSync('git diff --cached manifest.json', { encoding: 'utf-8' });

		if (!manifestDiff.includes('"version"')) {
			console.error('\x1b[33m⚠️  manifest.json has been modified, but the version has not been updated!\x1b[0m');
			console.error('');
			console.error('If this is intentional, use:');
			console.error('  git commit --no-verify');
			console.error('');
			process.exit(1);
		}
	} catch (error) {
	}
}

console.log('\x1b[32m✓ Version check passed\x1b[0m');
process.exit(0);
