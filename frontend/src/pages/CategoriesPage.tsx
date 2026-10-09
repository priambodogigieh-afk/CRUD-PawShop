import { useState, useEffect, type FormEvent, useCallback } from 'react'
import {
  fetchCategories, createCategory, updateCategory, deleteCategory,
  fetchBrands, createBrand, updateBrand, deleteBrand
} from '../api'
import type { Category, Brand } from '../types'
import { useAuth } from '../context/AuthContext'
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
import { RefreshCw, Edit, Trash2 } from 'lucide-react'

// ─── Toast ────────────────────────────────────────────────────────────────────
function useToast() {
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const show = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }, [])
  return { toast, show }
}

// ─── Category Section ─────────────────────────────────────────────────────────
function CategorySection({ isAdmin }: { isAdmin: boolean }) {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formName, setFormName] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { toast, show } = useToast()

  const load = useCallback(async () => {
    setLoading(true)
    try { setCategories(await fetchCategories()) }
    catch (e: any) { show(e.message, 'error') }
    finally { setLoading(false) }
  }, [show])

  useEffect(() => { load() }, [load])

  const resetForm = () => { setEditingId(null); setFormName(''); setFormDesc('') }

  const handleEdit = (cat: Category) => {
    setEditingId(cat.id); setFormName(cat.name); setFormDesc(cat.description ?? '')
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const name = formName.trim()
    const desc = formDesc.trim() || undefined

    if (!name) return show('Nama kategori tidak boleh kosong', 'error')
    if (name.length < 2) return show('Nama kategori harus memiliki minimal 2 karakter', 'error')

    setSubmitting(true)
    try {
      if (editingId !== null) {
        const res = await updateCategory(editingId, { name, description: desc })
        setCategories(prev => prev.map(c => c.id === editingId ? { ...res.category, _count: c._count } : c))
        show('Kategori berhasil diperbarui')
      } else {
        const res = await createCategory({ name, description: desc })
        setCategories(prev => [...prev, { ...res.category, _count: { products: 0 } }])
        show('Kategori berhasil ditambahkan')
      }
      resetForm()
    } catch (e: any) { show(e.message, 'error') }
    finally { setSubmitting(false) }
  }

  const handleDelete = async (cat: Category) => {
    if (!confirm(`Hapus kategori "${cat.name}"?`)) return
    try {
      await deleteCategory(cat.id)
      setCategories(prev => prev.filter(c => c.id !== cat.id))
      show('Kategori berhasil dihapus')
    } catch (e: any) { show(e.message, 'error') }
  }

  return (
    <div className="space-y-5">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-semibold flex items-center gap-2 ${toast.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          <span className="material-symbols-outlined text-base">{toast.type === 'success' ? 'check_circle' : 'error'}</span>
          {toast.msg}
        </div>
      )}

      {/* Form */}
      {isAdmin && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-sm">
          <h3 className="font-bold text-sm text-[#1E2330] mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-[#5B50E5]">{editingId ? 'edit' : 'add_circle'}</span>
            {editingId ? 'Edit Kategori' : 'Tambah Kategori Baru'}
          </h3>
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
            <Input
              className="flex-1 border-[#E2E8F0] rounded-xl px-4 py-2.5 text-sm focus-visible:border-[#5B50E5] focus-visible:ring-[#5B50E5]/10 h-10"
              placeholder="Nama kategori (e.g. Makanan Kucing)"
              value={formName}
              onChange={e => setFormName(e.target.value)}
              required
            />
            <Input
              className="flex-1 border-[#E2E8F0] rounded-xl px-4 py-2.5 text-sm focus-visible:border-[#5B50E5] focus-visible:ring-[#5B50E5]/10 h-10"
              placeholder="Deskripsi (opsional)"
              value={formDesc}
              onChange={e => setFormDesc(e.target.value)}
            />
            <div className="flex gap-2 shrink-0">
              <Button
                type="submit"
                disabled={submitting}
                className="bg-[#5B50E5] hover:bg-[#4A3FC8] text-white px-5 rounded-xl text-sm font-semibold h-10 cursor-pointer shadow-sm shadow-[#5B50E5]/20"
              >
                {submitting ? 'Menyimpan...' : editingId ? 'Simpan' : 'Tambah'}
              </Button>
              {editingId && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForm}
                  className="bg-[#EEF0FA] hover:bg-white border-[#E2E8F0] text-[#6E7385] px-4 rounded-xl text-sm font-semibold h-10 cursor-pointer"
                >
                  Batal
                </Button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
          <h3 className="font-bold text-[#1E2330] flex items-center gap-2">
            <span className="material-symbols-outlined text-[#5B50E5]">category</span>
            Daftar Kategori
            <Badge variant="outline" className="ml-1 bg-[#EEF0FA] border-transparent text-[#5B50E5] text-xs font-bold px-2 py-0.5 rounded-full">
              {categories.length}
            </Badge>
          </h3>
          <Button
            size="icon"
            variant="ghost"
            onClick={load}
            className="text-[#6E7385] hover:bg-[#EEF0FA] p-2 rounded-lg cursor-pointer h-8 w-8"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        {loading ? (
          <div className="overflow-x-auto">
            <Table className="w-full text-sm">
              <TableHeader className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                <TableRow>
                  <TableHead className="text-left px-6 py-3 font-semibold text-[#6E7385] text-xs uppercase tracking-wider">Nama Kategori</TableHead>
                  <TableHead className="text-left px-6 py-3 font-semibold text-[#6E7385] text-xs uppercase tracking-wider">Deskripsi</TableHead>
                  <TableHead className="text-center px-6 py-3 font-semibold text-[#6E7385] text-xs uppercase tracking-wider">Jumlah Produk</TableHead>
                  {isAdmin && <TableHead className="text-right px-6 py-3 font-semibold text-[#6E7385] text-xs uppercase tracking-wider">Aksi</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                <SkeletonRow cols={isAdmin ? 4 : 3} rows={3} />
              </TableBody>
            </Table>
          </div>
        ) : categories.length === 0 ? (
          <EmptyState
            icon="category"
            title="Belum ada kategori"
            description="Buat kategori baru untuk mengelompokkan produk-produk toko Anda."
          />
        ) : (
          <div className="overflow-x-auto">
            <Table className="w-full text-sm">
              <TableHeader className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                <TableRow>
                  <TableHead className="text-left px-6 py-3 font-semibold text-[#6E7385] text-xs uppercase tracking-wider">Nama Kategori</TableHead>
                  <TableHead className="text-left px-6 py-3 font-semibold text-[#6E7385] text-xs uppercase tracking-wider">Deskripsi</TableHead>
                  <TableHead className="text-center px-6 py-3 font-semibold text-[#6E7385] text-xs uppercase tracking-wider">Jumlah Produk</TableHead>
                  {isAdmin && <TableHead className="text-right px-6 py-3 font-semibold text-[#6E7385] text-xs uppercase tracking-wider">Aksi</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-[#E2E8F0]">
                {categories.map(cat => (
                  <TableRow key={cat.id} className="hover:bg-[#F8FAFC] transition-colors border-[#E2E8F0]">
                    <TableCell className="px-6 py-4 font-semibold text-[#1E2330]">{cat.name}</TableCell>
                    <TableCell className="px-6 py-4 text-[#6E7385]">{cat.description || <span className="italic text-[#6E7385]/40">—</span>}</TableCell>
                    <TableCell className="px-6 py-4 text-center">
                      <Badge variant="outline" className="inline-flex items-center justify-center bg-[#EEF0FA] border-transparent text-[#5B50E5] font-bold text-xs px-2.5 py-1 rounded-full">
                        {cat._count?.products ?? 0} produk
                      </Badge>
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleEdit(cat)}
                            className="p-1.5 text-[#6E7385] hover:text-[#5B50E5] hover:bg-[#EEF0FA] rounded-lg cursor-pointer h-8 w-8"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDelete(cat)}
                            className="p-1.5 text-[#6E7385] hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer h-8 w-8"
                            title="Hapus"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Brand Section ────────────────────────────────────────────────────────────
function BrandSection({ isAdmin }: { isAdmin: boolean }) {
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formName, setFormName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { toast, show } = useToast()

  const load = useCallback(async () => {
    setLoading(true)
    try { setBrands(await fetchBrands()) }
    catch (e: any) { show(e.message, 'error') }
    finally { setLoading(false) }
  }, [show])

  useEffect(() => { load() }, [load])

  const resetForm = () => { setEditingId(null); setFormName('') }

  const handleEdit = (b: Brand) => { setEditingId(b.id); setFormName(b.name) }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const name = formName.trim()

    if (!name) return show('Nama merek tidak boleh kosong', 'error')
    if (name.length < 2) return show('Nama merek harus memiliki minimal 2 karakter', 'error')

    setSubmitting(true)
    try {
      if (editingId !== null) {
        const res = await updateBrand(editingId, { name })
        setBrands(prev => prev.map(b => b.id === editingId ? { ...res.brand, _count: b._count } : b))
        show('Merek berhasil diperbarui')
      } else {
        const res = await createBrand({ name })
        setBrands(prev => [...prev, { ...res.brand, _count: { products: 0 } }])
        show('Merek berhasil ditambahkan')
      }
      resetForm()
    } catch (e: any) { show(e.message, 'error') }
    finally { setSubmitting(false) }
  }

  const handleDelete = async (b: Brand) => {
    if (!confirm(`Hapus merek "${b.name}"?`)) return
    try {
      await deleteBrand(b.id)
      setBrands(prev => prev.filter(x => x.id !== b.id))
      show('Merek berhasil dihapus')
    } catch (e: any) { show(e.message, 'error') }
  }

  return (
    <div className="space-y-5">
      {toast && (
        <div className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-semibold flex items-center gap-2 ${toast.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          <span className="material-symbols-outlined text-base">{toast.type === 'success' ? 'check_circle' : 'error'}</span>
          {toast.msg}
        </div>
      )}

      {isAdmin && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-sm">
          <h3 className="font-bold text-sm text-[#1E2330] mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-[#5B50E5]">{editingId ? 'edit' : 'add_circle'}</span>
            {editingId ? 'Edit Merek' : 'Tambah Merek Baru'}
          </h3>
          <form onSubmit={handleSubmit} className="flex gap-3">
            <Input
              className="flex-1 border-[#E2E8F0] rounded-xl px-4 py-2.5 text-sm focus-visible:border-[#5B50E5] focus-visible:ring-[#5B50E5]/10 h-10"
              placeholder="Nama merek (e.g. Royal Canin)"
              value={formName}
              onChange={e => setFormName(e.target.value)}
              required
            />
            <div className="flex gap-2 shrink-0">
              <Button
                type="submit"
                disabled={submitting}
                className="bg-[#5B50E5] hover:bg-[#4A3FC8] text-white px-5 rounded-xl text-sm font-semibold h-10 cursor-pointer shadow-sm shadow-[#5B50E5]/20"
              >
                {submitting ? 'Menyimpan...' : editingId ? 'Simpan' : 'Tambah'}
              </Button>
              {editingId && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForm}
                  className="bg-[#EEF0FA] hover:bg-white border-[#E2E8F0] text-[#6E7385] px-4 rounded-xl text-sm font-semibold h-10 cursor-pointer"
                >
                  Batal
                </Button>
              )}
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
          <h3 className="font-bold text-[#1E2330] flex items-center gap-2">
            <span className="material-symbols-outlined text-[#5B50E5]">storefront</span>
            Daftar Merek
            <Badge variant="outline" className="ml-1 bg-[#EEF0FA] border-transparent text-[#5B50E5] text-xs font-bold px-2 py-0.5 rounded-full">
              {brands.length}
            </Badge>
          </h3>
          <Button
            size="icon"
            variant="ghost"
            onClick={load}
            className="text-[#6E7385] hover:bg-[#EEF0FA] p-2 rounded-lg cursor-pointer h-8 w-8"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        {loading ? (
          <div className="overflow-x-auto">
            <Table className="w-full text-sm">
              <TableHeader className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                <TableRow>
                  <TableHead className="text-left px-6 py-3 font-semibold text-[#6E7385] text-xs uppercase tracking-wider">Nama Merek</TableHead>
                  <TableHead className="text-center px-6 py-3 font-semibold text-[#6E7385] text-xs uppercase tracking-wider">Jumlah Produk</TableHead>
                  {isAdmin && <TableHead className="text-right px-6 py-3 font-semibold text-[#6E7385] text-xs uppercase tracking-wider">Aksi</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                <SkeletonRow cols={isAdmin ? 3 : 2} rows={3} />
              </TableBody>
            </Table>
          </div>
        ) : brands.length === 0 ? (
          <EmptyState
            icon="storefront"
            title="Belum ada merek"
            description="Daftarkan merek produk yang Anda jual di toko."
          />
        ) : (
          <div className="overflow-x-auto">
            <Table className="w-full text-sm">
              <TableHeader className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                <TableRow>
                  <TableHead className="text-left px-6 py-3 font-semibold text-[#6E7385] text-xs uppercase tracking-wider">Nama Merek</TableHead>
                  <TableHead className="text-center px-6 py-3 font-semibold text-[#6E7385] text-xs uppercase tracking-wider">Jumlah Produk</TableHead>
                  {isAdmin && <TableHead className="text-right px-6 py-3 font-semibold text-[#6E7385] text-xs uppercase tracking-wider">Aksi</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-[#E2E8F0]">
                {brands.map(b => (
                  <TableRow key={b.id} className="hover:bg-[#F8FAFC] transition-colors border-[#E2E8F0]">
                    <TableCell className="px-6 py-4 font-semibold text-[#1E2330]">{b.name}</TableCell>
                    <TableCell className="px-6 py-4 text-center">
                      <Badge variant="outline" className="inline-flex items-center justify-center bg-[#EEF0FA] border-transparent text-[#5B50E5] font-bold text-xs px-2.5 py-1 rounded-full">
                        {b._count?.products ?? 0} produk
                      </Badge>
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleEdit(b)}
                            className="p-1.5 text-[#6E7385] hover:text-[#5B50E5] hover:bg-[#EEF0FA] rounded-lg cursor-pointer h-8 w-8"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDelete(b)}
                            className="p-1.5 text-[#6E7385] hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer h-8 w-8"
                            title="Hapus"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CategoriesPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'
  const [activeTab, setActiveTab] = useState<'categories' | 'brands'>('categories')

  return (
    <main className="flex-1 p-6 space-y-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-[#1E2330]">Kategori & Merek</h2>
          <p className="text-sm text-[#6E7385] mt-0.5">Kelola klasifikasi produk toko Anda</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#EEF0FA] rounded-xl p-1 w-fit">
        <button
          onClick={() => setActiveTab('categories')}
          className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'categories' ? 'bg-white text-[#5B50E5] shadow-sm' : 'text-[#6E7385] hover:text-[#1E2330]'}`}
        >
          <span className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-base">category</span>
            Kategori
          </span>
        </button>
        <button
          onClick={() => setActiveTab('brands')}
          className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'brands' ? 'bg-white text-[#5B50E5] shadow-sm' : 'text-[#6E7385] hover:text-[#1E2330]'}`}
        >
          <span className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-base">storefront</span>
            Merek
          </span>
        </button>
      </div>

      {activeTab === 'categories'
        ? <CategorySection isAdmin={isAdmin} />
        : <BrandSection isAdmin={isAdmin} />
      }
    </main>
  )
}
