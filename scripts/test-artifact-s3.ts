#!/usr/bin/env tsx

/**
 * Integration test script for S3 artifact storage
 * Tests: Store artifact → Fetch metadata → Fetch content
 */

import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3'
import { DatabaseService } from '@vyrak/database'
import { ArtifactS3Repository } from '../libs/agent-runtime/src/infras/repositories/artifact-s3.repository'
import { CustomConfigService } from '../libs/custom-config/src/custom-config.service'

async function main() {
  console.log('🧪 Testing S3 Artifact Storage Integration\n')

  // Initialize services
  const config = new CustomConfigService()
  const databaseService = new DatabaseService(config)
  await databaseService.onModuleInit()

  const s3Client = new S3Client({
    endpoint: config.get('s3.endpoint'),
    region: config.get('s3.region'),
    credentials: {
      accessKeyId: config.get('s3.accessKeyId'),
      secretAccessKey: config.get('s3.secretAccessKey'),
    },
    forcePathStyle: config.get('s3.forcePathStyle'),
  })

  console.log('S3 Config:')
  console.log(`  endpoint: ${config.get('s3.endpoint')}`)
  console.log(`  region: ${config.get('s3.region')}`)
  console.log(`  bucket: ${config.get('s3.bucket')} (type: ${typeof config.get('s3.bucket')})`)
  console.log(`  forcePathStyle: ${config.get('s3.forcePathStyle')}`)
  console.log()

  const repository = new ArtifactS3Repository(databaseService, s3Client, config.get('s3.bucket'))

  try {
    // Step 0: Use existing test workflow run
    console.log('🔧 Step 0: Using existing workflow run...')
    const orgId = 'org-0000-0000-0000-00000000001'
    const runId = 'run-0000-0000-0000-00000000003'

    // Set tenant context for database operations
    databaseService.setTenantContext(orgId)

    console.log('✅ Using test workflow run')
    console.log(`   Organization ID: ${orgId}`)
    console.log(`   Run ID: ${runId}`)
    console.log()

    // Step 1: Create test artifact
    console.log('📝 Step 1: Creating test artifact...')
    const testContent = `# Test Artifact
This is a test artifact created at ${new Date().toISOString()}

## Features
- S3 storage integration
- On-demand content fetching
- Metadata tracking`

    const artifact = await repository.create({
      organizationId: orgId,
      runId: runId,
      filePath: 'TEST_ARTIFACT.md',
      content: testContent,
    })

    console.log('✅ Artifact created:')
    console.log(`   ID: ${artifact.id}`)
    console.log(`   S3 Key: ${artifact.s3Key}`)
    console.log(`   Size: ${artifact.contentSize} bytes`)
    console.log(`   Type: ${artifact.contentType}`)
    console.log()

    // Step 2: Verify S3 storage
    console.log('🪣 Step 2: Verifying S3 storage...')
    const listCommand = new ListObjectsV2Command({
      Bucket: config.get('s3.bucket'),
      Prefix: artifact.s3Key,
    })
    const s3Objects = await s3Client.send(listCommand)

    if (s3Objects.Contents && s3Objects.Contents.length > 0) {
      console.log('✅ Object found in S3:')
      console.log(`   Key: ${s3Objects.Contents[0].Key}`)
      console.log(`   Size: ${s3Objects.Contents[0].Size} bytes`)
      console.log(`   Last Modified: ${s3Objects.Contents[0].LastModified}`)
    } else {
      console.error('❌ Object not found in S3!')
      process.exit(1)
    }
    console.log()

    // Step 3: Fetch artifact by ID (without content)
    console.log('📋 Step 3: Fetching artifact metadata...')
    const fetchedArtifact = await repository.findById(artifact.id, { includeContent: false })

    if (!fetchedArtifact) {
      console.error('❌ Artifact not found in database!')
      process.exit(1)
    }

    console.log('✅ Metadata fetched:')
    console.log(`   ID: ${fetchedArtifact.id}`)
    console.log(`   File Path: ${fetchedArtifact.filePath}`)
    console.log(`   Content Size: ${fetchedArtifact.contentSize} bytes`)
    console.log(`   Content Type: ${fetchedArtifact.contentType}`)
    console.log(`   Content: ${fetchedArtifact.content ? 'INCLUDED' : 'NOT INCLUDED'}`)
    console.log()

    // Step 4: Fetch artifact with content
    console.log('📄 Step 4: Fetching artifact with content...')
    const artifactWithContent = await repository.findById(artifact.id, { includeContent: true })

    if (!artifactWithContent) {
      console.error('❌ Artifact not found!')
      process.exit(1)
    }

    console.log('✅ Content fetched:')
    console.log(`   Content length: ${artifactWithContent.content.length} characters`)
    console.log(`   Content preview: ${artifactWithContent.content.substring(0, 50)}...`)
    console.log()

    // Step 5: Verify content integrity
    console.log('🔍 Step 5: Verifying content integrity...')
    if (artifactWithContent.content === testContent) {
      console.log('✅ Content matches original!')
    } else {
      console.error('❌ Content mismatch!')
      console.error(`   Expected: ${testContent.substring(0, 50)}...`)
      console.error(`   Got: ${artifactWithContent.content.substring(0, 50)}...`)
      process.exit(1)
    }
    console.log()

    // Step 6: List artifacts by run
    console.log('📚 Step 6: Listing artifacts by run...')
    const runArtifacts = await repository.findByRunId(artifact.runId)
    console.log(`✅ Found ${runArtifacts.length} artifact(s) for run ${artifact.runId}`)
    console.log()

    console.log('🎉 All tests passed!')
    console.log()
    console.log('Summary:')
    console.log('✅ Artifact stored in S3')
    console.log('✅ Metadata persisted in PostgreSQL')
    console.log('✅ Content fetched on-demand')
    console.log('✅ Content integrity verified')
  } catch (error) {
    console.error('❌ Test failed:', error)
    process.exit(1)
  } finally {
    await databaseService.onModuleDestroy()
  }
}

main()
