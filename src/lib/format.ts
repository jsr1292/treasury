/**
 * Locale-aware formatting utilities.
 * Uses navigator.language (browser) or falls back to EUR/es-ES defaults.
 */

// Detect user locale from browser
export function getUserLocale(): string {
  if (typeof navigator !== 'undefined') {
    return navigator.language || 'es-ES';
  }
  return 'es-ES';
}

// Detect likely currency based on locale
export function getDefaultCurrency(locale?: string): string {
  const loc = locale || getUserLocale();
  const map: Record<string, string> = {
    'es': 'EUR', 'es-ES': 'EUR', 'pt': 'EUR', 'pt-PT': 'EUR',
    'de': 'EUR', 'de-DE': 'EUR', 'fr': 'EUR', 'fr-FR': 'EUR',
    'it': 'EUR', 'it-IT': 'EUR', 'nl': 'EUR', 'nl-NL': 'EUR',
    'en-US': 'USD', 'en-GB': 'GBP',
    'ja': 'JPY', 'zh': 'CNY', 'pl': 'PLN', 'cs': 'CZK',
    'sv': 'SEK', 'da': 'DKK', 'no': 'NOK', 'fi': 'EUR',
  };
  return map[loc] || map[loc.split('-')[0]] || 'EUR';
}

// Format a number with locale-aware separators
export function formatNumber(value: number | string | null, locale?: string): string {
  if (value === null || value === undefined) return '—';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '—';
  return new Intl.NumberFormat(locale || getUserLocale(), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

// Format as currency with symbol
export function formatCurrency(value: number | string | null, currency: string = 'EUR', locale?: string): string {
  if (value === null || value === undefined) return '—';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '—';
  try {
    return new Intl.NumberFormat(locale || getUserLocale(), {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  } catch {
    // Fallback if currency code is invalid
    return `${formatNumber(num, locale)} ${currency}`;
  }
}

// Format a date with locale
export function formatDate(date: string | Date, locale?: string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString(locale || getUserLocale(), {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// Format a date short
export function formatDateShort(date: string | Date, locale?: string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString(locale || getUserLocale(), {
    month: 'short',
    day: 'numeric',
  });
}

// Parse a locale-aware number input
// "1.500.000,50" → 1500000.50 (es-ES)
// "1,500,000.50" → 1500000.50 (en-US)
export function parseLocaleNumber(input: string, locale?: string): number | null {
  if (!input.trim()) return null;
  const loc = locale || getUserLocale();
  
  // Detect separators used in the input
  const hasComma = input.includes(',');
  const hasDot = input.includes('.');
  
  let cleaned: string;
  
  if (hasComma && hasDot) {
    // Both present: last one is the decimal separator
    const lastComma = input.lastIndexOf(',');
    const lastDot = input.lastIndexOf('.');
    
    if (lastComma > lastDot) {
      // Comma is decimal: "1.500.000,50" → remove dots, comma → dot
      cleaned = input.replace(/\./g, '').replace(',', '.');
    } else {
      // Dot is decimal: "1,500,000.50" → remove commas
      cleaned = input.replace(/,/g, '');
    }
  } else if (hasComma) {
    // Only comma: could be decimal (es-ES) or thousands (en-US)
    // Check locale preference
    const decimalSep = (1.1).toLocaleString(loc).charAt(1);
    if (decimalSep === ',') {
      // Comma is decimal separator for this locale
      cleaned = input.replace(/\./g, '').replace(',', '.');
    } else {
      // Comma is thousands separator
      cleaned = input.replace(/,/g, '');
    }
  } else if (hasDot) {
    // Only dot: treat as decimal
    cleaned = input;
  } else {
    cleaned = input;
  }
  
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

// Get decimal separator for locale
export function getDecimalSeparator(locale?: string): string {
  return (1.1).toLocaleString(locale || getUserLocale()).charAt(1);
}

// Get thousands separator for locale
export function getThousandsSeparator(locale?: string): string {
  const formatted = (1000).toLocaleString(locale || getUserLocale());
  return formatted.charAt(1);
}
