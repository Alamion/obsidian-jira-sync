import { Editor, MarkdownFileInfo, MarkdownView, Notice } from 'obsidian';
import JiraPlugin from '../main';
import { IssueCommentModal } from '../modals';
import { addComment, validateSettings } from '../api';
import { useTranslations } from '../localization/translator';

const t = useTranslations('commands.add_comment').t;

export function registerAddCommentCommand(plugin: JiraPlugin): void {
	plugin.addCommand({
		id: 'add-comment-jira',
		name: t('name'),
		editorCheckCallback: (checking: boolean, editor: Editor, ctx: MarkdownView | MarkdownFileInfo) => {
			if (!validateSettings(plugin)) return false;
			if (!ctx.file) return false;

			const frontmatter = plugin.app.metadataCache.getFileCache(ctx.file)?.frontmatter;
			const issueKey = frontmatter?.key;
			if (!issueKey) return false;

			if (!checking) {
				const selectedText = editor.getSelection();
				new IssueCommentModal(plugin.app, selectedText, async (commentText: string) => {
					try {
						await addComment(plugin, issueKey, commentText);
					} catch (error: any) {
						new Notice(t('error') + ': ' + (error.message || 'Unknown error'));
						console.error(error);
					}
				}).open();
			}

			return true;
		},
	});
}
