import { Client } from "minio";
import { env } from "./dotenv.ts";

export const minioClient = new Client({
  endPoint: env.MINIO_ENDPOINT,
  port: env.MINIO_PORT,
  useSSL: env.MINIO_USE_SSL,
  accessKey: env.MINIO_ROOT_USER,
  secretKey: env.MINIO_ROOT_PASSWORD,
});

export const MINIO_BUCKET = env.MINIO_BUCKET;

export async function ensureBucket() {
  const exists = await minioClient.bucketExists(MINIO_BUCKET).catch(() => false);

  if (!exists) {
    await minioClient.makeBucket(MINIO_BUCKET);
  }
}
