/**
 * Utility for sending real-time transaction notifications to n8n Webhook
 */

export interface TransactionNotificationPayload {
  invoiceNumber: string
  totalAmount: number
  paymentMethod: string
  cashierName: string
  memberName?: string | null
  items: {
    productName: string
    quantity: number
    price: number
  }[]
  createdAt?: Date
}

export async function sendN8nNotification(data: TransactionNotificationPayload): Promise<void> {
  const webhookUrl = process.env.N8N_WEBHOOK_URL?.trim()

  if (!webhookUrl) {
    // n8n webhook URL is not configured, skip silently
    return
  }

  try {
    const dateObj = data.createdAt ? new Date(data.createdAt) : new Date()
    const formattedDate = dateObj.toLocaleString('id-ID', {
      dateStyle: 'short',
      timeStyle: 'short'
    })

    // Comma-separated summary string for Google Sheets & quick displays
    const itemsSummary = data.items
      .map((it) => `${it.productName} x${it.quantity}`)
      .join(', ')

    // Formatted currency
    const formattedTotal = new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(data.totalAmount)

    // Formatted multi-line message ready for Telegram / WhatsApp / Discord
    const itemsLines = data.items
      .map((it) => `• ${it.productName} (${it.quantity}x @ Rp ${it.price.toLocaleString('id-ID')})`)
      .join('\n')

    const summaryMessage = 
`🐾 *NOTIFIKASI TRANSAKSI PAWSHOP* 🐾
━━━━━━━━━━━━━━━━━━━━
📄 *No. Invoice:* \`${data.invoiceNumber}\`
📅 *Waktu:* ${formattedDate}
👤 *Kasir:* ${data.cashierName}
👥 *Pelanggan:* ${data.memberName || 'Umum'}
💳 *Pembayaran:* ${data.paymentMethod}
💰 *Total:* *${formattedTotal}*

📦 *Rincian Produk:*
${itemsLines}
━━━━━━━━━━━━━━━━━━━━
✅ Transaksi Berhasil Dicatat`

    const payload = {
      // Direct fields matching user's n8n workflow
      transaction_id: data.invoiceNumber,
      invoiceNumber: data.invoiceNumber,
      tanggal: formattedDate,
      kasir: data.cashierName,
      pelanggan: data.memberName || 'Umum',
      items: itemsSummary,
      total: data.totalAmount,
      total_formatted: formattedTotal,
      pembayaran: data.paymentMethod,
      
      // Full rich data
      items_detail: data.items,
      summary_message: summaryMessage
    }

    // Fire-and-forget async request to n8n
    fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'PawShop-POS/1.0'
      },
      body: JSON.stringify(payload)
    })
      .then(async (res) => {
        if (!res.ok) {
          console.warn(`[n8n Webhook] Received status ${res.status} from n8n`)
        } else {
          console.log(`[n8n Webhook] Successfully sent notification for ${data.invoiceNumber}`)
        }
      })
      .catch((err) => {
        console.error('[n8n Webhook Error]', err.message)
      })
  } catch (err: any) {
    console.error('[n8n Webhook Build Error]', err.message)
  }
}
