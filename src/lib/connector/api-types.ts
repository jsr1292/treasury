/**
 * Join configuration for multi-endpoint linking.
 */
export interface JoinConfig {
  fromField: string;       // Field in accounts/balances (e.g. "entityName")
  toField: string;         // Field in entities to match against (e.g. "name")
  method: 'exact' | 'contains' | 'fuzzy';
  fuzzyThreshold?: number; // 0-1, default 0.85
}

/**
 * API Connector — connect Treasury to external JSON APIs instead of direct DB access.
 * 
 * Define endpoints that return JSON arrays/objects, map their fields to our schema.
 */

export interface ApiAuth {
  type: 'bearer' | 'basic' | 'api-key' | 'none';
  /** Bearer token */
  token?: string;
  /** Basic auth */
  username?: string;
  password?: string;
  /** API key header name (e.g. "X-API-Key") */
  headerName?: string;
  apiKey?: string;
  /** Custom headers */
  headers?: Record<string, string>;
}

export interface FieldMap {
  /** Their JSON field name → Our internal field name */
  [theirField: string]: string;
}

export interface ApiEndpoint {
  /** URL to fetch. Supports {param} placeholders. */
  url: string;
  /** HTTP method */
  method?: 'GET' | 'POST';
  /** Request body for POST (JSON template with {param} placeholders) */
  body?: Record<string, any>;
  /** Field mapping: ourField → theirField */
  fields: FieldMap;
  /** JSON path to the data array. E.g. "data.items" if response is { data: { items: [...] } } */
  dataPath?: string;
  /** Pagination: field name for total pages or next URL */
  pagination?: {
    type: 'none' | 'offset' | 'cursor';
    /** For offset: query params for page/limit */
    pageParam?: string;
    limitParam?: string;
    limit?: number;
    /** For cursor: JSON field containing next cursor */
    cursorField?: string;
    /** Total items field (to know when to stop) */
    totalField?: string;
  };
  /** Cache TTL in seconds (default: 1800 = 30min) */
  cacheTtl?: number;
  /** Request timeout in ms */
  timeout?: number;
}

export interface ApiConnectorConfig {
  type: 'api';
  name?: string;
  version?: number;
  auth: ApiAuth;
  /** Global cache TTL in seconds */
  cacheTtl?: number;
  /** Global request timeout in ms */
  timeout?: number;
  /** Refresh interval in seconds (for auto-polling) */
  refreshInterval?: number;

  entities: ApiEndpoint;
  accounts: ApiEndpoint;
  balances: ApiEndpoint;
  /** Optional: historical balances for trend charts */
  balanceHistory?: ApiEndpoint & { accountIdParam?: string };
  /** Optional: FX rates */
  fxRates?: ApiEndpoint;

  /** Optional: join rules for linking accounts/balances to entities */
  joins?: JoinConfig[];

  /** Optional: additional custom endpoints */
  custom?: Record<string, ApiEndpoint>;
}
