import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { loginUser } from '../api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { User, Lock, Eye, EyeOff, Loader2 } from 'lucide-react'

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

    const trimmedUsername = username.trim()
    if (trimmedUsername.length < 3) {
      setError('Username harus memiliki minimal 3 karakter.')
      return
    }
    if (password.length < 4) {
      setError('Password harus memiliki minimal 4 karakter.')
      return
    }

    setLoading(true)
    try {
      const result = await loginUser(trimmedUsername, password)
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
        {/* shadcn Card with glassmorphism */}
        <Card className="bg-white/80 backdrop-blur-xl border-white/60 rounded-3xl p-8 shadow-2xl shadow-indigo-950/5 ring-0">
          <CardContent className="p-0">
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
                    <User className="w-4 h-4" />
                  </div>
                  <Input
                    id="login-username"
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="Masukkan username"
                    required
                    autoComplete="username"
                    className="w-full bg-white border-[#E2E8F0] rounded-xl pl-10 pr-4 py-3 h-12 text-[#1E2330] placeholder-[#A0A5B5] focus-visible:border-[#5B50E5] focus-visible:ring-4 focus-visible:ring-[#5B50E5]/10 shadow-sm transition-all duration-200 text-sm"
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
                    <Lock className="w-4 h-4" />
                  </div>
                  <Input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Masukkan password"
                    required
                    autoComplete="current-password"
                    className="w-full bg-white border-[#E2E8F0] rounded-xl pl-10 pr-10 py-3 h-12 text-[#1E2330] placeholder-[#A0A5B5] focus-visible:border-[#5B50E5] focus-visible:ring-4 focus-visible:ring-[#5B50E5]/10 shadow-sm transition-all duration-200 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A0A5B5] hover:text-[#6E7385] transition-colors cursor-pointer"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                id="login-submit-btn"
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-[#5B50E5] to-[#4A3FC8] hover:from-[#6C62EC] hover:to-[#5B50E5] disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-3 h-12 rounded-xl transition-all duration-200 shadow-lg shadow-[#5B50E5]/20 hover:shadow-[#5B50E5]/35 hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 mt-2 cursor-pointer text-sm"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Masuk...</span>
                  </>
                ) : (
                  'Masuk'
                )}
              </Button>
            </form>

            {/* Footer hint */}
            <p className="text-center text-[#6E7385]/60 text-xs mt-6">
              Hubungi Admin untuk mendapatkan akses akun
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
