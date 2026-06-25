import { describe, it, expect } from 'vitest';
import { validateFunctionString } from '../../../src/tools/convertFunctionString';

describe('validateFunctionString', () => {
	it('accepts empty string', async () => {
		const result = await validateFunctionString('');
		expect(result.isValid).toBe(true);
	});

	it('accepts whitespace-only string', async () => {
		const result = await validateFunctionString('   ');
		expect(result.isValid).toBe(true);
	});

	it('rejects document reference', async () => {
		const result = await validateFunctionString('document.title');
		expect(result.isValid).toBe(false);
		expect(result.errorMessage).toContain('document');
	});

	it('rejects window reference', async () => {
		const result = await validateFunctionString('window.location');
		expect(result.isValid).toBe(false);
		expect(result.errorMessage).toContain('window');
	});

	it('rejects eval reference', async () => {
		const result = await validateFunctionString('eval("1+1")');
		expect(result.isValid).toBe(false);
		expect(result.errorMessage).toContain('eval');
	});

	it('rejects Function reference', async () => {
		const result = await validateFunctionString('Function("return 1")');
		expect(result.isValid).toBe(false);
		expect(result.errorMessage).toContain('Function');
	});

	it('rejects fetch reference', async () => {
		const result = await validateFunctionString('fetch("/api")');
		expect(result.isValid).toBe(false);
		expect(result.errorMessage).toContain('fetch');
	});

	it('accepts simple property access', async () => {
		const result = await validateFunctionString('issue.fields.summary', ['issue']);
		expect(result.isValid).toBe(true);
	});

	it('accepts simple expressions', async () => {
		const result = await validateFunctionString('value + "!"', ['value']);
		expect(result.isValid).toBe(true);
	});

	it('accepts arrow function syntax', async () => {
		const result = await validateFunctionString('(issue, api_version) => issue.fields.summary', [
			'issue',
			'api_version',
		]);
		expect(result.isValid).toBe(true);
	});
});
