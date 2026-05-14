/**
 * Debounce with leading edge execution.
 */
export function debounceLeading<T extends unknown[]>(
	fn: (...args: T) => void,
	delay: number,
	getWindow: () => Window = () => window
): (...args: T) => void {
	let timeoutId: number | null = null;
	let timeoutWindow: Window | null = null;
	let lastCallTime = 0;

	return function (...args: T) {
		const now = Date.now();
		const timeSinceLastCall = now - lastCallTime;

		if (timeoutId) {
			timeoutWindow?.clearTimeout(timeoutId);
		}

		if (timeSinceLastCall >= delay) {
			lastCallTime = now;
			fn(...args);
		} else {
			timeoutWindow = getWindow();
			timeoutId = timeoutWindow.setTimeout(() => {
				lastCallTime = Date.now();
				timeoutId = null;
				timeoutWindow = null;
				fn(...args);
			}, delay);
		}
	};
}
