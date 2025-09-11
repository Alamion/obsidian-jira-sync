The functionality of the plugin can be divided into several parts.

### Basic Functionality
For basic functionality, it is enough to specify Jira credentials and the folder for created tasks.

**Authentication Methods**
The plugin supports three authentication methods:
- **Bearer Token (PAT)** - Personal Access Token authentication
- **Basic Auth (Username + PAT)** - Username with Personal Access Token
- **Session Cookie (Username + Password)** - Traditional username and password authentication

**Important Note for Auth Keys**: If using Personal Access Token authentication, the `write:jira-work` and `read:jira-work` scopes are essential for the plugin to function properly.

When running `Get issue from Jira with custom key`, the command will download the latest tasks from Jira and save them in the specified folder.

Without a template, such a page will be completely empty except for its title, so using a template is highly recommended. The template is used only when creating a new page.

#### Template
The template can consist of several different parts:
1. **formatter** - meta-information at the top of the screen. When specifying keys for it and using any `Get issues from Jira` variant, they will be populated with corresponding fields from the response data.
2. **body** - the main content of the page. When using indicators like `jira-sync-section-*`, `jira-sync-line-*`, or `jira-sync-inline-start-*`, they will be filled with the corresponding fields from the response data. The difference between these options is as follows: `line` reads and writes values from the current line, separating the indicator and value with a space. `section` reads values from multiple lines after the indicator, stopping only at another indicator or a heading. `inline` allows indicators to be placed anywhere in the text, not strictly at the beginning of lines. All indicators are invisible until highlighted with the mouse, providing a cleaner editing experience.

An example can be found in [[docs/template_example]].

It is highly recommended to specify basic values in the template's formatter: `key` - the Jira task ID used for updates, `summary` - the Jira task title, and `status` - the current status of the task in Jira.

The formatter takes priority and will overwrite file content values when updating a task in Jira if a field's value is present in both as formatter saves initial format of value and when putting it in body we parse it to string.

Not all fields are predefined, and some may need adjustments. For example, the template provided in [[docs/template_example]] will not correctly retrieve `progressPercent` and `creator` from Jira, even though these fields exist. To fix this, refer to the advanced usage section below.

### Commands

Currently, the plugin provides the following commands:
- `Get issue from Jira with custom key` - allows creating a file in the configured folder that imports information from Jira using a manually specified ID.
- `Batch Fetch Issues by JQL` - allows mass issue import from Jira using a JQL query.
- `Get current issue from Jira` - allows updating the active file if its formatter contains a `key` (the Jira task ID).
- `Update issue in Jira` - allows updating the information from the file in Jira using the key specified in the formatter. Some system fields (e.g., `status`) cannot be changed this way and have dedicated commands.
- `Create issue in Jira` - allows creating a new task in Jira. The formatter must include `summary` (task title) and optionally `project` and `issuetype` (the latter two can be selected from existing options during creation).
- `Update work log in Jira manually` - enables manual time tracking for a task. Currently, this is not reflected in the file, but it will be available in future updates.
- `Update work log in Jira by batch` - enables batch time tracking. If the formatter contains `jira_worklog_batch`, a batch of data from `jira_worklog_batch` will be sent, updating each listed entity.
- `Update issue status in Jira` - allows updating a task's status by selecting one of the available options.

### Advanced Usage

#### Field Mapping
In the settings, you can configure custom mapping for any additional fields received from Jira. To do this:
- Configure how information is sent to Jira (e.g., with the `null` function, the field will be ignored).
- Define how it is received from Jira (e.g., `issue.fields.creator.name` will retrieve the creator's name instead of the entire object with related data).

Similarly, you can configure the `progressPercentage` shown in the example. This field does not exist in the response, but it can be "assembled" from the existing `progress` field: `issue.fields.progress.total ? 100 * issue.fields.progress.progress / issue.fields.progress.total : 0`. As seen in the syntax, mapping uses a simplified TypeScript format.

It will look something like this:

![](images/progressPercentageExample.png)

#### Statistics
Statistics are now integrated into the plugin and can be accessed through the plugin settings in the "Timekeep work log statistics" section. This feature provides a dynamically generated table (or series of tables) showing work statistics and allowing you to send work logs to Jira. You can conveniently select time periods for calculation and transfer work log information to Jira directly from the settings interface.

With Obsidian themes disabled, the table looks like this:

![](images/statisticsExample.png)

### Plugin Settings

#### Connection Settings
This section allows you to select the authentication method and enter corresponding credentials. The plugin supports three authentication methods: Bearer Token (PAT), Basic Auth (Username + PAT), and Session Cookie (Username + Password). If using Personal Access Token authentication, ensure the `write:jira-work` and `read:jira-work` scopes are enabled for proper functionality.

#### General Settings
This section allows you to select the folder where new issues created using commands will be stored. This folder is also used for searching issues in the Timekeep work log statistics section.

#### Field Mapping
This section provides non-standard mappings (in JavaScript format) of information from Jira to Obsidian and vice versa. You can configure custom field transformations and mappings for any additional fields received from Jira.

#### Raw Issue Viewer
This section displays raw API output for entered issues, which should help with writing field mappings. This data is not saved and is provided for debugging and development purposes.

#### Test Field Mapping
This section provides a preview of mapping results for issues from the raw issue viewer. This feature helps with testing and refining field mappings. The data is not saved and is provided for convenience when working with mappings.

#### Timekeep Work Log Statistics
This section provides a dynamically generated table (or series of tables, see image) showing work statistics and providing the ability to send work logs to Jira. You can select time periods for calculation and transfer work log information to Jira directly from this interface.
