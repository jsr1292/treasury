/**
 * JSONPath — simple path extraction covering the 90% case.
 * Supports: $, .field, [n], [*], ..field
 */

export function extractByPath(data: any, path: string): any {
  if (!path || path === '$' || path === '') return data;
  const clean = path.replace(/^\$\.?/, '');
  if (!clean) return data;

  // Tokenize: split by . and [] while keeping brackets as tokens
  const tokens = tokenize(clean);
  let current: any = data;

  for (let i = 0; i < tokens.length; i++) {
    if (current == null) return null;
    const token = tokens[i];

    if (token === '*') {
      // If next token is a field name, extract that field from each element
      if (Array.isArray(current) && i + 1 < tokens.length && tokens[i + 1] !== '*') {
        const field = tokens[i + 1];
        current = current.map((item: any) => item?.[field]).filter(Boolean);
        i++; // skip the field token
      } else if (Array.isArray(current)) {
        current = current.flat();
      }
    } else if (/^\d+$/.test(token)) {
      const idx = parseInt(token);
      current = Array.isArray(current) ? current[idx] : null;
    } else if (token === '..') {
      // Recursive descent — find field in nested objects
      const nextToken = tokens[i + 1];
      if (nextToken) {
        current = findRecursive(current, nextToken);
        i++;
      }
    } else {
      current = current[token];
    }
  }

  return current ?? null;
}

function tokenize(path: string): string[] {
  const tokens: string[] = [];
  let current = '';
  for (let i = 0; i < path.length; i++) {
    const ch = path[i];
    if (ch === '.' || ch === '[' || ch === ']') {
      if (current) tokens.push(current);
      current = '';
      if (ch === '.' && path[i + 1] === '.') {
        tokens.push('..');
        i++;
      }
    } else {
      current += ch;
    }
  }
  if (current) tokens.push(current);
  return tokens;
}

function findRecursive(data: any, field: string): any {
  if (data == null) return null;
  if (data[field] !== undefined) return data[field];
  if (Array.isArray(data)) {
    for (const item of data) {
      const result = findRecursive(item, field);
      if (result !== undefined) return result;
    }
  } else if (typeof data === 'object') {
    for (const val of Object.values(data)) {
      const result = findRecursive(val, field);
      if (result !== undefined) return result;
    }
  }
  return null;
}
