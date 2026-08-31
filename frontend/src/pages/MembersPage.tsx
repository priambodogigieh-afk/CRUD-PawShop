import { useState, useEffect, useCallback } from 'react'
import { Plus, Edit, Trash2, Search, X, Check } from 'lucide-react'
import type { Member } from '../types'
import { fetchMembers, createMember, updateMember, deleteMember } from '../api'
import { SkeletonRow } from '../components/Skeleton'
import { EmptyState } from '../components/EmptyState'

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Form Modal States
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingMember, setEditingMember] = useState<Member | null>(null)
  const [formName, setFormName] = useState('')
  const [formPhone, setFormPhone] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Toast Notification
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const loadMembers = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await fetchMembers(search)
      setMembers(data)
      setError(null)
    } catch (err: any) {
      setError(err.message || 'Gagal memuat data member')
    } finally {
      setIsLoading(false)
    }
  }, [search])

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      loadMembers()
    }, 300)
    return () => clearTimeout(delayDebounce)
  }, [loadMembers])

  const handleOpenAddModal = () => {
    setEditingMember(null)
    setFormName('')
    setFormPhone('')
    setFormError(null)
    setIsModalOpen(true)
  }

  const handleOpenEditModal = (member: Member) => {
    setEditingMember(member)
    setFormName(member.name)
    setFormPhone(member.phone)
    setFormError(null)
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const name = formName.trim()
    const phone = formPhone.trim()

    if (!name || !phone) {
      setFormError('Semua field wajib diisi')
      return
    }

    if (name.length < 2) {
      setFormError('Nama lengkap harus memiliki minimal 2 karakter')
      return
    }

    const phoneRegex = /^\+?[0-9]{9,15}$/
    if (!phoneRegex.test(phone)) {
      setFormError('Nomor telepon harus berupa angka 9-15 digit (contoh: 081234567890 atau +6281234567890)')
      return
    }

    setIsSubmitting(true)
    setFormError(null)
    try {
      if (editingMember) {
        // Update
        const res = await updateMember(editingMember.id, { name, phone })
        if (res.success) {
          showToast('Data member berhasil diperbarui!', 'success')
          setIsModalOpen(false)
          loadMembers()
        }
      } else {
        // Create
        const res = await createMember({ name, phone })
        if (res.success) {
          showToast('Member baru berhasil didaftarkan!', 'success')
          setIsModalOpen(false)
          loadMembers()
        }
      }
    } catch (err: any) {
      setFormError(err.message || 'Gagal menyimpan data member')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus member ini secara permanen?')) return
    try {
      const res = await deleteMember(id)
      if (res.success) {
        showToast('Member berhasil dihapus', 'success')
        loadMembers()
      }
    } catch (err: any) {
      showToast(err.message || 'Gagal menghapus member', 'error')
    }
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-y-auto p-6 bg-[#F8FAFC] animate-fade-in-up">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-4 rounded-xl shadow-lg transition-all duration-300 transform translate-y-0 ${
            toast.type === 'success'
              ? 'bg-[#E6F7ED] text-[#1B8755] border border-[#1B8755]/20'
              : 'bg-[#FDE8E8] text-[#E03131] border border-[#E03131]/20'
          }`}
        >
          <span className="material-symbols-outlined text-lg">
            {toast.type === 'success' ? 'check_circle' : 'error'}
          </span>
          <span className="font-semibold text-sm">{toast.message}</span>
        </div>
      )}

      {/* Header section with page title & quick actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 shrink-0">
        <div>
          <h1 className="font-headline-lg text-2xl font-extrabold text-[#1E2330]">Kelola Member</h1>
          <p className="font-label-md text-xs text-[#6E7385] mt-1">Daftar member terintegrasi untuk point reward transaksi.</p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-[#5B50E5] to-[#4A3FC8] hover:from-[#6C62EC] hover:to-[#5B50E5] text-white rounded-xl font-bold transition-all duration-200 shadow-md shadow-[#5B50E5]/20 hover:shadow-[#5B50E5]/30 active:scale-95 text-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Member</span>
        </button>
      </div>

      {/* Filter and Search Box */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 mb-6 premium-shadow-sm shrink-0">
        <div className="relative w-full max-w-md">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6E7385] pointer-events-none">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Cari berdasarkan Nama, No. Telepon atau Kode Member..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[#EEF0FA]/40 border border-[#E2E8F0] rounded-xl font-body-md text-sm text-[#1E2330] focus:outline-none focus:border-[#5B50E5] focus:ring-4 focus:ring-[#5B50E5]/10 transition-all duration-200"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-[#6E7385] hover:text-[#1E2330]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Members Table Area */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden premium-shadow-sm flex-1 flex flex-col">
        <div className="overflow-x-auto flex-1">
          {isLoading && members.length === 0 ? (
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-[#EEF0FA]/40 border-b border-[#E2E8F0] text-[#6E7385]">
                  <th className="p-4 font-bold text-xs uppercase tracking-wider pl-6">Kode Member</th>
                  <th className="p-4 font-bold text-xs uppercase tracking-wider">Nama</th>
                  <th className="p-4 font-bold text-xs uppercase tracking-wider">No. Telepon</th>
                  <th className="p-4 font-bold text-xs uppercase tracking-wider">Poin Saat Ini</th>
                  <th className="p-4 font-bold text-xs uppercase tracking-wider pr-6 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                <SkeletonRow cols={5} rows={5} />
              </tbody>
            </table>
          ) : error ? (
            <div className="p-12 text-center text-[#E03131] flex flex-col items-center justify-center h-64">
              <span className="material-symbols-outlined text-[48px] mb-2">error</span>
              <p className="font-bold text-sm">{error}</p>
            </div>
          ) : members.length === 0 ? (
            <EmptyState
              icon="group"
              title="Belum ada member terdaftar"
              description="Daftarkan pelanggan setia Anda untuk mendapatkan poin reward setiap transaksi."
              action={
                <button
                  onClick={handleOpenAddModal}
                  className="bg-[#5B50E5] hover:bg-[#4A3FC8] text-white px-5 py-2.5 rounded-xl text-xs font-semibold transition-all shadow-md shadow-[#5B50E5]/20 hover:shadow-[#5B50E5]/30 cursor-pointer"
                >
                  Tambah Member Baru
                </button>
              }
            />
          ) : (
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-[#EEF0FA]/40 border-b border-[#E2E8F0] text-[#6E7385]">
                  <th className="p-4 font-bold text-xs uppercase tracking-wider pl-6">Kode Member</th>
                  <th className="p-4 font-bold text-xs uppercase tracking-wider">Nama</th>
                  <th className="p-4 font-bold text-xs uppercase tracking-wider">No. Telepon</th>
                  <th className="p-4 font-bold text-xs uppercase tracking-wider">Poin Saat Ini</th>
                  <th className="p-4 font-bold text-xs uppercase tracking-wider pr-6 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {members.map((member) => (
                  <tr key={member.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="p-4 pl-6">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-full font-bold text-xs">
                        {member.memberCode}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="font-bold text-[#1E2330] text-sm">{member.name}</span>
                    </td>
                    <td className="p-4 text-sm text-[#6E7385]">{member.phone}</td>
                    <td className="p-4">
                      <span className="font-extrabold text-[#5B50E5] text-sm">{member.points} pts</span>
                    </td>
                    <td className="p-4 pr-6 text-right space-x-2">
                      <button
                        onClick={() => handleOpenEditModal(member)}
                        className="inline-flex items-center justify-center p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit Member"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(member.id)}
                        className="inline-flex items-center justify-center p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Hapus Member"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal Form Tambah/Edit Member */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 border border-[#E2E8F0] shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-[#1E2330]">
                {editingMember ? 'Edit Data Member' : 'Pendaftaran Member Baru'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-[#6E7385] hover:bg-[#EEF0FA] rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 flex items-center gap-2 bg-[#FDE8E8] text-[#E03131] border border-[#E03131]/20 rounded-xl px-4 py-3 text-sm">
                <span className="material-symbols-outlined text-base">error</span>
                <span className="font-semibold">{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#6E7385] uppercase tracking-wider mb-1.5">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Masukkan nama member"
                  required
                  className="w-full bg-[#EEF0FA]/30 border border-[#E2E8F0] rounded-xl px-4 py-3 text-[#1E2330] placeholder-[#A0A5B5] focus:outline-none focus:border-[#5B50E5] focus:ring-4 focus:ring-[#5B50E5]/10 transition-all text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#6E7385] uppercase tracking-wider mb-1.5">
                  No. Telepon / WhatsApp
                </label>
                <input
                  type="tel"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="Contoh: 081234567890"
                  required
                  className="w-full bg-[#EEF0FA]/30 border border-[#E2E8F0] rounded-xl px-4 py-3 text-[#1E2330] placeholder-[#A0A5B5] focus:outline-none focus:border-[#5B50E5] focus:ring-4 focus:ring-[#5B50E5]/10 transition-all text-sm font-semibold"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 bg-[#EEF0FA]/60 text-[#6E7385] font-bold rounded-xl hover:bg-[#EEF0FA] active:scale-95 transition-all text-sm"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-gradient-to-r from-[#5B50E5] to-[#4A3FC8] text-white font-bold rounded-xl hover:shadow-md hover:shadow-[#5B50E5]/20 active:scale-95 transition-all flex items-center justify-center gap-1.5 text-sm"
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span>{editingMember ? 'Perbarui' : 'Daftarkan'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
