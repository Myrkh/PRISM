import { useEffect, useState, type FormEvent } from 'react'
import {
  ArrowRight,
  BarChart2,
  Chrome,
  Cpu,
  Eye,
  EyeOff,
  FileCheck2,
  Github,
  List,
  Loader2,
  Mail,
  Server,
  ShieldCheck,
  UserPlus,
  Users,
} from 'lucide-react'
import {
  AUTH_FOOTER_LEGAL_LINKS,
  AUTH_FOOTER_PRIMARY_LINKS,
  AuthFooterPagePanel,
  getAuthFooterPageLabel,
  type AuthFooterPageId,
} from '@/components/auth/AuthFooterPages'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { colors, dark, semantic } from '@/styles/tokens'
import { useAppStore } from '@/store/appStore'

type AuthMode = 'login' | 'signup'

type PasswordInputProps = {
  value: string
  onChange: (value: string) => void
  placeholder: string
  showPassword: boolean
  toggleShowPassword: () => void
}

type ForgotPasswordModalProps = {
  loading: boolean
  onClose: () => void
  onSubmit: (email: string) => Promise<void>
}

const CAROUSEL_SLIDES = [
  {
    icon: List,
    accent: colors.tealDim,
    title: 'SIF register, architecture, and compliance',
    description: 'Keep assumptions, loop architecture, and governance evidence aligned from one workspace instead of scattered sheets.',
  },
  {
    icon: BarChart2,
    accent: semantic.info,
    title: 'Live analysis backed by engineering context',
    description: 'Review the fast TypeScript estimate immediately, then escalate only the difficult cases to the advanced backend engine.',
  },
  {
    icon: ShieldCheck,
    accent: semantic.success,
    title: 'Proof tests with archived evidence',
    description: 'Run campaigns, capture results, publish PDFs, and keep the test evidence attached to the right revision baseline.',
  },
  {
    icon: FileCheck2,
    accent: semantic.warning,
    title: 'Published revisions that stay frozen',
    description: 'Close a revision, archive the final report, then restart cleanly from the next revision instead of rewriting history.',
  },
  {
    icon: Server,
    accent: semantic.warning,
    title: 'Hybrid engine strategy',
    description: 'Use PRISM interactively in the frontend and reserve Markov, Monte Carlo, and solver-heavy cases for the Python backend.',
  },
  {
    icon: Users,
    accent: semantic.info,
    title: 'Profiles for ownership and attribution',
    description: 'Tie future libraries, approvals, and engineering actions back to named users instead of an anonymous app session.',
  },
  {
    icon: Cpu,
    accent: colors.teal,
    title: 'Engine-ready platform',
    description: 'The new Engine workspace is prepared for queued runs, contracts, outputs, and TS-versus-Python comparisons.',
  },
  {
    icon: UserPlus,
    accent: colors.tealDim,
    title: 'Foundation for a reusable library',
    description: 'Authentication is the base needed to move from local component snippets to a real owned and reviewable template library.',
  },
] as const

function withAlpha(hex: string, alpha: string): string {
  return `${hex}${alpha}`
}

// ─── Password input ───────────────────────────────────────────────────────────

function PasswordInput({
  value,
  onChange,
  placeholder,
  showPassword,
  toggleShowPassword,
}: PasswordInputProps) {
  return (
    <div className="relative">
      <Input
        type={showPassword ? 'text' : 'password'}
        placeholder={placeholder}
        value={value}
        onChange={event => onChange(event.target.value)}
        required
        className="w-full rounded-lg border border-transparent px-4 py-3 pr-10 text-sm transition-shadow"
        style={{ background: dark.card2, color: dark.text }}
      />
      <button
        type="button"
        onClick={toggleShowPassword}
        className="absolute inset-y-0 right-0 flex items-center px-3 transition-colors"
        style={{ color: dark.textDim }}
      >
        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  )
}

// ─── Forgot password modal ────────────────────────────────────────────────────

function ForgotPasswordModal({ loading, onClose, onSubmit }: ForgotPasswordModalProps) {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await onSubmit(email)
    setSent(true)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="w-full max-w-sm rounded-2xl border p-7 shadow-2xl"
        style={{ background: dark.panel, borderColor: withAlpha(dark.text, '12') }}
      >
        {!sent ? (
          <>
            <div className="mb-5 flex items-center gap-3">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-lg"
                style={{ background: withAlpha(colors.teal, '1F') }}
              >
                <Mail className="h-4 w-4" style={{ color: colors.teal }} />
              </div>
              <div>
                <h3 className="text-sm font-bold" style={{ color: dark.text }}>
                  Reset password
                </h3>
                <p className="text-xs" style={{ color: dark.textDim }}>
                  A recovery link will be sent to your email
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                type="email"
                placeholder="Your email address"
                value={email}
                onChange={event => setEmail(event.target.value)}
                required
                className="w-full rounded-lg border border-transparent px-4 py-2.5 text-sm"
                style={{ background: dark.card2, color: dark.text }}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-lg border px-4 py-2.5 text-sm transition-all"
                  style={{ color: dark.textDim, borderColor: withAlpha(dark.text, '12') }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-60"
                  style={{ background: colors.teal, color: dark.text }}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                  Send
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="py-2 text-center">
            <div
              className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border"
              style={{ background: withAlpha(semantic.success, '14'), borderColor: withAlpha(semantic.success, '40') }}
            >
              <Mail className="h-6 w-6" style={{ color: semantic.success }} />
            </div>
            <p className="mb-1.5 font-bold" style={{ color: dark.text }}>
              Email sent
            </p>
            <p className="mb-5 text-xs leading-relaxed" style={{ color: dark.textDim }}>
              A reset link has been sent to <strong style={{ color: dark.text }}>{email}</strong>.
            </p>
            <button
              onClick={onClose}
              className="w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors"
              style={{ background: colors.teal, color: dark.text }}
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Feature showcase (right carousel panel) ──────────────────────────────────

function FeatureShowcase({ carouselIndex, onDotClick }: { carouselIndex: number; onDotClick: (i: number) => void }) {
  return (
    <div
      className="relative flex h-full flex-col items-center justify-between overflow-hidden p-8 md:p-10 xl:p-12"
      style={{ background: dark.card2 }}
    >
      {/* Background gradient */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 70% 40% at 50% 20%, ${withAlpha(colors.teal, '1A')} 0%, transparent 70%),
            linear-gradient(180deg, ${dark.card2} 0%, ${dark.panel} 100%)
          `,
        }}
      />

      {/* Center content */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center text-center w-full">
        {/* Icon */}
        <div className="relative mb-8 h-24 w-24 shrink-0">
          {CAROUSEL_SLIDES.map((slide, slideIndex) => {
            const SlideIcon = slide.icon
            return (
              <div
                key={slide.title}
                className={`absolute inset-0 flex items-center justify-center transition-all duration-500 ease-in-out ${
                  slideIndex === carouselIndex ? 'scale-100 opacity-100' : 'scale-90 opacity-0'
                }`}
              >
                <div
                  className="flex h-24 w-24 items-center justify-center rounded-3xl"
                  style={{
                    background: withAlpha(slide.accent, '14'),
                    boxShadow: slideIndex === carouselIndex ? `0 0 40px ${withAlpha(slide.accent, '33')}` : 'none',
                  }}
                >
                  <SlideIcon className="h-12 w-12" strokeWidth={1.2} style={{ color: slide.accent }} />
                </div>
              </div>
            )
          })}
        </div>

        {/* Text */}
        <div className="w-full" style={{ minHeight: 132 }}>
          {CAROUSEL_SLIDES.map((slide, slideIndex) => (
            <div
              key={slide.title}
              style={{ display: slideIndex === carouselIndex ? 'block' : 'none' }}
            >
              <h2 className="mb-3 px-2 text-2xl font-bold leading-snug" style={{ color: dark.text }}>
                {slide.title}
              </h2>
              <p className="px-4 text-sm leading-relaxed" style={{ color: withAlpha(dark.text, '80') }}>
                {slide.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Dots */}
      <div className="relative z-10 flex shrink-0 justify-center gap-2 pt-6">
        {CAROUSEL_SLIDES.map((slide, slideIndex) => (
          <button
            key={slide.title}
            type="button"
            onClick={() => onDotClick(slideIndex)}
            className="rounded-full transition-all duration-300"
            style={{
              width: slideIndex === carouselIndex ? 24 : 8,
              height: 8,
              background: slideIndex === carouselIndex ? colors.teal : withAlpha(dark.text, '33'),
            }}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Main auth screen ─────────────────────────────────────────────────────────

export function AuthScreen() {
  const authLoading = useAppStore(s => s.authLoading)
  const authError = useAppStore(s => s.authError)
  const setAuthError = useAppStore(s => s.setAuthError)
  const signInWithOAuth = useAppStore(s => s.signInWithOAuth)
  const signInWithPassword = useAppStore(s => s.signInWithPassword)
  const signUpWithPassword = useAppStore(s => s.signUpWithPassword)
  const requestPasswordReset = useAppStore(s => s.requestPasswordReset)

  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [company, setCompany] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [notice, setNotice] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [carouselIndex, setCarouselIndex] = useState(0)
  const [activeFooterPage, setActiveFooterPage] = useState<AuthFooterPageId | null>(null)

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCarouselIndex(current => (current + 1) % CAROUSEL_SLIDES.length)
    }, 4500)
    return () => window.clearInterval(timer)
  }, [])

  const resetMessages = () => {
    setNotice(null)
    setAuthError(null)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (authLoading) return
    resetMessages()
    if (mode === 'signup' && password !== confirmPassword) {
      setAuthError('Passwords do not match.')
      return
    }
    try {
      if (mode === 'login') {
        await signInWithPassword(email.trim(), password)
      } else {
        const result = await signUpWithPassword(email.trim(), password, fullName.trim(), {
          company: company.trim(),
          jobTitle: jobTitle.trim(),
        })
        if (result === 'pending_confirmation') {
          setNotice('Account created. Check your inbox to confirm your email before signing in.')
        }
      }
    } catch {
      // Store-level authError is rendered below the form.
    }
  }

  const handleForgotPassword = async (resetEmail: string) => {
    resetMessages()
    await requestPasswordReset(resetEmail)
  }

  const handleOAuth = async (provider: 'google' | 'github') => {
    resetMessages()
    try {
      await signInWithOAuth(provider)
    } catch {
      // Store-level authError is rendered below the form.
    }
  }

  return (
    <>
      {/* Forgot password modal (viewport-level) */}
      {showForgotPassword && (
        <ForgotPasswordModal
          onClose={() => setShowForgotPassword(false)}
          onSubmit={handleForgotPassword}
          loading={authLoading}
        />
      )}

      {/* Footer page overlay (viewport-level) */}
      {activeFooterPage && (
        <AuthFooterPagePanel
          page={activeFooterPage}
          onClose={() => setActiveFooterPage(null)}
          onNavigate={setActiveFooterPage}
        />
      )}

      {/* Full-screen split layout */}
      <div
        className="flex min-h-screen"
        style={{
          background: `
            radial-gradient(900px 520px at 12% 8%, ${withAlpha(colors.teal, '12')} 0%, transparent 58%),
            radial-gradient(860px 480px at 88% 12%, ${withAlpha(colors.tealDim, '08')} 0%, transparent 60%),
            linear-gradient(180deg, ${dark.page} 0%, ${dark.rail} 100%)
          `,
        }}
      >
        {/* ── Left: auth panel ───────────────────────────────────────────── */}
        <div
          className="relative flex w-full flex-col md:w-1/2"
          style={{ background: dark.panel, borderRight: `1px solid ${withAlpha(dark.border, 'CC')}` }}
        >
          {/* Scrollable inner — vertically centered, bounded width */}
          <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto px-6 py-12 md:px-10 xl:px-14">
            <div className="w-full max-w-[400px]">

              {/* Brand */}
              <div className="mb-9 flex items-center gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl border"
                  style={{ background: withAlpha(colors.teal, '14'), borderColor: withAlpha(colors.teal, '40') }}
                >
                  <img src="/favicon2.png" alt="PRISM" className="h-5 w-5 object-contain" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h1 className="text-2xl font-bold tracking-wide" style={{ color: dark.text }}>PRISM</h1>
                    <span
                      className="rounded-full border px-2 py-0.5 text-[10px] font-bold"
                      style={{ background: withAlpha(semantic.warning, '14'), color: semantic.warning, borderColor: withAlpha(semantic.warning, '24') }}
                    >
                      BETA
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs" style={{ color: dark.textDim }}>
                    Process Safety Engineering Workspace
                  </p>
                </div>
              </div>

              {/* Heading */}
              <h2 className="mb-2 text-2xl font-bold" style={{ color: dark.text }}>
                {mode === 'login' ? 'Welcome back' : 'Join PRISM'}
              </h2>
              <p className="mb-7 text-sm leading-relaxed" style={{ color: dark.textDim }}>
                {mode === 'login'
                  ? 'Sign in to access your projects, SIF dashboards, revision history, and proof test evidence.'
                  : 'Create an account to start using authenticated engineering workflows in PRISM.'}
              </p>

              {/* Form */}
              <form onSubmit={handleSubmit}>
                <div className="mb-3 space-y-3">
                  {mode === 'signup' && (
                    <>
                      <Input
                        type="text"
                        placeholder="Full name"
                        value={fullName}
                        onChange={event => setFullName(event.target.value)}
                        required
                        className="w-full rounded-lg border border-transparent px-4 py-3 text-sm"
                        style={{ background: dark.card2, color: dark.text }}
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <Input
                          type="text"
                          placeholder="Company"
                          value={company}
                          onChange={event => setCompany(event.target.value)}
                          className="w-full rounded-lg border border-transparent px-4 py-3 text-sm"
                          style={{ background: dark.card2, color: dark.text }}
                        />
                        <Input
                          type="text"
                          placeholder="Role (optional)"
                          value={jobTitle}
                          onChange={event => setJobTitle(event.target.value)}
                          className="w-full rounded-lg border border-transparent px-4 py-3 text-sm"
                          style={{ background: dark.card2, color: dark.text }}
                        />
                      </div>
                      <div className="border-t pt-1" style={{ borderColor: withAlpha(dark.text, '14') }} />
                    </>
                  )}

                  <Input
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={event => setEmail(event.target.value)}
                    required
                    className="w-full rounded-lg border border-transparent px-4 py-3 text-sm"
                    style={{ background: dark.card2, color: dark.text }}
                  />

                  <PasswordInput
                    value={password}
                    onChange={setPassword}
                    placeholder="Password"
                    showPassword={showPassword}
                    toggleShowPassword={() => setShowPassword(v => !v)}
                  />

                  {mode === 'signup' && (
                    <PasswordInput
                      value={confirmPassword}
                      onChange={setConfirmPassword}
                      placeholder="Confirm password"
                      showPassword={showPassword}
                      toggleShowPassword={() => setShowPassword(v => !v)}
                    />
                  )}
                </div>

                {mode === 'login' && (
                  <div className="mb-5 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(true)}
                      className="text-xs transition-colors"
                      style={{ color: colors.tealDim }}
                    >
                      Forgot password?
                    </button>
                  </div>
                )}

                {authError && (
                  <div
                    className="mb-4 rounded-lg border p-3 text-center text-xs"
                    style={{ background: withAlpha(semantic.error, '14'), borderColor: withAlpha(semantic.error, '24'), color: semantic.error }}
                  >
                    {authError}
                  </div>
                )}

                {notice && (
                  <div
                    className="mb-4 rounded-lg border p-3 text-center text-xs"
                    style={{ background: withAlpha(colors.teal, '14'), borderColor: withAlpha(colors.teal, '24'), color: colors.tealDim }}
                  >
                    {notice}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={authLoading}
                  className="flex w-full items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                  style={{ background: `linear-gradient(135deg, ${colors.teal}, ${colors.tealDark})`, color: '#fff' }}
                >
                  {authLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : mode === 'login' ? (
                    <ArrowRight className="h-4 w-4" />
                  ) : (
                    <UserPlus className="h-4 w-4" />
                  )}
                  {mode === 'login' ? 'Sign in' : 'Create account'}
                </button>
              </form>

              {/* OAuth */}
              <div className="mt-5">
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1" style={{ background: withAlpha(dark.text, '14') }} />
                  <span className="text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: dark.textDim }}>
                    OAuth
                  </span>
                  <div className="h-px flex-1" style={{ background: withAlpha(dark.text, '14') }} />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={authLoading}
                    className="rounded-lg border px-4 py-2.5 text-sm font-semibold"
                    style={{ background: dark.card2, borderColor: withAlpha(dark.border, 'CC'), color: dark.text }}
                    onClick={() => { void handleOAuth('google') }}
                  >
                    {authLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Chrome className="mr-2 h-4 w-4" />}
                    Google
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={authLoading}
                    className="rounded-lg border px-4 py-2.5 text-sm font-semibold"
                    style={{ background: dark.card2, borderColor: withAlpha(dark.border, 'CC'), color: dark.text }}
                    onClick={() => { void handleOAuth('github') }}
                  >
                    {authLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Github className="mr-2 h-4 w-4" />}
                    GitHub
                  </Button>
                </div>
              </div>

              {/* Switch mode */}
              <p className="mt-5 text-center text-xs" style={{ color: dark.textDim }}>
                {mode === 'login' ? 'No account yet?' : 'Already have an account?'}{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode(current => (current === 'login' ? 'signup' : 'login'))
                    resetMessages()
                  }}
                  className="font-semibold transition-colors"
                  style={{ color: colors.teal }}
                >
                  {mode === 'login' ? 'Sign up' : 'Sign in'}
                </button>
              </p>
            </div>
          </div>

          {/* Footer links — pinned at bottom of left panel */}
          <div
            className="shrink-0 border-t px-6 py-4 md:px-10"
            style={{ borderColor: withAlpha(dark.border, 'CC') }}
          >
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
              {[...AUTH_FOOTER_PRIMARY_LINKS, ...AUTH_FOOTER_LEGAL_LINKS].map(page => (
                <button
                  key={page}
                  type="button"
                  className="text-[11px] transition-colors hover:text-white"
                  style={{ color: withAlpha(dark.textDim, 'CC') }}
                  onClick={() => setActiveFooterPage(page)}
                >
                  {getAuthFooterPageLabel(page)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right: carousel — hidden on mobile ────────────────────────── */}
        <div className="hidden md:flex md:w-1/2 md:flex-col md:sticky md:top-0 md:h-screen">
          <FeatureShowcase carouselIndex={carouselIndex} onDotClick={setCarouselIndex} />
        </div>
      </div>
    </>
  )
}