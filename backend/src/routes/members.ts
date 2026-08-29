import { Elysia, t } from 'elysia'
import { PrismaClient } from '@prisma/client'
import { adminGuard } from '../utils/auth.js'

export function membersRoutes(prisma: PrismaClient) {
  return new Elysia({ prefix: '/api/members' })

    // GET all members or search by query
    .get('', async ({ query }) => {
      try {
        const search = query.search || ''
        const members = await prisma.member.findMany({
          where: {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search } },
              { memberCode: { contains: search, mode: 'insensitive' } }
            ]
          },
          orderBy: { createdAt: 'desc' }
        })
        return members
      } catch (error) {
        console.error('Error fetching members:', error)
        return { error: 'Gagal mengambil data member' }
      }
    }, {
      query: t.Object({
        search: t.Optional(t.String())
      })
    })

    // POST create a new member
    .post('', async ({ body, set }) => {
      const trimmedName = body.name.trim()
      const trimmedPhone = body.phone.trim()

      if (!trimmedName || !trimmedPhone) {
        set.status = 400
        return { error: 'Nama dan nomor telepon wajib diisi' }
      }

      try {
        // Generate a unique member code MEM-XXXXXX
        let memberCode = ''
        let isUnique = false
        let attempts = 0
        
        while (!isUnique && attempts < 10) {
          const rand = Math.floor(100000 + Math.random() * 900000)
          memberCode = `MEM-${rand}`
          const existing = await prisma.member.findUnique({
            where: { memberCode }
          })
          if (!existing) {
            isUnique = true
          }
          attempts++
        }

        // Check if phone already registered
        const existingPhone = await prisma.member.findUnique({
          where: { phone: trimmedPhone }
        })

        if (existingPhone) {
          set.status = 400
          return { error: 'Nomor telepon sudah terdaftar sebagai member' }
        }

        const member = await prisma.member.create({
          data: {
            memberCode,
            name: trimmedName,
            phone: trimmedPhone,
            points: 0
          }
        })

        return { success: true, member }
      } catch (error: any) {
        console.error('Error creating member:', error)
        set.status = 400
        return { error: error.message || 'Gagal menambahkan member baru' }
      }
    }, {
      body: t.Object({
        name: t.String({ minLength: 2 }),
        phone: t.String({ pattern: '^\\+?[0-9]{9,15}$' })
      })
    })

    // PUT update member details
    .put('/:id', async ({ params, body, set }) => {
      const id = parseInt(params.id)
      if (isNaN(id)) {
        set.status = 400
        return { error: 'ID member tidak valid' }
      }

      const trimmedName = body.name.trim()
      const trimmedPhone = body.phone.trim()

      if (!trimmedName || !trimmedPhone) {
        set.status = 400
        return { error: 'Nama dan nomor telepon wajib diisi' }
      }

      try {
        // Check if phone belongs to another member
        const existingPhone = await prisma.member.findFirst({
          where: {
            phone: trimmedPhone,
            id: { not: id }
          }
        })

        if (existingPhone) {
          set.status = 400
          return { error: 'Nomor telepon sudah digunakan oleh member lain' }
        }

        const member = await prisma.member.update({
          where: { id },
          data: {
            name: trimmedName,
            phone: trimmedPhone
          }
        })

        return { success: true, member }
      } catch (error: any) {
        console.error('Error updating member:', error)
        set.status = 400
        return { error: error.message || 'Gagal memperbarui data member' }
      }
    }, {
      body: t.Object({
        name: t.String({ minLength: 2 }),
        phone: t.String({ pattern: '^\\+?[0-9]{9,15}$' })
      })
    })

    // DELETE a member (ADMIN only)
    .delete('/:id', async ({ params, set }) => {
      try {
        const id = parseInt(params.id)
        if (isNaN(id)) {
          set.status = 400
          return { error: 'ID member tidak valid' }
        }

        await prisma.member.delete({
          where: { id }
        })

        return { success: true, message: 'Member berhasil dihapus' }
      } catch (error: any) {
        console.error('Error deleting member:', error)
        set.status = 400
        return { error: error.message || 'Gagal menghapus member' }
      }
    }, {
      beforeHandle: adminGuard
    })
}
