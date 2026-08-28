export function adminGuard(c: any) {
  const { user, set } = c
  if (!user || user.role !== 'ADMIN') {
    set.status = 403
    return { error: 'Akses ditolak: Hanya Admin yang diizinkan melakukan tindakan ini' }
  }
}
