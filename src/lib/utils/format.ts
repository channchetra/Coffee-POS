// General formatting utilities

/**
 * Format date for display
 * @param isoString ISO date string
 * @param locale Locale string
 * @returns Formatted date string
 */
export function formatDate(isoString: string, locale: string = 'en-US'): string {
  const date = new Date(isoString);
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(date);
}

/**
 * Format date and time for display
 * @param isoString ISO date string
 * @param locale Locale string
 * @returns Formatted datetime string
 */
export function formatDateTime(isoString: string, locale: string = 'en-US'): string {
  const date = new Date(isoString);
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

/**
 * Format time only
 * @param isoString ISO date string
 * @param locale Locale string
 * @returns Formatted time string
 */
export function formatTime(isoString: string, locale: string = 'en-US'): string {
  const date = new Date(isoString);
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

/**
 * Get relative time (e.g., "5 minutes ago")
 * @param isoString ISO date string
 * @param locale Locale string
 * @returns Relative time string
 */
export function formatRelativeTime(isoString: string, locale: string = 'en-US'): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return locale === 'km' ? 'ឥឡូវ​នេះ' : 'just now';
  if (diffMins < 60) return locale === 'km' ? `${diffMins} នាទីមុន` : `${diffMins}m ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return locale === 'km' ? `${diffHours} ម៉ោងមុន` : `${diffHours}h ago`;
  
  const diffDays = Math.floor(diffHours / 24);
  return locale === 'km' ? `${diffDays} ថ្ងៃមុន` : `${diffDays}d ago`;
}

/**
 * Truncate text with ellipsis
 * @param text Text to truncate
 * @param maxLength Maximum length
 * @returns Truncated text
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Generate a short device ID for display
 * @param deviceId Full device UUID
 * @returns Short ID like "ABC123"
 */
export function shortDeviceId(deviceId: string): string {
  return deviceId.slice(0, 6).toUpperCase();
}
