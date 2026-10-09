import { Elysia, t } from 'elysia'
import { PrismaClient } from '@prisma/client'
import { adminGuard } from '../utils/auth.js'
import { sendN8nNotification } from '../utils/n8n.js'

export function transactionsRoutes(prisma: PrismaClient) {
  return new Elysia({ prefix: '/api/transactions' })

    // GET reports summary (daily, weekly, monthly) (ADMIN only)
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
      beforeHandle: adminGuard,
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
    .post('', async ({ body, set, user }: any) => {
      try {
        if (!user) {
          set.status = 401
          return { error: 'Unauthorized: User authentication required' }
        }

        if (!body.items || body.items.length === 0) {
          set.status = 400
          return { error: 'Keranjang belanja tidak boleh kosong' }
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

        // Send real-time webhook notification to n8n
        sendN8nNotification({
          invoiceNumber: result.invoiceNumber,
          totalAmount: result.totalAmount,
          paymentMethod: result.paymentMethod,
          cashierName: result.cashierName,
          memberName: result.memberName,
          items: result.items.map(it => ({
            productName: it.productName,
            quantity: it.quantity,
            price: it.price
          })),
          createdAt: result.createdAt
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

    // ==========================================
    // MIDTRANS PAYMENT GATEWAY INTEGRATION
    // ==========================================

    // GET Midtrans Client Config
    .get('/midtrans/config', () => {
      const config = getMidtransConfig()
      return {
        clientKey: config.clientKey,
        merchantId: config.merchantId,
        isProduction: config.isProduction
      }
    })

    // POST Create Midtrans Snap Token
    .post('/midtrans/token', async ({ body, set, user }: any) => {
      try {
        if (!user) {
          set.status = 401
          return { error: 'Unauthorized: User authentication required' }
        }

        if (!body.items || body.items.length === 0) {
          set.status = 400
          return { error: 'Keranjang belanja tidak boleh kosong' }
        }

        const config = getMidtransConfig()
        const invoiceNumber = `INV-MID-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`

        // Check stock & calculate amount
        let subtotal = 0
        const itemDetails: any[] = []

        for (const item of body.items) {
          const dbProduct = await prisma.product.findUnique({
            where: { id: item.productId }
          })

          if (!dbProduct) {
            set.status = 404
            return { error: `Produk #${item.productId} tidak ditemukan` }
          }

          if (dbProduct.stock < item.quantity) {
            set.status = 400
            return { error: `Stok "${dbProduct.name}" tidak mencukupi (Tersedia: ${dbProduct.stock})` }
          }

          const lineTotal = dbProduct.sellingPrice * item.quantity
          subtotal += lineTotal

          // Midtrans item_details name limit is 50 chars
          const cleanName = dbProduct.name.length > 45 ? dbProduct.name.substring(0, 45) + '...' : dbProduct.name
          itemDetails.push({
            id: `PROD-${dbProduct.id}`,
            price: Math.round(dbProduct.sellingPrice),
            quantity: item.quantity,
            name: cleanName
          })
        }

        // Calculate tax 8% to match POS
        const taxAmount = Math.round(subtotal * 0.08)
        if (taxAmount > 0) {
          itemDetails.push({
            id: 'TAX-8',
            price: taxAmount,
            quantity: 1,
            name: 'Pajak PPn (8%)'
          })
        }

        const grossAmount = subtotal + taxAmount

        // Fetch customer info if member provided
        let customerDetails: any = {
          first_name: user.name || 'Pelanggan Toko',
          phone: '08123456789'
        }

        if (body.memberId) {
          const member = await prisma.member.findUnique({
            where: { id: body.memberId }
          })
          if (member) {
            customerDetails = {
              first_name: member.name,
              phone: member.phone
            }
          }
        }

        // Request Snap Token from Midtrans API
        const authHeader = `Basic ${Buffer.from(config.serverKey + ':').toString('base64')}`
        const snapPayload = {
          transaction_details: {
            order_id: invoiceNumber,
            gross_amount: grossAmount
          },
          item_details: itemDetails,
          customer_details: customerDetails,
          callbacks: {
            finish: 'http://localhost:5173'
          }
        }

        const snapResponse = await fetch(config.snapUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': authHeader
          },
          body: JSON.stringify(snapPayload)
        })

        const snapData = await snapResponse.json()

        if (!snapResponse.ok || !snapData.token) {
          console.error('Midtrans Snap error response:', snapData)
          set.status = 502
          return {
            error: snapData.error_messages ? snapData.error_messages.join(', ') : 'Gagal menghasilkan token pembayaran Midtrans',
            details: snapData
          }
        }

        return {
          success: true,
          token: snapData.token,
          redirectUrl: snapData.redirect_url,
          invoiceNumber,
          grossAmount,
          clientKey: config.clientKey
        }
      } catch (err: any) {
        console.error('Midtrans Token Creation Error:', err)
        set.status = 500
        return { error: err.message || 'Internal Server Error pada Midtrans Token' }
      }
    }, {
      body: t.Object({
        memberId: t.Optional(t.Nullable(t.Integer())),
        items: t.Array(t.Object({
          productId: t.Integer({ minimum: 1 }),
          quantity: t.Integer({ minimum: 1 })
        }))
      })
    })

    // POST Finish Midtrans Transaction (after customer paid via Snap)
    .post('/midtrans/finish', async ({ body, set, user }: any) => {
      try {
        if (!user) {
          set.status = 401
          return { error: 'Unauthorized: User authentication required' }
        }

        const { invoiceNumber, paymentType, memberId, items } = body

        if (!invoiceNumber || !items || items.length === 0) {
          set.status = 400
          return { error: 'Parameter transaksi Midtrans tidak lengkap' }
        }

        // Check if invoice already recorded to prevent duplicate records
        const existingTx = await prisma.transaction.findUnique({
          where: { invoiceNumber },
          include: { items: true }
        })
        if (existingTx) {
          return { success: true, transaction: existingTx }
        }

        // Process inventory reduction and record transaction
        const result = await prisma.$transaction(async (tx) => {
          let calculatedSubtotal = 0
          const itemsToCreate = []

          for (const item of items) {
            const dbProduct = await tx.product.findUnique({
              where: { id: item.productId }
            })

            if (!dbProduct) {
              throw new Error(`Produk dengan ID ${item.productId} tidak ditemukan`)
            }

            // Subtract stock
            await tx.product.update({
              where: { id: item.productId },
              data: { stock: Math.max(0, dbProduct.stock - item.quantity) }
            })

            calculatedSubtotal += dbProduct.sellingPrice * item.quantity

            itemsToCreate.push({
              productId: item.productId,
              productName: dbProduct.name,
              quantity: item.quantity,
              price: dbProduct.sellingPrice,
              costPrice: dbProduct.costPrice
            })
          }

          const tax = Math.round(calculatedSubtotal * 0.08)
          const totalAmount = calculatedSubtotal + tax

          // Member points
          let memberData = {}
          let pointsEarned = 0
          if (memberId) {
            const member = await tx.member.findUnique({
              where: { id: memberId }
            })
            if (member) {
              pointsEarned = Math.floor(totalAmount / 10000)
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

          const finalPaymentMethod = paymentType
            ? `MIDTRANS (${String(paymentType).toUpperCase()})`
            : 'MIDTRANS'

          const transaction = await tx.transaction.create({
            data: {
              invoiceNumber,
              totalAmount,
              paymentMethod: finalPaymentMethod,
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

        // Send real-time webhook notification to n8n
        sendN8nNotification({
          invoiceNumber: result.invoiceNumber,
          totalAmount: result.totalAmount,
          paymentMethod: result.paymentMethod,
          cashierName: result.cashierName,
          memberName: result.memberName,
          items: result.items.map(it => ({
            productName: it.productName,
            quantity: it.quantity,
            price: it.price
          })),
          createdAt: result.createdAt
        })

        return { success: true, transaction: result }
      } catch (err: any) {
        console.error('Error saving finished Midtrans transaction:', err)
        set.status = 400
        return { error: err.message || 'Gagal menyimpan transaksi Midtrans' }
      }
    }, {
      body: t.Object({
        invoiceNumber: t.String(),
        paymentType: t.Optional(t.String()),
        memberId: t.Optional(t.Nullable(t.Integer())),
        items: t.Array(t.Object({
          productId: t.Integer({ minimum: 1 }),
          quantity: t.Integer({ minimum: 1 })
        }))
      })
    })

    // GET Midtrans Status Check
    .get('/midtrans/status/:orderId', async ({ params, set }) => {
      try {
        const config = getMidtransConfig()
        const authHeader = `Basic ${Buffer.from(config.serverKey + ':').toString('base64')}`
        const statusRes = await fetch(`${config.apiBaseUrl}/${params.orderId}/status`, {
          headers: {
            'Accept': 'application/json',
            'Authorization': authHeader
          }
        })
        const statusData = await statusRes.json()
        return statusData
      } catch (err: any) {
        set.status = 500
        return { error: err.message || 'Gagal memeriksa status Midtrans' }
      }
    })

    // POST Trigger n8n Webhook Test
    .post('/n8n/test', async () => {
      await sendN8nNotification({
        invoiceNumber: `TRX-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-0017`,
        totalAmount: 460000,
        paymentMethod: 'QRIS',
        cashierName: 'Dewi Lestari',
        memberName: 'Budi Santoso',
        items: [
          { productName: 'Royal Canin Kitten 2kg', quantity: 1, price: 250000 },
          { productName: 'Pasir Kucing Wangi 10L', quantity: 2, price: 75000 },
          { productName: 'Mainan Bola Kucing', quantity: 3, price: 20000 }
        ],
        createdAt: new Date()
      })
      return { success: true, message: 'Notifikasi uji coba berhasil dikirim ke n8n!' }
    })
}

// Helper: Midtrans Configuration loader
function getMidtransConfig() {
  const rawServerKey = (process.env.MIDTRANS_SERVER_KEY || '').trim()
  const serverKey = rawServerKey.replace(/^SB-Mid-server\s+/, 'SB-Mid-server-').replace(/^Mid-server\s+/, 'Mid-server-')
  const clientKey = (process.env.MIDTRANS_CLIENT_KEY || '').trim()
  const merchantId = (process.env.MIDTRANS_MERCHANT_ID || '').trim()
  
  // Set isProduction based on env var (default false for Sandbox testing)
  const isProduction = process.env.MIDTRANS_IS_PRODUCTION === 'true'

  const snapUrl = isProduction
    ? 'https://app.midtrans.com/snap/v1/transactions'
    : 'https://app.sandbox.midtrans.com/snap/v1/transactions'

  const apiBaseUrl = isProduction
    ? 'https://api.midtrans.com/v2'
    : 'https://api.sandbox.midtrans.com/v2'

  return { serverKey, clientKey, merchantId, isProduction, snapUrl, apiBaseUrl }
}
