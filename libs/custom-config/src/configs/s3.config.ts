import { z } from 'zod'

export const S3ConfigSchema = z.object({
  endpoint: z.string().url(),
  region: z.string().min(1),
  bucket: z.string().min(1),
  accessKeyId: z.string().min(1),
  secretAccessKey: z.string().min(1),
  forcePathStyle: z.boolean().default(true),
})

export type S3Config = z.infer<typeof S3ConfigSchema>

/**
 * Load S3 configuration from environment variables
 *
 * Environment variable mapping:
 * - S3_ENDPOINT → endpoint
 * - S3_REGION → region
 * - S3_BUCKET → bucket
 * - S3_ACCESS_KEY_ID → accessKeyId
 * - S3_SECRET_ACCESS_KEY → secretAccessKey
 * - S3_FORCE_PATH_STYLE → forcePathStyle
 */
export function loadS3Config(): S3Config {
  const rawConfig = {
    endpoint: process.env.S3_ENDPOINT || 'http://localhost:4566',
    region: process.env.S3_REGION || 'us-east-1',
    bucket: process.env.S3_BUCKET || 'vyrak-artifacts',
    accessKeyId: process.env.S3_ACCESS_KEY_ID || 'test',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || 'test',
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== 'false',
  }

  return S3ConfigSchema.parse(rawConfig)
}
