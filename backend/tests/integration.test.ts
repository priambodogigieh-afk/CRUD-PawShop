import { describe, expect, it, beforeAll, afterAll } from 'bun:test'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

describe('Integration Tests - Database, Prisma ORM & CRUD Flow', () => {
  let prisma: PrismaClient
  let pool: pg.Pool

  beforeAll(() => {
    pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
    const adapter = new PrismaPg(pool)
    prisma = new PrismaClient({ adapter })
  })

  afterAll(async () => {
    if (prisma) await prisma.$disconnect()
    if (pool) await pool.end()
  })

  describe('PostgreSQL Database & Prisma ORM Connection', () => {
    it('should query categories successfully from database', async () => {
      const categories = await prisma.category.findMany()
      expect(categories).toBeDefined()
      expect(Array.isArray(categories)).toBe(true)
    })
  })

  describe('Members CRUD Database Integration Flow', () => {
    const testMemberPhone = `08999${Math.floor(1000 + Math.random() * 9000)}`
    const testMemberCode = `TEST-${Math.floor(100000 + Math.random() * 900000)}`
    let createdMemberId: number

    it('should create a new member record in the database', async () => {
      const member = await prisma.member.create({
        data: {
          memberCode: testMemberCode,
          name: 'Integration Test User',
          phone: testMemberPhone,
          points: 10
        }
      })

      expect(member).toBeDefined()
      expect(member.id).toBeDefined()
      expect(member.memberCode).toBe(testMemberCode)
      expect(member.phone).toBe(testMemberPhone)
      expect(member.points).toBe(10)

      createdMemberId = member.id
    })

    it('should fetch the created member by ID', async () => {
      const member = await prisma.member.findUnique({
        where: { id: createdMemberId }
      })

      expect(member).toBeDefined()
      expect(member?.name).toBe('Integration Test User')
      expect(member?.phone).toBe(testMemberPhone)
    })

    it('should update the member points and name in database', async () => {
      const updated = await prisma.member.update({
        where: { id: createdMemberId },
        data: {
          name: 'Updated Test User',
          points: 25
        }
      })

      expect(updated).toBeDefined()
      expect(updated.name).toBe('Updated Test User')
      expect(updated.points).toBe(25)
    })

    it('should throw an error when attempting to insert duplicate phone number (Database constraints)', async () => {
      let threwError = false
      try {
        await prisma.member.create({
          data: {
            memberCode: `TEST-DUP-${Math.floor(1000 + Math.random() * 9000)}`,
            name: 'Duplicate Phone User',
            phone: testMemberPhone // duplicate phone
          }
        })
      } catch (err) {
        threwError = true
      }

      expect(threwError).toBe(true)
    })

    it('should delete the created member record from the database', async () => {
      const deleted = await prisma.member.delete({
        where: { id: createdMemberId }
      })

      expect(deleted).toBeDefined()
      expect(deleted.id).toBe(createdMemberId)

      // Verify deletion
      const check = await prisma.member.findUnique({
        where: { id: createdMemberId }
      })
      expect(check).toBeNull()
    })
  })
})
