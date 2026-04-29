import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { url, auth, dataPath } = await request.json();

    if (!url) {
      return new Response(JSON.stringify({ error: 'URL is required' }), { status: 400 });
    }

    // Build headers
    const headers: Record<string, string> = { 'Accept': 'application/json' };
    if (auth?.type === 'bearer' && auth.token) {
      headers['Authorization'] = `Bearer ${auth.token}`;
    } else if (auth?.type === 'basic' && auth.username) {
      headers['Authorization'] = `Basic ${Buffer.from(`${auth.username}:${auth.password || ''}`).toString('base64')}`;
    } else if (auth?.type === 'api-key' && auth.apiKey) {
      headers[auth.headerName || 'X-API-Key'] = auth.apiKey;
    } else if (auth?.type === 'header' && auth.headers) {
      Object.assign(headers, auth.headers);
    }

    const res = await fetch(url, { headers, signal: AbortSignal.timeout(15000) });

    if (!res.ok) {
      return new Response(JSON.stringify({ error: `HTTP ${res.status}: ${res.statusText}` }), { status: 200 });
    }

    const json = await res.json();

    // Extract data using dataPath
    let data = json;
    if (dataPath) {
      for (const part of dataPath.split('.')) {
        data = data?.[part];
      }
    }

    // Normalize to array
    const items = Array.isArray(data) ? data : data ? [data] : [];
    if (items.length === 0) {
      // Maybe we're looking at the wrapper object — try common keys
      const wrapperKeys = ['results', 'data', 'items', 'records', 'rows', 'content', 'response', 'payload'];
      for (const wk of wrapperKeys) {
        if (Array.isArray(json[wk]) && json[wk].length > 0) {
          return new Response(JSON.stringify({
            keys: [],
            sample: null,
            detected: {},
            suggestedDataPath: wk,
            itemCount: json[wk].length,
            hint: `Found array at '${wk}' with ${json[wk].length} items. Set data path to '${wk}' and auto-detect again.`,
          }), { headers: { 'Content-Type': 'application/json' } });
        }
      }
      return new Response(JSON.stringify({ error: 'No data found — try setting a data path (e.g. results, data.items)', rawKeys: Object.keys(json), sample: null }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get all keys from the first item (and second for coverage)
    const allKeys = new Set<string>();
    for (const item of items.slice(0, 3)) {
      if (item && typeof item === 'object') {
        for (const key of Object.keys(item)) {
          allKeys.add(key);
        }
      }
    }

    const keys = [...allKeys];
    const sample = items[0];

    // Auto-detect field mappings based on common patterns
    const detected = autoDetectFields(keys, sample);

    // Detect data path if not provided
    const suggestedDataPath = dataPath || detectDataPath(json);

    return new Response(JSON.stringify({
      keys,
      sample,
      detected,
      suggestedDataPath,
      itemCount: items.length,
    }), { headers: { 'Content-Type': 'application/json' } });

  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// ─── Auto-detection logic ──────────────────────────────────────────

const ID_PATTERNS = /^(id|_id|code|codigo|código|clave|key|nº identificación|nif|cif|ruc|cuit)$/i;
const NAME_PATTERNS = /^(name|nombre|descripcion|descripción|title|nombre_completo|razon_social|razón_social|company|filial.*sucursal)$/i;
const PARENT_NAME_PATTERNS = /^(empresa|parent_name|company_name|grupo)$/i;
const TYPE_PATTERNS = /^(type|tipo|category|categoria|categoría|clasificacion|clasificación|tipo de entidad)$/i;
const CURRENCY_PATTERNS = /^(currency|divisa|moneda|curr|currency_code|iso_currency)$/i;
const PARENT_PATTERNS = /^(parent_id|parentid|parent|entity_id|entityid|company_id|empresa_id|grupo)$/i;
const COUNTRY_PATTERNS = /^(country|pais|país|nation|nacionalidad|área geográfica|area geografica)$/i;
const DATE_PATTERNS = /^(date|fecha|created_at|updated_at|timestamp|fecha_creacion|date_created|dt)$/i;
const BALANCE_PATTERNS = /^(balance|saldo|amount|monto|total|valor|value|quantity|cantidad|importe)$/i;
const ACCOUNT_ID_PATTERNS = /^(account_id|accountid|acct_id|cuenta_id|id_cuenta|account)$/i;
const ENTITY_ID_PATTERNS = /^(entity_id|entityid|empresa_id|company_id|cliente_id|holder_id|titular_id)$/i;
const ACCOUNT_NUMBER_PATTERNS = /^(account_number|iban|cc|numero_cuenta|n_cuenta|num_cuenta|ccc)$/i;
const BANK_PATTERNS = /^(bank|banco|bank_name|entidad|entity)$/i;
const ACTIVE_PATTERNS = /^(is_active|active|activo|status|estado|enabled)$/i;
const RATE_PATTERNS = /^(rate|tipo|interes|interés|rate_pct|pct|porcentaje)$/i;
const FROM_CURRENCY_PATTERNS = /^(from|from_currency|origen|source|base)$/i;
const TO_CURRENCY_PATTERNS = /^(to|to_currency|destino|target|quote)$/i;

function findMatch(keys: string[], patterns: RegExp): string | null {
  // Exact match
  const exact = keys.find(k => patterns.test(k));
  if (exact) return exact;
  // Partial match: check if any key contains the pattern word
  return null;
}

function autoDetectFields(keys: string[], sample: any) {
  return {
    id: findMatch(keys, ID_PATTERNS),
    name: findMatch(keys, NAME_PATTERNS),
    type: findMatch(keys, TYPE_PATTERNS),
    currency: findMatch(keys, CURRENCY_PATTERNS),
    parentId: findMatch(keys, PARENT_PATTERNS),
    parentName: findMatch(keys, PARENT_NAME_PATTERNS),
    country: findMatch(keys, COUNTRY_PATTERNS),
    date: findMatch(keys, DATE_PATTERNS),
    balance: findMatch(keys, BALANCE_PATTERNS),
    accountId: findMatch(keys, ACCOUNT_ID_PATTERNS),
    entityId: findMatch(keys, ENTITY_ID_PATTERNS),
    accountNumber: findMatch(keys, ACCOUNT_NUMBER_PATTERNS),
    bankName: findMatch(keys, BANK_PATTERNS),
    isActive: findMatch(keys, ACTIVE_PATTERNS),
    rate: findMatch(keys, RATE_PATTERNS),
    fromCurrency: findMatch(keys, FROM_CURRENCY_PATTERNS),
    toCurrency: findMatch(keys, TO_CURRENCY_PATTERNS),
  };
}

function detectDataPath(json: any): string | null {
  if (Array.isArray(json)) return null; // top-level is the array
  
  // Common wrappers: { data: [...] }, { results: [...] }, { items: [...] }, { records: [...] }
  const wrappers = ['data', 'results', 'items', 'records', 'rows', 'content', 'response', 'payload'];
  
  for (const key of Object.keys(json)) {
    const val = json[key];
    if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'object') {
      if (wrappers.includes(key.toLowerCase())) return key;
      // Any key with an array of objects is likely the data
      return key;
    }
    // Nested: { data: { items: [...] } }
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      for (const subKey of Object.keys(val)) {
        if (Array.isArray(val[subKey]) && val[subKey].length > 0) {
          return `${key}.${subKey}`;
        }
      }
    }
  }
  
  return null;
}
