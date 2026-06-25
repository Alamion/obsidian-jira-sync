import { describe, it, expect } from 'vitest';
import { sanitizeFileName } from '../../../src/tools/sanitizers';

describe('sanitizeFileName', () => {
	it('replaces backslash with dash', () => {
		expect(sanitizeFileName('foo\\bar')).toBe('foo-bar');
	});

	it('replaces forward slash with dash', () => {
		expect(sanitizeFileName('foo/bar')).toBe('foo-bar');
	});

	it('replaces colon with dash', () => {
		expect(sanitizeFileName('foo: bar')).toBe('foo- bar');
	});

	it('replaces asterisk with dash', () => {
		expect(sanitizeFileName('foo*bar')).toBe('foo-bar');
	});

	it('replaces question mark with dash', () => {
		expect(sanitizeFileName('foo?bar')).toBe('foo-bar');
	});

	it('replaces double quote with dash', () => {
		expect(sanitizeFileName('foo"bar')).toBe('foo-bar');
	});

	it('replaces left angle bracket with dash', () => {
		expect(sanitizeFileName('foo<bar')).toBe('foo-bar');
	});

	it('replaces right angle bracket with dash', () => {
		expect(sanitizeFileName('foo>bar')).toBe('foo-bar');
	});

	it('replaces pipe with dash', () => {
		expect(sanitizeFileName('foo|bar')).toBe('foo-bar');
	});

	it('replaces all invalid characters', () => {
		expect(sanitizeFileName('a<b>c"d:e/f\\g*h?i|j')).toBe('a-b-c-d-e-f-g-h-i-j');
	});

	it('returns empty string for empty input', () => {
		expect(sanitizeFileName('')).toBe('');
	});

	it('preserves valid characters', () => {
		expect(sanitizeFileName('hello-world 123')).toBe('hello-world 123');
	});

	it('handles unicode characters', () => {
		expect(sanitizeFileName('привет мир')).toBe('привет мир');
	});
});
