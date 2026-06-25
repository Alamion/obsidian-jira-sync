import { describe, it, expect } from 'vitest';
import { sanitizeFileName } from '../../../src/tools/sanitizers';

function generateFilenameFromTemplate(template: string, issue: { key: string; fields: { summary?: string } }): string {
	let filename = template;
	const summary = issue.fields?.summary || '';
	const sanitizedSummary = sanitizeFileName(summary);
	filename = filename.replace(/\{summary\}/g, sanitizedSummary);
	const key = issue.key || '';
	filename = filename.replace(/\{key\}/g, key);
	filename = sanitizeFileName(filename);
	if (!filename || filename.trim() === '') {
		if (key) {
			filename = key;
		} else if (sanitizedSummary) {
			filename = sanitizedSummary;
		} else {
			filename = 'jira-issue';
		}
	}
	return filename.trim();
}

describe('generateFilenameFromTemplate', () => {
	it('generates filename with summary and key default template', () => {
		const issue = { key: 'PROJ-123', fields: { summary: 'Fix login bug' } };
		const result = generateFilenameFromTemplate('{summary} ({key})', issue);
		expect(result).toBe('Fix login bug (PROJ-123)');
	});

	it('handles template with only key', () => {
		const issue = { key: 'PROJ-123', fields: { summary: 'Fix login bug' } };
		const result = generateFilenameFromTemplate('{key}', issue);
		expect(result).toBe('PROJ-123');
	});

	it('handles template with only summary', () => {
		const issue = { key: 'PROJ-123', fields: { summary: 'Fix login bug' } };
		const result = generateFilenameFromTemplate('{summary}', issue);
		expect(result).toBe('Fix login bug');
	});

	it('sanitizes summary in filename', () => {
		const issue = { key: 'PROJ-1', fields: { summary: 'bug: fix "critical" issue?' } };
		const result = generateFilenameFromTemplate('{summary}', issue);
		expect(result).not.toContain(':');
		expect(result).not.toContain('"');
		expect(result).not.toContain('?');
		expect(result).toContain('-');
	});

	it('falls back to key when summary is empty but template has non-template text', () => {
		const issue = { key: 'PROJ-1', fields: { summary: '' } };
		const result = generateFilenameFromTemplate('{summary}', issue);
		expect(result).toBe('PROJ-1');
	});

	it('falls back to jira-issue when both key and summary are empty', () => {
		const issue = { key: '', fields: { summary: '' } };
		const result = generateFilenameFromTemplate('{summary}', issue);
		expect(result).toBe('jira-issue');
	});

	it('preserves custom template structure', () => {
		const issue = { key: 'PROJ-42', fields: { summary: 'My Task' } };
		const result = generateFilenameFromTemplate('{key}-{summary}', issue);
		expect(result).toBe('PROJ-42-My Task');
	});

	it('handles missing fields gracefully by showing non-template parts', () => {
		const issue = { key: 'PROJ-1', fields: {} };
		const result = generateFilenameFromTemplate('{summary} ({key})', issue);
		expect(result).toBe('(PROJ-1)');
	});
});
