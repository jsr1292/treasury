/**
 * Transform Engine — configurable field transformation pipeline.
 * Pure functions, no side effects.
 */

export interface TransformStep {
  type: string;
  params?: Record<string, any>;
}

export interface FieldConfig {
  source: string;          // API field name
  target: string;          // Internal field name
  transforms?: TransformStep[];
}

// ─── Helpers ──────────────────────────────────────────────────────

function isEmpty(val: any): boolean {
  return val === null || val === undefined || val === '' || (typeof val === 'string' && val.trim() === '');
}

function applyRegex(value: string, pattern: string, flags: string = 'g'): RegExp | null {
  try {
    return new RegExp(pattern, flags);
  } catch {
    return null;
  }
}

// ─── Transform Implementations ─────────────────────────────────────

const TRANSFORMS: Record<string, (value: any, params: Record<string, any>, row?: any) => any> = {

  // ── Type coercions ──────────────────────────────────────────────

  string: (value) => {
    if (value === null || value === undefined) return null;
    return String(value);
  },

  trim: (value) => {
    if (typeof value !== 'string') return null;
    return value.trim();
  },

  upper: (value) => {
    if (typeof value !== 'string') return null;
    return value.toUpperCase();
  },

  lower: (value) => {
    if (typeof value !== 'string') return null;
    return value.toLowerCase();
  },

  // ── Regex transforms ────────────────────────────────────────────

  regex_replace: (value, params) => {
    if (typeof value !== 'string') return null;
    const { pattern, replacement = '', flags = 'g' } = params;
    if (!pattern) return value;
    const re = applyRegex(value, pattern, flags);
    if (!re) return null;
    return value.replace(re, replacement);
  },

  regex_extract: (value, params) => {
    if (typeof value !== 'string') return null;
    const { pattern, group = 0 } = params;
    if (!pattern) return null;
    const re = applyRegex(value, pattern, '');
    if (!re) return null;
    const match = value.match(re);
    if (!match) return null;
    return match[group] ?? null;
  },

  // ── Number parsing ───────────────────────────────────────────────

  number_format: (value, params) => {
    if (typeof value !== 'string' && typeof value !== 'number') return null;
    const { format = 'US' } = params;
    const str = String(value).trim();
    if (str === '') return null;

    let cleaned: string;
    if (format === 'EU') {
      // EU format: 4.000,69 → 4000.69
      // Remove thousand separators (dots), swap comma decimal to dot
      cleaned = str.replace(/\./g, '').replace(',', '.');
    } else {
      // US format: 4,000.69 → 4000.69
      // Remove commas, keep dot
      cleaned = str.replace(/,/g, '');
    }

    const num = parseFloat(cleaned);
    if (isNaN(num)) return null;
    return num;
  },

  // ── Currency ───────────────────────────────────────────────────

  currency_extract: (value, params) => {
    if (typeof value !== 'string') return null;
    const { pattern = '\\b([A-Z]{3})\\b', default: defaultCurrency } = params;
    const re = applyRegex(value, pattern, '');
    if (!re) return defaultCurrency ?? null;
    const match = value.match(re);
    if (match && match[1]) return match[1];
    return defaultCurrency ?? null;
  },

  // ── Lookup ─────────────────────────────────────────────────────

  lookup: (value, params) => {
    const { table = {}, fallback } = params;
    const key = String(value ?? '');
    if (table.hasOwnProperty(key)) return table[key];
    return fallback ?? null;
  },

  // ── Default / Coalesce ──────────────────────────────────────────

  default: (value, params) => {
    const { fallback } = params;
    if (isEmpty(value)) return fallback;
    return value;
  },

  coalesce: (_value, params, row) => {
    const { fields = [] } = params;
    if (!Array.isArray(fields)) return null;
    if (!row) return null;
    for (const field of fields) {
      const val = row[field];
      if (!isEmpty(val)) return val;
    }
    return null;
  },

  // ── Template ────────────────────────────────────────────────────

  template: (_value, params, row) => {
    const { template = '' } = params;
    if (!row) return template;
    // Replace {fieldName} placeholders with values from the row
    return template.replace(/\{(\w+)\}/g, (_match, fieldName) => {
      const val = row[fieldName];
      return val !== undefined ? String(val) : '';
    });
  },
};

// ─── Main Engine ─────────────────────────────────────────────────

/**
 * Apply a sequence of transform steps to a value.
 * If any step (except `default`) returns null, stops and returns null.
 * The `default` transform can fill in a null value.
 */
export function applyTransforms(value: any, transforms: TransformStep[], row?: any): any {
  if (!transforms || transforms.length === 0) return value;
  if (row === undefined) row = null;

  let result: any = value;

  for (const step of transforms) {
    const fn = TRANSFORMS[step.type];
    if (!fn) {
      // Unknown transform type — skip silently
      continue;
    }
    const params = step.params ?? {};
    result = fn(result, params, row);

    // If result is null and it's not the `default` transform, stop processing
    if (result === null && step.type !== 'default') {
      return null;
    }
  }

  return result;
}

/**
 * Get the list of available transform types.
 */
export function getTransformTypes(): string[] {
  return Object.keys(TRANSFORMS);
}

/**
 * Describe a transform type for UI display.
 */
export const TRANSFORM_DESCRIPTIONS: Record<string, { label: string; icon: string; description: string; paramFields: { key: string; label: string; type: string; placeholder?: string; hint?: string }[] }> = {
  string: {
    label: 'String',
    icon: '🔤',
    description: 'Ensure the value is a string',
    paramFields: [],
  },
  trim: {
    label: 'Trim',
    icon: '✂️',
    description: 'Strip leading and trailing whitespace',
    paramFields: [],
  },
  upper: {
    label: 'UPPER',
    icon: '🔠',
    description: 'Convert to uppercase',
    paramFields: [],
  },
  lower: {
    label: 'lower',
    icon: '🔡',
    description: 'Convert to lowercase',
    paramFields: [],
  },
  regex_replace: {
    label: 'Regex Replace',
    icon: '🔄',
    description: 'Replace matching pattern with replacement text',
    paramFields: [
      { key: 'pattern', label: 'Pattern', type: 'text', placeholder: '[^0-9.,-]', hint: 'Regex pattern (no delimiters)' },
      { key: 'replacement', label: 'Replacement', type: 'text', placeholder: '', hint: 'Text to replace matches with' },
      { key: 'flags', label: 'Flags', type: 'text', placeholder: 'g', hint: 'e.g. g, i, m' },
    ],
  },
  regex_extract: {
    label: 'Regex Extract',
    icon: '🎯',
    description: 'Extract the first matching group from the value',
    paramFields: [
      { key: 'pattern', label: 'Pattern', type: 'text', placeholder: '\\d+(\\.\\d+)?', hint: 'Include a capture group () to extract' },
      { key: 'group', label: 'Group', type: 'number', placeholder: '0', hint: '0 = full match, 1 = first group' },
    ],
  },
  number_format: {
    label: 'Number Parse',
    icon: '🔢',
    description: 'Parse a formatted number string into a float',
    paramFields: [
      { key: 'format', label: 'Format', type: 'select', hint: 'Number format convention' },
    ],
  },
  currency_extract: {
    label: 'Currency Code',
    icon: '💱',
    description: 'Extract a 3-letter ISO currency code',
    paramFields: [
      { key: 'pattern', label: 'Pattern', type: 'text', placeholder: '\\b([A-Z]{3})\\b', hint: 'Regex to find currency code' },
      { key: 'default', label: 'Default', type: 'text', placeholder: 'EUR', hint: 'Fallback if not found' },
    ],
  },
  lookup: {
    label: 'Lookup Table',
    icon: '📖',
    description: 'Map values through a lookup table',
    paramFields: [
      { key: 'table', label: 'Table (JSON)', type: 'textarea', placeholder: '{"old":"new","A":"B"}', hint: 'JSON object mapping input to output' },
      { key: 'fallback', label: 'Fallback', type: 'text', placeholder: '', hint: 'Value when key not found' },
    ],
  },
  default: {
    label: 'Default',
    icon: '⬇️',
    description: 'Provide a fallback value for empty/null values',
    paramFields: [
      { key: 'fallback', label: 'Fallback', type: 'text', placeholder: '0', hint: 'Value to use when empty' },
    ],
  },
  coalesce: {
    label: 'Coalesce',
    icon: '🔀',
    description: 'Use first non-empty value from a list of source fields',
    paramFields: [
      { key: 'fields', label: 'Fields', type: 'text', placeholder: 'fieldA, fieldB', hint: 'Comma-separated list of field names' },
    ],
  },
  template: {
    label: 'Template',
    icon: '📝',
    description: 'String interpolation with {field} placeholders',
    paramFields: [
      { key: 'template', label: 'Template', type: 'textarea', placeholder: '{name} - {currency}', hint: 'Use {fieldName} to insert field values' },
    ],
  },
};

/**
 * Get default params for a transform type.
 */
export function getDefaultParams(type: string): Record<string, any> {
  const desc = TRANSFORM_DESCRIPTIONS[type];
  if (!desc) return {};
  const defaults: Record<string, any> = {};
  for (const pf of desc.paramFields) {
    if (pf.type === 'number') defaults[pf.key] = 0;
    else if (pf.type === 'select') defaults[pf.key] = 'US';
    else defaults[pf.key] = '';
  }
  return defaults;
}

/**
 * Parse the coalesce fields string into an array.
 */
export function parseCoalesceFields(fieldsStr: string): string[] {
  return fieldsStr.split(',').map(s => s.trim()).filter(Boolean);
}

/**
 * Parse a lookup table JSON string.
 */
export function parseLookupTable(jsonStr: string): Record<string, string> {
  try {
    return JSON.parse(jsonStr || '{}');
  } catch {
    return {};
  }
}

/**
 * Preview a transform chain on a sample value.
 * Returns array of intermediate results + final result.
 */
export function previewTransforms(value: any, transforms: TransformStep[], row?: any): { steps: { type: string; input: any; output: any }[]; final: any } {
  const steps: { type: string; input: any; output: any }[] = [];
  let current: any = value;

  for (const step of transforms) {
    const fn = TRANSFORMS[step.type];
    if (!fn) continue;
    const params = step.params ?? {};
    const output = fn(current, params, row);
    steps.push({ type: step.type, input: current, output });
    current = output;
    if (current === null) break;
  }

  return { steps, final: current };
}
