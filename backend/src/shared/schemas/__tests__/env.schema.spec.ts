import { describe, expect, it } from 'vitest';
import { envSchema } from '../env.schema';

describe('envSchema REDIS_URL sanitization', () => {
  const baseEnv = {
    MONGODB_URI: 'mongodb://localhost:27017/bfdp',
  };

  it('preserves clean rediss:// URLs', () => {
    const parsed = envSchema.parse({
      ...baseEnv,
      REDIS_URL: 'rediss://default:secret@endpoint.upstash.io:6379',
    });
    expect(parsed.REDIS_URL).toBe('rediss://default:secret@endpoint.upstash.io:6379');
  });

  it('preserves clean redis:// URLs', () => {
    const parsed = envSchema.parse({
      ...baseEnv,
      REDIS_URL: 'redis://default:secret@localhost:6379',
    });
    expect(parsed.REDIS_URL).toBe('redis://default:secret@localhost:6379');
  });

  it('strips redis-cli command prefixes and upgrades to rediss:// when --tls is present', () => {
    const parsed = envSchema.parse({
      ...baseEnv,
      REDIS_URL: 'redis-cli --tls -u redis://default:secret@adjusted-weevil-201126.upstash.io:6379',
    });
    expect(parsed.REDIS_URL).toBe('rediss://default:secret@adjusted-weevil-201126.upstash.io:6379');
  });

  it('handles redis://redis-cli --tls prefix correctly', () => {
    const parsed = envSchema.parse({
      ...baseEnv,
      REDIS_URL: 'redis://redis-cli --tls -u redis://default:secret@adjusted-weevil-201126.upstash.io:6379',
    });
    expect(parsed.REDIS_URL).toBe('rediss://default:secret@adjusted-weevil-201126.upstash.io:6379');
  });

  it('strips enclosing quotes and extra whitespace', () => {
    const parsed = envSchema.parse({
      ...baseEnv,
      REDIS_URL: '  "rediss://default:secret@endpoint.upstash.io:6379"  ',
    });
    expect(parsed.REDIS_URL).toBe('rediss://default:secret@endpoint.upstash.io:6379');
  });
});

