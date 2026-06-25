import { describe, it, expect } from 'vitest';
import {
	parseFileContent,
	extractAllJiraSyncValuesFromContent,
	updateJiraSyncContent,
} from '../../../src/tools/sectionTools';

describe('parseFileContent', () => {
	it('parses a sync section (stops at next heading)', () => {
		const content = '`jira-sync-section-status`\nIn Progress\n\n## Next Section\nmore text';
		const blocks = parseFileContent(content);
		expect(blocks).toHaveLength(1);
		expect(blocks[0].type).toBe('section');
		expect(blocks[0].name).toBe('status');
		expect(blocks[0].content).toBe('In Progress');
	});

	it('parses a sync section without heading captures everything', () => {
		const content = '`jira-sync-section-status`\nIn Progress\n\nmore text';
		const blocks = parseFileContent(content);
		expect(blocks[0].type).toBe('section');
		expect(blocks[0].content).toContain('In Progress');
		expect(blocks[0].content).toContain('more text');
	});

	it('parses a sync line (captures rest of line)', () => {
		const content = 'text `jira-sync-line-assignee`johndoe more text';
		const blocks = parseFileContent(content);
		expect(blocks[0].type).toBe('line');
		expect(blocks[0].name).toBe('assignee');
		expect(blocks[0].content).toBe('johndoe more text');
	});

	it('parses an inline block', () => {
		const content = 'hello `jira-sync-inline-start-summary`my issue`jira-sync-end` world';
		const blocks = parseFileContent(content);
		expect(blocks).toHaveLength(1);
		expect(blocks[0].type).toBe('inline');
		expect(blocks[0].name).toBe('summary');
		expect(blocks[0].content).toBe('my issue');
	});

	it('parses a block', () => {
		const content = 'before\n`jira-sync-block-start-description`\nline1\nline2\n`jira-sync-end`\nafter';
		const blocks = parseFileContent(content);
		expect(blocks).toHaveLength(1);
		expect(blocks[0].type).toBe('block');
		expect(blocks[0].name).toBe('description');
		expect(blocks[0].content).toBe('line1\nline2');
	});

	it('returns empty array for content without sync markers', () => {
		const content = 'just plain text\nno markers here';
		const blocks = parseFileContent(content);
		expect(blocks).toHaveLength(0);
	});

	it('parses multiple blocks of different types', () => {
		const content = [
			'`jira-sync-section-status`',
			'Done',
			'',
			'`jira-sync-line-assignee`john',
			'`jira-sync-inline-start-priority`High`jira-sync-end`',
		].join('\n');
		const blocks = parseFileContent(content);
		expect(blocks).toHaveLength(3);
	});
});

describe('extractAllJiraSyncValuesFromContent', () => {
	it('extracts values into a dictionary', () => {
		const content = '`jira-sync-section-status`\nDone\n`jira-sync-line-assignee`john';
		const result = extractAllJiraSyncValuesFromContent(content);
		expect(result).toEqual({ status: 'Done', assignee: 'john' });
	});

	it('returns empty object for content without sync markers', () => {
		const result = extractAllJiraSyncValuesFromContent('plain text');
		expect(result).toEqual({});
	});
});

describe('updateJiraSyncContent', () => {
	it('updates a section with new content', () => {
		const content = '`jira-sync-section-status`\nIn Progress';
		const result = updateJiraSyncContent(content, { status: 'Done' });
		expect(result).toContain('Done');
	});

	it('does not modify content for unknown field names', () => {
		const content = '`jira-sync-section-status`\nIn Progress';
		const result = updateJiraSyncContent(content, { assignee: 'john' });
		expect(result).toBe(content);
	});

	it('updates only the specified fields', () => {
		const content = ['`jira-sync-section-status`', 'In Progress', '`jira-sync-line-assignee`jane'].join('\n');
		const result = updateJiraSyncContent(content, { status: 'Done' });
		expect(result).toContain('Done');
		expect(result).toContain('jane');
	});

	it('preserves content after section when a heading boundary is present', () => {
		const content = 'some header\n\n`jira-sync-section-status`\nold value\n\n## Next\nfooter';
		const result = updateJiraSyncContent(content, { status: 'new value' });
		expect(result).toContain('`jira-sync-section-status`');
		expect(result).toContain('new value');
		expect(result).toContain('some header');
		expect(result).toContain('footer');
	});
});
