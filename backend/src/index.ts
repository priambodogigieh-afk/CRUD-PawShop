import 'dotenv/config'
import { Elysia, t } from 'elysia'
import { cors } from '@elysiajs/cors'
import { jwt } from '@elysiajs/jwt'
import { bearer } from '@elysiajs/bearer'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import { categoriesRoutes } from './routes/categories'
import { brandsRoutes } from './routes/brands'
import { productsRoutes } from './routes/products'
import { transactionsRoutes } from './routes/transactions'
import { membersRoutes } from './routes/members'
import { hashPassword, verifyPassword } from './utils/password'

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("==================================================");
  console.error("FATAL ERROR: DATABASE_URL environment variable is missing!");
  console.error("Please configure it in the Vercel Dashboard Settings.");
  console.error("==================================================");
}

const pool = new pg.Pool(databaseUrl ? { connectionString: databaseUrl } : undefined);
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const app = new Elysia()
  .use(cors())
  .use(bearer())
  .use(
    jwt({
      name: 'jwt',
      secret: process.env.JWT_SECRET || 'supersecretkey'
    })
  )

  // Derive user from bearer token
  .derive(async ({ jwt, bearer }) => {
    if (!bearer) return { user: null }
    const payload = await jwt.verify(bearer)
    if (!payload) return { user: null }
    return { user: payload as { id: string; username: string; name: string; role: string } }
  })

  // Global Error Handler
  .onError(({ code, error, set }) => {
    const err = error as any
    console.error(`[API Error] Code: ${code}`, err)

    if (code === 'VALIDATION') {
      set.status = 400
      let message = 'Validasi gagal'
      if (err.all && err.all.length > 0) {
        const details = err.all.map((e: any) => {
          const field = e.path.replace('/', '') || 'input'
          let reason = e.message
          if (e.summary) reason = e.summary
          
          if (reason.includes('Expected string')) {
            reason = 'harus berupa teks'
          } else if (reason.includes('Expected number') || reason.includes('Expected integer')) {
            reason = 'harus berupa angka'
          } else if (reason.includes('minimum')) {
            reason = `tidak boleh kurang dari ${e.schema.minimum}`
          } else if (reason.includes('minLength')) {
            reason = `harus memiliki panjang minimal ${e.schema.minLength} karakter`
          } else if (reason.includes('Expected pattern')) {
            reason = 'format tidak valid'
          }
          return `${field}: ${reason}`
        }).join(', ')
        message = `Validasi gagal: ${details}`
      } else {
        message = `Validasi gagal: ${err.message}`
      }
      return { error: message, details: err.all }
    }

    if (code === 'NOT_FOUND') {
      set.status = 404
      return { error: 'Rute API tidak ditemukan' }
    }

    // Prisma Client errors
    if (err.name === 'PrismaClientKnownRequestError') {
      if (err.code === 'P2002') {
        set.status = 400
        const target = (err.meta?.target as string[]) || []
        const fieldName = target.join(', ')
        return { 
          error: `Gagal menyimpan: Data dengan ${fieldName || 'nilai tersebut'} sudah terdaftar (konflik unik).` 
        }
      }
      if (err.code === 'P2003') {
        set.status = 400
        return { error: 'Gagal memproses data karena relasi antar data (foreign key) tidak valid.' }
      }
      if (err.code === 'P2025') {
        set.status = 404
        return { error: 'Data tidak ditemukan di database.' }
      }
    }

    set.status = err.status || 500
    return { 
      error: err.message || 'Terjadi kesalahan internal pada server',
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    }
  })


  // ==========================================
  // PUBLIC ROUTES
  // ==========================================
  .get('/', () => ({
    status: 'success',
    message: 'PawShop POS API v2.0',
    version: '2.0.0'
  }))

  // ==========================================
  // AUTH ROUTES (public)
  // ==========================================
  .post('/api/auth/register', async ({ body, set }) => {
    const { username, password, name, role } = body
    if (role !== 'ADMIN' && role !== 'KASIR') {
      set.status = 400
      return { error: 'Role harus ADMIN atau KASIR' }
    }
    try {
      const existing = await prisma.user.findUnique({ where: { username } })
      if (existing) {
        set.status = 400
        return { error: 'Username sudah digunakan' }
      }
      const hashedPassword = await hashPassword(password)
      const newUser = await prisma.user.create({
        data: { username, password: hashedPassword, name, role }
      })
      return {
        success: true,
        user: { id: newUser.id, username: newUser.username, name: newUser.name, role: newUser.role }
      }
    } catch (error: any) {
      console.error('Register error:', error)
      set.status = 500
      return { error: 'Gagal melakukan registrasi', details: error?.message || String(error) }
    }
  }, {
    body: t.Object({
      username: t.String({ minLength: 3 }),
      password: t.String({ minLength: 4 }),
      name: t.String({ minLength: 1 }),
      role: t.String()
    })
  })

  .post('/api/auth/login', async ({ body, jwt, set }) => {
    const { username, password } = body
    try {
      const user = await prisma.user.findUnique({ where: { username } })
      if (!user) {
        set.status = 401
        return { error: 'Username atau password salah' }
      }
      const isMatch = await verifyPassword(password, user.password)
      if (!isMatch) {
        set.status = 401
        return { error: 'Username atau password salah' }
      }
      const token = await jwt.sign({
        id: user.id, username: user.username, name: user.name, role: user.role
      })
      return {
        success: true,
        token,
        user: { id: user.id, username: user.username, name: user.name, role: user.role }
      }
    } catch (error: any) {
      console.error('Login error:', error)
      set.status = 500
      return { error: 'Gagal melakukan login', details: error?.message || String(error) }
    }
  }, {
    body: t.Object({ username: t.String(), password: t.String() })
  })

  // ==========================================
  // PROTECTED ROUTES (JWT required)
  // ==========================================
  .group('', (app) =>
    app
      .guard({
        beforeHandle({ user, set }: any) {
          if (!user) {
            set.status = 401
            return { error: 'Unauthorized: Missing or invalid token' }
          }
        }
      })
      // Categories CRUD (all authenticated users can read, ADMIN can write)
      .use(categoriesRoutes(prisma))
      // Brands CRUD
      .use(brandsRoutes(prisma))
      // Products CRUD
      .use(productsRoutes(prisma))
      // Transactions & Reports
      .use(transactionsRoutes(prisma))
      // Members CRUD
      .use(membersRoutes(prisma))
  )

if (!process.env.VERCEL) {
  app.listen(3000)
  console.log(
    `🦊 Elysia is running at http://${app.server?.hostname}:${app.server?.port}`
  )
}

export default app
