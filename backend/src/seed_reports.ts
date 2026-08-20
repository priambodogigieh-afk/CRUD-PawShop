import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('=== SEEDING TRANSACTIONS & SALES REPORT DATA ===')

  // Check if we have users and products
  const users = await prisma.user.findMany()
  const products = await prisma.product.findMany()

  if (users.length === 0 || products.length === 0) {
    console.log('Error: Please seed users and products first!')
    return
  }

  const cashier = users.find(u => u.role === 'KASIR') || users[0]

  // Delete existing transactions to prevent duplicate seeds
  await prisma.transactionItem.deleteMany()
  await prisma.transaction.deleteMany()
  console.log('Deleted old transactions.')

  const now = new Date()

  // Generate helper to create date at X days ago, hour Y
  const getDateAgo = (daysAgo: number, hour: number) => {
    const d = new Date()
    d.setDate(d.getDate() - daysAgo)
    d.setHours(hour, Math.floor(Math.random() * 60), Math.floor(Math.random() * 60))
    return d
  }

  // Create transactions spread over the last 60 days
  // Days 0 to 30: current period (weekly & monthly reports)
  // Days 31 to 60: comparison period (growth metric)
  let invoiceCounter = 1000

  for (let day = 60; day >= 0; day--) {
    // Generate 1 to 4 transactions per day (with some random variance)
    const numTransactions = Math.floor(Math.random() * 3) + 1 // 1, 2, or 3 txs

    for (let t = 0; t < numTransactions; t++) {
      invoiceCounter++
      const hour = 9 + Math.floor(Math.random() * 10) // 9 AM to 7 PM
      const createdAt = getDateAgo(day, hour)
      const invoiceNumber = `INV-${createdAt.getFullYear()}${String(createdAt.getMonth()+1).padStart(2,'0')}${String(createdAt.getDate()).padStart(2,'0')}-${invoiceCounter}`
      
      // Select random 1 to 3 items from products list
      const numItems = Math.floor(Math.random() * 3) + 1
      const selectedProducts = [...products].sort(() => 0.5 - Math.random()).slice(0, numItems)

      const itemsData = []
      let totalAmount = 0

      for (const prod of selectedProducts) {
        const quantity = Math.floor(Math.random() * 2) + 1 // 1 or 2 items
        totalAmount += prod.sellingPrice * quantity
        
        itemsData.push({
          productId: prod.id,
          productName: prod.name,
          quantity,
          price: prod.sellingPrice,
          costPrice: prod.costPrice
        })
      }

      const paymentMethod = ['CASH', 'CARD', 'QRIS'][Math.floor(Math.random() * 3)]

      await prisma.transaction.create({
        data: {
          invoiceNumber,
          totalAmount,
          paymentMethod,
          cashierId: cashier.id,
          cashierName: cashier.name,
          createdAt,
          items: {
            create: itemsData
          }
        }
      })
    }
  }

  const txCount = await prisma.transaction.count()
  console.log(`Successfully seeded ${txCount} transactions into the database.`)
  console.log('=== SEEDING TRANSACTIONS COMPLETE ===')
  process.exit(0)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
