---
jira_selected_week_data: '[]'
---


```dataviewjs
const tasksDirectory = "Kanban";
const show_max_weeks = 3;

// Get all markdown files in the Kanban directory
const files = app.vault.getMarkdownFiles().filter(file => file.path.startsWith(tasksDirectory));

// Regular expression to extract issue key (assuming it's in format like "PROJECT-123" in the file content)
const issueKeyRegex = /(?:^|\s)([A-Z]+-\d+)(?:\s|$)/;

async function processFiles() {
	let timekeepBlocks = [];
	
	// Process all files in one go
	await Promise.all(files.map(async file => {
		const content = await app.vault.read(file);
		
		// Extract issue key from file content instead of using file.key
		let issueKey = null;
		const keyMatch = content.match(issueKeyRegex);
		if (keyMatch) {
			issueKey = keyMatch[1];
		}
		
		// Match all timekeep blocks using a single regex
		const timekeepMatches = content.match(/```timekeep\n([\s\S]*?)```/g);
		
		if (timekeepMatches) {
			timekeepMatches.forEach(block => {
				try {
					// Extract JSON content and parse it
					const jsonContent = block.replace(/```timekeep\n/, "").replace(/```/, "").trim();
					const data = JSON.parse(jsonContent);
					
					timekeepBlocks.push({ 
						file: file.name, 
						path: file.path, 
						issueKey: issueKey, // Use extracted issue key
						data: data 
					});
				} catch (error) {
					console.error(`Error parsing JSON in ${file.name}:`, error);
				}
			});
		}
	}));

	// Group entries by week
	const groupedByWeek = {};

	// Process all timekeep blocks once
	timekeepBlocks.forEach(block => {
		processEntries(block.data.entries, block.file, block.issueKey, "", groupedByWeek);
	});
	
	// Trim old entries to show only the most recent weeks
	trimOldEntries(groupedByWeek, show_max_weeks);

	// Display results
	if (Object.keys(groupedByWeek).length > 0) {
		// Sort weeks chronologically
		const sortedWeeks = Object.keys(groupedByWeek).sort();
		
		for (const week of sortedWeeks) {
			const entries = groupedByWeek[week];
			dv.header(3, `Week of ${week}`);
			dv.table(
				["Task", "Block Path", "Start Time", "Duration"],
				entries.map(entry => [
					entry.file, 
					entry.blockPath, 
					entry.startTime, 
					entry.duration
				])
			);
		}
		
		// Create options for metabind select
		const options = sortedWeeks
			.map(week => `option('${JSON.stringify(groupedByWeek[week])}', ${week})`)
			.join(",\n");
		
		// Display meta-bind controls
		dv.paragraph(`\`\`\`meta-bind
INPUT[inlineSelect(option('[]', 'select week'), ${options}): jira_selected_week_data]
\`\`\``);
		
		dv.paragraph(`\`\`\`meta-bind-button
label: Send worklog to Jira
hidden: false
id: ""
style: primary
actions:
  - type: command
	command: obsidian-jira-sync:sent_week
\`\`\``);
	} else {
		dv.paragraph("No entries found.");
	}
}

// Process entries recursively with improved efficiency
function processEntries(entries, fileName, issueKey, parentPath, groupedByWeek) {
	if (!entries || !Array.isArray(entries)) return;

	for (const entry of entries) {
		// Create the current block path
		const currentPath = parentPath ? `${parentPath} > ${entry.name}` : entry.name;
		
		// Process this entry if it has a start time
		if (entry.startTime) {
			const startTime = new Date(entry.startTime);
			const weekStart = getWeekStartDate(startTime);
			const weekKey = weekStart.toISOString().split('T')[0];

			// Initialize the week array if it doesn't exist
			if (!groupedByWeek[weekKey]) groupedByWeek[weekKey] = [];

			// Calculate duration
			let duration;
			let endTime;
			
			if (entry.endTime) {
				endTime = new Date(entry.endTime);
				duration = formatDuration(endTime - startTime);
			} else {
				endTime = new Date();
				duration = "ongoing";
			}

			// Add to grouped data
			groupedByWeek[weekKey].push({
				file: fileName.replace(".md", ""),
				issueKey: issueKey,
				blockPath: currentPath,
				startTime: formatDate(startTime, 'DD-MM-YYYY HH:mm'),
				endTime: entry.endTime ? formatDate(endTime, 'DD-MM-YYYY HH:mm') : "ongoing",
				duration: duration
			});
		}
		
		// Process subentries recursively
		if (entry.subEntries && Array.isArray(entry.subEntries)) {
			processEntries(entry.subEntries, fileName, issueKey, currentPath, groupedByWeek);
		}
	}
}

// Date formatting helper
function formatDate(date, format) {
	const pad = (num) => num.toString().padStart(2, '0');

	const year = date.getFullYear();
	const month = pad(date.getMonth() + 1);
	const day = pad(date.getDate());
	const hours = pad(date.getHours());
	const minutes = pad(date.getMinutes());

	return format
		.replace('YYYY', year)
		.replace('MM', month)
		.replace('DD', day)
		.replace('HH', hours)
		.replace('mm', minutes);
}

// Get the start date of the week for a given date
function getWeekStartDate(date) {
	const result = new Date(date);
	const day = result.getDay();
	const diff = result.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
	result.setDate(diff);
	return new Date(result.setHours(0, 0, 0, 0)); // Start of the day
}

// Format milliseconds to readable duration
function formatDuration(ms) {
	const seconds = Math.floor(ms / 1000) % 60;
	const minutes = Math.floor(ms / (1000 * 60)) % 60;
	const hours = Math.floor(ms / (1000 * 60 * 60));
	return `${hours}h ${minutes}m ${seconds}s`;
}

// Remove oldest entries beyond the maximum number of weeks to display
function trimOldEntries(groupedByWeek, max_weeks) {
	const dates = Object.keys(groupedByWeek).sort();
	
	while (dates.length > max_weeks) {
		const oldestDate = dates.shift();
		delete groupedByWeek[oldestDate];
	}
}

// Execute the main function
processFiles();
```
