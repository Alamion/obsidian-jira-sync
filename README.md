# Obsidian to Jira Plugin

This plugins supports creating and updating jira issues from obsidian using the command palette, there are 3 commands:

- Import issue from Jira: Let you import a issue information to a MD file inside a new jira-issues directory (There is a ribbon icon for this too)
- Update issue to Jira: Let you update a issue to Jira, with a key, priority and summary from the frontmatter.
- Create issue in Jira: Let you create a issue to Jira, with a priority and summary from the frontmatter. Will let you choose with suggests modals the project and issue type.

## Configuration

Is required the following information for authentication and to know the url to the api.

- Username
- Password
- Url

## How to use

- Clone this repo.
- Make sure your NodeJS is at least v16 (`node --version`).
- `npm i` or `yarn` to install dependencies.
- `npm run dev` to start compilation in watch mode.

## Manually installing the plugin

- Copy over `main.js`, `styles.css`, `manifest.json` to your vault `VaultFolder/.obsidian/plugins/your-plugin-id/`.


