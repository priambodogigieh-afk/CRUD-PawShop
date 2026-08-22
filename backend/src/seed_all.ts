import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import { hashPassword } from './utils/password'

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('=== SEEDING CORE DATA (USERS, CATEGORIES, BRANDS, PRODUCTS) ===')

  // 1. Seed Users
  let adminUser = await prisma.user.findUnique({ where: { username: 'admin' } })
  if (!adminUser) {
    const hashedAdmin = await hashPassword('admin123')
    adminUser = await prisma.user.create({
      data: {
        username: 'admin',
        password: hashedAdmin,
        name: 'Admin PawShop',
        role: 'ADMIN'
      }
    })
    console.log('Seeded Admin account.')
  } else {
    console.log('Admin account already exists.')
  }

  let cashierUser = await prisma.user.findUnique({ where: { username: 'kasir' } })
  if (!cashierUser) {
    const hashedKasir = await hashPassword('kasir123')
    cashierUser = await prisma.user.create({
      data: {
        username: 'kasir',
        password: hashedKasir,
        name: 'Kasir PawShop',
        role: 'KASIR'
      }
    })
    console.log('Seeded Cashier account.')
  } else {
    console.log('Cashier account already exists.')
  }

  // 2. Seed Categories
  const categoryNames = [
    'Makanan Kucing',
    'Makanan Anjing',
    'Perawatan & Kesehatan',
    'Aksesoris & Mainan',
    'Lain-lain'
  ]
  const categoriesMap: Record<string, any> = {}
  for (const name of categoryNames) {
    let cat = await prisma.category.findUnique({ where: { name } })
    if (!cat) {
      cat = await prisma.category.create({ data: { name, description: `Kategori ${name}` } })
      console.log(`Seeded Category: ${name}`)
    }
    categoriesMap[name] = cat
  }

  // 3. Seed Brands
  const brandNames = ['Royal Canin', 'Whiskas', 'Pedigree', 'Alpo', 'Generic']
  const brandsMap: Record<string, any> = {}
  for (const name of brandNames) {
    let brand = await prisma.brand.findUnique({ where: { name } })
    if (!brand) {
      brand = await prisma.brand.create({ data: { name } })
      console.log(`Seeded Brand: ${name}`)
    }
    brandsMap[name] = brand
  }

  // 4. Seed Products
  const defaultProducts = [
    {
      sku: 'RC-KITTEN',
      name: 'Royal Canin Kitten 2kg',
      category: 'Makanan Kucing',
      brand: 'Royal Canin',
      sellingPrice: 150000,
      costPrice: 110000,
      stock: 50
    },
    {
      sku: 'WH-TUNA',
      name: 'Whiskas Tuna Cat Food 1.2kg',
      category: 'Makanan Kucing',
      brand: 'Whiskas',
      sellingPrice: 35000,
      costPrice: 25000,
      stock: 100
    },
    {
      sku: 'PD-ADULT',
      name: 'Pedigree Adult Beef & Veg 3kg',
      category: 'Makanan Anjing',
      brand: 'Pedigree',
      sellingPrice: 180000,
      costPrice: 135000,
      stock: 40
    },
    {
      sku: 'SH-KUTU',
      name: 'Shampoo Anti Kutu Hewan 250ml',
      category: 'Perawatan & Kesehatan',
      brand: 'Generic',
      sellingPrice: 45000,
      costPrice: 30000,
      stock: 25
    },
    {
      sku: 'MN-TIKUS',
      name: 'Mainan Tikus Bunyi Bulu',
      category: 'Aksesoris & Mainan',
      brand: 'Generic',
      sellingPrice: 15000,
      costPrice: 8000,
      stock: 60
    }
  ]

  for (const prod of defaultProducts) {
    let existingProd = await prisma.product.findUnique({ where: { sku: prod.sku } })
    if (!existingProd) {
      await prisma.product.create({
        data: {
          sku: prod.sku,
          name: prod.name,
          categoryId: categoriesMap[prod.category].id,
          brandId: brandsMap[prod.brand].id,
          sellingPrice: prod.sellingPrice,
          costPrice: prod.costPrice,
          stock: prod.stock
        }
      })
      console.log(`Seeded Product: ${prod.name}`)
    }
  }

  console.log('=== CORE DATA SEEDING COMPLETE ===')
}

main()
  .then(() => {
    pool.end()
    process.exit(0)
  })
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
