import mongoose from 'mongoose';
import { config } from '../../config';
import { logger } from '../../observability/logger';

let connected = false;

export async function connectMongo(): Promise<void> {
  if (connected) {
    return;
  }

  mongoose.set('strictQuery', true);

  mongoose.connection.on('disconnected', () => {
    connected = false;
    logger.warn('mongo.disconnected');
  });

  mongoose.connection.on('reconnected', () => {
    connected = true;
    logger.info('mongo.reconnected');
  });

  mongoose.connection.on('error', (error) => {
    logger.error({ err: error }, 'mongo.connection_error');
  });

  await mongoose.connect(config.mongo.uri, {
    dbName: config.mongo.dbName,
    serverSelectionTimeoutMS: 30_000,
    connectTimeoutMS: 30_000,
    maxPoolSize: 20,
  });

  connected = true;
  logger.info({ db: config.mongo.dbName }, 'mongo.connected');
}

export async function disconnectMongo(): Promise<void> {
  if (!connected) {
    return;
  }
  await mongoose.disconnect();
  connected = false;
}

export function isMongoReady(): boolean {
  return mongoose.connection.readyState === 1;
}

export function mongoState(): string {
  switch (mongoose.connection.readyState) {
    case 0:
      return 'disconnected';
    case 1:
      return 'connected';
    case 2:
      return 'connecting';
    case 3:
      return 'disconnecting';
    default:
      return 'unknown';
  }
}

