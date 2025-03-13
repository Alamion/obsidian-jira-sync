# Obsidian Jira Plugin

A robust plugin for Obsidian that enables seamless integration with Jira. This plugin allows you to manage Jira issues directly from your Obsidian vault, providing a bridge between your knowledge base and your project management workflow.

## Features

- **Import Issues from Jira**: Fetch and import issues from Jira into your Obsidian vault as markdown notes
- **Update Issues to Jira**: Make changes to your issues in Obsidian and push them back to Jira
- **Create New Issues**: Create new Jira issues directly from Obsidian notes
- **Markdown Conversion**: Automatically converts between Jira markup and Markdown
- **Template Support**: Use custom templates for your imported Jira issues

## Installation

1. Open Obsidian
2. Go to Settings > Community plugins
3. Disable Safe mode if it's enabled
4. Click "Browse" and search for "Jira Issue Manager"
5. Install the plugin
6. Enable the plugin after installation

## Configuration

1. After enabling the plugin, go to its settings tab
2. Enter your Jira credentials:
	- **Username**: Your Jira username
	- **Password**: Your Jira password
	- **Jira URL**: The base URL of your Jira instance (e.g., `https://your-company.atlassian.net`)
3. Configure additional settings:
	- **Issues Folder**: The folder where issues will be stored (default: `jira-issues`)
	- **Session Cookie Name**: The name of the Jira session cookie (default: `JSESSIONID`)
	- **Template Path**: Optional path to a template file for new issues

## How to Use

### Importing Issues from Jira

There are two ways to import an issue:

1. **Using the Ribbon Icon**: Click the "Import issue from Jira" ribbon icon (file download icon)
2. **Using the Command Palette**: Press `Ctrl/Cmd+P` and search for "Get issue from Jira"

Either method will open a modal where you can enter the Jira issue key (e.g., `PROJECT-123`). The issue will be imported as a markdown note in your configured issues folder.

### Updating Issues to Jira

1. Open the markdown note for the issue you want to update
2. Make your changes to the issue description
3. Press `Ctrl/Cmd+P` and search for "Update issue to Jira"
4. The plugin will push your changes back to Jira

### Creating New Issues in Jira

1. Create a new markdown note with the following frontmatter:
   ```yaml
   ---
   summary: "Your issue summary here"
   priority: "Medium" # Optional
   ---
   ```
2. Write the issue description in the note body
3. Press `Ctrl/Cmd+P` and search for "Create issue in Jira"
4. Select the project and issue type from the modal prompts
5. The issue will be created in Jira, and the note will be updated with the issue key

### Note Structure

When an issue is imported or created, the plugin generates a note with the following structure:

```
---
key: PROJECT-123
summary: Issue summary
priority: Medium
---

Your issue description in markdown format
```

The plugin will respect the "Description" section in your note when updating or creating issues.

## Using Templates

You can define a template for new issue notes. Create a markdown file anywhere in your vault, then set its path in the plugin settings. When importing or creating issues, this template will be used as the base for the new note.

## Tips and Tricks

- **Issue Organization**: The plugin creates all issues in the configured issues folder, helping you keep Jira-related notes organized
- **Markdown Conversion**: The plugin automatically handles the conversion between Jira markup and Markdown, so you can write in standard Markdown syntax
- **Frontmatter Fields**: The plugin uses frontmatter to store issue metadata (key, summary, priority). Edit these fields to update the issue in Jira
- **Authentication**: The plugin stores session cookies securely in your browser's local storage

## Troubleshooting

- **Authentication Issues**: Ensure your Jira username, password, and URL are correct
- **Missing Issues Folder**: The plugin will automatically create the issues folder if it doesn't exist
- **Template Not Found**: Check that the template path in the settings is correct and the file exists

## Security Note

This plugin stores your Jira credentials in Obsidian's settings. Make sure to keep your vault secure and consider using environment variables or a more secure authentication method for sensitive environments.

## License

[MIT License](LICENSE)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

For more information or to report issues, please visit the [GitHub repository](https://github.com/your-username/obsidian-jira-plugin).
