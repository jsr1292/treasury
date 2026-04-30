/**
 * Pagination — supports offset/limit, cursor, and Link header pagination.
 */

export interface PaginationConfig {
  type: 'none' | 'offset' | 'cursor' | 'link_header';
  // For offset
  pageParam?: string;     // default "page"
  sizeParam?: string;     // default "pageSize"
  pageSize?: number;      // default 100
  startPage?: number;     // default 1
  // For cursor
  cursorPath?: string;   // JSONPath to next cursor in response, e.g. "next_cursor"
  // For all
  maxPages?: number;     // safety limit, default 50
  dataPath?: string;     // where the array lives in response
}

export function buildPaginationParams(
  config: PaginationConfig,
  page: number,
  cursor?: string
): Record<string, string> {
  const params: Record<string, string> = {};
  if (config.type === 'offset') {
    const pageParam = config.pageParam ?? 'page';
    const sizeParam = config.sizeParam ?? 'pageSize';
    params[pageParam] = String(page);
    if (config.pageSize) params[sizeParam] = String(config.pageSize);
  } else if (config.type === 'cursor') {
    if (cursor) params['cursor'] = cursor;
  }
  return params;
}

export function extractCursor(json: any, cursorPath: string): string | null {
  const parts = cursorPath.replace(/^\$\.?/, '').split(/[.\[\]]/).filter(Boolean);
  let current: any = json;
  for (const part of parts) {
    if (current == null) return null;
    if (/^\d+$/.test(part)) {
      current = current[parseInt(part)];
    } else {
      current = current[part];
    }
  }
  return current ?? null;
}

export function extractLinkNext(headers: Headers): string | null {
  const linkHeader = headers.get('link') || headers.get('Link');
  if (!linkHeader) return null;
  // Parse: <url>; rel="next"
  const match = linkHeader.match(/<([^>]+)>;\s*rel=["']?next["']?/i);
  return match ? match[1] : null;
}

export function shouldContinue(
  config: PaginationConfig,
  page: number,
  data: any[]
): boolean {
  const pageSize = config.pageSize ?? 100;
  const maxPages = config.maxPages ?? 50;

  if (page >= maxPages) return false;
  if (!data || !Array.isArray(data)) return false;
  if (data.length < pageSize) return false; // last page

  return true;
}
