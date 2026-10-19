/**
 * Formats a given time in seconds to mm:ss format.
 * Gracefully handles invalid, negative, or infinite values.
 *
 * @param {number} seconds - The time duration in seconds.
 * @returns {string} Formatted time string (e.g., "03:45").
 */
export function formatTime(seconds) {
  if (seconds === null || seconds === undefined || isNaN(seconds) || !isFinite(seconds) || seconds < 0) {
    return '00:00';
  }

  const roundedSeconds = Math.floor(seconds);
  const minutes = Math.floor(roundedSeconds / 60);
  const remainingSeconds = roundedSeconds % 60;

  const paddedMinutes = String(minutes).padStart(2, '0');
  const paddedSeconds = String(remainingSeconds).padStart(2, '0');

  return `${paddedMinutes}:${paddedSeconds}`;
}

export default formatTime;
