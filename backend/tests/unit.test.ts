import { describe, expect, it } from 'bun:test'

// Helper function to calculate points (1 point per Rp 10.000)
export function calculatePoints(totalAmount: number): number {
  if (totalAmount < 0) return 0
  return Math.floor(totalAmount / 10000)
}

// Mock validation helper for product request payload
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

describe('Unit Tests - Business Logic & Request Validation', () => {
  
  describe('Point Calculation Logic (1 point per Rp 10.000)', () => {
    it('should return 0 points for transaction total below Rp 10.000', () => {
      expect(calculatePoints(5000)).toBe(0)
      expect(calculatePoints(9999)).toBe(0)
    })

    it('should return 1 point for transaction total exactly Rp 10.000', () => {
      expect(calculatePoints(10000)).toBe(1)
    })

    it('should calculate floor points correctly for larger amounts', () => {
      expect(calculatePoints(15000)).toBe(1)
      expect(calculatePoints(25500)).toBe(2)
      expect(calculatePoints(100000)).toBe(10)
    })

    it('should return 0 points for negative transaction amounts', () => {
      expect(calculatePoints(-5000)).toBe(0)
    })
  })

  describe('Product Request Payload Validation', () => {
    it('should fail if SKU is empty', () => {
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

    it('should fail if name is empty', () => {
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

    it('should fail if sellingPrice is negative', () => {
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

    it('should fail if stock is negative', () => {
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

    it('should pass with valid product details', () => {
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

  describe('Password Hashing Utility', () => {
    it('should hash and verify password correctly using Bun password API', async () => {
      const password = 'mySecretPassword'
      const hashed = await Bun.password.hash(password)
      expect(hashed).toBeDefined()
      expect(hashed).not.toBe(password)

      const isMatch = await Bun.password.verify(password, hashed)
      expect(isMatch).toBe(true)

      const isWrongMatch = await Bun.password.verify('wrongPassword', hashed)
      expect(isWrongMatch).toBe(false)
    })
  })
})
