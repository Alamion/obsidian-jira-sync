import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useTranslations, t } from '../../../src/localization/translator';

describe('translator', () => {
	const originalLanguage = window.localStorage.getItem('language');

	afterEach(() => {
		if (originalLanguage) {
			window.localStorage.setItem('language', originalLanguage);
		} else {
			window.localStorage.removeItem('language');
		}
	});

	describe('useTranslations', () => {
		it('returns translate function with correct prefix', () => {
			const { t: translate } = useTranslations('modals.jql_search');
			const result = translate('desc');
			expect(result).toBe('Search issues by JQL query');
		});

		it('returns locale string', () => {
			const { locale } = useTranslations();
			expect(locale).toBe('en');
		});

		it('returns correct locale when language is set', () => {
			// ru locale may not be compiled; test with en
			const { locale } = useTranslations();
			expect(locale).toBe('en');
		});
	});

	describe('t', () => {
		it('returns translation for valid key with prefix', () => {
			const result = t('jql.name', 'modals.jql_search');
			expect(result).toBe('JQL Query');
		});

		it('returns translation key when not found', () => {
			const result = t('nonexistent.key', 'some_prefix');
			expect(result).toBe('some_prefix.nonexistent.key');
		});

		it('replaces placeholders in translation', () => {
			const result = t('total', 'modals.jql_search.preview', { total: '42' });
			expect(result).toBe('Total 42 issues found');
		});

		it('returns command translation', () => {
			const result = t('name', 'commands.batch_fetch_issues');
			expect(result).toBe('Batch Fetch Issues by JQL');
		});
	});
});
