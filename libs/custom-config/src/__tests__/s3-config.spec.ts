import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { loadS3Config, S3ConfigSchema } from '../configs/s3.config'

describe('S3Config', () => {
  let originalEnv: NodeJS.ProcessEnv

  beforeEach(() => {
    originalEnv = { ...process.env }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('S3ConfigSchema', () => {
    it('should validate valid S3 config', () => {
      const validConfig = {
        endpoint: 'http://localhost:4566',
        region: 'us-east-1',
        bucket: 'vyrak-artifacts',
        accessKeyId: 'test',
        secretAccessKey: 'test',
        forcePathStyle: true,
      }

      const result = S3ConfigSchema.safeParse(validConfig)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual(validConfig)
      }
    })

    it('should reject invalid endpoint URL', () => {
      const invalidConfig = {
        endpoint: 'not-a-url',
        region: 'us-east-1',
        bucket: 'vyrak-artifacts',
        accessKeyId: 'test',
        secretAccessKey: 'test',
        forcePathStyle: true,
      }

      const result = S3ConfigSchema.safeParse(invalidConfig)
      expect(result.success).toBe(false)
    })

    it('should reject empty region', () => {
      const invalidConfig = {
        endpoint: 'http://localhost:4566',
        region: '',
        bucket: 'vyrak-artifacts',
        accessKeyId: 'test',
        secretAccessKey: 'test',
        forcePathStyle: true,
      }

      const result = S3ConfigSchema.safeParse(invalidConfig)
      expect(result.success).toBe(false)
    })

    it('should reject empty bucket', () => {
      const invalidConfig = {
        endpoint: 'http://localhost:4566',
        region: 'us-east-1',
        bucket: '',
        accessKeyId: 'test',
        secretAccessKey: 'test',
        forcePathStyle: true,
      }

      const result = S3ConfigSchema.safeParse(invalidConfig)
      expect(result.success).toBe(false)
    })

    it('should reject empty accessKeyId', () => {
      const invalidConfig = {
        endpoint: 'http://localhost:4566',
        region: 'us-east-1',
        bucket: 'vyrak-artifacts',
        accessKeyId: '',
        secretAccessKey: 'test',
        forcePathStyle: true,
      }

      const result = S3ConfigSchema.safeParse(invalidConfig)
      expect(result.success).toBe(false)
    })

    it('should reject empty secretAccessKey', () => {
      const invalidConfig = {
        endpoint: 'http://localhost:4566',
        region: 'us-east-1',
        bucket: 'vyrak-artifacts',
        accessKeyId: 'test',
        secretAccessKey: '',
        forcePathStyle: true,
      }

      const result = S3ConfigSchema.safeParse(invalidConfig)
      expect(result.success).toBe(false)
    })

    it('should default forcePathStyle to true', () => {
      const configWithoutForcePathStyle = {
        endpoint: 'http://localhost:4566',
        region: 'us-east-1',
        bucket: 'vyrak-artifacts',
        accessKeyId: 'test',
        secretAccessKey: 'test',
      }

      const result = S3ConfigSchema.safeParse(configWithoutForcePathStyle)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.forcePathStyle).toBe(true)
      }
    })
  })

  describe('loadS3Config', () => {
    it('should load default config when no env vars set', () => {
      delete process.env.S3_ENDPOINT
      delete process.env.S3_REGION
      delete process.env.S3_BUCKET
      delete process.env.S3_ACCESS_KEY_ID
      delete process.env.S3_SECRET_ACCESS_KEY
      delete process.env.S3_FORCE_PATH_STYLE

      const config = loadS3Config()

      expect(config).toEqual({
        endpoint: 'http://localhost:4566',
        region: 'us-east-1',
        bucket: 'vyrak-artifacts',
        accessKeyId: 'test',
        secretAccessKey: 'test',
        forcePathStyle: true,
      })
    })

    it('should override with environment variables', () => {
      process.env.S3_ENDPOINT = 'https://s3.amazonaws.com'
      process.env.S3_REGION = 'ap-southeast-1'
      process.env.S3_BUCKET = 'production-bucket'
      process.env.S3_ACCESS_KEY_ID = 'AKIAIOSFODNN7EXAMPLE'
      process.env.S3_SECRET_ACCESS_KEY = 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'
      process.env.S3_FORCE_PATH_STYLE = 'false'

      const config = loadS3Config()

      expect(config).toEqual({
        endpoint: 'https://s3.amazonaws.com',
        region: 'ap-southeast-1',
        bucket: 'production-bucket',
        accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
        secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
        forcePathStyle: false,
      })
    })

    it('should parse forcePathStyle as boolean', () => {
      process.env.S3_FORCE_PATH_STYLE = 'true'
      let config = loadS3Config()
      expect(config.forcePathStyle).toBe(true)

      process.env.S3_FORCE_PATH_STYLE = 'false'
      config = loadS3Config()
      expect(config.forcePathStyle).toBe(false)

      delete process.env.S3_FORCE_PATH_STYLE
      config = loadS3Config()
      expect(config.forcePathStyle).toBe(true)
    })

    it('should throw on invalid config', () => {
      process.env.S3_ENDPOINT = 'not-a-url'

      expect(() => loadS3Config()).toThrow()
    })
  })
})
