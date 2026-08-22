import { describe, expect, it } from 'bun:test'

// Fungsi pembantu untuk menghitung poin (1 poin per Rp 10.000)
export function calculatePoints(totalAmount: number): number {
  if (totalAmount < 0) return 0
  return Math.floor(totalAmount / 10000)
}

// Fungsi pembantu validasi payload request produk
export function validateProductPayload(payload: {
  sku: string
  name: string
  categoryId: number
  sellingPrice: number
  stock: number
}) {
  if (!payload.sku || payload.sku.trim().length === 0) {
    return { success: false, error: 'SKU tidak boleh kosong' }
  }
  if (!payload.name || payload.name.trim().length === 0) {
    return { success: false, error: 'Nama produk tidak boleh kosong' }
  }
  if (!payload.categoryId || payload.categoryId <= 0) {
    return { success: false, error: 'Kategori tidak valid' }
  }
  if (payload.sellingPrice < 0) {
    return { success: false, error: 'Harga jual tidak boleh negatif' }
  }
  if (payload.stock < 0) {
    return { success: false, error: 'Stok tidak boleh negatif' }
  }
  return { success: true }
}

describe('Pengujian Unit - Logika Bisnis & Validasi Request', () => {
  
  describe('Logika Perhitungan Poin (1 poin per Rp 10.000)', () => {
    it('harus mengembalikan 0 poin untuk total transaksi di bawah Rp 10.000', () => {
      expect(calculatePoints(5000)).toBe(0)
      expect(calculatePoints(9999)).toBe(0)
    })

    it('harus mengembalikan 1 poin untuk total transaksi tepat Rp 10.000', () => {
      expect(calculatePoints(10000)).toBe(1)
    })

    it('harus menghitung poin pembulatan ke bawah dengan benar untuk nominal besar', () => {
      expect(calculatePoints(15000)).toBe(1)
      expect(calculatePoints(25500)).toBe(2)
      expect(calculatePoints(100000)).toBe(10)
    })

    it('harus mengembalikan 0 poin untuk nominal transaksi negatif', () => {
      expect(calculatePoints(-5000)).toBe(0)
    })
  })

  describe('Validasi Payload Request Produk', () => {
    it('harus gagal jika SKU kosong', () => {
      const result = validateProductPayload({
        sku: '   ',
        name: 'Royal Canin Maxi',
        categoryId: 1,
        sellingPrice: 150000,
        stock: 10
      })
      expect(result.success).toBe(false)
      expect(result.error).toBe('SKU tidak boleh kosong')
    })

    it('harus gagal jika nama kosong', () => {
      const result = validateProductPayload({
        sku: 'RC-MAXI',
        name: '',
        categoryId: 1,
        sellingPrice: 150000,
        stock: 10
      })
      expect(result.success).toBe(false)
      expect(result.error).toBe('Nama produk tidak boleh kosong')
    })

    it('harus gagal jika harga jual negatif', () => {
      const result = validateProductPayload({
        sku: 'RC-MAXI',
        name: 'Royal Canin Maxi',
        categoryId: 1,
        sellingPrice: -100,
        stock: 10
      })
      expect(result.success).toBe(false)
      expect(result.error).toBe('Harga jual tidak boleh negatif')
    })

    it('harus gagal jika stok negatif', () => {
      const result = validateProductPayload({
        sku: 'RC-MAXI',
        name: 'Royal Canin Maxi',
        categoryId: 1,
        sellingPrice: 150000,
        stock: -5
      })
      expect(result.success).toBe(false)
      expect(result.error).toBe('Stok tidak boleh negatif')
    })

    it('harus lolos dengan detail produk yang valid', () => {
      const result = validateProductPayload({
        sku: 'RC-MAXI',
        name: 'Royal Canin Maxi',
        categoryId: 1,
        sellingPrice: 150000,
        stock: 10
      })
      expect(result.success).toBe(true)
    })
  })

  describe('Utilitas Hashing Password', () => {
    it('harus melakukan hash dan verifikasi password dengan benar menggunakan custom password utility', async () => {
      const password = 'mySecretPassword'
      const { hashPassword, verifyPassword } = await import('../src/utils/password')
      const hashed = await hashPassword(password)
      expect(hashed).toBeDefined()
      expect(hashed).not.toBe(password)

      const isMatch = await verifyPassword(password, hashed)
      expect(isMatch).toBe(true)

      const isWrongMatch = await verifyPassword('wrongPassword', hashed)
      expect(isWrongMatch).toBe(false)
    })
  })
})
