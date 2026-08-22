import { describe, expect, it, beforeAll, afterAll } from 'bun:test'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

describe('Pengujian Integrasi - Database, Prisma ORM & Alur CRUD', () => {
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

  describe('Koneksi Database PostgreSQL & Prisma ORM', () => {
    it('harus berhasil mengambil data kategori dari database', async () => {
      const categories = await prisma.category.findMany()
      expect(categories).toBeDefined()
      expect(Array.isArray(categories)).toBe(true)
    })
  })

  describe('Alur Integrasi Database CRUD Member', () => {
    const testMemberPhone = `08999${Math.floor(1000 + Math.random() * 9000)}`
    const testMemberCode = `TEST-${Math.floor(100000 + Math.random() * 900000)}`
    let createdMemberId: number

    it('harus berhasil membuat data member baru di database', async () => {
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

    it('harus berhasil mengambil data member berdasarkan ID', async () => {
      const member = await prisma.member.findUnique({
        where: { id: createdMemberId }
      })

      expect(member).toBeDefined()
      expect(member?.name).toBe('Integration Test User')
      expect(member?.phone).toBe(testMemberPhone)
    })

    it('harus berhasil memperbarui poin dan nama member di database', async () => {
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

    it('harus melempar error saat mencoba memasukkan nomor telepon duplikat (Batasan Database)', async () => {
      let threwError = false
      try {
        await prisma.member.create({
          data: {
            memberCode: `TEST-DUP-${Math.floor(1000 + Math.random() * 9000)}`,
            name: 'Duplicate Phone User',
            phone: testMemberPhone // nomor telepon duplikat
          }
        })
      } catch (err) {
        threwError = true
      }

      expect(threwError).toBe(true)
    })

    it('harus berhasil menghapus data member dari database', async () => {
      const deleted = await prisma.member.delete({
        where: { id: createdMemberId }
      })

      expect(deleted).toBeDefined()
      expect(deleted.id).toBe(createdMemberId)

      // Verifikasi penghapusan
      const check = await prisma.member.findUnique({
        where: { id: createdMemberId }
      })
      expect(check).toBeNull()
    })
  })
})
