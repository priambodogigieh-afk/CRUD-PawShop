import bcrypt from 'bcryptjs'

// Declare Bun if TypeScript needs it, or just use it dynamically since it is a global in Bun
declare const Bun: any;

export async function hashPassword(password: string): Promise<string> {
  if (typeof Bun !== 'undefined' && Bun.password) {
    return Bun.password.hash(password)
  }
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (typeof Bun !== 'undefined' && Bun.password) {
    return Bun.password.verify(password, hash)
  }
  return bcrypt.compare(password, hash)
}
