import type { Category, Brand, Product, CategoryInput, BrandInput, ProductInput, Transaction, ReportResponse, Member, MemberInput } from './types'
import { getStoredToken } from './context/AuthContext'

const API_BASE = import.meta.env.DEV ? 'http://localhost:3000/api' : '/api'

function authHeaders(contentType = true): Record<string, string> {
  const token = getStoredToken()
  const headers: Record<string, string> = {}
  if (contentType) headers['Content-Type'] = 'application/json'
  if (token) headers['Authorization'] = `Bearer ${token}`
  return headers
}

async function handleResponse<T>(res: Response): Promise<T> {
  const text = await res.text()
  let data: any
  try {
    data = text ? JSON.parse(text) : {}
  } catch (e) {
    data = { error: text || `HTTP error ${res.status}` }
  }

  if (!res.ok) {
    const errorMsg = data.error || data.message || `Request failed with status ${res.status}`
    throw new Error(errorMsg)
  }
  return data as T
}

// ==========================================
// AUTH
// ==========================================
export async function loginUser(username: string, password: string) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  return handleResponse<{ success: boolean; token: string; user: { id: string; username: string; name: string; role: 'ADMIN' | 'KASIR' } }>(res)
}

// ==========================================
// CATEGORIES
// ==========================================
export async function fetchCategories(): Promise<Category[]> {
  const res = await fetch(`${API_BASE}/categories`, { headers: authHeaders(false) })
  return handleResponse<Category[]>(res)
}

export async function createCategory(data: CategoryInput): Promise<{ success: boolean; category: Category }> {
  const res = await fetch(`${API_BASE}/categories`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  })
  return handleResponse(res)
}

export async function updateCategory(id: number, data: Partial<CategoryInput>): Promise<{ success: boolean; category: Category }> {
  const res = await fetch(`${API_BASE}/categories/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(data),
  })
  return handleResponse(res)
}

export async function deleteCategory(id: number): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/categories/${id}`, {
    method: 'DELETE',
    headers: authHeaders(false),
  })
  return handleResponse(res)
}

// ==========================================
// BRANDS
// ==========================================
export async function fetchBrands(): Promise<Brand[]> {
  const res = await fetch(`${API_BASE}/brands`, { headers: authHeaders(false) })
  return handleResponse<Brand[]>(res)
}

export async function createBrand(data: BrandInput): Promise<{ success: boolean; brand: Brand }> {
  const res = await fetch(`${API_BASE}/brands`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  })
  return handleResponse(res)
}

export async function updateBrand(id: number, data: Partial<BrandInput>): Promise<{ success: boolean; brand: Brand }> {
  const res = await fetch(`${API_BASE}/brands/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(data),
  })
  return handleResponse(res)
}

export async function deleteBrand(id: number): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/brands/${id}`, {
    method: 'DELETE',
    headers: authHeaders(false),
  })
  return handleResponse(res)
}

// ==========================================
// PRODUCTS
// ==========================================
export interface ProductsQueryParams {
  search?: string
  categoryId?: number
  sortBy?: 'price_asc' | 'price_desc' | 'stock_asc' | 'stock_desc' | 'name_asc'
}

export async function fetchProducts(params?: ProductsQueryParams): Promise<Product[]> {
  const qs = new URLSearchParams()
  if (params?.search) qs.set('search', params.search)
  if (params?.categoryId) qs.set('categoryId', String(params.categoryId))
  if (params?.sortBy) qs.set('sortBy', params.sortBy)
  const url = `${API_BASE}/products${qs.toString() ? '?' + qs.toString() : ''}`
  const res = await fetch(url, { headers: authHeaders(false) })
  return handleResponse<Product[]>(res)
}

export async function createProduct(data: ProductInput): Promise<{ success: boolean; product: Product }> {
  const res = await fetch(`${API_BASE}/products`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  })
  return handleResponse(res)
}

export async function updateProduct(id: number, data: Partial<ProductInput>): Promise<{ success: boolean; product: Product }> {
  const res = await fetch(`${API_BASE}/products/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(data),
  })
  return handleResponse(res)
}

export async function deleteProduct(id: number): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/products/${id}`, {
    method: 'DELETE',
    headers: authHeaders(false),
  })
  return handleResponse(res)
}

export async function patchProductStock(id: number, stock: number): Promise<{ success: boolean; product: Product }> {
  const res = await fetch(`${API_BASE}/products/${id}/stock`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ stock }),
  })
  return handleResponse(res)
}

// ==========================================
// TRANSACTIONS & REPORTS
// ==========================================
export async function createTransaction(data: { paymentMethod: string; memberId?: number | null; items: { productId: number; quantity: number }[] }): Promise<{ success: boolean; transaction: Transaction }> {
  const res = await fetch(`${API_BASE}/transactions`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  })
  return handleResponse(res)
}

export async function fetchReports(type: 'daily' | 'weekly' | 'monthly'): Promise<ReportResponse> {
  const res = await fetch(`${API_BASE}/transactions/reports?type=${type}`, {
    headers: authHeaders(false),
  })
  return handleResponse<ReportResponse>(res)
}

export async function fetchTransactions(): Promise<Transaction[]> {
  const res = await fetch(`${API_BASE}/transactions`, {
    headers: authHeaders(false),
  })
  return handleResponse<Transaction[]>(res)
}

// ==========================================
// MEMBERS
// ==========================================
export async function fetchMembers(search?: string): Promise<Member[]> {
  const qs = new URLSearchParams()
  if (search) qs.set('search', search)
  const url = `${API_BASE}/members${qs.toString() ? '?' + qs.toString() : ''}`
  const res = await fetch(url, { headers: authHeaders(false) })
  return handleResponse<Member[]>(res)
}

export async function createMember(data: MemberInput): Promise<{ success: boolean; member: Member }> {
  const res = await fetch(`${API_BASE}/members`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  })
  return handleResponse(res)
}

export async function updateMember(id: number, data: MemberInput): Promise<{ success: boolean; member: Member }> {
  const res = await fetch(`${API_BASE}/members/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(data),
  })
  return handleResponse(res)
}

export async function deleteMember(id: number): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/members/${id}`, {
    method: 'DELETE',
    headers: authHeaders(false),
  })
  return handleResponse(res)
}
