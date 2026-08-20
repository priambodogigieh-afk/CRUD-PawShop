import { Elysia, t } from 'elysia'
import { PrismaClient } from '@prisma/client'

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

    // POST create brand
    .post('', async ({ body, set }) => {
      try {
        const existing = await prisma.brand.findUnique({ where: { name: body.name } })
        if (existing) {
          set.status = 400
          return { error: 'Nama merek sudah digunakan' }
        }
        const brand = await prisma.brand.create({ data: { name: body.name } })
        return { success: true, brand }
      } catch (error) {
        console.error('Error creating brand:', error)
        set.status = 500
        return { error: 'Gagal menambahkan merek' }
      }
    }, {
      body: t.Object({
        name: t.String({ minLength: 1 })
      })
    })

    // PUT update brand
    .put('/:id', async ({ params, body, set }) => {
      const id = parseInt(params.id)
      try {
        if (body.name) {
          const existing = await prisma.brand.findFirst({
            where: { name: body.name, NOT: { id } }
          })
          if (existing) {
            set.status = 400
            return { error: 'Nama merek sudah digunakan' }
          }
        }
        const brand = await prisma.brand.update({
          where: { id },
          data: { name: body.name }
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
      params: t.Object({ id: t.String() }),
      body: t.Object({
        name: t.Optional(t.String({ minLength: 1 }))
      })
    })

    // DELETE brand (reject if has products)
    .delete('/:id', async ({ params, set }) => {
      const id = parseInt(params.id)
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
      params: t.Object({ id: t.String() })
    })
}
