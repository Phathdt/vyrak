import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@vyrak/database'

import * as argon2 from 'argon2'
import { Pool } from 'pg'

// Create PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE__URL || 'postgresql://postgres:postgres@localhost:5432/vyrak',
})

// Create driver adapter for Prisma 7
const adapter = new PrismaPg(pool)

// Initialize Prisma client with adapter
const prisma = new PrismaClient({ adapter })

async function seedTestData() {
  console.log('Seeding test data...')

  const testEmail = process.env.TEST_USER_EMAIL || 'test@example.com'
  const testPassword = process.env.TEST_USER_PASSWORD || 'Test123456!'

  try {
    // Hash password với argon2
    const hashedPassword = await argon2.hash(testPassword)

    // Tạo hoặc update test user
    const user = await prisma.user.upsert({
      where: { email: testEmail },
      update: {},
      create: {
        email: testEmail,
        passwordHash: hashedPassword,
        name: 'Test User',
        emailVerified: true,
      },
    })

    console.log('✓ Test data seeded successfully')
    console.log(`✓ Test user: ${testEmail}`)
    console.log(`✓ User ID: ${user.id}`)
  } catch (error) {
    console.error('Error seeding test data:', error)
    throw error
  }
}

seedTestData()
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
