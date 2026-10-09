import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { fetchTransactions } from '../api'
import type { Transaction } from '../types'
import { SkeletonRow } from '../components/Skeleton'
import { EmptyState } from '../components/EmptyState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { RefreshCw, Search, Receipt } from 'lucide-react'

interface HistoryPageProps {
  onViewReceipt: (receipt: any) => void
}

export const HistoryPage: React.FC<HistoryPageProps> = ({ onViewReceipt }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadTransactions = useCallback(async () => {
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
    } catch (err: any) {
      setError(err.message || 'Gagal memuat riwayat penjualan.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTransactions()
  }, [loadTransactions])

  const filteredTransactions = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return transactions
    return transactions.filter(
      tx =>
        tx.invoiceNumber.toLowerCase().includes(term) ||
        tx.cashierName.toLowerCase().includes(term) ||
        (tx.memberName && tx.memberName.toLowerCase().includes(term))
    )
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
      paymentMethod: tx.paymentMethod || 'CASH',
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
    <main className="flex-1 p-6 space-y-5 overflow-y-auto bg-background relative animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-[#1E2330]">Riwayat Penjualan</h2>
          <p className="text-xs text-[#6E7385] mt-1">Daftar transaksi penjualan POS kasir terakhir.</p>
        </div>
        <Button
          variant="outline"
          onClick={loadTransactions}
          className="border-[#E2E8F0] bg-white font-bold text-xs text-[#1E2330] hover:bg-[#EEF0FA] active:scale-95 shadow-sm rounded-xl cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5 mr-1 text-[#1E2330]" />
          <span>Segarkan</span>
        </Button>
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-3xl border border-[#E2E8F0] shadow-sm overflow-hidden flex flex-col min-h-[400px]">
        {/* Filters */}
        <div className="p-5 border-b border-[#E2E8F0] flex items-center justify-between gap-4 shrink-0 flex-wrap">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6E7385] w-4 h-4 pointer-events-none" />
            <Input
              type="text"
              placeholder="Cari berdasarkan No. Invoice, Kasir, atau Member..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-[#F8FAFC] border-[#E2E8F0] rounded-xl text-xs text-[#1E2330] focus-visible:border-[#5B50E5] focus-visible:ring-[#5B50E5]/10 font-semibold h-10"
            />
          </div>
          <div className="text-xs font-bold text-[#6E7385]">
            Menampilkan {filteredTransactions.length} transaksi
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto flex-1">
          {isLoading && transactions.length === 0 ? (
            <Table className="w-full min-w-[700px]">
              <TableHeader>
                <TableRow className="bg-[#EEF0FA]/40 border-b border-[#E2E8F0] text-[#6E7385] hover:bg-[#EEF0FA]/40">
                  <TableHead className="p-4 font-bold text-xs uppercase tracking-wider pl-6 text-[#6E7385]">No. Invoice</TableHead>
                  <TableHead className="p-4 font-bold text-xs uppercase tracking-wider text-[#6E7385]">Tanggal</TableHead>
                  <TableHead className="p-4 font-bold text-xs uppercase tracking-wider text-[#6E7385]">Kasir</TableHead>
                  <TableHead className="p-4 font-bold text-xs uppercase tracking-wider text-[#6E7385]">Member</TableHead>
                  <TableHead className="p-4 font-bold text-xs uppercase tracking-wider text-right text-[#6E7385]">Total Belanja</TableHead>
                  <TableHead className="p-4 font-bold text-xs uppercase tracking-wider pr-6 text-right text-[#6E7385]">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <SkeletonRow cols={6} rows={5} />
              </TableBody>
            </Table>
          ) : error ? (
            <div className="p-12 text-center text-[#E03131] flex flex-col items-center justify-center h-64">
              <span className="material-symbols-outlined text-[48px] mb-2">error</span>
              <p className="font-bold text-sm">{error}</p>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <EmptyState
              icon="receipt_long"
              title="Tidak Ada Riwayat Transaksi"
              description="Transaksi kasir yang sukses atau disinkronkan secara lokal akan tampil di sini."
            />
          ) : (
            <Table className="w-full min-w-[700px]">
              <TableHeader>
                <TableRow className="bg-[#EEF0FA]/40 border-b border-[#E2E8F0] text-[#6E7385] hover:bg-[#EEF0FA]/40">
                  <TableHead className="p-4 font-bold text-xs uppercase tracking-wider pl-6 text-[#6E7385]">No. Invoice</TableHead>
                  <TableHead className="p-4 font-bold text-xs uppercase tracking-wider text-[#6E7385]">Tanggal</TableHead>
                  <TableHead className="p-4 font-bold text-xs uppercase tracking-wider text-[#6E7385]">Kasir</TableHead>
                  <TableHead className="p-4 font-bold text-xs uppercase tracking-wider text-[#6E7385]">Member</TableHead>
                  <TableHead className="p-4 font-bold text-xs uppercase tracking-wider text-[#6E7385]">Metode</TableHead>
                  <TableHead className="p-4 font-bold text-xs uppercase tracking-wider text-right text-[#6E7385]">Total Belanja</TableHead>
                  <TableHead className="p-4 font-bold text-xs uppercase tracking-wider pr-6 text-right text-[#6E7385]">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-[#E2E8F0]">
                {filteredTransactions.map((tx) => {
                  const isOfflineTx = tx.invoiceNumber.startsWith('INV-OFF')
                  const upperMethod = (tx.paymentMethod || 'CASH').toUpperCase()
                  return (
                    <TableRow key={tx.id} className="hover:bg-[#F8FAFC] transition-colors border-[#E2E8F0]">
                      <TableCell className="p-4 pl-6">
                        <Badge
                          variant="outline"
                          className={`font-bold text-xs px-2.5 py-1 rounded-full border ${
                            isOfflineTx
                              ? 'bg-amber-50 border-amber-200 text-amber-700'
                              : 'bg-indigo-50 border-indigo-100 text-indigo-700'
                          }`}
                        >
                          {tx.invoiceNumber}
                        </Badge>
                      </TableCell>
                      <TableCell className="p-4 text-xs text-[#6E7385]">
                        {new Date(tx.createdAt).toLocaleString('id-ID', {
                          dateStyle: 'medium',
                          timeStyle: 'short'
                        })}
                      </TableCell>
                      <TableCell className="p-4">
                        <span className="font-bold text-[#1E2330] text-xs">{tx.cashierName}</span>
                      </TableCell>
                      <TableCell className="p-4 text-xs">
                        {tx.memberName ? (
                          <div className="flex flex-col">
                            <span className="font-bold text-[#1E2330]">{tx.memberName}</span>
                            <span className="text-[10px] text-[#6E7385]">{tx.memberCode}</span>
                          </div>
                        ) : (
                          <span className="text-[#6E7385]/60">-</span>
                        )}
                      </TableCell>
                      <TableCell className="p-4">
                        <Badge
                          variant="outline"
                          className={`font-bold text-[11px] px-2.5 py-0.5 rounded-full border ${
                            upperMethod.includes('MIDTRANS')
                              ? 'bg-purple-50 border-purple-200 text-purple-700'
                              : upperMethod.includes('TRANSFER')
                              ? 'bg-blue-50 border-blue-200 text-blue-700'
                              : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                          }`}
                        >
                          {upperMethod.includes('MIDTRANS')
                            ? tx.paymentMethod.replace('MIDTRANS', 'Midtrans').replace(/[\(\)]/g, ' ').trim()
                            : upperMethod.includes('TRANSFER')
                            ? 'Transfer'
                            : 'Tunai'}
                        </Badge>
                      </TableCell>
                      <TableCell className="p-4 text-right">
                        <span className="font-extrabold text-[#1E2330] text-xs">{formatCurrency(tx.totalAmount)}</span>
                      </TableCell>
                      <TableCell className="p-4 pr-6 text-right">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleActionView(tx)}
                          className="bg-[#5B50E5]/10 hover:bg-[#5B50E5] text-[#5B50E5] hover:text-white rounded-lg font-bold text-xs cursor-pointer transition-colors"
                          title="Lihat Struk"
                        >
                          <Receipt className="w-3.5 h-3.5 mr-1" />
                          <span>Lihat Struk</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </main>
  )
}
