
export function createLimiter(concurrency: number) {
	let activeCount = 0;
	const queue: (() => void)[] = [];

	const next = () => {
		activeCount--;
		if (queue.length > 0) {
			const fn = queue.shift();
			if (fn) fn();
		}
	};

	return async function limit<T>(fn: () => Promise<T>): Promise<T> {
		if (activeCount >= concurrency) {
			await new Promise<void>(resolve => queue.push(resolve));
		}
		activeCount++;
		try {
			return await fn();
		} finally {
			next();
		}
	};
}

export function chunkArray<T>(arr: T[], size: number): T[][] {
	return Array.from({length: Math.ceil(arr.length / size)}, (_, i) =>
		arr.slice(i * size, i * size + size)
	);
}
