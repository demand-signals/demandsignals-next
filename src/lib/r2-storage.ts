// ── Cloudflare R2 Storage Wrapper ─────────────────────────────────────
// Two buckets:
//   • Public  → dsig-assets-public → https://assets.demandsignals.co/*
//   • Private → dsig-docs-private   → signed URLs only (15-min default TTL)
//
// R2 is S3-compatible, so this wraps @aws-sdk/client-s3 with a small,
// purpose-fit API. Used by invoicing (Stage C item 1) and every future
// DSIG feature that stores files (proposals, SOWs, contracts, media).
//
// Required env vars (see CLAUDE.md §19):
//   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
//   R2_PUBLIC_BUCKET, R2_PUBLIC_URL, R2_PRIVATE_BUCKET, R2_ENDPOINT

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

function required(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Missing required env var: ${name}`)
  return v
}

let clientSingleton: S3Client | null = null

function client(): S3Client {
  if (clientSingleton) return clientSingleton
  clientSingleton = new S3Client({
    region: 'auto',
    endpoint: required('R2_ENDPOINT'),
    credentials: {
      accessKeyId: required('R2_ACCESS_KEY_ID'),
      secretAccessKey: required('R2_SECRET_ACCESS_KEY'),
    },
  })
  return clientSingleton
}

// ── Public bucket ─────────────────────────────────────────────────────
// Assets served via https://assets.demandsignals.co/<key>
// Use for: logos, OG images, marketing videos, blog media, public client assets.

/**
 * Upload a buffer to the public bucket.
 * Returns the fully-qualified public URL.
 */
export async function uploadPublic(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<string> {
  const Bucket = required('R2_PUBLIC_BUCKET')
  await client().send(
    new PutObjectCommand({
      Bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  )
  return getPublicUrl(key)
}

/**
 * Synchronously compute the public URL for a key.
 * No network call. Use for rendering <img src=...> etc.
 */
export function getPublicUrl(key: string): string {
  const base = required('R2_PUBLIC_URL').replace(/\/$/, '')
  const normalized = key.replace(/^\//, '')
  return `${base}/${normalized}`
}

// ── Private bucket ────────────────────────────────────────────────────
// Access via short-lived signed URLs. Use for: invoices, SOW PDFs,
// contracts, client uploads, research reports, internal drafts.

/**
 * Upload a buffer to the private bucket.
 * Returns nothing — caller tracks the key separately (typically in DB).
 */
export async function uploadPrivate(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<void> {
  const Bucket = required('R2_PRIVATE_BUCKET')
  await client().send(
    new PutObjectCommand({
      Bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  )
}

/**
 * Generate a signed URL for a private-bucket object.
 * Default TTL is 900 seconds (15 minutes).
 */
export async function getPrivateSignedUrl(
  key: string,
  ttlSeconds: number = 900,
): Promise<string> {
  const Bucket = required('R2_PRIVATE_BUCKET')
  const cmd = new GetObjectCommand({ Bucket, Key: key })
  return await getSignedUrl(client(), cmd, { expiresIn: ttlSeconds })
}

/**
 * Delete an object from the private bucket.
 * Used for compensating-rollback when a DB insert fails after R2 upload.
 */
export async function deletePrivate(key: string): Promise<void> {
  const Bucket = required('R2_PRIVATE_BUCKET')
  await client().send(new DeleteObjectCommand({ Bucket, Key: key }))
}
