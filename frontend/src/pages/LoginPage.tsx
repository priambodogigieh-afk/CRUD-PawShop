import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { loginUser } from '../api'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const result = await loginUser(username, password)
      login(result.token, result.user)
      navigate('/', { replace: true })
    } catch (err: any) {
      setError(err.message || 'Login gagal. Periksa kembali username dan password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-[#F4F5FC] via-[#EEF0FA] to-[#E6E8F7]">
      {/* Animated gradient orbs background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#5B50E5]/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/3 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute -bottom-20 left-1/3 w-72 h-72 bg-teal-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="relative z-10 w-full max-w-md px-4">
        {/* Card */}
        <div className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-3xl p-8 shadow-2xl shadow-indigo-950/5">
          {/* Logo & Branding */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-md mb-4 p-2.5 border border-[#E2E8F0]">
              <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-2xl font-bold text-[#1E2330]">PAWSHOP POS</h1>
            <p className="text-[#6E7385] text-sm mt-1">Masuk ke akun Anda</p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-5 flex items-center gap-2 bg-red-50 border border-red-200 text-[#E03131] rounded-xl px-4 py-3 text-sm animate-in fade-in">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username */}
            <div>
              <label htmlFor="login-username" className="block text-sm font-semibold text-[#6E7385] mb-1.5">
                Username
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A0A5B5]">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <input
                  id="login-username"
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Masukkan username"
                  required
                  autoComplete="username"
                  className="w-full bg-white border border-[#E2E8F0] rounded-xl pl-10 pr-4 py-3 text-[#1E2330] placeholder-[#A0A5B5] focus:outline-none focus:border-[#5B50E5] focus:ring-4 focus:ring-[#5B50E5]/10 shadow-sm transition-all duration-200 text-sm"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="login-password" className="block text-sm font-semibold text-[#6E7385] mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A0A5B5]">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Masukkan password"
                  required
                  autoComplete="current-password"
                  className="w-full bg-white border border-[#E2E8F0] rounded-xl pl-10 pr-10 py-3 text-[#1E2330] placeholder-[#A0A5B5] focus:outline-none focus:border-[#5B50E5] focus:ring-4 focus:ring-[#5B50E5]/10 shadow-sm transition-all duration-200 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A0A5B5] hover:text-[#6E7385] transition-colors"
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              id="login-submit-btn"
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#5B50E5] to-[#4A3FC8] hover:from-[#6C62EC] hover:to-[#5B50E5] disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-all duration-200 shadow-lg shadow-[#5B50E5]/20 hover:shadow-[#5B50E5]/35 hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 mt-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Masuk...
                </>
              ) : (
                'Masuk'
              )}
            </button>
          </form>

          {/* Footer hint */}
          <p className="text-center text-[#6E7385]/60 text-xs mt-6">
            Hubungi Admin untuk mendapatkan akses akun
          </p>
        </div>

        {/* Role badges */}
        <div className="flex justify-center gap-3 mt-4">
          <span className="inline-flex items-center gap-1.5 bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs px-3 py-1 rounded-full font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Admin
          </span>
          <span className="inline-flex items-center gap-1.5 bg-blue-100 border border-blue-200 text-blue-700 text-xs px-3 py-1 rounded-full font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            Kasir
          </span>
        </div>
      </div>
    </div>
  )
}
