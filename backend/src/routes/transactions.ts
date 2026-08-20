import { Elysia, t } from 'elysia'
import { PrismaClient } from '@prisma/client'

export function transactionsRoutes(prisma: PrismaClient) {
  return new Elysia({ prefix: '/api/transactions' })

    // GET reports summary (daily, weekly, monthly)
    .get('/reports', async ({ query, set }) => {
      try {
        const type = query.type || 'daily'
        const now = new Date()
        let startDate = new Date()
        let compareStartDate = new Date()
        let compareEndDate = new Date()

        if (type === 'daily') {
          // Today: 00:00:00
          startDate.setHours(0, 0, 0, 0)
          // Yesterday: 00:00:00 to 23:59:59
          compareStartDate = new Date(startDate)
          compareStartDate.setDate(compareStartDate.getDate() - 1)
          compareEndDate = new Date(startDate)
        } else if (type === 'weekly') {
          // Last 7 days
          startDate.setDate(startDate.getDate() - 7)
          startDate.setHours(0, 0, 0, 0)
          // Previous 7 days
          compareStartDate = new Date(startDate)
          compareStartDate.setDate(compareStartDate.getDate() - 7)
          compareEndDate = new Date(startDate)
        } else {
          // Last 30 days
          startDate.setDate(startDate.getDate() - 30)
          startDate.setHours(0, 0, 0, 0)
          // Previous 30 days
          compareStartDate = new Date(startDate)
          compareStartDate.setDate(compareStartDate.getDate() - 30)
          compareEndDate = new Date(startDate)
        }

        // Fetch transactions for the current period
        const txs = await prisma.transaction.findMany({
          where: { createdAt: { gte: startDate } },
          include: { items: true },
          orderBy: { createdAt: 'asc' }
        })

        // Fetch transactions for comparison period
        const compareTxs = await prisma.transaction.findMany({
          where: {
            createdAt: {
              gte: compareStartDate,
              lt: compareEndDate
            }
          },
          include: { items: true }
        })

        // 1. Calculate metrics
        let totalRevenue = 0
        let totalProfit = 0
        let totalTransactions = txs.length

        txs.forEach(t => {
          totalRevenue += t.totalAmount
          t.items.forEach(item => {
            totalProfit += (item.price - item.costPrice) * item.quantity
          })
        })

        let compareRevenue = 0
        compareTxs.forEach(t => {
          compareRevenue += t.totalAmount
        })

        const averageTransaction = totalTransactions > 0 ? totalRevenue / totalTransactions : 0
        // Revenue growth rate
        const growth = compareRevenue > 0 ? ((totalRevenue - compareRevenue) / compareRevenue) * 100 : 0

        // 2. Top Selling Products
        const productSales: Record<string, { name: string; qty: number; revenue: number }> = {}
        txs.forEach(t => {
          t.items.forEach(item => {
            if (!productSales[item.productId]) {
              productSales[item.productId] = { name: item.productName, qty: 0, revenue: 0 }
            }
            productSales[item.productId].qty += item.quantity
            productSales[item.productId].revenue += item.price * item.quantity
          })
        })

        const topProducts = Object.values(productSales)
          .sort((a, b) => b.qty - a.qty)
          .slice(0, 5)

        // 3. Chart Data: group by hour (daily) or by day (weekly/monthly)
        const chartData: { label: string; revenue: number; profit: number }[] = []

        if (type === 'daily') {
          // Group by 2-hour interval (00:00, 02:00, etc.)
          const intervals = Array.from({ length: 12 }, (_, i) => i * 2)
          intervals.forEach(hour => {
            const label = `${String(hour).padStart(2, '0')}:00`
            let rev = 0
            let prof = 0
            txs.forEach(t => {
              const tHour = new Date(t.createdAt).getHours()
              if (tHour >= hour && tHour < hour + 2) {
                rev += t.totalAmount
                t.items.forEach(item => {
                  prof += (item.price - item.costPrice) * item.quantity
                })
              }
            })
            chartData.push({ label, revenue: rev, profit: prof })
          })
        } else {
          // Group by Day Date (e.g., "20 Aug", "19 Aug")
          const daysCount = type === 'weekly' ? 7 : 30
          for (let i = daysCount - 1; i >= 0; i--) {
            const d = new Date()
            d.setDate(d.getDate() - i)
            const label = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })

            let rev = 0
            let prof = 0
            txs.forEach(t => {
              const tDate = new Date(t.createdAt)
              if (tDate.getDate() === d.getDate() && tDate.getMonth() === d.getMonth()) {
                rev += t.totalAmount
                t.items.forEach(item => {
                  prof += (item.price - item.costPrice) * item.quantity
                })
              }
            })
            chartData.push({ label, revenue: rev, profit: prof })
          }
        }

        return {
          success: true,
          summary: {
            revenue: totalRevenue,
            profit: totalProfit,
            transactionsCount: totalTransactions,
            averageTransaction,
            growth
          },
          topProducts,
          chartData
        }
      } catch (error) {
        console.error('Error generating reports:', error)
        set.status = 500
        return { error: 'Gagal menghasilkan data laporan' }
      }
    }, {
      query: t.Object({
        type: t.Optional(t.String())
      })
    })

    // GET transaction list (history)
    .get('', async () => {
      try {
        const history = await prisma.transaction.findMany({
          orderBy: { createdAt: 'desc' },
          include: { items: true },
          take: 50
        })
        return history
      } catch (error) {
        console.error('Error fetching transactions:', error)
        return { error: 'Gagal mengambil riwayat transaksi' }
      }
    })

    // POST create transaction (checkout)
    .post('', async ({ body, set, user }) => {
      try {
        if (!user) {
          set.status = 401
          return { error: 'Unauthorized: User authentication required' }
        }

        const invoiceNumber = `INV-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`

        // Process checkout inside a Prisma Transaction to ensure atomic consistency
        const result = await prisma.$transaction(async (tx) => {
          let calculatedTotal = 0
          const itemsToCreate = []

          for (const item of body.items) {
            // Check stock & price
            const dbProduct = await tx.product.findUnique({
              where: { id: item.productId }
            })

            if (!dbProduct) {
              throw new Error(`Produk dengan ID ${item.productId} tidak ditemukan`)
            }

            if (dbProduct.stock < item.quantity) {
              throw new Error(`Stok produk "${dbProduct.name}" tidak mencukupi (Tersedia: ${dbProduct.stock})`)
            }

            // Subtract stock
            await tx.product.update({
              where: { id: item.productId },
              data: { stock: dbProduct.stock - item.quantity }
            })

            calculatedTotal += dbProduct.sellingPrice * item.quantity

            itemsToCreate.push({
              productId: item.productId,
              productName: dbProduct.name,
              quantity: item.quantity,
              price: dbProduct.sellingPrice,
              costPrice: dbProduct.costPrice
            })
          }

          // Calculate points earned if memberId is provided
          let memberData = {}
          let pointsEarned = 0
          if (body.memberId) {
            const member = await tx.member.findUnique({
              where: { id: body.memberId }
            })
            if (member) {
              pointsEarned = Math.floor(calculatedTotal / 10000)
              await tx.member.update({
                where: { id: member.id },
                data: { points: member.points + pointsEarned }
              })
              memberData = {
                memberId: member.id,
                memberCode: member.memberCode,
                memberName: member.name,
                pointsEarned
              }
            }
          }

          // Create transaction header
          const transaction = await tx.transaction.create({
            data: {
              invoiceNumber,
              totalAmount: calculatedTotal,
              paymentMethod: body.paymentMethod,
              cashierId: user.id,
              cashierName: user.name,
              ...memberData,
              items: {
                create: itemsToCreate
              }
            },
            include: {
              items: true
            }
          })

          return transaction
        })

        return { success: true, transaction: result }
      } catch (error: any) {
        console.error('Error creating transaction:', error)
        set.status = 400
        return { error: error.message || 'Gagal memproses transaksi kasir' }
      }
    }, {
      body: t.Object({
        paymentMethod: t.String(),
        memberId: t.Optional(t.Nullable(t.Integer())),
        items: t.Array(t.Object({
          productId: t.Integer({ minimum: 1 }),
          quantity: t.Integer({ minimum: 1 })
        }))
      })
    })
}
