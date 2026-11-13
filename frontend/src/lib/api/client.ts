import { env } from '../env';

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    requestId: string;
    details?: unknown;
  };
}

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly requestId: string;
  readonly details?: unknown;

  constructor(body: ApiErrorBody | null, status: number) {
    super(body?.error.message ?? 'The request could not be completed.');
    this.name = 'ApiError';
    this.code = body?.error.code ?? 'INTERNAL_ERROR';
    this.status = status;
    this.requestId = body?.error.requestId ?? 'unknown';
    this.details = body?.error.details;
  }
}

let accessToken: string | null = null;

/** The auth provider keeps this in sync with the active session. */
export function setAccessToken(token: string | null): void {
  accessToken = token;
}

function buildUrl(path: string, query?: Record<string, string | number | undefined>): string {
  const url = new URL(`${env.apiBaseUrl}${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

async function parseError(response: Response): Promise<ApiError> {
  const body = (await response.json().catch(() => null)) as ApiErrorBody | null;
  return new ApiError(body, response.status);
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit & { query?: Record<string, string | number | undefined> } = {},
): Promise<T> {
  const { query, ...rest } = init;
  const headers = new Headers(rest.headers);
  if (accessToken) {
    headers.set('authorization', `Bearer ${accessToken}`);
  }
  if (rest.body && !(rest.body instanceof FormData)) {
    headers.set('content-type', 'application/json');
  }

  const response = await fetch(buildUrl(path, query), { ...rest, headers });
  if (!response.ok) {
    throw await parseError(response);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

export interface DownloadedFile {
  blob: Blob;
  fileName: string;
}

/** Authenticated binary download; the SPA cannot rely on a bare anchor href. */
export async function apiDownload(path: string): Promise<DownloadedFile> {
  const headers = new Headers();
  if (accessToken) {
    headers.set('authorization', `Bearer ${accessToken}`);
  }

  const response = await fetch(buildUrl(path), { headers });
  if (!response.ok) {
    throw await parseError(response);
  }

  const disposition = response.headers.get('content-disposition') ?? '';
  const match = /filename="(?<name>[^"]+)"/.exec(disposition);
  const fileName = match?.groups?.name ?? 'report.xlsx';

  return { blob: await response.blob(), fileName };
}
