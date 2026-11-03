import { Queue } from 'bullmq'

const queue = new Queue('workflow-execution', {
  connection: {
    host: 'localhost',
    port: 6379,
  },
})

const job = {
  organizationId: '650e8400-e29b-41d4-a716-446655440001',
  workflowId: '6a37961d-db87-4bfa-9312-433cc0e644b1',
  phaseId: '1477cf68-d979-41bc-9df8-69f0d6b3ef8e',
  phaseKey: 'implementation',
  runType: 'IMPLEMENTATION',
  metadata: {
    orgId: '650e8400-e29b-41d4-a716-446655440001',
    projectId: '950e8400-e29b-41d4-a716-446655440003',
  },
}

queue
  .add('phase-run', job, {
    jobId: `${job.workflowId}:${job.phaseKey}:${Date.now()}`,
  })
  .then(() => {
    console.log('✅ Job enqueued successfully with metadata')
    process.exit(0)
  })
  .catch((err) => {
    console.error('❌ Error enqueuing job:', err)
    process.exit(1)
  })
