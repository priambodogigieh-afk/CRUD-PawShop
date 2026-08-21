import React, { useEffect, useState } from 'react'
import { fetchTransactions } from '../api'
import type { Transaction } from '../types'

interface HistoryPageProps {
  onViewReceipt: (receipt: any) => void
}

export const HistoryPage: React.FC<HistoryPageProps> = ({ onViewReceipt }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadTransactions = async () => {
    setIsLoading(true)
    setError(null)
    try {
      // First try to load from offline pending queue to show queued items
      const offlineQueueStr = localStorage.getItem('pawshop_offline_queue')
      const offlineQueue = offlineQueueStr ? JSON.parse(offlineQueueStr) : []
      
      const data = await fetchTransactions().catch(() => {
        // Fallback to cache if offline
        const cached = localStorage.getItem('pawshop_transactions_cache')
        return cached ? JSON.parse(cached) : []
      })

      // Cache the loaded transactions
      if (data && data.length > 0) {
        localStorage.setItem('pawshop_transactions_cache', JSON.stringify(data))
      }

      // Map offline queue items for preview in list
      const offlineItems: Transaction[] = offlineQueue.map((tx: any, idx: number) => ({
        id: -idx - 1,
        invoiceNumber: `INV-OFF-${Date.now().toString().slice(-6)}-${idx}`,
        totalAmount: tx.items.reduce((sum: number, it: any) => sum + (it.price || 0) * it.quantity, 0), // estimation
        paymentMethod: 'CASH',
        cashierId: 'kasir',
        cashierName: 'Kasir (Offline)',
        memberCode: tx.memberId ? 'MEMBER' : null,
        memberName: tx.memberId ? 'Loyal Customer' : null,
        createdAt: new Date().toISOString(),
        items: tx.items.map((it: any) => ({
          id: -1,
          productId: it.productId,
          productName: `Produk ID: ${it.productId}`, // placeholder
          quantity: it.quantity,
          price: 0,
          costPrice: 0
        }))
      }))

      const combined = [...offlineItems, ...data]
      setTransactions(combined)
      setFilteredTransactions(combined)
    } catch (err: any) {
      setError(err.message || 'Gagal memuat riwayat penjualan.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadTransactions()
  }, [])

  useEffect(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) {
      setFilteredTransactions(transactions)
    } else {
      const filtered = transactions.filter(
        tx =>
          tx.invoiceNumber.toLowerCase().includes(term) ||
          tx.cashierName.toLowerCase().includes(term) ||
          (tx.memberName && tx.memberName.toLowerCase().includes(term))
      )
      setFilteredTransactions(filtered)
    }
  }, [searchTerm, transactions])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(value)
  }

  const handleActionView = (tx: Transaction) => {
    // Map backend Transaction structure to Receipt Structure
    const totalAmount = tx.totalAmount
    const subtotal = Math.round(totalAmount / 1.08)
    const tax = totalAmount - subtotal

    const receiptPayload = {
      invoiceNo: tx.invoiceNumber,
      date: new Date(tx.createdAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }),
      cashier: tx.cashierName,
      items: tx.items.map(item => ({
        name: item.productName || `Produk #${item.productId}`,
        price: item.price || Math.round(totalAmount / (item.quantity || 1)),
        quantity: item.quantity,
        total: (item.price || Math.round(totalAmount / (item.quantity || 1))) * item.quantity
      })),
      totals: {
        subtotal,
        tax,
        total: totalAmount
      },
      cash: totalAmount, // fallback
      change: 0, // fallback
      member: tx.memberCode ? {
        code: tx.memberCode,
        name: tx.memberName || 'Member',
        points: 0,
        newPointsEarned: tx.pointsEarned || 0
      } : null,
      isOffline: tx.invoiceNumber.startsWith('INV-OFF')
    }

    onViewReceipt(receiptPayload)
  }

  return (
    <main className="flex-1 p-6 space-y-5 overflow-y-auto bg-background relative">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-[#1E2330]">Riwayat Penjualan</h2>
          <p className="text-xs text-[#6E7385] mt-1">Daftar transaksi penjualan POS kasir terakhir.</p>
        </div>
        <button
          onClick={loadTransactions}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-[#E2E8F0] rounded-xl font-bold text-xs text-[#1E2330] hover:bg-[#EEF0FA] active:scale-95 transition-all-default shadow-sm"
        >
          <span className="material-symbols-outlined text-sm font-bold">refresh</span>
          <span>Segarkan</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-3xl border border-[#E2E8F0] shadow-sm overflow-hidden flex flex-col min-h-[400px]">
        {/* Filters */}
        <div className="p-5 border-b border-[#E2E8F0] flex items-center justify-between gap-4 shrink-0 flex-wrap">
          <div className="relative w-full max-w-md">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6E7385] text-sm">search</span>
            <input
              type="text"
              placeholder="Cari berdasarkan No. Invoice, Kasir, atau Member..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl font-body-md text-xs text-[#1E2330] focus:outline-none focus:border-[#5B50E5] focus:ring-2 focus:ring-[#5B50E5]/10 text-sm font-semibold"
            />
          </div>
          <div className="text-xs font-bold text-[#6E7385]">
            Menampilkan {filteredTransactions.length} transaksi
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto flex-1">
          {isLoading && transactions.length === 0 ? (
            <div className="p-8 text-center text-[#6E7385] flex flex-col items-center justify-center h-64 gap-2">
              <div className="w-8 h-8 border-4 border-[#5B50E5] border-t-transparent rounded-full animate-spin"></div>
              <span className="font-semibold text-sm mt-2">Memuat riwayat transaksi...</span>
            </div>
          ) : error ? (
            <div className="p-12 text-center text-[#E03131] flex flex-col items-center justify-center h-64">
              <span className="material-symbols-outlined text-[48px] mb-2">error</span>
              <p className="font-bold text-sm">{error}</p>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="p-12 text-center text-[#6E7385] flex flex-col items-center justify-center h-64">
              <span className="material-symbols-outlined text-[64px] text-[#6E7385]/30 mb-2">receipt_long</span>
              <p className="font-bold text-sm">Tidak Ada Riwayat Transaksi</p>
              <p className="text-xs mt-1 text-[#6E7385]/70">Transaksi kasir yang sukses akan tampil di sini.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-[#EEF0FA]/40 border-b border-[#E2E8F0] text-[#6E7385]">
                  <th className="p-4 font-bold text-xs uppercase tracking-wider pl-6">No. Invoice</th>
                  <th className="p-4 font-bold text-xs uppercase tracking-wider">Tanggal</th>
                  <th className="p-4 font-bold text-xs uppercase tracking-wider">Kasir</th>
                  <th className="p-4 font-bold text-xs uppercase tracking-wider">Member</th>
                  <th className="p-4 font-bold text-xs uppercase tracking-wider text-right">Total Belanja</th>
                  <th className="p-4 font-bold text-xs uppercase tracking-wider pr-6 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {filteredTransactions.map((tx) => {
                  const isOfflineTx = tx.invoiceNumber.startsWith('INV-OFF')
                  return (
                    <tr key={tx.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="p-4 pl-6">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 border rounded-full font-bold text-xs ${
                          isOfflineTx
                            ? 'bg-amber-50 border-amber-200 text-amber-700'
                            : 'bg-indigo-50 border-indigo-100 text-indigo-700'
                        }`}>
                          {tx.invoiceNumber}
                        </span>
                      </td>
                      <td className="p-4 text-xs text-[#6E7385]">
                        {new Date(tx.createdAt).toLocaleString('id-ID', {
                          dateStyle: 'medium',
                          timeStyle: 'short'
                        })}
                      </td>
                      <td className="p-4">
                        <span className="font-bold text-[#1E2330] text-xs">{tx.cashierName}</span>
                      </td>
                      <td className="p-4 text-xs">
                        {tx.memberName ? (
                          <div className="flex flex-col">
                            <span className="font-bold text-[#1E2330]">{tx.memberName}</span>
                            <span className="text-[10px] text-[#6E7385]">{tx.memberCode}</span>
                          </div>
                        ) : (
                          <span className="text-[#6E7385]/60">-</span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <span className="font-extrabold text-[#1E2330] text-xs">{formatCurrency(tx.totalAmount)}</span>
                      </td>
                      <td className="p-4 pr-6 text-right">
                        <button
                          onClick={() => handleActionView(tx)}
                          className="inline-flex items-center justify-center gap-1 px-3 py-1.5 bg-[#5B50E5]/10 hover:bg-[#5B50E5] text-[#5B50E5] hover:text-white rounded-lg transition-all-default font-bold text-xs active:scale-95"
                          title="Lihat Struk"
                        >
                          <span className="material-symbols-outlined text-xs leading-none">receipt</span>
                          <span>Lihat Struk</span>
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </main>
  )
}
