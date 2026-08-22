import bcrypt from 'bcryptjs'

// Declare Bun if TypeScript needs it, or just use it dynamically since it is a global in Bun
declare const Bun: any;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}
