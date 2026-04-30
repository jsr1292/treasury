/**
 * JSONPath — simple path extraction covering the 90% case.
 * Supports: $, .field, [n], [*], ..field
 */

export function extractByPath(data: any, path: string): any {
  if (!path || path === '$' || path === '') return data;
  const clean = path.replace(/^\$\.?/, '');
  if (!clean) return data;

  const parts = clean.split(/[.\[\]]/).filter(Boolean);
  let current: any = data;

  for (const part of parts) {
    if (current == null) return null;

    if (part === '*') {
      // Flatten arrays of arrays into a single flat array
      if (Array.isArray(current)) {
        current = current.flatMap(item => Array.isArray(item) ? item : [item]);
      }
    } else if (/^\d+$/.test(part)) {
      // Array index
      const idx = parseInt(part);
      current = Array.isArray(current) ? current[idx] : null;
    } else {
      // Object key
      current = current[part];
    }
  }

  return current ?? null;
}
