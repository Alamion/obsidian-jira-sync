---
jira_selected_week: 2025-03-10
---


```dataviewjs
const tasksDirectory = "Kanban";
const show_max_weeks = 3


const files = app.vault.getMarkdownFiles().filter(file => file.path.startsWith(tasksDirectory));

let timekeepBlocks = [];

async function processFiles() {
    for (const file of files) {
        const content = await app.vault.read(file);
        const timekeepMatches = content.match(/```timekeep\n([\s\S]*?)```/g);

        if (timekeepMatches) {
            timekeepMatches.forEach(block => {
                try {
                    const jsonContent = block.replace(/```timekeep\n/, "").replace(/```/, "").trim();
                    const data = JSON.parse(jsonContent);
                    timekeepBlocks.push({ 
                        file: file.name, 
                        path: file.path, 
                        data: data, 
                        jira_task: file.jira 
                    });
                } catch (error) {
                    console.error(`Error parsing JSON in ${file.name}:`, error);
                }
            });
        }
    }

    const groupedByWeek = {};
    const jiraData = {};
    window.jiraData = jiraData;

    // Process all timekeep blocks with recursive entries
    timekeepBlocks.forEach(block => {
        processEntries(block.data.entries, block.file, "", groupedByWeek, jiraData, block);
    });
    
	trimOldEntries(groupedByWeek, show_max_weeks)
	trimOldEntries(jiraData, show_max_weeks)

    // Display results
    if (Object.keys(groupedByWeek).length > 0) {
	    const sortedWeeks = Object.keys(groupedByWeek).sort()
        for (const week of sortedWeeks) {
			const entries = groupedByWeek[week];
            dv.header(3, `Week of ${week}`);
            dv.table(
                ["Task", "Block Path", "Start Time", "End Time", "Duration"],
                entries.map(entry => [
                    entry.file, 
                    entry.blockPath, 
                    entry.startTime, 
                    entry.endTime, 
                    entry.duration
                ])
            );
        }
        
        let options = '';
        for (const [week, entries] of Object.entries(jiraData)) {
            options += `option(${week}),\n`;
        }
        if (options.length > 2) options = options.substring(0, options.length - 2);
    
        dv.paragraph(`\`\`\`meta-bind
INPUT[inlineSelect(${options}): jira_selected_week]
\`\`\``);
        
        dv.paragraph(`\`\`\`meta-bind-button
label: Send
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

// Recursive function to process entries and their subentries
function processEntries(entries, fileName, parentPath, groupedByWeek, jiraData, originalBlock) {
    if (!entries || !Array.isArray(entries)) return;

    entries.forEach(entry => {
        // Create the current block path
        const currentPath = parentPath ? `${parentPath} > ${entry.name}` : entry.name;
        
        // Process this entry if it has a start time
        if (entry.startTime) {
            const startTime = new Date(entry.startTime);
            const weekStart = getWeekStartDate(startTime);
            const weekKey = weekStart.toISOString().split('T')[0];

            if (!groupedByWeek[weekKey]) groupedByWeek[weekKey] = [];
            if (!jiraData[weekKey]) jiraData[weekKey] = [];

            // Calculate duration
            let duration;
            let endTime = entry.endTime ? new Date(entry.endTime) : new Date();
            
            if (entry.endTime) {
                duration = formatDuration(endTime - startTime);
            } else {
                duration = "ongoing";
            }

            // Add to grouped data
            groupedByWeek[weekKey].push({
                file: fileName.replace(".md", ""),
                blockPath: currentPath,
                startTime: formatDate(startTime, 'DD-MM-YYYY HH:mm'),
                endTime: entry.endTime ? formatDate(endTime, 'DD-MM-YYYY HH:mm') : "ongoing",
                duration: duration
            });
            
            // Add to Jira data
            jiraData[weekKey].push({
                task: originalBlock,
                time_block: {
                    ...entry,
                    path: currentPath
                }
            });
        }
        
        // Process subentries recursively
        if (entry.subEntries && Array.isArray(entry.subEntries)) {
            processEntries(entry.subEntries, fileName, currentPath, groupedByWeek, jiraData, originalBlock);
        }
    });
}

function formatDate(date, format) {
    const pad = (num) => num.toString().padStart(2, '0');

    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    const seconds = pad(date.getSeconds());

    return format
        .replace('YYYY', year)
        .replace('MM', month)
        .replace('DD', day)
        .replace('HH', hours)
        .replace('mm', minutes)
        .replace('ss', seconds);
}

function getWeekStartDate(date) {
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(date.setDate(diff));
}

function formatDuration(ms) {
    const seconds = Math.floor(ms / 1000) % 60;
    const minutes = Math.floor(ms / (1000 * 60)) % 60;
    const hours = Math.floor(ms / (1000 * 60 * 60));
    return `${hours}h ${minutes}m ${seconds}s`;
}

function trimOldEntries(example_object, max_days) {
    let dates = Object.keys(example_object).sort();
    
    while (dates.length > max_days) {
        let oldestDate = dates.shift();
        delete example_object[oldestDate];
    }
}

processFiles();
```
