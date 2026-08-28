import { Elysia, t } from 'elysia'
import { PrismaClient } from '@prisma/client'
import { adminGuard } from '../utils/auth'

export function categoriesRoutes(prisma: PrismaClient) {
  return new Elysia({ prefix: '/api/categories' })

    // GET all categories with product count
    .get('', async () => {
      try {
        const categories = await prisma.category.findMany({
          orderBy: { name: 'asc' },
          include: {
            _count: { select: { products: true } }
          }
        })
        return categories
      } catch (error) {
        console.error('Error fetching categories:', error)
        return { error: 'Gagal mengambil data kategori' }
      }
    })

    // POST create category (ADMIN only)
    .post('', async ({ body, set }) => {
      try {
        const trimmedName = body.name.trim()
        if (!trimmedName) {
          set.status = 400
          return { error: 'Nama kategori tidak boleh kosong' }
        }

        const existing = await prisma.category.findUnique({ where: { name: trimmedName } })
        if (existing) {
          set.status = 400
          return { error: 'Nama kategori sudah digunakan' }
        }
        const category = await prisma.category.create({
          data: { name: trimmedName, description: body.description?.trim() ?? null }
        })
        return { success: true, category }
      } catch (error) {
        console.error('Error creating category:', error)
        set.status = 500
        return { error: 'Gagal menambahkan kategori' }
      }
    }, {
      beforeHandle: adminGuard,
      body: t.Object({
        name: t.String({ minLength: 1 }),
        description: t.Optional(t.String())
      })
    })

    // PUT update category (ADMIN only)
    .put('/:id', async ({ params, body, set }) => {
      const id = parseInt(params.id)
      if (isNaN(id)) {
        set.status = 400
        return { error: 'ID kategori tidak valid' }
      }
      try {
        const trimmedName = body.name?.trim()
        if (trimmedName === '') {
          set.status = 400
          return { error: 'Nama kategori tidak boleh kosong' }
        }

        // Check name uniqueness (excluding self)
        if (trimmedName) {
          const existing = await prisma.category.findFirst({
            where: { name: trimmedName, NOT: { id } }
          })
          if (existing) {
            set.status = 400
            return { error: 'Nama kategori sudah digunakan' }
          }
        }
        const category = await prisma.category.update({
          where: { id },
          data: {
            name: trimmedName,
            description: body.description?.trim() ?? undefined
          }
        })
        return { success: true, category }
      } catch (error: any) {
        if (error.code === 'P2025') {
          set.status = 404
          return { error: 'Kategori tidak ditemukan' }
        }
        set.status = 500
        return { error: 'Gagal memperbarui kategori' }
      }
    }, {
      beforeHandle: adminGuard,
      params: t.Object({ id: t.String() }),
      body: t.Object({
        name: t.Optional(t.String({ minLength: 1 })),
        description: t.Optional(t.String())
      })
    })

    // DELETE category (ADMIN only, reject if has products)
    .delete('/:id', async ({ params, set }) => {
      const id = parseInt(params.id)
      if (isNaN(id)) {
        set.status = 400
        return { error: 'ID kategori tidak valid' }
      }
      try {
        const count = await prisma.product.count({ where: { categoryId: id } })
        if (count > 0) {
          set.status = 400
          return { error: `Kategori tidak dapat dihapus karena masih memiliki ${count} produk terkait` }
        }
        await prisma.category.delete({ where: { id } })
        return { success: true, message: 'Kategori berhasil dihapus' }
      } catch (error: any) {
        if (error.code === 'P2025') {
          set.status = 404
          return { error: 'Kategori tidak ditemukan' }
        }
        set.status = 500
        return { error: 'Gagal menghapus kategori' }
      }
    }, {
      beforeHandle: adminGuard,
      params: t.Object({ id: t.String() })
    })
}
