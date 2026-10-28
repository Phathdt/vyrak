import { ApiProperty } from '@nestjs/swagger'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

/**
 * Request DTO for generating pre-signed upload URL
 */
export const GenerateUploadUrlSchema = z.object({
  filePath: z.string().min(1).describe('File path relative to run directory'),
  contentType: z.string().optional().describe('MIME type (default: text/plain)'),
})

export class GenerateUploadUrlDto extends createZodDto(GenerateUploadUrlSchema) {
  @ApiProperty({ description: 'File path relative to run directory', example: 'plan.md' })
  filePath!: string

  @ApiProperty({
    description: 'MIME type (default: text/plain)',
    example: 'text/plain',
    required: false,
  })
  contentType?: string
}

/**
 * Response DTO for pre-signed upload URL
 */
export const PresignedUploadUrlResponseSchema = z.object({
  uploadUrl: z.string().describe('Pre-signed URL for direct S3 upload'),
  s3Key: z.string().describe('S3 object key'),
  bucket: z.string().describe('S3 bucket name'),
  expiresIn: z.number().describe('URL expiration in seconds'),
})

export class PresignedUploadUrlResponseDto extends createZodDto(PresignedUploadUrlResponseSchema) {
  @ApiProperty({
    description: 'Pre-signed URL for direct S3 upload',
    example: 'https://s3.amazonaws.com/vyrak-artifacts/org-123/run-456/plan.md?...',
  })
  uploadUrl!: string

  @ApiProperty({ description: 'S3 object key', example: 'org-123/run-456/plan.md' })
  s3Key!: string

  @ApiProperty({ description: 'S3 bucket name', example: 'vyrak-artifacts' })
  bucket!: string

  @ApiProperty({ description: 'URL expiration in seconds', example: 3600 })
  expiresIn!: number
}

/**
 * Request DTO for confirming artifact upload
 */
export const ConfirmUploadSchema = z.object({
  s3Key: z.string().min(1).describe('S3 object key'),
  s3Bucket: z.string().min(1).describe('S3 bucket name'),
  contentSize: z.number().positive().describe('Content size in bytes'),
  contentType: z.string().min(1).describe('MIME type'),
  filePath: z.string().min(1).describe('File path relative to run directory'),
})

export class ConfirmUploadDto extends createZodDto(ConfirmUploadSchema) {
  @ApiProperty({ description: 'S3 object key', example: 'org-123/run-456/plan.md' })
  s3Key!: string

  @ApiProperty({ description: 'S3 bucket name', example: 'vyrak-artifacts' })
  s3Bucket!: string

  @ApiProperty({ description: 'Content size in bytes', example: 1024 })
  contentSize!: number

  @ApiProperty({ description: 'MIME type', example: 'text/plain' })
  contentType!: string

  @ApiProperty({ description: 'File path relative to run directory', example: 'plan.md' })
  filePath!: string
}

/**
 * Response DTO for confirming artifact upload
 */
export const ConfirmUploadResponseSchema = z.object({
  artifactId: z.string().uuid().describe('Created artifact ID'),
})

export class ConfirmUploadResponseDto extends createZodDto(ConfirmUploadResponseSchema) {
  @ApiProperty({
    description: 'Created artifact ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  artifactId!: string
}
