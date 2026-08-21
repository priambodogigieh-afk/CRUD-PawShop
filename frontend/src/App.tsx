import { useState, useEffect, useMemo } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import type { Product, Member } from './types'
import { fetchProducts, createTransaction, fetchMembers } from './api'
import { useAuth } from './context/AuthContext'
import LoginPage from './pages/LoginPage'
import ProtectedRoute from './components/ProtectedRoute'
import CategoriesPage from './pages/CategoriesPage'
import ProductsPage from './pages/ProductsPage'
import ReportsPage from './pages/ReportsPage'
import MembersPage from './pages/MembersPage'
import './App.css'

const CATEGORIES = [
  'Makanan Kucing',
  'Makanan Anjing',
  'Perawatan & Kesehatan',
  'Aksesoris & Mainan',
  'Lain-lain'
]



// Helper function to map product keywords to high-quality images from desain.md
function getProductImage(name: string, category: string): string {
  const lowercaseName = name.toLowerCase()
  const lowercaseCat = category.toLowerCase()

  if (lowercaseName.includes('tuna') || lowercaseName.includes('food') || lowercaseName.includes('kucing') || lowercaseName.includes('anjing') || lowercaseCat.includes('makanan')) {
    return 'https://lh3.googleusercontent.com/aida-public/AB6AXuD6WnrQDioDZyEsUujadaVxN2QwYwDckdcS74yb6rfWrrfiXQJizbsVN7C4sv4i6gPIE4b6i4KI05_oTDHguBhvWuoSGLhd1l0ehtvRWvD9Ek0G8sKdzChSRz2rJuIzv6sNzMDyMv1NvphWmmpisapgr7klsblzom2UVDukClz1Yd3I58tXr4tpS4OJdhGTow3_kCDDZvvc2TJiqcPHRKe_Ou3YkIJYcyJ4MAWbGPTJk_Vz2eAhAAqpdQ'
  }
  if (lowercaseName.includes('toy') || lowercaseName.includes('mainan') || lowercaseName.includes('tikus') || lowercaseCat.includes('aksesoris')) {
    return 'https://lh3.googleusercontent.com/aida-public/AB6AXuBb3nmw_VIP3-_X8pcuJ0YLsqx5efL52ZwsiQi6fNkqX8ljAd9fHjNZCe1Szmbx6f6ShWgb6rnGSHrGPzmezNaV8vU8QVxntP2EzW54xhH6VAOwAnrXScUcYe6Jyxq21GuZYqJHJAKNFIA9Vq81m03hC91rYEWwoY9ItNbSb5INAlrY0hk0CJ-574AgKYhlx5_1oucWE7OX8bF3TsEDy1taA3N5Nn33-cVB14QThdVkm3WYN1-LBfAv3g'
  }
  if (lowercaseName.includes('shampoo') || lowercaseName.includes('kutu') || lowercaseName.includes('clipper') || lowercaseCat.includes('perawatan') || lowercaseCat.includes('kesehatan')) {
    return 'https://lh3.googleusercontent.com/aida-public/AB6AXuA2i5DPj0EtIhyq6LhNY0EqMFQn7wRh5YfPyDVQ-w0lzJO0hsNMzyhx9vC87OVRUap8xJrGAWl2qtJTR1B4A0bsevzxeuo8gB4JZtb1Qd5-t7MXMn-ud7E_OjMAKch-Gs9Eqg-go7OjwD0Uu_vSLUF1HuPMJzL7NTyZJxypYSFbel8yOVroZGRPN2FLFd00MUcI3c52yN-TROu0eY4kTBHZyGTXQoHOyI5DoWUpEuhlJL1iHFh7LOhgPg'
  }
  return 'https://images.unsplash.com/photo-1548767797-d8c844163c4c?q=80&w=300&auto=format&fit=crop'
}



interface CartItem {
  product: Product
  quantity: number
}

// Translations dictionary for bilingual support (Indonesian & English)
const TRANSLATIONS = {
  ID: {
    dashboard: 'Dashboard',
    register: 'Pembayaran',
    inventory: 'Stok',
    searchPos: 'Search products, SKUs, or scan barcode...',
    allCategories: 'Semua Kategori',
    categories: 'Category',
    stokHabis: 'Out of Stock',
    stokTipis: 'Low Stock',
    stokReady: 'In Stock',
    cartTitle: 'Current Order',
    cartEmpty: 'Shopping Cart Empty',
    cartEmptyDesc: 'Klik produk di katalog kiri untuk menambahkan ke struk.',
    subtotal: 'Subtotal',
    tax: 'Pajak (8%)',
    total: 'Total Bayar',
    tunai: 'Cash',
    debit: 'Card',
    qris: 'QRIS',
    process: 'Process Payment',
    inventorySummary: 'Dashboard Overview',
    inventoryDesc: 'Real-time metrics for Main Branch.',
    totalSku: 'TOTAL PRODUCTS',
    totalStock: 'Total Stock',
    totalAsset: 'Total Asset Value',
    todaySalesLabel: "TODAY'S SALES",
    lowStockLabel: 'LOW STOCK ALERTS',
    quickAdd: 'Quick Add Product',
    quickEdit: 'Edit Product Details',
    productName: 'Product Name',
    productCategory: 'Category',
    priceIdr: 'Price (IDR)',
    stockQty: 'Initial Stock',
    description: 'Deskripsi Produk',
    descPlaceholder: 'Masukkan deskripsi barang, ukuran, rasa, kemasan...',
    cancel: 'Batal',
    saveChange: 'Simpan Perubahan',
    addProduct: 'Add to Inventory',
    productList: 'Recent Inventory',
    items: 'Items',
    actions: 'Aksi',
    emptyProducts: 'Tidak Ada Data Produk',
    confirmDelete: 'Konfirmasi Hapus',
    confirmDeleteDesc: 'Apakah Anda yakin ingin menghapus produk ini secara permanen dari sistem? Tindakan ini tidak dapat dibatalkan.',
    deletePermanent: 'Hapus Permanen',
    refresh: 'Refresh Data',
    toastSuccessPayment: 'Transaksi berhasil dengan',
    toastLowStock: 'Jumlah pesanan melebihi stok tersedia',
    toastStockEmpty: 'Stok produk habis!',
    toastFieldsRequired: 'Harap isi semua field wajib',
    toastPricePositive: 'Harga harus berupa angka positif',
    toastStockPositive: 'Stok harus berupa angka bulat positif',
    toastProductSaved: 'Produk baru berhasil ditambahkan!',
    toastProductUpdated: 'Produk berhasil diperbarui!',
    toastProductDeleted: 'Produk berhasil dihapus!',
    station: 'Station 01',
    branch: 'Main Branch',
    storeCashier: 'Store Manager',
    storeCashierDesc: 'Admin Access',
    searchInventory: 'Search products, SKUs, or scan barcode...',
    recentInventory: 'Recent Inventory',
    posPanel: 'Panel Informasi POS',
    posTips: '💡 Tips POS Toko Hewan:',
    tip1: '✔ Selalu pantau status stok yang berkedip merah (stok di bawah 10 unit) untuk melakukan restock segera.',
    tip2: '✔ Total Nilai Aset diperbarui otomatis di bagian atas untuk melacak valuasi total barang Anda.',
    viewAll: 'View All',
    newSaleBtn: 'New Sale'
  },
  EN: {
    dashboard: 'Dashboard',
    register: 'Pembayaran',
    inventory: 'Stock',
    searchPos: 'Search products, SKUs, or scan barcode...',
    allCategories: 'All Categories',
    categories: 'Category',
    stokHabis: 'Out of Stock',
    stokTipis: 'Low Stock',
    stokReady: 'In Stock',
    cartTitle: 'Current Order',
    cartEmpty: 'Shopping Cart Empty',
    cartEmptyDesc: 'Click products on the left catalog to add to receipt.',
    subtotal: 'Subtotal',
    tax: 'Tax (8%)',
    total: 'Total Payment',
    tunai: 'Cash',
    debit: 'Card',
    qris: 'QRIS',
    process: 'Process Payment',
    inventorySummary: 'Dashboard Overview',
    inventoryDesc: 'Real-time metrics for Main Branch.',
    totalSku: 'TOTAL PRODUCTS',
    totalStock: 'Total Stock',
    totalAsset: 'Total Asset Value',
    todaySalesLabel: "TODAY'S SALES",
    lowStockLabel: 'LOW STOCK ALERTS',
    quickAdd: 'Quick Add Product',
    quickEdit: 'Edit Product Details',
    productName: 'Product Name',
    productCategory: 'Category',
    priceIdr: 'Price (IDR)',
    stockQty: 'Initial Stock',
    description: 'Product Description',
    descPlaceholder: 'Enter item description, size, flavor, packaging...',
    cancel: 'Cancel',
    saveChange: 'Save Changes',
    addProduct: 'Add to Inventory',
    productList: 'Recent Inventory',
    items: 'Items',
    actions: 'Actions',
    emptyProducts: 'No Product Data',
    confirmDelete: 'Confirm Delete',
    confirmDeleteDesc: 'Are you sure you want to permanently delete this product? This action cannot be undone.',
    deletePermanent: 'Delete Permanently',
    refresh: 'Refresh Data',
    toastSuccessPayment: 'Transaction successful with',
    toastLowStock: 'Order quantity exceeds available stock',
    toastStockEmpty: 'Product stock is empty!',
    toastFieldsRequired: 'Please fill in all required fields',
    toastPricePositive: 'Price must be a positive number',
    toastStockPositive: 'Stock must be a positive integer',
    toastProductSaved: 'Product successfully saved!',
    toastProductUpdated: 'Product successfully updated!',
    toastProductDeleted: 'Product successfully deleted!',
    station: 'Station 01',
    branch: 'Main Branch',
    storeCashier: 'Store Manager',
    storeCashierDesc: 'Admin Access',
    searchInventory: 'Search products, SKUs, or scan barcode...',
    recentInventory: 'Recent Inventory',
    posPanel: 'POS Information Panel',
    posTips: '💡 Pet Shop POS Tips:',
    tip1: '✔ Always monitor stock status flashing red (stock under 10 units) to restock immediately.',
    tip2: '✔ Total Asset Value updates automatically at the top to track your total inventory valuation.',
    viewAll: 'View All',
    newSaleBtn: 'New Sale'
  }
}

function Dashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const isAdmin = user?.role === 'ADMIN'

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  // Localization State (defaults to English)
  const [lang] = useState<'EN' | 'ID'>('ID')
  const tText = TRANSLATIONS[lang]

  // Network Connectivity State
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine)

  // Navigation State
  const [activeTab, setActiveTab] = useState<'register' | 'inventory' | 'categories' | 'members' | 'reports'>('register')
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false)
  const [isCartOpenMobile, setIsCartOpenMobile] = useState<boolean>(false)

  // API State
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')

  // Cart State (POS Register)
  const [cart, setCart] = useState<CartItem[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [memberPhone, setMemberPhone] = useState<string>('')
  const [cashReceived, setCashReceived] = useState<string>('')

  // Delete Confirmation State
  const [deletingProductId, setDeletingProductId] = useState<number | null>(null)

  // Last transaction details for printable receipt modal
  const [lastTransaction, setLastTransaction] = useState<any | null>(null)

  // Toast State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // Network Status Event Listeners & Auto-Sync
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      showToast('Koneksi internet terhubung kembali!', 'success')
      syncOfflineTransactions()
    }
    const handleOffline = () => {
      setIsOnline(false)
      showToast('Koneksi internet terputus. Beralih ke Mode Offline.', 'error')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Sync offline transactions if online on mount
  useEffect(() => {
    if (isOnline) {
      syncOfflineTransactions()
    }
  }, [isOnline])

  // Load products on mount
  useEffect(() => {
    loadProducts()
  }, [])

  // Load members on mount or tab change to POS
  const loadMembers = async () => {
    try {
      const data = await fetchMembers()
      setMembers(data)
      localStorage.setItem('pawshop_members_cache', JSON.stringify(data))
    } catch (err) {
      console.error('Error fetching members:', err)
      const cached = localStorage.getItem('pawshop_members_cache')
      if (cached) {
        setMembers(JSON.parse(cached))
      }
    }
  }

  useEffect(() => {
    if (activeTab === 'register') {
      loadMembers()
    }
  }, [activeTab])

  // Set default active tab based on role
  useEffect(() => {
    if (user) {
      if (user.role === 'ADMIN') {
        setActiveTab('inventory')
      } else {
        setActiveTab('register')
      }
    }
  }, [user])

  const loadProducts = async () => {
    setIsLoading(true)
    try {
      const data = await fetchProducts()
      setProducts(data)
      localStorage.setItem('pawshop_products_cache', JSON.stringify(data))
    } catch (err: any) {
      console.error(err.message || 'Gagal memuat produk.')
      const cached = localStorage.getItem('pawshop_products_cache')
      if (cached) {
        setProducts(JSON.parse(cached))
        showToast('Gagal memuat produk terbaru. Menggunakan data cache.', 'success')
      } else {
        showToast(tText.refresh + ' failed', 'error')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const syncOfflineTransactions = async () => {
    const queueStr = localStorage.getItem('pawshop_offline_queue')
    if (!queueStr) return

    let queue: any[] = []
    try {
      queue = JSON.parse(queueStr)
    } catch (e) {
      console.error('Failed to parse offline queue:', e)
      return
    }

    if (queue.length === 0) return

    let successCount = 0
    const remainingQueue = []

    for (const txData of queue) {
      try {
        const res = await createTransaction(txData)
        if (res.success) {
          successCount++
        } else {
          remainingQueue.push(txData)
        }
      } catch (err) {
        console.error('Failed to sync offline transaction:', err)
        remainingQueue.push(txData)
      }
    }

    if (remainingQueue.length > 0) {
      localStorage.setItem('pawshop_offline_queue', JSON.stringify(remainingQueue))
    } else {
      localStorage.removeItem('pawshop_offline_queue')
    }

    if (successCount > 0) {
      showToast(`Berhasil menyinkronkan ${successCount} transaksi offline ke server!`, 'success')
      loadProducts()
    }
  }

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => {
      setToast(null)
    }, 3000)
  }



  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchSearch =
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchTerm.toLowerCase())
      const matchCategory = selectedCategory === '' || product.category.name === selectedCategory
      return matchSearch && matchCategory
    })
  }, [products, searchTerm, selectedCategory])

  // Format Currency (IDR)
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }



  // POS Add to Cart
  const handleAddToCart = (product: Product) => {
    if (product.stock <= 0) {
      showToast(tText.toastStockEmpty, 'error')
      return
    }

    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.product.id === product.id)
      if (existing) {
        if (existing.quantity >= product.stock) {
          showToast(tText.toastLowStock, 'error')
          return prevCart
        }
        return prevCart.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      }
      return [...prevCart, { product, quantity: 1 }]
    })
  }

  // POS Remove/Decrement from Cart
  const handleRemoveFromCart = (productId: number) => {
    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.product.id === productId)
      if (existing && existing.quantity > 1) {
        return prevCart.map((item) =>
          item.product.id === productId ? { ...item, quantity: item.quantity - 1 } : item
        )
      }
      return prevCart.filter((item) => item.product.id !== productId)
    })
  }

  // POS Clear Cart
  const handleClearCart = () => {
    setCart([])
  }

  // POS Process Payment
  const handleProcessPayment = async () => {
    if (cart.length === 0) {
      showToast(tText.cartEmpty, 'error')
      return
    }

    const cashReceivedVal = parseFloat(cashReceived) || 0
    const changeAmount = cashReceivedVal - cartTotals.total

    if (!cashReceived || changeAmount < 0) {
      showToast('Uang tunai yang diterima kurang!', 'error')
      return
    }

    const matchedMember = memberPhone.trim() !== '' ? members.find(m => m.phone === memberPhone.trim()) : null
    const txPayload = {
      paymentMethod: 'CASH',
      memberId: matchedMember ? matchedMember.id : null,
      items: cart.map(item => ({
        productId: item.product.id,
        quantity: item.quantity
      }))
    }

    const receiptData = {
      invoiceNo: `INV-${Date.now().toString().slice(-8)}`,
      date: new Date().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }),
      cashier: user?.name || 'Kasir',
      items: cart.map(item => ({
        name: item.product.name,
        price: item.product.sellingPrice,
        quantity: item.quantity,
        total: item.product.sellingPrice * item.quantity
      })),
      totals: {
        subtotal: cartTotals.subtotal,
        tax: cartTotals.tax,
        total: cartTotals.total
      },
      cash: cashReceivedVal,
      change: changeAmount,
      member: matchedMember ? {
        code: matchedMember.memberCode,
        name: matchedMember.name,
        points: matchedMember.points,
        newPointsEarned: Math.floor(cartTotals.total / 10000)
      } : null,
      isOffline: false
    }

    if (!isOnline) {
      try {
        // Save to offline queue
        const queueStr = localStorage.getItem('pawshop_offline_queue')
        const queue = queueStr ? JSON.parse(queueStr) : []
        queue.push(txPayload)
        localStorage.setItem('pawshop_offline_queue', JSON.stringify(queue))

        // Update local state
        const updatedProducts = products.map((p) => {
          const cartItem = cart.find((item) => item.product.id === p.id)
          if (cartItem) {
            return { ...p, stock: Math.max(0, p.stock - cartItem.quantity) }
          }
          return p
        })
        setProducts(updatedProducts)
        localStorage.setItem('pawshop_products_cache', JSON.stringify(updatedProducts))

        receiptData.invoiceNo = `INV-OFF-${Date.now().toString().slice(-6)}`
        receiptData.isOffline = true
        setLastTransaction(receiptData)
        showToast(`Transaksi Sukses (Lokal/Offline)! Kembalian: ${formatCurrency(changeAmount)}`, 'success')
      } catch (err) {
        showToast('Gagal menyimpan transaksi secara lokal.', 'error')
      }
      return
    }

    try {
      // Process transaction via atomic backend call
      const res = await createTransaction(txPayload)

      if (res.success) {
        // Update local state
        const updatedProducts = products.map((p) => {
          const cartItem = cart.find((item) => item.product.id === p.id)
          if (cartItem) {
            return { ...p, stock: Math.max(0, p.stock - cartItem.quantity) }
          }
          return p
        })
        setProducts(updatedProducts)
        localStorage.setItem('pawshop_products_cache', JSON.stringify(updatedProducts))

        const finalReceiptData = {
          ...receiptData,
          invoiceNo: res.transaction?.invoiceNumber || receiptData.invoiceNo,
          member: matchedMember ? {
            code: matchedMember.memberCode,
            name: matchedMember.name,
            points: matchedMember.points + (res.transaction?.pointsEarned || 0),
            newPointsEarned: res.transaction?.pointsEarned || 0
          } : null
        }
        setLastTransaction(finalReceiptData)
        showToast(`Transaksi Sukses! Kembalian: ${formatCurrency(changeAmount)}`, 'success')
      }
    } catch (err: any) {
      showToast(err.message || 'Gagal memproses transaksi.', 'error')
    }
  }

  const handleCloseReceipt = () => {
    setCart([])
    setCashReceived('')
    setMemberPhone('')
    setLastTransaction(null)
  }

  // Calculate Cart Totals
  const cartTotals = useMemo(() => {
    const subtotal = cart.reduce((acc, curr) => acc + (curr.product.sellingPrice * curr.quantity), 0)
    const tax = Math.round(subtotal * 0.08)
    const total = subtotal + tax

    return { subtotal, tax, total }
  }, [cart])



  const handleDeleteConfirm = async () => {
    if (!deletingProductId) return

    try {
      await fetch(`http://localhost:3000/api/products/${deletingProductId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('petshop_token') ?? ''}` }
      })
      setProducts((prev) => prev.filter((p) => p.id !== deletingProductId))
      setCart((prevCart) => prevCart.filter((item) => item.product.id !== deletingProductId))
      showToast(tText.toastProductDeleted, 'success')
    } catch (err: any) {
      showToast(err.message || 'Gagal menghapus produk.', 'error')
    } finally {
      setDeletingProductId(null)
    }
  }

  const renderCart = () => (
    <>
      <div className="p-6 border-b border-[#E2E8F0] flex justify-between items-center bg-[#EEF0FA]/30 shrink-0">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[#5B50E5]" style={{ fontVariationSettings: "'FILL' 1" }}>shopping_basket</span>
          <h2 className="font-headline-md text-headline-md font-extrabold text-[#1E2330]">{tText.cartTitle}</h2>
        </div>
        {cart.length > 0 && (
          <button
            onClick={handleClearCart}
            className="text-[#6E7385] hover:text-[#E03131] transition-all-default p-1.5 hover:bg-[#EEF0FA] rounded-lg active:scale-95"
            title="Clear Order"
          >
            <span className="material-symbols-outlined text-xl">delete_sweep</span>
          </button>
        )}
      </div>

      {/* Cart Items List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F8FAFC]/50">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#6E7385]/55">
            <span className="material-symbols-outlined text-[64px] mb-3 text-[#5B50E5]/25">add_shopping_cart</span>
            <p className="text-sm font-semibold">{tText.cartEmpty}</p>
            <p className="text-xs mt-1 max-w-[200px]">{tText.cartEmptyDesc}</p>
          </div>
        ) : (
          cart.map((item) => (
            <div
              key={item.product.id}
              className="flex items-start gap-4 p-3 bg-white rounded-xl border border-[#E2E8F0]/70 premium-shadow-sm transition-all hover:border-[#5B50E5]/30"
            >
              <div className="flex-1 min-w-0">
                <h4 className="font-body-md text-sm font-bold text-[#1E2330] truncate">{item.product.name}</h4>
                <p className="font-label-md text-xs text-[#6E7385] mt-0.5">{formatCurrency(item.product.sellingPrice)}</p>
              </div>
              <div className="flex items-center gap-2 bg-[#EEF0FA] border border-[#E2E8F0] rounded-xl px-1.5 py-0.5 shadow-inner">
                <button
                  onClick={() => handleRemoveFromCart(item.product.id)}
                  className="text-[#6E7385] hover:text-primary transition-colors p-1 rounded-lg hover:bg-white"
                >
                  <span className="material-symbols-outlined text-sm font-bold">remove</span>
                </button>
                <span className="font-label-md text-xs font-bold text-[#1E2330] w-4 text-center">{item.quantity}</span>
                <button
                  onClick={() => handleAddToCart(item.product)}
                  className="text-[#6E7385] hover:text-primary transition-colors p-1 rounded-lg hover:bg-white"
                >
                  <span className="material-symbols-outlined text-sm font-bold">add</span>
                </button>
              </div>
              {/* Price label container with dynamic min-width to prevent clashing and wrapping */}
              <div className="font-body-md text-sm font-bold text-[#1E2330] ml-2 min-w-[100px] text-right shrink-0">
                {formatCurrency(item.product.sellingPrice * item.quantity)}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Financial Calculation Panel & Payment Selectors */}
      <div className="p-6 bg-[#EEF0FA]/20 border-t border-[#E2E8F0] space-y-4 shrink-0">
        <div className="space-y-2 bg-white p-4 rounded-xl border border-[#E2E8F0]/80 premium-shadow-sm">
          <div className="flex justify-between font-body-md text-sm text-[#6E7385]">
            <span>{tText.subtotal}</span>
            <span className="font-semibold text-[#1E2330]">{formatCurrency(cartTotals.subtotal)}</span>
          </div>
          <div className="flex justify-between font-body-md text-sm text-[#6E7385]">
            <span>{tText.tax}</span>
            <span className="font-semibold text-[#1E2330]">{formatCurrency(cartTotals.tax)}</span>
          </div>
          <div className="flex justify-between font-headline-md text-base text-primary font-bold pt-2.5 border-t border-dashed border-[#E2E8F0]">
            <span>{tText.total}</span>
            <span className="text-2xl text-[#5B50E5] font-extrabold tracking-tight">{formatCurrency(cartTotals.total)}</span>
          </div>
        </div>

        {/* Member Selection (Phone Input only) */}
        <div className="space-y-1 bg-white p-3 rounded-xl border border-[#E2E8F0]/80 shadow-sm">
          <label className="block text-[10px] font-bold text-[#6E7385] uppercase tracking-wider">No. HP Member (Opsional)</label>
          <div className="relative">
            <input
              type="text"
              placeholder="e.g. 08123456789"
              value={memberPhone}
              onChange={(e) => setMemberPhone(e.target.value)}
              className="w-full pl-8 pr-4 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg font-body-md text-xs text-[#1E2330] focus:outline-none focus:border-[#5B50E5] focus:ring-2 focus:ring-[#5B50E5]/10 text-sm font-semibold"
            />
            <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-[#6E7385] pointer-events-none text-sm">phone_iphone</span>
          </div>
          {memberPhone.trim() !== '' && (() => {
            const found = members.find(m => m.phone === memberPhone.trim())
            if (found) {
              return (
                <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-1 rounded-md">
                  <span className="material-symbols-outlined text-xs">check_circle</span>
                  <span>{found.name} ({found.memberCode} - Poin: {found.points})</span>
                </div>
              )
            } else {
              return (
                <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-red-500 font-semibold bg-red-50 px-2 py-1 rounded-md">
                  <span className="material-symbols-outlined text-xs">error</span>
                  <span>Member tidak ditemukan</span>
                </div>
              )
            }
          })()}
        </div>

        {/* Static Payment Info (Cash only) */}
        <div className="flex items-center justify-between p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl text-xs text-[#6E7385]">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[#5B50E5] text-base">payments</span>
            <span className="font-bold">Metode Pembayaran</span>
          </div>
          <span className="font-extrabold text-[#5B50E5]">Tunai (Cash)</span>
        </div>

        {/* Cash Received Input */}
        <div className="space-y-1.5 bg-white p-3 rounded-xl border border-[#E2E8F0]/80 shadow-sm">
          <label className="block text-[10px] font-bold text-[#6E7385] uppercase tracking-wider">Uang Tunai Diterima (Wajib)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#6E7385]">Rp</span>
            <input
              type="number"
              placeholder="0"
              value={cashReceived}
              onChange={(e) => setCashReceived(e.target.value)}
              className="w-full pl-8 pr-4 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg font-body-md text-xs text-[#1E2330] focus:outline-none focus:border-[#5B50E5] focus:ring-2 focus:ring-[#5B50E5]/10 text-sm font-semibold"
            />
          </div>
        </div>

        {/* Realtime Change calculation */}
        {parseFloat(cashReceived) > 0 && (
          <div className={`flex justify-between items-center p-3.5 rounded-xl text-xs border ${
            parseFloat(cashReceived) - cartTotals.total < 0
              ? 'bg-red-50 border-red-200 text-red-700'
              : 'bg-emerald-50 border-emerald-200 text-emerald-700'
          }`}>
            <span className="font-bold">
              {parseFloat(cashReceived) - cartTotals.total < 0 ? 'Kekurangan Uang' : 'Kembalian'}
            </span>
            <span className="font-extrabold text-sm">
              {parseFloat(cashReceived) - cartTotals.total < 0
                ? formatCurrency(Math.abs(parseFloat(cashReceived) - cartTotals.total))
                : formatCurrency(parseFloat(cashReceived) - cartTotals.total)}
            </span>
          </div>
        )}

        {/* Primary CTA Action Button with glowing hover effect */}
        <button
          onClick={() => {
            handleProcessPayment()
            setIsCartOpenMobile(false)
          }}
          disabled={cart.length === 0 || !cashReceived || parseFloat(cashReceived) - cartTotals.total < 0}
          className="w-full py-3.5 bg-gradient-to-r from-[#5B50E5] to-[#4A3FC8] hover:shadow-lg hover:shadow-[#5B50E5]/25 disabled:opacity-50 text-white rounded-[10px] font-extrabold active:scale-[0.98] transition-all-default flex items-center justify-center gap-2 cursor-pointer h-12 text-sm"
        >
          <span>{tText.process}</span>
          <span className="material-symbols-outlined text-lg">arrow_forward</span>
        </button>
      </div>
    </>
  )

  return (
    <div className="h-screen bg-background text-[#1E2330] flex overflow-hidden font-sans">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-4 rounded-xl shadow-lg transition-all duration-300 transform translate-y-0 ${toast.type === 'success'
            ? 'bg-[#E6F7ED] text-[#1B8755] border border-[#1B8755]/20'
            : 'bg-[#FDE8E8] text-[#E03131] border border-[#E03131]/20'
            }`}
        >
          {toast.type === 'success' ? (
            <span className="material-symbols-outlined rounded-full bg-white/20 p-1 text-sm">check</span>
          ) : (
            <span className="material-symbols-outlined rounded-full bg-white/20 p-1 text-sm">warning</span>
          )}
          <span className="font-semibold text-sm">{toast.message}</span>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingProductId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl border border-[#E2E8F0] slide-in-right">
            <div className="flex items-center gap-3 text-[#E03131] mb-4">
              <span className="material-symbols-outlined text-[28px]">warning</span>
              <h3 className="text-xl font-bold">{tText.confirmDelete}</h3>
            </div>
            <p className="text-[#6E7385] text-sm mb-6 leading-relaxed">
              {tText.confirmDeleteDesc}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeletingProductId(null)}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-[#EEF0FA] hover:bg-white text-[#1E2330] border border-[#E2E8F0] transition-all-default active:scale-95"
              >
                {tText.cancel}
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-[#E03131] hover:bg-[#E03131]/95 text-white shadow-sm transition-all-default active:scale-95"
              >
                {tText.deletePermanent}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar Navigasi (Kiri - Width: 240px, Background: #EEF0FA) */}
      <nav className="hidden md:flex flex-col bg-[#EEF0FA] w-[240px] h-full pt-6 pb-4 px-4 space-y-2 shrink-0 border-r border-[#E2E8F0]">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center p-1.5 shadow-md border border-[#E2E8F0] shrink-0 animate-pulse">
            <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <div className="flex items-center gap-2">
            <h1 className="font-headline-md text-headline-md font-extrabold text-[#1E2330] leading-tight tracking-wider">PAWSHOP</h1>
            {isOnline ? (
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]" title="Online" />
            ) : (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" title="Offline Mode"></span>
              </span>
            )}
          </div>
        </div>

        <div className="flex-1 space-y-2 pt-8">
          {!isAdmin && (
            <button
              onClick={() => {
                setActiveTab('register')
                setSearchTerm('')
                setSelectedCategory('')
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all-default text-left active:scale-[0.98] ${activeTab === 'register'
                ? 'bg-[#5B50E5] text-white shadow-lg shadow-[#5B50E5]/25'
                : 'text-[#6E7385] hover:bg-white hover:text-[#1E2330] hover:translate-x-1'
                }`}
            >
              <span className="material-symbols-outlined">point_of_sale</span>
              <span className="font-label-md text-label-md">{tText.register}</span>
            </button>
          )}

          <button
            onClick={() => {
              setActiveTab('inventory')
              setSearchTerm('')
              setSelectedCategory('')
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all-default text-left active:scale-[0.98] ${activeTab === 'inventory'
              ? 'bg-[#5B50E5] text-white shadow-lg shadow-[#5B50E5]/25'
              : 'text-[#6E7385] hover:bg-white hover:text-[#1E2330] hover:translate-x-1'
              }`}
          >
            <span className="material-symbols-outlined">inventory_2</span>
            <span className="font-label-md text-label-md">{tText.inventory}</span>
          </button>

          {isAdmin && (
            <button
              onClick={() => {
                setActiveTab('categories')
                setSearchTerm('')
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all-default text-left active:scale-[0.98] ${activeTab === 'categories'
                ? 'bg-[#5B50E5] text-white shadow-lg shadow-[#5B50E5]/25'
                : 'text-[#6E7385] hover:bg-white hover:text-[#1E2330] hover:translate-x-1'
                }`}
            >
              <span className="material-symbols-outlined">category</span>
              <span className="font-label-md text-label-md">Kategori & Merek</span>
            </button>
          )}


          <button
            onClick={() => {
              setActiveTab('members')
              setSearchTerm('')
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all-default text-left active:scale-[0.98] ${activeTab === 'members'
              ? 'bg-[#5B50E5] text-white shadow-lg shadow-[#5B50E5]/25'
              : 'text-[#6E7385] hover:bg-white hover:text-[#1E2330] hover:translate-x-1'
              }`}
          >
            <span className="material-symbols-outlined">group</span>
            <span className="font-label-md text-label-md">Members</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('reports')
              setSearchTerm('')
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all-default text-left active:scale-[0.98] ${activeTab === 'reports'
              ? 'bg-[#5B50E5] text-white shadow-lg shadow-[#5B50E5]/25'
              : 'text-[#6E7385] hover:bg-white hover:text-[#1E2330] hover:translate-x-1'
              }`}
          >
            <span className="material-symbols-outlined">bar_chart</span>
            <span className="font-label-md text-label-md">Reports</span>
          </button>
        </div>

        <div className="mt-auto pt-4 border-t border-[#E2E8F0]">
          <div className="flex items-center gap-3 px-4 py-3 mb-1">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#5B50E5] to-teal-400 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {user?.name?.charAt(0).toUpperCase() ?? 'U'}
            </div>
            <div className="overflow-hidden">
              <p className="font-semibold text-sm text-[#1E2330] leading-tight truncate">{user?.name ?? ''}</p>
              <p className="text-[10px] text-[#6E7385] leading-none">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-[#6E7385] hover:text-[#E03131] hover:bg-red-50/80 hover:translate-x-1 rounded-xl text-left font-bold transition-all-default"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-label-md text-label-md">Logout</span>
          </button>
        </div>
      </nav>

      {/* Mobile Sidebar Overlay & Drawer */}
      <div className={`fixed inset-0 z-40 flex md:hidden transition-opacity duration-300 ${isMobileSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        {/* Backdrop overlay */}
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsMobileSidebarOpen(false)}></div>
        
        {/* Sliding sidebar container */}
        <div className={`relative flex flex-col bg-[#EEF0FA] w-64 h-full py-6 px-4 space-y-2 z-50 border-r border-[#E2E8F0] shadow-2xl transition-transform duration-300 ease-out transform ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="mb-8 flex items-center justify-between px-2">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center p-1 border border-[#E2E8F0] shrink-0 animate-pulse">
                <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
              </div>
              <h1 className="font-headline-md text-headline-md text-[#1E2330] font-extrabold tracking-wider">PAWSHOP</h1>
              <div className="ml-1">
                {isOnline ? (
                  <span className="w-2 h-2 inline-block rounded-full bg-emerald-500" title="Online" />
                ) : (
                  <span className="relative inline-flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" title="Offline Mode"></span>
                  </span>
                )}
              </div>
            </div>
            <button onClick={() => setIsMobileSidebarOpen(false)} className="p-1.5 text-[#6E7385] hover:bg-white rounded-lg transition-colors border border-[#E2E8F0]" title="Close Menu">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <div className="flex-1 space-y-2">
            {!isAdmin && (
              <button
                onClick={() => {
                  setActiveTab('register')
                  setSearchTerm('')
                  setSelectedCategory('')
                  setIsMobileSidebarOpen(false)
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-left transition-all active:scale-[0.98] ${activeTab === 'register' ? 'bg-[#5B50E5] text-white shadow-lg shadow-[#5B50E5]/25' : 'text-[#6E7385] hover:bg-white hover:text-[#1E2330]'
                  }`}
              >
                <span className="material-symbols-outlined">point_of_sale</span>
                <span className="font-label-md text-label-md">{tText.register}</span>
              </button>
            )}

            <button
              onClick={() => {
                setActiveTab('inventory')
                setSearchTerm('')
                setSelectedCategory('')
                setIsMobileSidebarOpen(false)
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-left transition-all active:scale-[0.98] ${activeTab === 'inventory' ? 'bg-[#5B50E5] text-white shadow-lg shadow-[#5B50E5]/25' : 'text-[#6E7385] hover:bg-white hover:text-[#1E2330]'
                }`}
            >
              <span className="material-symbols-outlined">inventory_2</span>
              <span className="font-label-md text-label-md">{tText.inventory}</span>
            </button>

            {isAdmin && (
              <button
                onClick={() => {
                  setActiveTab('categories')
                  setSearchTerm('')
                  setIsMobileSidebarOpen(false)
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-left transition-all active:scale-[0.98] ${activeTab === 'categories' ? 'bg-[#5B50E5] text-white shadow-lg shadow-[#5B50E5]/25' : 'text-[#6E7385] hover:bg-white hover:text-[#1E2330]'
                  }`}
              >
                <span className="material-symbols-outlined">category</span>
                <span className="font-label-md text-label-md">Kategori & Merek</span>
              </button>
            )}

            <button
              onClick={() => {
                setActiveTab('members')
                setSearchTerm('')
                setIsMobileSidebarOpen(false)
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-left transition-all active:scale-[0.98] ${activeTab === 'members' ? 'bg-[#5B50E5] text-white shadow-lg shadow-[#5B50E5]/25' : 'text-[#6E7385] hover:bg-white hover:text-[#1E2330]'
                }`}
            >
              <span className="material-symbols-outlined">group</span>
              <span className="font-label-md text-label-md">Members</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('reports')
                setSearchTerm('')
                setIsMobileSidebarOpen(false)
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-left transition-all active:scale-[0.98] ${activeTab === 'reports' ? 'bg-[#5B50E5] text-white shadow-lg shadow-[#5B50E5]/25' : 'text-[#6E7385] hover:bg-white hover:text-[#1E2330]'
                }`}
            >
              <span className="material-symbols-outlined">bar_chart</span>
              <span className="font-label-md text-label-md">Reports</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-background relative">
        {/* Mobile Top Navbar */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-[#E2E8F0] shrink-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="p-1.5 bg-[#EEF0FA] text-[#6E7385] rounded-xl border border-[#E2E8F0] hover:bg-white transition-colors"
            >
              <span className="material-symbols-outlined text-xl leading-none">menu</span>
            </button>
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="Logo" className="w-6 h-6 object-contain" />
              <span className="font-extrabold text-sm text-[#1E2330] tracking-wider">PAWSHOP</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Connectivity status */}
            {isOnline ? (
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]" title="Online" />
            ) : (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" title="Offline Mode"></span>
              </span>
            )}
            {/* Cart toggle for cashier POS */}
            {!isAdmin && activeTab === 'register' && (
              <button
                onClick={() => setIsCartOpenMobile(true)}
                className="relative p-2 bg-[#5B50E5]/10 hover:bg-[#5B50E5]/20 text-[#5B50E5] rounded-xl transition-all-default active:scale-95 flex items-center justify-center border border-[#5B50E5]/20"
              >
                <span className="material-symbols-outlined text-base leading-none">shopping_basket</span>
                {cart.length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[9px] font-bold rounded-full w-4.5 h-4.5 flex items-center justify-center shadow-md animate-pulse">
                    {cart.reduce((sum, item) => sum + item.quantity, 0)}
                  </span>
                )}
              </button>
            )}
          </div>
        </header>

        {/* Dashboard Canvas Content */}
        {activeTab === 'inventory' ? (
          <ProductsPage />
        ) : activeTab === 'categories' ? (
          <CategoriesPage />
        ) : activeTab === 'members' ? (
          <MembersPage />
        ) : activeTab === 'reports' ? (
          <ReportsPage />
        ) : activeTab === 'register' ? (
          /* ========================================================
             1. REGISTER VIEW (POS KASIR - Tata Letak 3-Kolom)
             ======================================================== */
          <main className="flex-1 flex overflow-hidden">
            {/* Products Catalog Grid (Kolom Tengah) */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col">
              {/* POS Filter Controls */}
              <div className="flex items-center gap-4 mb-6 shrink-0">
                <div className="relative flex-1">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#6E7385]">search</span>
                  <input
                    type="text"
                    placeholder={tText.searchPos}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white border border-[#E2E8F0] rounded-xl font-body-md text-body-md text-[#1E2330] focus:outline-none focus:border-[#5B50E5] focus:ring-4 focus:ring-[#5B50E5]/10 shadow-sm transition-all duration-200"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-[#6E7385] hover:text-[#1E2330]"
                    >
                      <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                  )}
                </div>
                <div className="relative">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="pl-9 pr-8 py-3 bg-white border border-[#E2E8F0] rounded-xl font-label-md text-label-md text-[#6E7385] focus:outline-none focus:border-[#5B50E5] focus:ring-4 focus:ring-[#5B50E5]/10 shadow-sm appearance-none cursor-pointer transition-all duration-200"
                  >
                    <option value="">{tText.allCategories}</option>
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#6E7385] pointer-events-none text-sm">filter_list</span>
                  <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6E7385] pointer-events-none text-sm">expand_more</span>
                </div>
              </div>

              {/* Grid Canvas */}
              {isLoading ? (
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-6">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="bg-white rounded-2xl border border-[#E2E8F0] h-64 animate-pulse">
                      <div className="aspect-[4/3] bg-[#EEF0FA] w-full"></div>
                      <div className="p-3 space-y-2">
                        <div className="h-4 bg-[#EEF0FA] rounded w-3/4"></div>
                        <div className="h-3 bg-[#EEF0FA] rounded w-1/2"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
                  <span className="material-symbols-outlined text-[64px] text-[#6E7385]/40 mb-4">search_off</span>
                  <h4 className="font-bold text-[#1E2330] text-base">{tText.emptyProducts}</h4>
                  <p className="text-[#6E7385] text-xs mt-1">Sesuaikan filter atau tambahkan produk baru di menu Inventory.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-6">
                  {filteredProducts.map((product) => {
                    const isLowStock = product.stock <= 10
                    const isOutOfStock = product.stock === 0
                    if (isAdmin) {
                      return (
                        <div
                          key={product.id}
                          className={`group bg-white rounded-2xl premium-shadow-sm border border-[#E2E8F0] overflow-hidden flex flex-col text-left h-full ${isOutOfStock ? 'opacity-50 border-dashed' : ''
                            }`}
                        >
                          {/* Aspect Ratio 4:3 Image container with floating glassmorphic price tag */}
                          <div className="aspect-[4/3] bg-[#EEF0FA] relative overflow-hidden shrink-0">
                            <img
                              className="w-full h-full object-cover"
                              alt={product.name}
                              src={product.imageUrl || getProductImage(product.name, product.category.name)}
                            />
                            <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-md text-[#5B50E5] border border-white/50 px-3 py-1 rounded-full font-extrabold text-xs shadow-sm">
                              {formatCurrency(product.sellingPrice)}
                            </div>
                          </div>
                          {/* Card Content with padded body for breathing room */}
                          <div className="p-4 flex-1 flex flex-col justify-between">
                            <div>
                              <h3 className="font-body-md text-body-md font-semibold text-[#1E2330] line-clamp-2 leading-snug">{product.name}</h3>
                              <p className="font-label-md text-[10px] text-[#6E7385] mt-1 font-bold">{product.category.name}</p>
                            </div>
                            <div className="mt-3 flex justify-between items-center pt-2.5 border-t border-[#E2E8F0]/50">
                              {isOutOfStock ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-[#FDE8E8] text-[#E03131] rounded-full font-label-md text-[10px] font-bold">
                                  <span className="pulse-dot-red"></span>
                                  {tText.stokHabis}
                                </span>
                              ) : isLowStock ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-[#FFF8E6] text-[#825100] rounded-full font-label-md text-[10px] font-bold pulse-low-stock">
                                  <span className="pulse-dot-orange"></span>
                                  {tText.stokTipis} ({product.stock})
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-[#E6F7ED] text-[#1B8755] rounded-full font-label-md text-[10px] font-bold">
                                  <span className="pulse-dot-green"></span>
                                  {tText.stokReady} ({product.stock})
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    }

                    return (
                      <button
                        key={product.id}
                        onClick={() => handleAddToCart(product)}
                        disabled={isOutOfStock}
                        className={`group bg-white rounded-2xl premium-shadow-sm border border-[#E2E8F0] overflow-hidden flex flex-col text-left hover:border-[#5B50E5] transition-all-default hover:translate-y-[-2px] hover:shadow-md h-full active:scale-95 ${isOutOfStock ? 'opacity-50 cursor-not-allowed border-dashed' : ''
                          }`}
                      >
                        {/* Aspect Ratio 4:3 Image container with floating glassmorphic price tag */}
                        <div className="aspect-[4/3] bg-[#EEF0FA] relative overflow-hidden shrink-0">
                          <img
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            alt={product.name}
                            src={product.imageUrl || getProductImage(product.name, product.category.name)}
                          />
                          <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-md text-[#5B50E5] border border-white/50 px-3 py-1 rounded-full font-extrabold text-xs shadow-sm">
                            {formatCurrency(product.sellingPrice)}
                          </div>
                        </div>
                        {/* Card Content with padded body for breathing room */}
                        <div className="p-4 flex-1 flex flex-col justify-between">
                          <div>
                            <h3 className="font-body-md text-body-md font-semibold text-[#1E2330] line-clamp-2 leading-snug">{product.name}</h3>
                            <p className="font-label-md text-[10px] text-[#6E7385] mt-1 font-bold">{product.category.name}</p>
                          </div>
                          <div className="mt-3 flex justify-between items-center pt-2.5 border-t border-[#E2E8F0]/50">
                            {isOutOfStock ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-[#FDE8E8] text-[#E03131] rounded-full font-label-md text-[10px] font-bold">
                                <span className="pulse-dot-red"></span>
                                {tText.stokHabis}
                              </span>
                            ) : isLowStock ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-[#FFF8E6] text-[#825100] rounded-full font-label-md text-[10px] font-bold pulse-low-stock">
                                <span className="pulse-dot-orange"></span>
                                {tText.stokTipis} ({product.stock})
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-[#E6F7ED] text-[#1B8755] rounded-full font-label-md text-[10px] font-bold">
                                <span className="pulse-dot-green"></span>
                                {tText.stokReady} ({product.stock})
                              </span>
                            )}
                            <span className="material-symbols-outlined text-white bg-[#5B50E5] group-hover:bg-[#4A3FC8] group-hover:rotate-90 rounded-full p-1.5 text-xs transition-all duration-300 font-bold shadow-md shadow-[#5B50E5]/20">add</span>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Panel Pesanan / Order Cart (Desktop Aside) */}
            {!isAdmin && (
              <aside className="hidden lg:flex w-[380px] bg-white border-l border-[#E2E8F0] flex flex-col shrink-0 h-full shadow-sm relative z-10 slide-in-right">
                {renderCart()}
              </aside>
            )}

            {/* Mobile Cart Drawer Overlay */}
            {!isAdmin && (
              <div className={`lg:hidden fixed inset-0 z-50 flex justify-end transition-opacity duration-300 ${isCartOpenMobile ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                {/* Backdrop */}
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsCartOpenMobile(false)}></div>
                
                {/* Sliding Cart container */}
                <aside className={`relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col z-50 transition-transform duration-300 ease-out transform ${isCartOpenMobile ? 'translate-x-0' : 'translate-x-full'}`}>
                  <div className="absolute top-4 right-4 z-20">
                    <button
                      onClick={() => setIsCartOpenMobile(false)}
                      className="p-1.5 text-[#6E7385] hover:bg-[#EEF0FA] rounded-lg transition-colors"
                    >
                      <span className="material-symbols-outlined">close</span>
                    </button>
                  </div>
                  {renderCart()}
                </aside>
              </div>
            )}
          </main>
        ) : (
          /* ========================================================
             2. INVENTORY (STOK) VIEW
             ======================================================== */
          <ProductsPage />
        )}
      </div>

      {/* Virtual Receipt Modal */}
      {lastTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto print:bg-white print:p-0 print:block">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-[#E2E8F0] flex flex-col z-50 animate-in zoom-in-95 duration-200 print:shadow-none print:border-none print:p-0 print:w-full print:max-w-none">
            {/* The printable receipt paper area */}
            <div id="printable-receipt-content" className="bg-white flex flex-col text-left font-mono text-xs text-[#1E2330] leading-relaxed select-text print:p-0">
              <div className="text-center space-y-1 mb-4">
                <h2 className="text-xl font-black tracking-widest text-[#1E2330]">PAWSHOP</h2>
                <p className="text-[10px] text-[#6E7385]">PET SHOP & POS REGISTER</p>
                <p className="text-[9px] text-[#6E7385]">Kawasan Bisnis PawShop, Jakarta</p>
                <p className="text-[9px] text-[#6E7385]">Telp: (021) 555-PAWS</p>
              </div>

              <div className="border-t border-dashed border-[#E2E8F0] my-2 print:border-black"></div>

              <div className="space-y-0.5 text-[10px] text-[#6E7385] print:text-black">
                <div className="flex justify-between">
                  <span>No. Struk:</span>
                  <span className="font-bold text-[#1E2330] print:text-black">{lastTransaction.invoiceNo}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tanggal:</span>
                  <span>{lastTransaction.date}</span>
                </div>
                <div className="flex justify-between">
                  <span>Kasir:</span>
                  <span>{lastTransaction.cashier}</span>
                </div>
                <div className="flex justify-between">
                  <span>Mode:</span>
                  <span className={`font-bold ${lastTransaction.isOffline ? 'text-amber-600' : 'text-emerald-600'} print:text-black`}>
                    {lastTransaction.isOffline ? 'OFFLINE (Pending Sync)' : 'ONLINE'}
                  </span>
                </div>
              </div>

              <div className="border-t border-dashed border-[#E2E8F0] my-2 print:border-black"></div>

              {/* Items Table */}
              <div className="space-y-2">
                <div className="grid grid-cols-12 font-bold text-[10px] text-[#1E2330] pb-1">
                  <span className="col-span-6">Item</span>
                  <span className="col-span-2 text-center">Qty</span>
                  <span className="col-span-4 text-right">Total</span>
                </div>
                <div className="space-y-1.5">
                  {lastTransaction.items.map((item: any, index: number) => (
                    <div key={index} className="grid grid-cols-12 text-[10px] text-[#6E7385] print:text-black leading-tight">
                      <div className="col-span-6 flex flex-col">
                        <span className="font-bold text-[#1E2330] print:text-black">{item.name}</span>
                        <span>{formatCurrency(item.price)}</span>
                      </div>
                      <span className="col-span-2 text-center self-center">{item.quantity}</span>
                      <span className="col-span-4 text-right self-center font-bold text-[#1E2330] print:text-black">{formatCurrency(item.total)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-dashed border-[#E2E8F0] my-2 print:border-black"></div>

              <div className="space-y-1 text-[10px]">
                <div className="flex justify-between text-[#6E7385] print:text-black">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(lastTransaction.totals.subtotal)}</span>
                </div>
                <div className="flex justify-between text-[#6E7385] print:text-black">
                  <span>PPN (8%):</span>
                  <span>{formatCurrency(lastTransaction.totals.tax)}</span>
                </div>
                <div className="flex justify-between text-sm font-black text-[#1E2330] print:text-black pt-1">
                  <span>TOTAL:</span>
                  <span>{formatCurrency(lastTransaction.totals.total)}</span>
                </div>
              </div>

              <div className="border-t border-dashed border-[#E2E8F0] my-2 print:border-black"></div>

              <div className="space-y-1 text-[10px]">
                <div className="flex justify-between text-[#6E7385] print:text-black">
                  <span>Tunai Diterima:</span>
                  <span className="font-bold text-[#1E2330] print:text-black">{formatCurrency(lastTransaction.cash)}</span>
                </div>
                <div className="flex justify-between text-[#6E7385] print:text-black">
                  <span>Kembalian:</span>
                  <span className="font-bold text-emerald-600 print:text-black">{formatCurrency(lastTransaction.change)}</span>
                </div>
              </div>

              {lastTransaction.member && (
                <>
                  <div className="border-t border-dashed border-[#E2E8F0] my-2 print:border-black"></div>
                  <div className="bg-[#EEF0FA]/40 p-2.5 rounded-xl space-y-1 text-[9px] text-[#6E7385] print:bg-none print:p-0 print:text-black">
                    <div className="flex justify-between">
                      <span>Nama Member:</span>
                      <span className="font-bold text-[#1E2330] print:text-black">{lastTransaction.member.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Kode Member:</span>
                      <span className="font-bold text-[#1E2330] print:text-black">{lastTransaction.member.code}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Poin Baru Didapat:</span>
                      <span className="font-bold text-[#5B50E5] print:text-black">+{lastTransaction.member.newPointsEarned} pts</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Poin Saat Ini:</span>
                      <span className="font-bold text-[#1E2330] print:text-black">{lastTransaction.member.points} pts</span>
                    </div>
                  </div>
                </>
              )}

              <div className="border-t border-dashed border-[#E2E8F0] my-2 print:border-black"></div>

              <div className="text-center space-y-1 mt-2 text-[9px] text-[#6E7385] print:text-black">
                <p className="font-bold">*** TERIMA KASIH ***</p>
                <p>Barang yang sudah dibeli</p>
                <p>tidak dapat ditukar/dikembalikan.</p>
                <p className="text-[8px] mt-2">Powered by PawShop POS v1.2</p>
              </div>
            </div>

            {/* Modal Actions - Hidden when printing */}
            <div className="mt-6 flex flex-col gap-2.5 print:hidden">
              <button
                onClick={() => window.print()}
                className="w-full py-3 bg-[#5B50E5] hover:bg-[#4A3FC8] text-white rounded-xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all-default shadow-md shadow-[#5B50E5]/15"
              >
                <span className="material-symbols-outlined text-lg">print</span>
                <span>Cetak Struk (Thermal)</span>
              </button>
              <button
                onClick={handleCloseReceipt}
                className="w-full py-3 bg-[#EEF0FA] hover:bg-white text-[#1E2330] border border-[#E2E8F0] rounded-xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all-default"
              >
                <span className="material-symbols-outlined text-lg">add_shopping_cart</span>
                <span>Transaksi Baru</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
