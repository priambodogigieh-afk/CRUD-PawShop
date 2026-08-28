import { Elysia, t } from 'elysia'
import { PrismaClient } from '@prisma/client'
import { adminGuard } from '../utils/auth'

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

    // POST create product (ADMIN only)
    .post('', async ({ body, set }) => {
      try {
        const sku = body.sku.trim().toUpperCase()
        if (!/^[A-Z0-9-]+$/.test(sku)) {
          set.status = 400
          return { error: 'SKU hanya boleh berisi huruf besar, angka, dan tanda hubung (-)' }
        }

        const name = body.name.trim()
        if (!name) {
          set.status = 400
          return { error: 'Nama produk tidak boleh kosong' }
        }

        if (body.costPrice !== undefined && body.sellingPrice !== undefined && body.sellingPrice < body.costPrice) {
          set.status = 400
          return { error: 'Harga jual tidak boleh lebih kecil dari harga modal' }
        }

        // Check SKU uniqueness
        const existingSku = await prisma.product.findUnique({ where: { sku } })
        if (existingSku) {
          set.status = 400
          return { error: 'SKU sudah digunakan oleh produk lain' }
        }

        const product = await prisma.product.create({
          data: {
            sku,
            name,
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
      beforeHandle: adminGuard,
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

    // PUT update product (ADMIN only)
    .put('/:id', async ({ params, body, set }) => {
      const id = parseInt(params.id)
      if (isNaN(id)) {
        set.status = 400
        return { error: 'ID produk tidak valid' }
      }
      try {
        let sku = body.sku?.trim().toUpperCase()
        if (sku !== undefined) {
          if (!/^[A-Z0-9-]+$/.test(sku)) {
            set.status = 400
            return { error: 'SKU hanya boleh berisi huruf besar, angka, dan tanda hubung (-)' }
          }

          // Check SKU uniqueness (excluding self)
          const existing = await prisma.product.findFirst({
            where: { sku, NOT: { id } }
          })
          if (existing) {
            set.status = 400
            return { error: 'SKU sudah digunakan oleh produk lain' }
          }
        }

        const name = body.name?.trim()
        if (name === '') {
          set.status = 400
          return { error: 'Nama produk tidak boleh kosong' }
        }

        // Check if sellingPrice is less than costPrice
        // Since body parameters are optional in update, we first retrieve the existing product if needed
        let finalCostPrice = body.costPrice
        let finalSellingPrice = body.sellingPrice
        if (finalCostPrice === undefined || finalSellingPrice === undefined) {
          const currentProduct = await prisma.product.findUnique({ where: { id } })
          if (currentProduct) {
            if (finalCostPrice === undefined) finalCostPrice = currentProduct.costPrice
            if (finalSellingPrice === undefined) finalSellingPrice = currentProduct.sellingPrice
          }
        }

        if (finalCostPrice !== undefined && finalSellingPrice !== undefined && finalSellingPrice < finalCostPrice) {
          set.status = 400
          return { error: 'Harga jual tidak boleh lebih kecil dari harga modal' }
        }

        const product = await prisma.product.update({
          where: { id },
          data: {
            sku,
            name,
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
      beforeHandle: adminGuard,
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

    // DELETE product (ADMIN only)
    .delete('/:id', async ({ params, set }) => {
      const id = parseInt(params.id)
      if (isNaN(id)) {
        set.status = 400
        return { error: 'ID produk tidak valid' }
      }
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
      beforeHandle: adminGuard,
      params: t.Object({ id: t.String() })
    })

    // PATCH stock only (ADMIN only - for inventory adjustments, POS checkout uses direct Prisma transaction)
    .patch('/:id/stock', async ({ params, body, set }) => {
      const id = parseInt(params.id)
      if (isNaN(id)) {
        set.status = 400
        return { error: 'ID produk tidak valid' }
      }
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
      beforeHandle: adminGuard,
      params: t.Object({ id: t.String() }),
      body: t.Object({ stock: t.Integer({ minimum: 0 }) })
    })
}
