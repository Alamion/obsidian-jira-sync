import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

interface TestConnection {
	name: string;
	jiraUrl: string;
	apiVersion: '2' | '3';
	authMethod: 'bearer' | 'basic';
	apiToken: string;
	email?: string;
}

interface TestConfig {
	connections: TestConnection[];
}

function loadConfig(): TestConfig | null {
	try {
		const configPath = path.resolve(__dirname, '../../test-config.local.json');
		if (!fs.existsSync(configPath)) {
			return null;
		}
		const raw = fs.readFileSync(configPath, 'utf-8');
		return JSON.parse(raw);
	} catch {
		return null;
	}
}

const config = loadConfig();
const runIntegration = !!config && process.env.RUN_INTEGRATION_TESTS === 'true';

async function mockBaseRequest(conn: TestConnection, method: string, urlPath: string, body?: string): Promise<any> {
	const url = `${conn.jiraUrl}/rest/api/${conn.apiVersion}${urlPath}`;
	const headers: Record<string, string> = {
		'Content-Type': 'application/json',
	};

	if (conn.authMethod === 'bearer') {
		headers['Authorization'] = `Bearer ${conn.apiToken}`;
	} else if (conn.authMethod === 'basic' && conn.email) {
		const encoded = Buffer.from(`${conn.email}:${conn.apiToken}`).toString('base64');
		headers['Authorization'] = `Basic ${encoded}`;
	}

	const fetchArgs: RequestInit = {
		method,
		headers,
		body: body || undefined,
	};

	const response = await fetch(url, fetchArgs);
	const json = await response.json();

	if (!response.ok) {
		throw new Error(`HTTP ${response.status}: ${JSON.stringify(json)}`);
	}

	return json;
}

async function findExistingIssue(conn: TestConnection): Promise<string | null> {
	try {
		const result = await mockBaseRequest(
			conn,
			'POST',
			'/search',
			JSON.stringify({ jql: '', maxResults: 1, fields: ['key'] }),
		);
		if (result.issues && result.issues.length > 0) {
			return result.issues[0].key;
		}
		return null;
	} catch {
		return null;
	}
}

if (runIntegration) {
	describe.each(config!.connections)('Integration: $name ($apiVersion)', (conn) => {
		let existingIssueKey: string | null;

		beforeAll(async () => {
			existingIssueKey = await findExistingIssue(conn);
		});

		it('fetches server info (self)', async () => {
			const result = await mockBaseRequest(conn, 'GET', '/serverInfo');
			expect(result).toHaveProperty('baseUrl');
			expect(result).toHaveProperty('version');
		});

		it('searches issues with empty JQL', async () => {
			const result = await mockBaseRequest(
				conn,
				'POST',
				'/search',
				JSON.stringify({ jql: '', maxResults: 1, fields: ['key', 'summary'] }),
			);
			expect(result).toHaveProperty('issues');
			expect(Array.isArray(result.issues)).toBe(true);
			if (result.issues.length > 0) {
				expect(result.issues[0]).toHaveProperty('key');
				expect(result.issues[0]).toHaveProperty('fields');
			}
		});

		it('fetches a specific issue by key', async () => {
			if (!existingIssueKey) {
				console.warn('No existing issues found, skipping test');
				return;
			}
			const result = await mockBaseRequest(conn, 'GET', `/issue/${existingIssueKey}`);
			expect(result).toHaveProperty('key', existingIssueKey);
			expect(result).toHaveProperty('fields');
			expect(result.fields).toHaveProperty('summary');
		});

		it('searches by project JQL', async () => {
			if (!existingIssueKey) {
				console.warn('No existing issues found, skipping test');
				return;
			}
			const projectKey = existingIssueKey.split('-')[0];
			const result = await mockBaseRequest(
				conn,
				'POST',
				'/search',
				JSON.stringify({ jql: `project = ${projectKey}`, maxResults: 3, fields: ['key', 'summary'] }),
			);
			expect(result).toHaveProperty('issues');
			expect(result.issues.length).toBeGreaterThan(0);
			for (const issue of result.issues) {
				expect(issue.key).toMatch(new RegExp(`^${projectKey}-`));
			}
		});

		it('fetches issue transitions', async () => {
			if (!existingIssueKey) {
				console.warn('No existing issues found, skipping test');
				return;
			}
			const result = await mockBaseRequest(conn, 'GET', `/issue/${existingIssueKey}/transitions`);
			expect(result).toHaveProperty('transitions');
			expect(Array.isArray(result.transitions)).toBe(true);
		});

		if (conn.apiVersion === '3') {
			it('uses approximate count endpoint (v3 specific)', async () => {
				const result = await mockBaseRequest(
					conn,
					'POST',
					'/search/approximate-count',
					JSON.stringify({ jql: '' }),
				);
				expect(result).toHaveProperty('count');
				expect(typeof result.count).toBe('number');
			});
		}
	});
} else {
	describe('Integration tests', () => {
		it('are skipped unless RUN_INTEGRATION_TESTS=true and tests/test-config.local.json exists', () => {
			if (config) {
				console.info('Test config found. Set RUN_INTEGRATION_TESTS=true to run integration tests.');
			} else {
				console.info(
					'No test config found. Create tests/test-config.local.json (see test-config.example.json).',
				);
			}
			expect(true).toBe(true);
		});
	});
}
