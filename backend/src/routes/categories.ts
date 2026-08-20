import { Elysia, t } from 'elysia'
import { PrismaClient } from '@prisma/client'

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

    // POST create category (ADMIN only — checked in index)
    .post('', async ({ body, set }) => {
      try {
        const existing = await prisma.category.findUnique({ where: { name: body.name } })
        if (existing) {
          set.status = 400
          return { error: 'Nama kategori sudah digunakan' }
        }
        const category = await prisma.category.create({
          data: { name: body.name, description: body.description ?? null }
        })
        return { success: true, category }
      } catch (error) {
        console.error('Error creating category:', error)
        set.status = 500
        return { error: 'Gagal menambahkan kategori' }
      }
    }, {
      body: t.Object({
        name: t.String({ minLength: 1 }),
        description: t.Optional(t.String())
      })
    })

    // PUT update category
    .put('/:id', async ({ params, body, set }) => {
      const id = parseInt(params.id)
      try {
        // Check name uniqueness (excluding self)
        if (body.name) {
          const existing = await prisma.category.findFirst({
            where: { name: body.name, NOT: { id } }
          })
          if (existing) {
            set.status = 400
            return { error: 'Nama kategori sudah digunakan' }
          }
        }
        const category = await prisma.category.update({
          where: { id },
          data: {
            name: body.name,
            description: body.description ?? undefined
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
      params: t.Object({ id: t.String() }),
      body: t.Object({
        name: t.Optional(t.String({ minLength: 1 })),
        description: t.Optional(t.String())
      })
    })

    // DELETE category (reject if has products)
    .delete('/:id', async ({ params, set }) => {
      const id = parseInt(params.id)
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
      params: t.Object({ id: t.String() })
    })
}
