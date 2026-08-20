import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import type { User } from '../types'

interface ProtectedRouteProps {
  children: ReactNode
  allowedRoles?: User['role'][]
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { token, user } = useAuth()

  // Not authenticated → redirect to login
  if (!token || !user) {
    return <Navigate to="/login" replace />
  }

  // Role check (if specified)
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f1117] text-white">
        <div className="text-center">
          <div className="text-5xl mb-4">🚫</div>
          <h2 className="text-xl font-semibold mb-2">Akses Ditolak</h2>
          <p className="text-white/50 text-sm">Anda tidak memiliki izin untuk mengakses halaman ini.</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
