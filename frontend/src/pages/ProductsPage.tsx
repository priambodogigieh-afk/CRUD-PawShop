import { useState, useEffect, useMemo, type FormEvent } from 'react'
import { fetchProducts, createProduct, updateProduct, deleteProduct, fetchCategories, fetchBrands } from '../api'
import type { Product, Category, Brand, ProductInput } from '../types'
import { useAuth } from '../context/AuthContext'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatCurrency(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}

function useToast() {
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const show = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }
  return { toast, show }
}

// ─── Product Form Modal ───────────────────────────────────────────────────────
interface ProductFormProps {
  editing: Product | null
  categories: Category[]
  brands: Brand[]
  onClose: () => void
  onSaved: (product: Product) => void
}

function ProductFormModal({ editing, categories, brands, onClose, onSaved }: ProductFormProps) {
  const [sku, setSku] = useState(editing?.sku ?? '')
  const [name, setName] = useState(editing?.name ?? '')
  const [categoryId, setCategoryId] = useState<string>(editing?.categoryId ? String(editing.categoryId) : '')
  const [brandId, setBrandId] = useState<string>(editing?.brandId ? String(editing.brandId) : '')
  const [sellingPrice, setSellingPrice] = useState<string>(editing?.sellingPrice ? String(editing.sellingPrice) : '')
  const [stock, setStock] = useState<string>(editing?.stock !== undefined ? String(editing.stock) : '0')
  const [expiredDate, setExpiredDate] = useState<string>(
    editing?.expiredDate ? new Date(editing.expiredDate).toISOString().split('T')[0] : ''
  )
  const [imageUrl, setImageUrl] = useState<string>(editing?.imageUrl ?? '')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 1.5 * 1024 * 1024) {
      setError('Ukuran gambar tidak boleh melebihi 1.5MB')
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setImageUrl(reader.result)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    const trimmedSku = sku.trim().toUpperCase()
    const trimmedName = name.trim()
    const sell = parseFloat(sellingPrice)
    const stk = parseInt(stock)

    if (!trimmedSku || !trimmedName || !categoryId) {
      setError('SKU, nama produk, dan kategori wajib diisi')
      return
    }

    const skuRegex = /^[A-Z0-9-]+$/
    if (!skuRegex.test(trimmedSku)) {
      setError('SKU hanya boleh berisi huruf besar, angka, dan tanda hubung (-)')
      return
    }

    if (isNaN(sell) || sell < 0) {
      setError('Harga jual harus berupa angka positif')
      return
    }

    if (isNaN(stk) || stk < 0) {
      setError('Stok harus berupa angka bulat positif')
      return
    }

    const payload: ProductInput = {
      sku: trimmedSku,
      name: trimmedName,
      categoryId: parseInt(categoryId),
      brandId: brandId ? parseInt(brandId) : null,
      costPrice: 0,
      sellingPrice: sell,
      stock: stk,
      expiredDate: expiredDate || null,
      imageUrl: imageUrl || null
    }

    setSubmitting(true)
    try {
      let saved: Product
      if (editing) {
        const res = await updateProduct(editing.id, payload)
        saved = res.product
      } else {
        const res = await createProduct(payload)
        saved = res.product
      }
      onSaved(saved)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-[#E2E8F0] max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0] shrink-0">
          <h3 className="font-bold text-[#1E2330] flex items-center gap-2">
            <span className="material-symbols-outlined text-[#5B50E5]">{editing ? 'edit' : 'add_box'}</span>
            {editing ? 'Edit Produk' : 'Tambah Produk Baru'}
          </h3>
          <button onClick={onClose} className="p-2 text-[#6E7385] hover:bg-[#EEF0FA] rounded-lg transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-base shrink-0">error</span>
              {error}
            </div>
          )}

          {/* SKU + Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#6E7385] mb-1.5 uppercase tracking-wide">SKU *</label>
              <input className="w-full border border-[#E2E8F0] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#5B50E5] focus:ring-2 focus:ring-[#5B50E5]/10"
                placeholder="e.g. RC-MAXI-15KG" value={sku} onChange={e => setSku(e.target.value)} required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#6E7385] mb-1.5 uppercase tracking-wide">Nama Produk *</label>
              <input className="w-full border border-[#E2E8F0] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#5B50E5] focus:ring-2 focus:ring-[#5B50E5]/10"
                placeholder="e.g. Royal Canin Maxi Adult 15kg" value={name} onChange={e => setName(e.target.value)} required />
            </div>
          </div>

          {/* Category + Brand */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#6E7385] mb-1.5 uppercase tracking-wide">Kategori *</label>
              <select className="w-full border border-[#E2E8F0] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#5B50E5] bg-white"
                value={categoryId} onChange={e => setCategoryId(e.target.value)} required>
                <option value="">Pilih Kategori</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#6E7385] mb-1.5 uppercase tracking-wide">Merek</label>
              <select className="w-full border border-[#E2E8F0] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#5B50E5] bg-white"
                value={brandId} onChange={e => setBrandId(e.target.value)}>
                <option value="">Tidak Ada Merek</option>
                {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          </div>

          {/* Harga Jual */}
          <div>
            <label className="block text-xs font-semibold text-[#6E7385] mb-1.5 uppercase tracking-wide">Harga Jual (Rp) *</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6E7385] text-sm font-semibold">Rp</span>
              <input type="number" min="0" step="500"
                className="w-full border border-[#E2E8F0] rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-[#5B50E5] focus:ring-2 focus:ring-[#5B50E5]/10"
                placeholder="0" value={sellingPrice} onChange={e => setSellingPrice(e.target.value)} required />
            </div>
          </div>

          {/* Stock + Expired */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#6E7385] mb-1.5 uppercase tracking-wide">
                {editing ? 'Jumlah Stok *' : 'Stok Awal *'}
              </label>
              <input type="number" min="0"
                className="w-full border border-[#E2E8F0] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#5B50E5] focus:ring-2 focus:ring-[#5B50E5]/10"
                placeholder="0" value={stock} onChange={e => setStock(e.target.value)} required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#6E7385] mb-1.5 uppercase tracking-wide">
                Tanggal Kadaluarsa
                <span className="text-[#6E7385]/50 font-normal ml-1">(opsional)</span>
              </label>
              <input type="date"
                className="w-full border border-[#E2E8F0] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#5B50E5] focus:ring-2 focus:ring-[#5B50E5]/10 bg-white"
                value={expiredDate} onChange={e => setExpiredDate(e.target.value)} />
            </div>
          </div>

          {/* Foto Produk */}
          <div>
            <label className="block text-xs font-semibold text-[#6E7385] mb-1.5 uppercase tracking-wide">
              Foto Produk
              <span className="text-[#6E7385]/50 font-normal ml-1">(opsional, maks 1.5MB)</span>
            </label>
            <div className="flex items-center gap-4 border border-[#E2E8F0] rounded-xl p-4 bg-[#F8FAFC]">
              {imageUrl ? (
                <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-[#E2E8F0] shrink-0 bg-white flex items-center justify-center">
                  <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setImageUrl('')}
                    className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded-full p-1 shadow-md transition-colors"
                    title="Hapus Foto"
                  >
                    <span className="material-symbols-outlined text-xs leading-none font-bold">close</span>
                  </button>
                </div>
              ) : (
                <div className="w-24 h-24 rounded-lg border-2 border-dashed border-[#E2E8F0] shrink-0 flex flex-col items-center justify-center text-[#6E7385]/40 bg-white">
                  <span className="material-symbols-outlined text-[32px]">image</span>
                  <span className="text-[10px] mt-1 font-semibold">Belum Ada</span>
                </div>
              )}
              <div className="flex-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  id="product-image-upload"
                />
                <label
                  htmlFor="product-image-upload"
                  className="inline-flex items-center gap-2 px-4 py-2 border border-[#E2E8F0] rounded-xl bg-white hover:bg-[#EEF0FA] text-[#1E2330] text-xs font-bold cursor-pointer transition-all active:scale-95"
                >
                  <span className="material-symbols-outlined text-sm">upload</span>
                  Pilih Berkas Foto
                </label>
                <p className="text-[11px] text-[#6E7385] mt-1.5">
                  Format yang didukung: JPG, PNG, WEBP. Maksimal 1.5MB.
                </p>
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#E2E8F0] flex justify-end gap-3 shrink-0">
          <button type="button" onClick={onClose}
            className="px-5 py-2.5 text-sm font-semibold bg-[#EEF0FA] hover:bg-white border border-[#E2E8F0] text-[#6E7385] rounded-xl transition-all">
            Batal
          </button>
          <button
            onClick={handleSubmit as any}
            disabled={submitting}
            className="px-6 py-2.5 text-sm font-semibold bg-[#5B50E5] hover:bg-[#4A3FC8] disabled:opacity-60 text-white rounded-xl transition-all flex items-center gap-2">
            {submitting && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {submitting ? 'Menyimpan...' : editing ? 'Simpan Perubahan' : 'Tambah Produk'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ProductsPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'
  const { toast, show } = useToast()

  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [search, setSearch] = useState('')
  const [filterCategoryId, setFilterCategoryId] = useState<string>('')
  const [sortBy, setSortBy] = useState<string>('name_asc')

  // Modal
  const [modalOpen, setModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)

  // Delete confirm
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const [prods, cats, brds] = await Promise.all([fetchProducts(), fetchCategories(), fetchBrands()])
      setProducts(prods)
      setCategories(cats)
      setBrands(brds)
    } catch (e: any) { show(e.message, 'error') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  // Client-side filter + sort (fast UX, no debounce needed for small datasets)
  const filtered = useMemo(() => {
    let list = [...products]
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(p => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q))
    }
    if (filterCategoryId) list = list.filter(p => p.categoryId === parseInt(filterCategoryId))
    switch (sortBy) {
      case 'price_asc': list.sort((a, b) => a.sellingPrice - b.sellingPrice); break
      case 'price_desc': list.sort((a, b) => b.sellingPrice - a.sellingPrice); break
      case 'stock_asc': list.sort((a, b) => a.stock - b.stock); break
      case 'stock_desc': list.sort((a, b) => b.stock - a.stock); break
      default: list.sort((a, b) => a.name.localeCompare(b.name))
    }
    return list
  }, [products, search, filterCategoryId, sortBy])

  const handleOpenAdd = () => { setEditingProduct(null); setModalOpen(true) }
  const handleOpenEdit = (p: Product) => { setEditingProduct(p); setModalOpen(true) }

  const handleSaved = (saved: Product) => {
    setProducts(prev => {
      const exists = prev.find(p => p.id === saved.id)
      return exists ? prev.map(p => p.id === saved.id ? saved : p) : [saved, ...prev]
    })
    show(editingProduct ? 'Produk berhasil diperbarui' : 'Produk berhasil ditambahkan')
    setModalOpen(false)
  }

  const handleDelete = async () => {
    if (deletingId === null) return
    try {
      await deleteProduct(deletingId)
      setProducts(prev => prev.filter(p => p.id !== deletingId))
      show('Produk berhasil dihapus')
    } catch (e: any) { show(e.message, 'error') }
    finally { setDeletingId(null) }
  }

  const isExpiringSoon = (date: string | null) => {
    if (!date) return false
    const days = (new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    return days >= 0 && days <= 30
  }

  const isExpired = (date: string | null) => {
    if (!date) return false
    return new Date(date) < new Date()
  }

  return (
    <main className="flex-1 p-6 space-y-5 overflow-y-auto animate-fade-in-up">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-semibold flex items-center gap-2 ${toast.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          <span className="material-symbols-outlined text-base">{toast.type === 'success' ? 'check_circle' : 'error'}</span>
          {toast.msg}
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deletingId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 shadow-2xl border border-[#E2E8F0] max-w-sm w-full">
            <div className="flex items-center gap-3 text-red-600 mb-3">
              <span className="material-symbols-outlined text-2xl">warning</span>
              <h3 className="font-bold">Konfirmasi Hapus</h3>
            </div>
            <p className="text-sm text-[#6E7385] mb-5">Apakah Anda yakin ingin menghapus produk ini? Tindakan ini tidak dapat dibatalkan.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeletingId(null)}
                className="px-4 py-2 text-sm font-semibold bg-[#EEF0FA] border border-[#E2E8F0] text-[#6E7385] rounded-xl hover:bg-white transition-all">
                Batal
              </button>
              <button onClick={handleDelete}
                className="px-4 py-2 text-sm font-semibold bg-red-600 hover:bg-red-700 text-white rounded-xl transition-all">
                Hapus Permanen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <ProductFormModal
          editing={editingProduct}
          categories={categories}
          brands={brands}
          onClose={() => setModalOpen(false)}
          onSaved={handleSaved}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-[#1E2330]">Manajemen Produk</h2>
          <p className="text-sm text-[#6E7385] mt-0.5">{filtered.length} dari {products.length} produk ditampilkan</p>
        </div>
        {isAdmin && (
          <button onClick={handleOpenAdd}
            className="flex items-center gap-2 bg-[#5B50E5] hover:bg-[#4A3FC8] text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-md shadow-[#5B50E5]/20 hover:shadow-[#5B50E5]/30">
            <span className="material-symbols-outlined text-lg">add</span>
            Tambah Produk
          </button>
        )}
      </div>

      {/* Control Bar */}
      <div className="flex flex-wrap gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6E7385]">search</span>
          <input
            className="w-full pl-10 pr-4 py-2.5 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:border-[#5B50E5] focus:ring-2 focus:ring-[#5B50E5]/10 bg-white"
            placeholder="Cari nama produk atau SKU..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6E7385] hover:text-[#1E2330]">
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          )}
        </div>
        {/* Category Filter */}
        <select
          className="border border-[#E2E8F0] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#5B50E5] bg-white text-[#1E2330] min-w-[160px]"
          value={filterCategoryId}
          onChange={e => setFilterCategoryId(e.target.value)}
        >
          <option value="">Semua Kategori</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {/* Sort */}
        <select
          className="border border-[#E2E8F0] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#5B50E5] bg-white text-[#1E2330] min-w-[180px]"
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
        >
          <option value="name_asc">Nama A–Z</option>
          <option value="price_asc">Harga Jual Terendah</option>
          <option value="price_desc">Harga Jual Tertinggi</option>
          <option value="stock_asc">Stok Sedikit</option>
          <option value="stock_desc">Stok Terbanyak</option>
        </select>
        {/* Refresh */}
        <button onClick={load} className="p-2.5 border border-[#E2E8F0] rounded-xl text-[#6E7385] hover:bg-[#EEF0FA] transition-colors" title="Refresh">
          <span className={`material-symbols-outlined ${loading ? 'animate-spin' : ''}`}>refresh</span>
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {[1,2,3,4,5].map(i => <div key={i} className="h-12 bg-[#EEF0FA] rounded-xl animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-[#6E7385]/50">
            <span className="material-symbols-outlined text-5xl mb-2 block text-[#5B50E5]/30">inventory_2</span>
            <p className="font-semibold text-sm">Tidak ada produk ditemukan</p>
            <p className="text-xs mt-1">Coba ubah filter atau tambahkan produk baru</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm whitespace-nowrap">
              <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                <tr>
                  <th className="text-left px-5 py-3 font-semibold text-[#6E7385] text-xs uppercase tracking-wider">SKU</th>
                  <th className="text-left px-5 py-3 font-semibold text-[#6E7385] text-xs uppercase tracking-wider">Nama Produk</th>
                  <th className="text-left px-5 py-3 font-semibold text-[#6E7385] text-xs uppercase tracking-wider">Kategori</th>
                  <th className="text-left px-5 py-3 font-semibold text-[#6E7385] text-xs uppercase tracking-wider">Merek</th>
                  <th className="text-right px-5 py-3 font-semibold text-[#6E7385] text-xs uppercase tracking-wider">Harga Jual</th>
                  <th className="text-center px-5 py-3 font-semibold text-[#6E7385] text-xs uppercase tracking-wider">Stok</th>
                  <th className="text-center px-5 py-3 font-semibold text-[#6E7385] text-xs uppercase tracking-wider">Kadaluarsa</th>
                  {isAdmin && <th className="text-right px-5 py-3 font-semibold text-[#6E7385] text-xs uppercase tracking-wider">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {filtered.map(p => {
                  const lowStock = p.stock < 5
                  const veryLowStock = p.stock === 0
                  const expired = isExpired(p.expiredDate)
                  const expiring = isExpiringSoon(p.expiredDate)
                  return (
                    <tr key={p.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="px-5 py-3.5">
                        <span className="font-mono text-xs bg-[#EEF0FA] text-[#5B50E5] px-2 py-1 rounded-lg">{p.sku}</span>
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-[#1E2330] max-w-[200px]">
                        <div className="truncate" title={p.name}>{p.name}</div>
                      </td>
                      <td className="px-5 py-3.5 text-[#6E7385]">{p.category.name}</td>
                      <td className="px-5 py-3.5 text-[#6E7385]">{p.brand?.name ?? <span className="italic text-[#6E7385]/40">—</span>}</td>
                      <td className="px-5 py-3.5 text-right font-bold text-[#1E2330] font-mono text-xs">{formatCurrency(p.sellingPrice)}</td>
                      <td className="px-5 py-3.5 text-center">
                        <span className={`inline-flex items-center justify-center font-bold text-xs px-2.5 py-1 rounded-full ${
                          veryLowStock
                            ? 'bg-red-100 text-red-700 ring-1 ring-red-200'
                            : lowStock
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-emerald-50 text-emerald-700'
                        }`}>
                          {veryLowStock && <span className="mr-1">⚠</span>}
                          {p.stock}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        {p.expiredDate ? (
                          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                            expired ? 'bg-red-100 text-red-700' : expiring ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {expired ? '⚠ ' : expiring ? '⏰ ' : ''}{formatDate(p.expiredDate)}
                          </span>
                        ) : <span className="text-[#6E7385]/40 text-xs">—</span>}
                      </td>
                      {isAdmin && (
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button onClick={() => handleOpenEdit(p)}
                              className="p-1.5 text-[#6E7385] hover:text-[#5B50E5] hover:bg-[#EEF0FA] rounded-lg transition-all" title="Edit">
                              <span className="material-symbols-outlined text-lg">edit</span>
                            </button>
                            <button onClick={() => setDeletingId(p.id)}
                              className="p-1.5 text-[#6E7385] hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Hapus">
                              <span className="material-symbols-outlined text-lg">delete</span>
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Summary Footer */}
        {!loading && products.length > 0 && (
          <div className="px-5 py-3 border-t border-[#E2E8F0] bg-[#F8FAFC] flex flex-wrap gap-4 text-xs text-[#6E7385]">
            <span>Total: <strong className="text-[#1E2330]">{products.length} SKU</strong></span>
            <span>Stok kritis (&lt;5): <strong className="text-red-600">{products.filter(p => p.stock < 5).length} produk</strong></span>
          </div>
        )}
      </div>
    </main>
  )
}
