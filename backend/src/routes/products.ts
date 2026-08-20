import { Elysia, t } from 'elysia'
import { PrismaClient } from '@prisma/client'

export function productsRoutes(prisma: PrismaClient) {
  return new Elysia({ prefix: '/api/products' })

    // GET all products with search, categoryId filter, and sortBy
    .get('', async ({ query }) => {
      try {
        const { search, categoryId, sortBy } = query

        // Build where clause
        const where: any = {}
        if (search) {
          where.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            { sku: { contains: search, mode: 'insensitive' } }
          ]
        }
        if (categoryId) {
          where.categoryId = parseInt(categoryId)
        }

        // Build orderBy
        let orderBy: any = { createdAt: 'asc' }
        if (sortBy === 'price_asc') orderBy = { sellingPrice: 'asc' }
        else if (sortBy === 'price_desc') orderBy = { sellingPrice: 'desc' }
        else if (sortBy === 'stock_asc') orderBy = { stock: 'asc' }
        else if (sortBy === 'stock_desc') orderBy = { stock: 'desc' }
        else if (sortBy === 'name_asc') orderBy = { name: 'asc' }

        const products = await prisma.product.findMany({
          where,
          orderBy,
          include: {
            category: { select: { id: true, name: true } },
            brand: { select: { id: true, name: true } }
          }
        })
        return products
      } catch (error) {
        console.error('Error fetching products:', error)
        return { error: 'Gagal mengambil data produk' }
      }
    }, {
      query: t.Object({
        search: t.Optional(t.String()),
        categoryId: t.Optional(t.String()),
        sortBy: t.Optional(t.String())
      })
    })

    // POST create product
    .post('', async ({ body, set }) => {
      try {
        // Check SKU uniqueness
        const existingSku = await prisma.product.findUnique({ where: { sku: body.sku } })
        if (existingSku) {
          set.status = 400
          return { error: 'SKU sudah digunakan oleh produk lain' }
        }

        const product = await prisma.product.create({
          data: {
            sku: body.sku,
            name: body.name,
            categoryId: body.categoryId,
            brandId: body.brandId ?? null,
            costPrice: body.costPrice,
            sellingPrice: body.sellingPrice,
            stock: body.stock ?? 0,
            expiredDate: body.expiredDate ? new Date(body.expiredDate) : null,
            imageUrl: body.imageUrl ?? null
          },
          include: {
            category: { select: { id: true, name: true } },
            brand: { select: { id: true, name: true } }
          }
        })
        return { success: true, product }
      } catch (error: any) {
        console.error('Error creating product:', error)
        set.status = 500
        return { error: 'Gagal menambahkan produk baru' }
      }
    }, {
      body: t.Object({
        sku: t.String({ minLength: 1 }),
        name: t.String({ minLength: 1 }),
        categoryId: t.Integer({ minimum: 1 }),
        brandId: t.Optional(t.Nullable(t.Integer())),
        costPrice: t.Number({ minimum: 0 }),
        sellingPrice: t.Number({ minimum: 0 }),
        stock: t.Optional(t.Integer({ minimum: 0 })),
        expiredDate: t.Optional(t.Nullable(t.String())),
        imageUrl: t.Optional(t.Nullable(t.String()))
      })
    })

    // PUT update product
    .put('/:id', async ({ params, body, set }) => {
      const id = parseInt(params.id)
      try {
        // Check SKU uniqueness (excluding self)
        if (body.sku) {
          const existing = await prisma.product.findFirst({
            where: { sku: body.sku, NOT: { id } }
          })
          if (existing) {
            set.status = 400
            return { error: 'SKU sudah digunakan oleh produk lain' }
          }
        }

        const product = await prisma.product.update({
          where: { id },
          data: {
            sku: body.sku,
            name: body.name,
            categoryId: body.categoryId,
            brandId: body.brandId ?? undefined,
            costPrice: body.costPrice,
            sellingPrice: body.sellingPrice,
            stock: body.stock,
            expiredDate: body.expiredDate !== undefined
              ? (body.expiredDate ? new Date(body.expiredDate) : null)
              : undefined,
            imageUrl: body.imageUrl !== undefined ? body.imageUrl : undefined
          },
          include: {
            category: { select: { id: true, name: true } },
            brand: { select: { id: true, name: true } }
          }
        })
        return { success: true, product }
      } catch (error: any) {
        if (error.code === 'P2025') {
          set.status = 404
          return { error: 'Produk tidak ditemukan' }
        }
        set.status = 500
        return { error: 'Gagal memperbarui produk' }
      }
    }, {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        sku: t.Optional(t.String({ minLength: 1 })),
        name: t.Optional(t.String({ minLength: 1 })),
        categoryId: t.Optional(t.Integer({ minimum: 1 })),
        brandId: t.Optional(t.Nullable(t.Integer())),
        costPrice: t.Optional(t.Number({ minimum: 0 })),
        sellingPrice: t.Optional(t.Number({ minimum: 0 })),
        stock: t.Optional(t.Integer({ minimum: 0 })),
        expiredDate: t.Optional(t.Nullable(t.String())),
        imageUrl: t.Optional(t.Nullable(t.String()))
      })
    })

    // DELETE product
    .delete('/:id', async ({ params, set }) => {
      const id = parseInt(params.id)
      try {
        await prisma.product.delete({ where: { id } })
        return { success: true, message: 'Produk berhasil dihapus' }
      } catch (error: any) {
        if (error.code === 'P2025') {
          set.status = 404
          return { error: 'Produk tidak ditemukan' }
        }
        set.status = 500
        return { error: 'Gagal menghapus produk' }
      }
    }, {
      params: t.Object({ id: t.String() })
    })

    // PATCH stock only (for POS checkout)
    .patch('/:id/stock', async ({ params, body, set }) => {
      const id = parseInt(params.id)
      try {
        const product = await prisma.product.update({
          where: { id },
          data: { stock: body.stock }
        })
        return { success: true, product }
      } catch (error: any) {
        if (error.code === 'P2025') {
          set.status = 404
          return { error: 'Produk tidak ditemukan' }
        }
        set.status = 500
        return { error: 'Gagal memperbarui stok' }
      }
    }, {
      params: t.Object({ id: t.String() }),
      body: t.Object({ stock: t.Integer({ minimum: 0 }) })
    })
}
