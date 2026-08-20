// ==========================================
// AUTH
// ==========================================
export interface User {
  id: string
  username: string
  name: string
  role: 'ADMIN' | 'KASIR'
}

export interface AuthState {
  user: User | null
  token: string | null
  login: (token: string, user: User) => void
  logout: () => void
}

// ==========================================
// INVENTORY — Relational schema v2
// ==========================================

export interface Category {
  id: number
  name: string
  description: string | null
  _count?: { products: number }
}

export interface Brand {
  id: number
  name: string
  _count?: { products: number }
}

export interface Product {
  id: number
  sku: string
  name: string
  categoryId: number
  brandId: number | null
  costPrice: number
  sellingPrice: number
  stock: number
  expiredDate: string | null
  imageUrl?: string | null
  createdAt: string
  updatedAt: string
  category: { id: number; name: string }
  brand: { id: number; name: string } | null
}

export type CategoryInput = {
  name: string
  description?: string
}

export type BrandInput = {
  name: string
}

export type ProductInput = {
  sku: string
  name: string
  categoryId: number
  brandId?: number | null
  costPrice: number
  sellingPrice: number
  stock: number
  expiredDate?: string | null
  imageUrl?: string | null
}

// ==========================================
// TRANSACTIONS & REPORTS
// ==========================================

export interface TransactionItem {
  id: number
  transactionId: number
  productId: number
  productName: string
  quantity: number
  price: number
  costPrice: number
}

export interface Transaction {
  id: number
  invoiceNumber: string
  totalAmount: number
  paymentMethod: string
  cashierId: string
  cashierName: string
  memberId?: number | null
  memberCode?: string | null
  memberName?: string | null
  pointsEarned?: number
  createdAt: string
  items: TransactionItem[]
}

export interface Member {
  id: number
  memberCode: string
  name: string
  phone: string
  points: number
  createdAt: string
}

export interface MemberInput {
  name: string
  phone: string
}

export interface ReportSummary {
  revenue: number
  profit: number
  transactionsCount: number
  averageTransaction: number
  growth: number
}

export interface ChartDataItem {
  label: string
  revenue: number
  profit: number
}

export interface TopProductItem {
  name: string
  qty: number
  revenue: number
}

export interface ReportResponse {
  success: boolean
  summary: ReportSummary
  topProducts: TopProductItem[]
  chartData: ChartDataItem[]
}

