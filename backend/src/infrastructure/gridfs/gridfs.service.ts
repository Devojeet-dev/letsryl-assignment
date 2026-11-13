import { createHash } from 'node:crypto';
import type { Readable } from 'node:stream';
import { GridFSBucket, MongoClient, ObjectId } from 'mongodb';
import { config } from '../../config';
import { logger } from '../../observability/logger';

let client: MongoClient | null = null;
let uploadBucket: GridFSBucket | null = null;
let reportBucket: GridFSBucket | null = null;

async function ensureClient(): Promise<MongoClient> {
  if (!client) {
    client = new MongoClient(config.mongo.uri, { maxPoolSize: 10 });
    await client.connect();
    logger.info('gridfs.client_connected');
  }
  return client;
}

async function getBucket(name: string): Promise<GridFSBucket> {
  const mongo = await ensureClient();
  return new GridFSBucket(mongo.db(config.mongo.dbName), { bucketName: name });
}

export async function getUploadBucket(): Promise<GridFSBucket> {
  if (!uploadBucket) {
    uploadBucket = await getBucket(config.storage.uploadBucket);
  }
  return uploadBucket;
}

export async function getReportBucket(): Promise<GridFSBucket> {
  if (!reportBucket) {
    reportBucket = await getBucket(config.storage.reportBucket);
  }
  return reportBucket;
}

export interface StoredFile {
  id: string;
  sizeBytes: number;
  checksum: string;
}

/** Streams a buffer into GridFS and returns an integrity checksum. */
export async function storeUpload(
  buffer: Buffer,
  fileName: string,
  metadata: Record<string, unknown>
): Promise<StoredFile> {
  const bucket = await getUploadBucket();
  const checksum = createHash('sha256').update(buffer).digest('hex');

  const id = await new Promise<ObjectId>((resolve, reject) => {
    const stream = bucket.openUploadStream(fileName, {
      metadata: { ...metadata, checksum, sizeBytes: buffer.length },
    });
    stream.once('finish', () => resolve(stream.id as ObjectId));
    stream.once('error', reject);
    stream.end(buffer);
  });

  return { id: id.toHexString(), sizeBytes: buffer.length, checksum };
}

export async function readGridFile(
  id: string,
  bucketName: 'uploads' | 'reports'
): Promise<Buffer> {
  const bucket = bucketName === 'uploads' ? await getUploadBucket() : await getReportBucket();
  const chunks: Buffer[] = [];
  const stream = bucket.openDownloadStream(new ObjectId(id));
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk: Buffer) => chunks.push(chunk));
    stream.once('end', () => resolve(Buffer.concat(chunks)));
    stream.once('error', reject);
  });
}

export async function openGridFileStream(
  id: string,
  bucketName: 'uploads' | 'reports'
): Promise<Readable> {
  const bucket = bucketName === 'uploads' ? await getUploadBucket() : await getReportBucket();
  return bucket.openDownloadStream(new ObjectId(id));
}

export async function storeReport(
  buffer: Buffer,
  fileName: string
): Promise<StoredFile> {
  const bucket = await getReportBucket();
  const checksum = createHash('sha256').update(buffer).digest('hex');

  const id = await new Promise<ObjectId>((resolve, reject) => {
    const stream = bucket.openUploadStream(fileName, {
      metadata: { checksum, sizeBytes: buffer.length },
    });
    stream.once('finish', () => resolve(stream.id as ObjectId));
    stream.once('error', reject);
    stream.end(buffer);
  });

  return { id: id.toHexString(), sizeBytes: buffer.length, checksum };
}

/** Removes a superseded artefact; missing files are treated as already gone. */
export async function deleteGridFile(
  id: string,
  bucketName: 'uploads' | 'reports'
): Promise<void> {
  const bucket = bucketName === 'uploads' ? await getUploadBucket() : await getReportBucket();
  await bucket.delete(new ObjectId(id)).catch(() => undefined);
}

export async function closeGridFs(): Promise<void> {
  await client?.close().catch(() => undefined);
  client = null;
  uploadBucket = null;
  reportBucket = null;
}

