import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
	test: {
		include: ['tests/__tests__/**/*.test.ts'],
		environment: 'jsdom',
		setupFiles: ['tests/__tests__/setup.ts'],
	},
	resolve: {
		extensions: ['.ts', '.mjs', '.js', '.mts', '.jsx', '.tsx', '.json'],
		alias: {
			obsidian: path.resolve(__dirname, '__mocks__/obsidian.ts'),
		},
	},
});
