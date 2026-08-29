import { Elysia, t } from 'elysia'
import { PrismaClient } from '@prisma/client'
import { adminGuard } from '../utils/auth.js'

export function brandsRoutes(prisma: PrismaClient) {
  return new Elysia({ prefix: '/api/brands' })

    // GET all brands with product count
    .get('', async () => {
      try {
        const brands = await prisma.brand.findMany({
          orderBy: { name: 'asc' },
          include: {
            _count: { select: { products: true } }
          }
        })
        return brands
      } catch (error) {
        console.error('Error fetching brands:', error)
        return { error: 'Gagal mengambil data merek' }
      }
    })

    // POST create brand (ADMIN only)
    .post('', async ({ body, set }) => {
      try {
        const trimmedName = body.name.trim()
        if (!trimmedName) {
          set.status = 400
          return { error: 'Nama merek tidak boleh kosong' }
        }
        const existing = await prisma.brand.findUnique({ where: { name: trimmedName } })
        if (existing) {
          set.status = 400
          return { error: 'Nama merek sudah digunakan' }
        }
        const brand = await prisma.brand.create({ data: { name: trimmedName } })
        return { success: true, brand }
      } catch (error) {
        console.error('Error creating brand:', error)
        set.status = 500
        return { error: 'Gagal menambahkan merek' }
      }
    }, {
      beforeHandle: adminGuard,
      body: t.Object({
        name: t.String({ minLength: 1 })
      })
    })

    // PUT update brand (ADMIN only)
    .put('/:id', async ({ params, body, set }) => {
      const id = parseInt(params.id)
      if (isNaN(id)) {
        set.status = 400
        return { error: 'ID merek tidak valid' }
      }
      try {
        const trimmedName = body.name?.trim()
        if (trimmedName === '') {
          set.status = 400
          return { error: 'Nama merek tidak boleh kosong' }
        }
        if (trimmedName) {
          const existing = await prisma.brand.findFirst({
            where: { name: trimmedName, NOT: { id } }
          })
          if (existing) {
            set.status = 400
            return { error: 'Nama merek sudah digunakan' }
          }
        }
        const brand = await prisma.brand.update({
          where: { id },
          data: { name: trimmedName }
        })
        return { success: true, brand }
      } catch (error: any) {
        if (error.code === 'P2025') {
          set.status = 404
          return { error: 'Merek tidak ditemukan' }
        }
        set.status = 500
        return { error: 'Gagal memperbarui merek' }
      }
    }, {
      beforeHandle: adminGuard,
      params: t.Object({ id: t.String() }),
      body: t.Object({
        name: t.Optional(t.String({ minLength: 1 }))
      })
    })

    // DELETE brand (ADMIN only, reject if has products)
    .delete('/:id', async ({ params, set }) => {
      const id = parseInt(params.id)
      if (isNaN(id)) {
        set.status = 400
        return { error: 'ID merek tidak valid' }
      }
      try {
        const count = await prisma.product.count({ where: { brandId: id } })
        if (count > 0) {
          set.status = 400
          return { error: `Merek tidak dapat dihapus karena masih memiliki ${count} produk terkait` }
        }
        await prisma.brand.delete({ where: { id } })
        return { success: true, message: 'Merek berhasil dihapus' }
      } catch (error: any) {
        if (error.code === 'P2025') {
          set.status = 404
          return { error: 'Merek tidak ditemukan' }
        }
        set.status = 500
        return { error: 'Gagal menghapus merek' }
      }
    }, {
      beforeHandle: adminGuard,
      params: t.Object({ id: t.String() })
    })
}
