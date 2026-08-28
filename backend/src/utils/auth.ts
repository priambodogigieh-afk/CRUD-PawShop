export function adminGuard({ user, set }: { user: any; set: any }) {
  if (!user || user.role !== 'ADMIN') {
    set.status = 403
    return { error: 'Akses ditolak: Hanya Admin yang diizinkan melakukan tindakan ini' }
  }
}
