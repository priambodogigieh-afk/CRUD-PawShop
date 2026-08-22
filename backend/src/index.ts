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

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

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
      const hashedPassword = await Bun.password.hash(password)
      const newUser = await prisma.user.create({
        data: { username, password: hashedPassword, name, role }
      })
      return {
        success: true,
        user: { id: newUser.id, username: newUser.username, name: newUser.name, role: newUser.role }
      }
    } catch (error) {
      console.error('Register error:', error)
      set.status = 500
      return { error: 'Gagal melakukan registrasi' }
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
      const isMatch = await Bun.password.verify(password, user.password)
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
    } catch (error) {
      console.error('Login error:', error)
      set.status = 500
      return { error: 'Gagal melakukan login' }
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
  .listen(3000)

console.log(
  `🦊 Elysia is running at http://${app.server?.hostname}:${app.server?.port}`
)
