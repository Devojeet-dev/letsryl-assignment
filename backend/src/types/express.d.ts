import type { AuthContext } from '../modules/auth/auth.types';

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      auth?: AuthContext;
      validated?: {
        body?: unknown;
        params?: unknown;
        query?: unknown;
      };
    }
  }
}

export {};
