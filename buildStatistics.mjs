import esbuild from "esbuild";
import fs from "fs";

async function build() {
	try {
		const result = await esbuild.build({
			entryPoints: ['docs/statistics.ts'],
			bundle: true,
			minify: true,
			format: 'iife',
			globalName: 'exports',
			outfile: 'docs/statistics.min.js',
			write: false,
			target: 'es2018',
		});

		const minifiedCode = new TextDecoder().decode(result.outputFiles[0].contents);

		const dataviewBlock =`---
jira_worklog_batch: '[]'
---

To set folder searching issue files in, redact in one of last lines \`t="Jira Issues"\`
To set number of weeks shown, redact in one of last lines \`e=3\`
\`\`\`dataviewjs
${minifiedCode}
exports.runTimekeep();
\`\`\`
Select a week to sent work log to Jira. Always reselect before pressing the button`;

		fs.writeFileSync('docs/statistics.md', dataviewBlock);
		console.log('Build completed successfully!');
		console.log(`Minified size: ${minifiedCode.length} bytes`);

	} catch (error) {
		console.error('Build failed:', error);
		process.exit(1);
	}
}

build();
