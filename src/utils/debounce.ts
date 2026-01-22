/**
 * Debounce with leading edge execution.
 */
export function debounceLeading<T extends unknown[]>(
	fn: (...args: T) => void,
	delay: number
): (...args: T) => void {
	let timeoutId: ReturnType<typeof setTimeout> | null = null;
	let lastCallTime = 0;

	return function (...args: T) {
		const now = Date.now();
		const timeSinceLastCall = now - lastCallTime;

		if (timeoutId) {
			clearTimeout(timeoutId);
		}

		if (timeSinceLastCall >= delay) {
			lastCallTime = now;
			fn(...args);
		} else {
			timeoutId = setTimeout(() => {
				lastCallTime = Date.now();
				timeoutId = null;
				fn(...args);
			}, delay);
		}
	};
}
