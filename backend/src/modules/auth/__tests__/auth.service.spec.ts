import { describe, expect, it, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { SignJWT } from 'jose';
import { createApp } from '../../../app';
import { config } from '../../../config';
import { AppError, ERROR_CODES } from '../../../shared';
import { createDemoSession } from '../auth.service';
import { verifyAccessToken } from '../auth-token.service';
import { signAppJwt } from '../tokens/app-jwt.service';

describe('Auth Service & Endpoints', () => {
  const secretKey = new TextEncoder().encode(config.auth.appJwtSecret || 'test-secret-at-least-32-chars-long-12345');

  describe('createDemoSession', () => {
    it('creates a demo session when demo auth is enabled', async () => {
      const original = config.auth.demoEnabled;
      (config.auth as { demoEnabled: boolean }).demoEnabled = true;

      try {
        const session = await createDemoSession();
        expect(session).toBeDefined();
        expect(session.user.id).toBe('demo-reviewer');
        expect(session.user.email).toBe('demo@bfdp.local');
        expect(session.accessToken).toBeTruthy();
        expect(session.expiresAt).toBeTruthy();
      } finally {
        (config.auth as { demoEnabled: boolean }).demoEnabled = original;
      }
    });

    it('throws FORBIDDEN when demo auth is disabled', async () => {
      const original = config.auth.demoEnabled;
      (config.auth as { demoEnabled: boolean }).demoEnabled = false;

      try {
        await expect(createDemoSession()).rejects.toThrow(AppError);
        await expect(createDemoSession()).rejects.toMatchObject({
          code: ERROR_CODES.FORBIDDEN,
        });
      } finally {
        (config.auth as { demoEnabled: boolean }).demoEnabled = original;
      }
    });

    it('throws SERVICE_UNAVAILABLE when APP_JWT_SECRET is empty', async () => {
      const originalEnabled = config.auth.demoEnabled;
      const originalSecret = config.auth.appJwtSecret;
      (config.auth as { demoEnabled: boolean }).demoEnabled = true;
      (config.auth as { appJwtSecret: string }).appJwtSecret = '';

      try {
        await expect(createDemoSession()).rejects.toMatchObject({
          code: ERROR_CODES.SERVICE_UNAVAILABLE,
        });
      } finally {
        (config.auth as { demoEnabled: boolean }).demoEnabled = originalEnabled;
        (config.auth as { appJwtSecret: string }).appJwtSecret = originalSecret;
      }
    });
  });

  describe('verifyAccessToken', () => {
    it('validates a legitimate app JWT issued by signAppJwt', async () => {
      const tokenSession = await signAppJwt({
        userId: 'user_123',
        email: 'analyst@bank.test',
        name: 'Analyst',
        avatarUrl: null,
        provider: 'app',
      });

      const context = await verifyAccessToken(tokenSession.accessToken);
      expect(context.userId).toBe('user_123');
      expect(context.email).toBe('analyst@bank.test');
      expect(context.provider).toBe('app');
    });

    it('rejects an expired app token with TOKEN_EXPIRED', async () => {
      const expiredJwt = await new SignJWT({
        email: 'expired@bank.test',
        provider: 'app',
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setSubject('user_expired')
        .setIssuer('bfdp-api')
        .setAudience('bfdp-app')
        .setIssuedAt(Math.floor(Date.now() / 1000) - 7200)
        .setExpirationTime(Math.floor(Date.now() / 1000) - 3600)
        .sign(secretKey);

      await expect(verifyAccessToken(expiredJwt)).rejects.toMatchObject({
        code: ERROR_CODES.TOKEN_EXPIRED,
      });
    });

    it('rejects a token with invalid signature with TOKEN_INVALID', async () => {
      const fakeSecret = new TextEncoder().encode('wrong-secret-key-that-does-not-match-at-all-32');
      const forgedJwt = await new SignJWT({
        email: 'hacker@test.com',
        provider: 'app',
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setSubject('attacker')
        .setIssuer('bfdp-api')
        .setAudience('bfdp-app')
        .setIssuedAt()
        .setExpirationTime('1h')
        .sign(fakeSecret);

      await expect(verifyAccessToken(forgedJwt)).rejects.toMatchObject({
        code: ERROR_CODES.TOKEN_INVALID,
      });
    });

    it('rejects an unparseable malformed string with TOKEN_INVALID', async () => {
      await expect(verifyAccessToken('not-even-a-jwt')).rejects.toMatchObject({
        code: ERROR_CODES.TOKEN_INVALID,
      });
    });

    it('rejects an untrusted issuer with TOKEN_INVALID', async () => {
      const untrustedIssuerJwt = await new SignJWT({ email: 'test@untrusted.org' })
        .setProtectedHeader({ alg: 'HS256' })
        .setSubject('random-user')
        .setIssuer('unknown-foreign-authority')
        .setIssuedAt()
        .setExpirationTime('1h')
        .sign(secretKey);

      await expect(verifyAccessToken(untrustedIssuerJwt)).rejects.toMatchObject({
        code: ERROR_CODES.TOKEN_INVALID,
      });
    });
  });

  describe('Route Mounting & Unversioned Path Aliasing', () => {
    const app = createApp();

    it('responds to health probe at root /health', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(typeof res.body.status).toBe('string');
      expect(res.body.checks).toBeInstanceOf(Array);
    });

    it('responds to health probe at /api/v1/health', async () => {
      const res = await request(app).get('/api/v1/health');
      expect(res.status).toBe(200);
      expect(typeof res.body.status).toBe('string');
      expect(res.body.checks).toBeInstanceOf(Array);
    });

    it('mounts /batches at root and rejects unauthenticated request with 401 UNAUTHORIZED (not 404)', async () => {
      const res = await request(app).get('/batches');
      expect(res.status).toBe(401);
      expect(res.body.error?.code).toBe(ERROR_CODES.UNAUTHORIZED);
    });

    it('mounts /batches at /api/v1/batches and rejects unauthenticated request with 401 UNAUTHORIZED', async () => {
      const res = await request(app).get('/api/v1/batches');
      expect(res.status).toBe(401);
      expect(res.body.error?.code).toBe(ERROR_CODES.UNAUTHORIZED);
    });

    it('returns 404 NOT_FOUND for nonexistent route', async () => {
      const res = await request(app).get('/definitely-not-a-valid-route');
      expect(res.status).toBe(404);
      expect(res.body.error?.code).toBe(ERROR_CODES.NOT_FOUND);
    });
  });
});
