import { useState, useEffect } from 'react'
import { fetchReports, fetchTransactions } from '../api'
import type { ReportSummary, TopProductItem, ChartDataItem, Transaction } from '../types'

// Helpers
const formatCurrency = (n: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(n)
}

const formatDate = (iso: string) => {
  return new Date(iso).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export default function ReportsPage() {
  const [reportType, setReportType] = useState<'daily' | 'weekly' | 'monthly'>('weekly')
  const [summary, setSummary] = useState<ReportSummary | null>(null)
  const [topProducts, setTopProducts] = useState<TopProductItem[]>([])
  const [chartData, setChartData] = useState<ChartDataItem[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [repRes, txs] = await Promise.all([
        fetchReports(reportType),
        fetchTransactions()
      ])
      if (repRes.success) {
        setSummary(repRes.summary)
        setTopProducts(repRes.topProducts)
        setChartData(repRes.chartData)
      } else {
        throw new Error('Gagal memuat laporan summary')
      }
      setTransactions(txs)
    } catch (e: any) {
      console.error(e)
      setError(e.message || 'Gagal memuat data laporan.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [reportType])

  // Custom Chart dimensions
  const chartHeight = 180
  const maxVal = chartData.length > 0 ? Math.max(...chartData.map(d => d.revenue), 100000) : 100000

  return (
    <main className="flex-1 p-6 space-y-6 overflow-y-auto bg-[#F8FAFC]">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-[#1E2330]">Laporan Penjualan</h2>
          <p className="text-sm text-[#6E7385] mt-0.5">Analisis omset, profitabilitas, dan produk terlaris</p>
        </div>

        {/* Tab Buttons */}
        <div className="flex gap-1 bg-[#EEF0FA] rounded-xl p-1 shadow-inner border border-[#E2E8F0]/50">
          {(['daily', 'weekly', 'monthly'] as const).map(type => (
            <button
              key={type}
              onClick={() => setReportType(type)}
              className={`px-4.5 py-2 rounded-lg text-xs font-extrabold transition-all duration-200 active:scale-95 ${
                reportType === type
                  ? 'bg-white text-[#5B50E5] shadow-sm'
                  : 'text-[#6E7385] hover:text-[#1E2330]'
              }`}
            >
              {type === 'daily' ? 'Harian' : type === 'weekly' ? 'Mingguan' : 'Bulanan'}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 flex items-center gap-2">
          <span className="material-symbols-outlined text-base">error</span>
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-28 bg-white border border-[#E2E8F0] rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : summary ? (
        <>
          {/* Metrics Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Omset */}
            <div className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-[#6E7385] uppercase tracking-wider">Total Omset</span>
                <h3 className="text-xl font-extrabold text-[#1E2330] tracking-tight">{formatCurrency(summary.revenue)}</h3>
                <div className="flex items-center gap-1 text-xs">
                  <span className={`font-bold flex items-center ${summary.growth >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    <span className="material-symbols-outlined text-xs font-bold">
                      {summary.growth >= 0 ? 'trending_up' : 'trending_down'}
                    </span>
                    {Math.abs(summary.growth).toFixed(1)}%
                  </span>
                  <span className="text-[#6E7385]/60 text-[10px]">vs periode lalu</span>
                </div>
              </div>
              <div className="w-11 h-11 rounded-xl bg-indigo-50 text-[#5B50E5] flex items-center justify-center border border-[#E2E8F0] shadow-sm shrink-0">
                <span className="material-symbols-outlined">payments</span>
              </div>
            </div>

            {/* Profit */}
            <div className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-[#6E7385] uppercase tracking-wider">Keuntungan Bersih</span>
                <h3 className="text-xl font-extrabold text-emerald-600 tracking-tight">{formatCurrency(summary.profit)}</h3>
                <span className="text-[#6E7385]/60 text-[10px]">Margin: <strong className="text-[#1E2330]">{summary.revenue > 0 ? ((summary.profit / summary.revenue) * 100).toFixed(0) : 0}%</strong></span>
              </div>
              <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-[#E2E8F0] shadow-sm shrink-0">
                <span className="material-symbols-outlined">trending_up</span>
              </div>
            </div>

            {/* Total Transactions */}
            <div className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-[#6E7385] uppercase tracking-wider">Jumlah Transaksi</span>
                <h3 className="text-xl font-extrabold text-[#1E2330] tracking-tight">{summary.transactionsCount}</h3>
                <span className="text-[#6E7385]/60 text-[10px]">Checkout sukses</span>
              </div>
              <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-[#E2E8F0] shadow-sm shrink-0">
                <span className="material-symbols-outlined">receipt_long</span>
              </div>
            </div>

            {/* Average Ticket */}
            <div className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-[#6E7385] uppercase tracking-wider">Rata-rata Transaksi</span>
                <h3 className="text-xl font-extrabold text-[#1E2330] tracking-tight">{formatCurrency(summary.averageTransaction)}</h3>
                <span className="text-[#6E7385]/60 text-[10px]">Nilai keranjang rata-rata</span>
              </div>
              <div className="w-11 h-11 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center border border-[#E2E8F0] shadow-sm shrink-0">
                <span className="material-symbols-outlined">shopping_cart</span>
              </div>
            </div>
          </div>

          {/* Chart Section */}
          <div className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-sm">
            <h3 className="font-bold text-sm text-[#1E2330] mb-5 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#5B50E5]">bar_chart</span>
              Tren Penjualan & Profit
            </h3>

            {/* Bar Chart Container using pure HTML/CSS and Flexbox for guaranteed loading and clean aesthetics */}
            <div className="flex items-end justify-between gap-2 md:gap-4 pt-4 border-b border-[#E2E8F0]" style={{ height: `${chartHeight}px` }}>
              {chartData.map((d, i) => {
                const revenuePercent = (d.revenue / maxVal) * 100
                const profitPercent = (d.profit / maxVal) * 100

                return (
                  <div key={i} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                    {/* Tooltip on Hover */}
                    <div className="absolute bottom-full mb-2 bg-[#1E2330] text-white text-[10px] rounded-lg px-2.5 py-1.5 shadow-md hidden group-hover:block z-20 pointer-events-none whitespace-nowrap">
                      <p className="font-bold">{d.label}</p>
                      <p className="text-[#A5B4FC]">Omset: {formatCurrency(d.revenue)}</p>
                      <p className="text-emerald-400">Profit: {formatCurrency(d.profit)}</p>
                    </div>

                    {/* Columns Stack */}
                    <div className="w-full flex justify-center items-end gap-0.5 h-full">
                      {/* Revenue Column */}
                      <div
                        className="w-2.5 md:w-5 bg-gradient-to-t from-[#5B50E5]/70 to-[#5B50E5] rounded-t-sm transition-all duration-500 hover:brightness-110"
                        style={{ height: `${Math.max(revenuePercent, 2)}%` }}
                      />
                      {/* Profit Column */}
                      <div
                        className="w-1.5 md:w-3 bg-gradient-to-t from-emerald-500/70 to-emerald-500 rounded-t-sm transition-all duration-500 hover:brightness-110"
                        style={{ height: `${Math.max(profitPercent, 2)}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Labels row */}
            <div className="flex justify-between items-center gap-2 md:gap-4 mt-2 overflow-x-auto text-[9px] font-bold text-[#6E7385] select-none">
              {chartData.map((d, i) => (
                <div key={i} className="flex-1 text-center truncate">{d.label}</div>
              ))}
            </div>
            {/* Legend indicators */}
            <div className="flex gap-4 items-center justify-center mt-5 text-[10px] font-bold">
              <span className="flex items-center gap-1.5 text-[#1E2330]">
                <span className="w-3 h-3 rounded bg-[#5B50E5]" />
                Omset Penjualan
              </span>
              <span className="flex items-center gap-1.5 text-[#1E2330]">
                <span className="w-3 h-3 rounded bg-emerald-500" />
                Keuntungan Bersih (Profit)
              </span>
            </div>
          </div>

          {/* Grid Bottom: Top Selling & Recent History */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Top Products */}
            <div className="lg:col-span-5 bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-sm flex flex-col">
              <h3 className="font-bold text-sm text-[#1E2330] mb-4 flex items-center gap-2 border-b border-[#E2E8F0]/50 pb-3 shrink-0">
                <span className="material-symbols-outlined text-[#5B50E5]">star</span>
                Produk Terlaris
              </h3>
              {topProducts.length === 0 ? (
                <div className="flex-1 flex flex-col justify-center items-center py-10 text-[#6E7385]/40 text-center">
                  <span className="material-symbols-outlined text-4xl mb-1">shopping_basket</span>
                  <p className="text-xs font-bold">Belum ada data produk terjual</p>
                </div>
              ) : (
                <div className="space-y-4.5 flex-1 overflow-y-auto">
                  {topProducts.map((p, i) => {
                    const maxQty = Math.max(...topProducts.map(x => x.qty), 1)
                    const percent = (p.qty / maxQty) * 100
                    return (
                      <div key={i} className="space-y-1.5">
                        <div className="flex justify-between items-center text-xs font-bold">
                          <span className="text-[#1E2330] truncate pr-2">{i+1}. {p.name}</span>
                          <span className="text-[#5B50E5] shrink-0 font-mono">{p.qty} unit</span>
                        </div>
                        {/* Progress Bar */}
                        <div className="h-2 w-full bg-[#EEF0FA] rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-[#5B50E5] to-indigo-400 rounded-full" style={{ width: `${percent}%` }} />
                        </div>
                        <div className="text-[10px] text-[#6E7385] font-semibold flex justify-between">
                          <span>Total Terjual</span>
                          <span>{formatCurrency(p.revenue)}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Right: Recent Transactions */}
            <div className="lg:col-span-7 bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-sm flex flex-col">
              <h3 className="font-bold text-sm text-[#1E2330] mb-4 flex items-center gap-2 border-b border-[#E2E8F0]/50 pb-3 shrink-0">
                <span className="material-symbols-outlined text-[#5B50E5]">history</span>
                Riwayat Transaksi Terbaru
              </h3>
              {transactions.length === 0 ? (
                <div className="flex-1 flex flex-col justify-center items-center py-10 text-[#6E7385]/40 text-center">
                  <span className="material-symbols-outlined text-4xl mb-1 flex">assignment</span>
                  <p className="text-xs font-bold">Belum ada transaksi</p>
                </div>
              ) : (
                <div className="flex-1 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-[#6E7385] font-bold border-b border-[#E2E8F0] pb-2 text-left uppercase text-[9px] tracking-wider">
                        <th className="pb-2">Invoice</th>
                        <th className="pb-2">Tanggal</th>
                        <th className="pb-2">Kasir</th>
                        <th className="pb-2 text-center">Metode</th>
                        <th className="pb-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0]/40 font-semibold text-[#1E2330]">
                      {transactions.slice(0, 5).map(tx => (
                        <tr key={tx.id} className="hover:bg-[#F8FAFC]">
                          <td className="py-2.5 font-mono text-[10px] text-[#5B50E5]">{tx.invoiceNumber}</td>
                          <td className="py-2.5 text-[#6E7385]">{formatDate(tx.createdAt)}</td>
                          <td className="py-2.5">{tx.cashierName}</td>
                          <td className="py-2.5 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                              tx.paymentMethod === 'CASH' ? 'bg-emerald-50 text-emerald-700' : tx.paymentMethod === 'CARD' ? 'bg-indigo-50 text-indigo-700' : 'bg-sky-50 text-sky-700'
                            }`}>{tx.paymentMethod}</span>
                          </td>
                          <td className="py-2.5 text-right font-bold text-[#1E2330] font-mono">{formatCurrency(tx.totalAmount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="py-20 text-center text-[#6E7385]/55">
          <span className="material-symbols-outlined text-5xl mb-2 text-[#5B50E5]/30">bar_chart</span>
          <p className="font-bold text-sm">Tidak ada data laporan tersedia</p>
        </div>
      )}
    </main>
  )
}
