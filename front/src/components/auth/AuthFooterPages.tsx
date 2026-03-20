import type { ReactNode } from 'react'
import {
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  Building2,
  CheckCircle2,
  Clock3,
  Database,
  FileText,
  Gauge,
  GitBranchPlus,
  HardDriveDownload,
  Headset,
  History,
  LifeBuoy,
  Lock,
  Mail,
  MessageSquare,
  Rocket,
  ScrollText,
  Server,
  ShieldCheck,
  Users,
  Workflow,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { colors, dark, semantic } from '@/styles/tokens'

export type AuthFooterPageId =
  | 'help'
  | 'contact'
  | 'release-notes'
  | 'on-premise'
  | 'terms-of-use'
  | 'privacy'

const PAGE_META: Record<AuthFooterPageId, {
  label: string
  accent: string
  icon: LucideIcon
}> = {
  help: { label: 'Help', accent: colors.teal, icon: LifeBuoy },
  contact: { label: 'Contact', accent: semantic.info, icon: Headset },
  'release-notes': { label: 'Release notes', accent: semantic.warning, icon: Rocket },
  'on-premise': { label: 'On-Premise', accent: colors.tealDim, icon: Building2 },
  'terms-of-use': { label: 'Terms of use', accent: semantic.warning, icon: ScrollText },
  privacy: { label: 'Privacy', accent: semantic.success, icon: ShieldCheck },
}

export const AUTH_FOOTER_PRIMARY_LINKS: AuthFooterPageId[] = ['help', 'contact', 'release-notes', 'on-premise']
export const AUTH_FOOTER_LEGAL_LINKS: AuthFooterPageId[] = ['terms-of-use', 'privacy']

type FooterPagePanelProps = {
  page: AuthFooterPageId
  onClose: () => void
  onNavigate: (page: AuthFooterPageId) => void
}

type HeroStat = {
  label: string
  value: string
  hint: string
  tone?: 'default' | 'accent' | 'success' | 'warning'
}

function withAlpha(hex: string, alpha: string): string {
  return `${hex}${alpha}`
}

function toneColor(accent: string, tone: HeroStat['tone']) {
  if (tone === 'success') return semantic.success
  if (tone === 'warning') return semantic.warning
  if (tone === 'accent') return accent
  return dark.text
}

function SurfaceCard({
  title,
  icon,
  accent,
  hint,
  children,
}: {
  title: string
  icon: LucideIcon
  accent: string
  hint?: string
  children: ReactNode
}) {
  const Icon = icon

  return (
    <section
      className="rounded-2xl border p-4 md:p-5"
      style={{
        background: `linear-gradient(180deg, ${withAlpha(dark.card2, 'FA')} 0%, ${withAlpha(dark.page, 'F6')} 100%)`,
        borderColor: withAlpha(dark.border, 'D9'),
        boxShadow: `0 16px 32px ${withAlpha('#000000', '24')}`,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold" style={{ color: dark.text }}>
            {title}
          </h3>
          {hint && (
            <p className="mt-1 text-xs leading-relaxed" style={{ color: dark.textDim }}>
              {hint}
            </p>
          )}
        </div>
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl border"
          style={{
            background: withAlpha(accent, '14'),
            borderColor: withAlpha(accent, '30'),
            color: accent,
          }}
        >
          <Icon size={17} />
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  )
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map(item => (
        <li key={item} className="flex items-start gap-2">
          <span
            className="mt-1 h-1.5 w-1.5 rounded-full"
            style={{ background: colors.tealDim }}
          />
          <span className="text-sm leading-relaxed" style={{ color: dark.textDim }}>
            {item}
          </span>
        </li>
      ))}
    </ul>
  )
}

function StepList({ steps }: { steps: Array<{ title: string; hint: string }> }) {
  return (
    <div className="space-y-3">
      {steps.map((step, index) => (
        <div
          key={step.title}
          className="rounded-xl border p-3.5"
          style={{ borderColor: withAlpha(dark.border, 'D9'), background: withAlpha(dark.panel, '80') }}
        >
          <div className="flex items-start gap-3">
            <div
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-[11px] font-black"
              style={{
                borderColor: withAlpha(colors.teal, '50'),
                background: withAlpha(colors.teal, '14'),
                color: colors.tealDim,
              }}
            >
              {index + 1}
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: dark.text }}>
                {step.title}
              </p>
              <p className="mt-1 text-xs leading-relaxed" style={{ color: dark.textDim }}>
                {step.hint}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function PageLayout({
  page,
  eyebrow,
  title,
  description,
  badges,
  stats,
  children,
}: {
  page: AuthFooterPageId
  eyebrow: string
  title: string
  description: string
  badges: string[]
  stats: HeroStat[]
  children: ReactNode
}) {
  const meta = PAGE_META[page]
  const Icon = meta.icon

  return (
    <div className="space-y-4">
      <section
        className="overflow-hidden rounded-2xl border"
        style={{
          borderColor: withAlpha(meta.accent, '40'),
          background: `
            radial-gradient(120% 120% at 100% 0%, ${withAlpha(meta.accent, '22')} 0%, transparent 50%),
            linear-gradient(180deg, ${withAlpha(dark.panel, 'F7')} 0%, ${withAlpha(dark.page, 'FC')} 100%)
          `,
        }}
      >
        <div className="p-5 md:p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-2xl">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-2xl border"
                  style={{
                    background: withAlpha(meta.accent, '15'),
                    borderColor: withAlpha(meta.accent, '36'),
                    color: meta.accent,
                  }}
                >
                  <Icon size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.24em]" style={{ color: meta.accent }}>
                    {eyebrow}
                  </p>
                  <p className="mt-1 text-xs" style={{ color: dark.textDim }}>
                    PRISM beta surface
                  </p>
                </div>
              </div>

              <h2 className="mt-5 text-2xl font-black leading-tight" style={{ color: dark.text }}>
                {title}
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed" style={{ color: withAlpha(dark.text, 'C7') }}>
                {description}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {badges.map(badge => (
                  <span
                    key={badge}
                    className="rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide"
                    style={{
                      color: dark.text,
                      background: withAlpha(dark.card2, 'CC'),
                      borderColor: withAlpha(meta.accent, '2C'),
                    }}
                  >
                    {badge}
                  </span>
                ))}
              </div>
            </div>

            <div
              className="grid gap-2 sm:grid-cols-3 xl:w-[440px] xl:grid-cols-1"
              style={{ minWidth: 0 }}
            >
              {stats.map(stat => {
                const statColor = toneColor(meta.accent, stat.tone)
                return (
                  <div
                    key={stat.label}
                    className="rounded-xl border px-3 py-3"
                    style={{
                      borderColor: withAlpha(dark.border, 'D9'),
                      background: withAlpha(dark.card2, 'D9'),
                    }}
                  >
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: dark.textDim }}>
                      {stat.label}
                    </p>
                    <p className="mt-1 text-sm font-bold" style={{ color: statColor }}>
                      {stat.value}
                    </p>
                    <p className="mt-1 text-[11px] leading-relaxed" style={{ color: dark.textDim }}>
                      {stat.hint}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {children}
    </div>
  )
}

function PageSwitcher({
  current,
  onNavigate,
}: {
  current: AuthFooterPageId
  onNavigate: (page: AuthFooterPageId) => void
}) {
  const pages = [...AUTH_FOOTER_PRIMARY_LINKS, ...AUTH_FOOTER_LEGAL_LINKS]

  return (
    <div className="flex flex-wrap gap-2">
      {pages.map(page => {
        const meta = PAGE_META[page]
        const active = page === current
        return (
          <button
            key={page}
            type="button"
            onClick={() => onNavigate(page)}
            className="rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-colors"
            style={{
              color: active ? dark.text : dark.textDim,
              background: active ? withAlpha(meta.accent, '16') : withAlpha(dark.card2, 'B3'),
              borderColor: active ? withAlpha(meta.accent, '42') : withAlpha(dark.border, 'C0'),
            }}
          >
            {meta.label}
          </button>
        )
      })}
    </div>
  )
}

function WorkspaceMapCard() {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {[
        {
          title: 'Overview',
          hint: 'Start from the live SIL signal, architecture path, and operational health.',
          icon: Gauge,
        },
        {
          title: 'Compliance',
          hint: 'Inspect the blockers, evidence gaps, and traceability score before approval.',
          icon: ShieldCheck,
        },
        {
          title: 'Proof Test',
          hint: 'Capture procedures, measurements, verdicts, and archived evidence.',
          icon: Workflow,
        },
        {
          title: 'Report + History',
          hint: 'Publish the package, download the PDFs, and compare frozen revisions later.',
          icon: History,
        },
      ].map(item => {
        const Icon = item.icon
        return (
          <div
            key={item.title}
            className="rounded-xl border p-3"
            style={{ borderColor: withAlpha(dark.border, 'D9'), background: withAlpha(dark.panel, '80') }}
          >
            <div className="flex items-center gap-2">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-lg border"
                style={{
                  borderColor: withAlpha(colors.teal, '36'),
                  background: withAlpha(colors.teal, '12'),
                  color: colors.tealDim,
                }}
              >
                <Icon size={15} />
              </div>
              <p className="text-sm font-semibold" style={{ color: dark.text }}>
                {item.title}
              </p>
            </div>
            <p className="mt-2 text-xs leading-relaxed" style={{ color: dark.textDim }}>
              {item.hint}
            </p>
          </div>
        )
      })}
    </div>
  )
}

function HelpPage() {
  return (
    <PageLayout
      page="help"
      eyebrow="Support center"
      title="Navigate the PRISM engineering path"
      description="PRISM works best when the team follows a single cadence: frame the design in Overview, clear the blockers in Compliance, capture evidence in Proof Test, publish the dossier in Report, then preserve deltas in History."
      badges={['Overview first', 'Revision-aware', 'PDF evidence', 'Beta workflow']}
      stats={[
        { label: 'Recommended path', value: '5 linked workspaces', hint: 'Overview, Compliance, Proof Test, Report, and History cover the full trail.', tone: 'accent' },
        { label: 'Best signal', value: 'One SIF at a time', hint: 'Resolve the highest-risk queue first instead of editing several drafts in parallel.' },
        { label: 'Frozen evidence', value: 'Published revisions stay locked', hint: 'Use the compare view instead of rewriting a baseline.', tone: 'success' },
      ]}
    >
      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <SurfaceCard
          title="Suggested workflow"
          icon={BookOpen}
          accent={colors.teal}
          hint="A short operating rhythm aligned with the existing PRISM tabs."
        >
          <StepList
            steps={[
              { title: 'Read the live design status in Overview', hint: 'Check PFDavg, target SIL, architecture path, and the operational health banner before editing details.' },
              { title: 'Use Compliance to clear the real blockers', hint: 'Open the highest-priority gaps first and let the right panel guide you back to the missing metadata or evidence.' },
              { title: 'Run Proof Test with the current revision context', hint: 'Save procedures, measurements, and verdicts against the right baseline instead of keeping test notes outside the tool.' },
              { title: 'Generate the Report only when the revision is defensible', hint: 'The report should summarize a stable design, not substitute for incomplete engineering work.' },
              { title: 'Close the revision and consult History for deltas', hint: 'Once published, compare revisions side by side instead of mutating a frozen package.' },
            ]}
          />
        </SurfaceCard>

        <SurfaceCard
          title="Workspace map"
          icon={BarChart3}
          accent={semantic.info}
          hint="These are the PRISM surfaces that already define the product language."
        >
          <WorkspaceMapCard />
        </SurfaceCard>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <SurfaceCard
          title="Before asking for support"
          icon={MessageSquare}
          accent={semantic.info}
          hint="Requests are resolved faster when the engineering context is explicit."
        >
          <BulletList
            items={[
              'Reference the project, SIF number, current revision label, and the tab where the issue appears.',
              'State whether the problem is design data, compliance evidence, proof test execution, or PDF export.',
              'Attach the exact error text, the action you just took, and whether the revision was already published.',
              'If a comparison is involved, mention both revision labels so the reviewer can reproduce the delta.',
            ]}
          />
        </SurfaceCard>

        <SurfaceCard
          title="What this beta already supports"
          icon={CheckCircle2}
          accent={semantic.success}
          hint="The current auth build is already tied to the newer revision and evidence model."
        >
          <BulletList
            items={[
              'Password login, Google OAuth, GitHub OAuth, and password reset from the same entry surface.',
              'Published revision PDFs and proof test artifacts attached to the right baseline.',
              'User profiles synchronized from the identity provider for future ownership and approvals.',
              'A clear split between live engineering views and archived evidence views.',
            ]}
          />
        </SurfaceCard>
      </div>
    </PageLayout>
  )
}

function ContactPage() {
  return (
    <PageLayout
      page="contact"
      eyebrow="Contact"
      title="Route questions to the right support path"
      description="PRISM issues are easier to resolve when product, deployment, and security topics are separated early. Use the page below as the intake model for your workspace owner, integrator, or internal platform team."
      badges={['Product support', 'Security path', 'Deployment-ready']}
      stats={[
        { label: 'Functional questions', value: 'Workspace owner first', hint: 'Use the person who owns the SIF workflow before escalating technical issues.', tone: 'accent' },
        { label: 'Security concern', value: 'Same-day escalation', hint: 'Do not post sensitive details in ordinary feedback channels.', tone: 'warning' },
        { label: 'Deployment topic', value: 'Implementation team', hint: 'On-prem, SSO, storage, and SMTP should follow an infrastructure path.' },
      ]}
    >
      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <SurfaceCard
          title="Support lanes"
          icon={Headset}
          accent={semantic.info}
          hint="Keep the first message short, factual, and routed by topic."
        >
          <div className="space-y-3">
            {[
              {
                title: 'Product and workflow support',
                hint: 'Use this when you need help with Overview, Compliance, Proof Test, Report, or History behavior.',
                meta: 'Send to the PRISM workspace owner or product contact.',
                icon: LifeBuoy,
              },
              {
                title: 'Technical and deployment support',
                hint: 'Use this for authentication, environment variables, storage policies, SMTP, or on-prem rollout.',
                meta: 'Route to the implementation team or platform engineering.',
                icon: Server,
              },
              {
                title: 'Security disclosure',
                hint: 'Use a private incident channel for credentials, access anomalies, or exposure of regulated data.',
                meta: 'Escalate through your internal security response process.',
                icon: Lock,
              },
            ].map(item => {
              const Icon = item.icon
              return (
                <div
                  key={item.title}
                  className="rounded-xl border p-3"
                  style={{ borderColor: withAlpha(dark.border, 'D9'), background: withAlpha(dark.panel, '82') }}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border"
                      style={{
                        borderColor: withAlpha(semantic.info, '32'),
                        background: withAlpha(semantic.info, '12'),
                        color: semantic.info,
                      }}
                    >
                      <Icon size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: dark.text }}>
                        {item.title}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed" style={{ color: dark.textDim }}>
                        {item.hint}
                      </p>
                      <p className="mt-2 text-[11px] font-medium" style={{ color: withAlpha(dark.text, 'B8') }}>
                        {item.meta}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </SurfaceCard>

        <SurfaceCard
          title="What to include in the first message"
          icon={Mail}
          accent={colors.tealDim}
          hint="This context usually removes one back-and-forth cycle."
        >
          <BulletList
            items={[
              'Environment: hosted or on-prem, auth method used, and whether Supabase credentials were recently changed.',
              'Scope: project name, SIF number, revision label, and the exact page where the issue starts.',
              'Impact: cosmetic issue, blocked workflow, wrong calculation context, missing artifact, or access problem.',
              'Evidence: exact timestamp, screenshots or exported PDF name, and any browser console or backend error if available.',
            ]}
          />

          <div
            className="mt-4 rounded-xl border px-3 py-3"
            style={{ borderColor: withAlpha(colors.tealDim, '30'), background: withAlpha(colors.tealDim, '10') }}
          >
            <p className="text-xs font-semibold" style={{ color: dark.text }}>
              Recommended escalation rule
            </p>
            <p className="mt-1 text-[11px] leading-relaxed" style={{ color: dark.textDim }}>
              If the issue changes a published revision, loses evidence, or exposes access data, treat it as a priority incident instead of ordinary feedback.
            </p>
          </div>
        </SurfaceCard>
      </div>
    </PageLayout>
  )
}

function ReleaseNotesPage() {
  return (
    <PageLayout
      page="release-notes"
      eyebrow="Release notes"
      title="Recent PRISM milestones"
      description="This auth surface now sits on top of the broader PRISM revision model. The entries below reflect the latest visible milestones in this workspace, using exact dates from the current codebase."
      badges={['March 9, 2026', 'Auth + profiles', 'Revision evidence']}
      stats={[
        { label: 'Latest change', value: 'March 9, 2026', hint: 'Profiles are now synchronized from authentication events.', tone: 'accent' },
        { label: 'Artifact model', value: 'Published PDFs retained', hint: 'Revision storage policies and archive support were added on March 8, 2026.', tone: 'success' },
        { label: 'UI foundation', value: 'Shared PRISM tokens', hint: 'The March 6, 2026 frontend refactor unified core visual primitives.' },
      ]}
    >
      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <SurfaceCard
          title="Timeline"
          icon={Clock3}
          accent={semantic.warning}
          hint="Most recent first."
        >
          <div className="space-y-3">
            {[
              {
                date: 'March 9, 2026',
                title: 'Authentication profiles synchronized into public workspace data',
                body: 'PRISM now creates and updates profile records from auth users, keeping provider, display name, avatar, and last sign-in aligned for future ownership and review features.',
              },
              {
                date: 'March 8, 2026',
                title: 'Revision publication and storage policies hardened',
                body: 'Published revision artifacts gained dedicated storage policy work so report PDFs and proof test packages remain attached to the correct frozen baseline.',
              },
              {
                date: 'March 8, 2026',
                title: 'Proof test archives and response metrics expanded',
                body: 'Campaign archives and response measurement support were added so teams can keep evidence history instead of overwriting test context.',
              },
              {
                date: 'March 6, 2026',
                title: 'Core frontend split into reusable PRISM surfaces',
                body: 'The layout, token system, overview, and compliance surfaces were refactored into smaller modules, which defines the current visual language used by this auth experience.',
              },
            ].map(item => (
              <div
                key={`${item.date}-${item.title}`}
                className="rounded-xl border p-3.5"
                style={{ borderColor: withAlpha(dark.border, 'D9'), background: withAlpha(dark.panel, '82') }}
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: semantic.warning }}>
                  {item.date}
                </p>
                <p className="mt-1 text-sm font-semibold" style={{ color: dark.text }}>
                  {item.title}
                </p>
                <p className="mt-2 text-xs leading-relaxed" style={{ color: dark.textDim }}>
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard
          title="What changed for operators"
          icon={GitBranchPlus}
          accent={colors.teal}
          hint="User-visible consequences of the recent milestones."
        >
          <BulletList
            items={[
              'The sign-in screen now has a clear role in the product instead of being an isolated auth wall.',
              'Profile identity is ready to support future attribution on revisions, libraries, and approvals.',
              'Proof test evidence and report exports are treated as revision artifacts, not temporary downloads.',
              'The visual system is more coherent across Overview, Compliance, History, Report, and now the footer pages.',
            ]}
          />

          <div
            className="mt-4 rounded-xl border px-3 py-3"
            style={{ borderColor: withAlpha(colors.teal, '34'), background: withAlpha(colors.teal, '10') }}
          >
            <p className="text-xs font-semibold" style={{ color: dark.text }}>
              Next expected layer
            </p>
            <p className="mt-1 text-[11px] leading-relaxed" style={{ color: dark.textDim }}>
              The codebase is preparing ownership, reusable libraries, queued engine workflows, and stronger review trails on top of the new auth foundation.
            </p>
          </div>
        </SurfaceCard>
      </div>
    </PageLayout>
  )
}

function OnPremisePage() {
  return (
    <PageLayout
      page="on-premise"
      eyebrow="Deployment"
      title="Run PRISM inside your own operating perimeter"
      description="PRISM is already structured around separable surfaces: a React frontend, Supabase-backed data and storage, and a Python engine path for heavier calculations. That shape lends itself to controlled customer-hosted deployments."
      badges={['Customer-hosted', 'Identity-ready', 'Artifact retention']}
      stats={[
        { label: 'Reference topology', value: 'Frontend + data + engine', hint: 'The current stack separates UI, persistence, storage, and compute concerns.', tone: 'accent' },
        { label: 'Identity base', value: 'OAuth or password', hint: 'The auth model can sit behind the identity controls you already operate.' },
        { label: 'Evidence trail', value: 'Storage under your rules', hint: 'Reports and proof test artifacts can follow your retention and backup policies.', tone: 'success' },
      ]}
    >
      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <SurfaceCard
          title="Reference deployment shape"
          icon={Server}
          accent={colors.tealDim}
          hint="A practical split for controlled environments."
        >
          <div className="space-y-3">
            {[
              {
                title: 'PRISM frontend',
                hint: 'Serve the React application behind your reverse proxy, SSO gateway, or internal access control stack.',
                icon: Building2,
              },
              {
                title: 'Data and storage plane',
                hint: 'Keep project data, profiles, revision snapshots, and artifact files inside a tenant you administer.',
                icon: Database,
              },
              {
                title: 'Advanced compute plane',
                hint: 'Expose the heavier Python calculations only where the architecture requires solver-grade or Monte Carlo runs.',
                icon: HardDriveDownload,
              },
            ].map(item => {
              const Icon = item.icon
              return (
                <div
                  key={item.title}
                  className="rounded-xl border p-3"
                  style={{ borderColor: withAlpha(dark.border, 'D9'), background: withAlpha(dark.panel, '82') }}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border"
                      style={{
                        borderColor: withAlpha(colors.tealDim, '34'),
                        background: withAlpha(colors.tealDim, '12'),
                        color: colors.tealDim,
                      }}
                    >
                      <Icon size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: dark.text }}>
                        {item.title}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed" style={{ color: dark.textDim }}>
                        {item.hint}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </SurfaceCard>

        <div className="space-y-4">
          <SurfaceCard
            title="Operational checklist"
            icon={Workflow}
            accent={semantic.info}
            hint="Controls commonly requested by industrial teams."
          >
            <BulletList
              items={[
                'Identity integration for Google, GitHub, SSO, or password-only policies that match your site rules.',
                'Artifact backup and retention for reports, proof test PDFs, and future revision attachments.',
                'SMTP and password-reset flows that remain internal to your domain.',
                'Monitoring, audit trails, and storage lifecycle policies before the first production publication.',
              ]}
            />
          </SurfaceCard>

          <SurfaceCard
            title="Why teams ask for on-prem"
            icon={ShieldCheck}
            accent={semantic.success}
            hint="Typical drivers behind customer-hosted rollouts."
          >
            <BulletList
              items={[
                'Data residency requirements around project metadata, safety studies, and frozen evidence files.',
                'Direct coupling with internal identity, network zones, and validation procedures.',
                'Need for local control over backups, retention, and access logging.',
                'Desire to keep advanced engine services close to protected plant or engineering networks.',
              ]}
            />
          </SurfaceCard>
        </div>
      </div>
    </PageLayout>
  )
}

function TermsPage() {
  return (
    <PageLayout
      page="terms-of-use"
      eyebrow="Terms of use"
      title="Use PRISM as an engineering workflow aid"
      description="These terms summarize how this beta surface is intended to be used inside a professional safety workflow. They do not replace your project procedures, contractual commitments, or independent engineering judgment."
      badges={['Beta build', 'Professional use', 'No automatic approval']}
      stats={[
        { label: 'License scope', value: 'Internal engineering use', hint: 'Access should remain limited to authorized teams and approved partners.', tone: 'accent' },
        { label: 'Decision rule', value: 'Human review required', hint: 'PRISM supports decisions; it does not replace competent functional safety review.', tone: 'warning' },
        { label: 'Change model', value: 'Features may evolve', hint: 'Beta behavior, copy, and integrations can change as the product matures.' },
      ]}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <SurfaceCard
          title="Acceptable use"
          icon={Users}
          accent={semantic.warning}
          hint="Use the tool for legitimate project work and controlled demonstrations."
        >
          <BulletList
            items={[
              'Do not share accounts, bypass access controls, or use the workspace to probe infrastructure you do not own.',
              'Do not publish regulated project data to third parties unless your governance process allows it.',
              'Do not rely on draft outputs as the sole basis for hazardous operation decisions or proof of compliance.',
              'Keep exported reports and proof test artifacts under the same document control rules as the rest of your safety dossier.',
            ]}
          />
        </SurfaceCard>

        <SurfaceCard
          title="Engineering responsibility"
          icon={Gauge}
          accent={semantic.info}
          hint="The platform informs review; it does not replace it."
        >
          <BulletList
            items={[
              'Users remain responsible for the correctness of inputs, assumptions, and evidence attached to each SIF.',
              'Published revisions should be reviewed and approved under your existing management-of-change process.',
              'Calculated indicators, proof test verdicts, and report exports must be checked in context before external issue or sign-off.',
              'Any production use should be validated against your own procedures, standards interpretation, and quality system.',
            ]}
          />
        </SurfaceCard>

        <SurfaceCard
          title="Availability and changes"
          icon={ArrowUpRight}
          accent={colors.teal}
          hint="Beta software evolves quickly."
        >
          <BulletList
            items={[
              'Features, UI copy, and integrations may be added, removed, or reworked without preserving older draft behavior.',
              'Temporary interruption, maintenance windows, or environment resets may happen during beta rollout and validation.',
              'Future pricing, packaging, or entitlement models are not defined by the presence of a feature in this build.',
            ]}
          />
        </SurfaceCard>

        <SurfaceCard
          title="Reports and intellectual property"
          icon={FileText}
          accent={colors.tealDim}
          hint="Exports remain part of your engineering record."
        >
          <BulletList
            items={[
              'Your project data and uploaded evidence remain under your organization’s control, subject to the way the deployment is configured.',
              'The PRISM product, interface, and supporting software remain protected by the owner’s intellectual property rights.',
              'Do not remove product attribution from generated outputs where it is intentionally preserved.',
              'Validate contractual and legal wording with counsel before using this page as production policy text.',
            ]}
          />
        </SurfaceCard>
      </div>
    </PageLayout>
  )
}

function PrivacyPage() {
  return (
    <PageLayout
      page="privacy"
      eyebrow="Privacy"
      title="Keep identity and project data scoped to the workspace"
      description="The current auth foundation stores only the profile information needed to identify a user in PRISM and connect actions back to a named account. Access is intended to stay limited to the authenticated user and the workspace data they are allowed to use."
      badges={['Minimal profile data', 'Workspace-scoped', 'RLS-aware']}
      stats={[
        { label: 'Profile fields', value: 'Email, name, avatar, provider', hint: 'The current schema also tracks created time, updated time, and last sign-in.', tone: 'accent' },
        { label: 'Access model', value: 'Own profile only', hint: 'The current policy model is built around row-level access to the authenticated user record.', tone: 'success' },
        { label: 'Retention note', value: 'Follow your deployment policy', hint: 'Customer-hosted environments control backup and deletion behavior.' },
      ]}
    >
      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <SurfaceCard
          title="Data currently handled by the auth layer"
          icon={Database}
          accent={semantic.success}
          hint="Based on the profile synchronization now present in the codebase."
        >
          <BulletList
            items={[
              'Account identity: user ID, email address, provider, and profile display name.',
              'Presentation metadata: avatar URL when the identity provider supplies one.',
              'Operational metadata: created time, updated time, and last sign-in timestamp.',
              'Workspace content remains separate from these profile fields and follows the data model of projects, SIFs, revisions, and artifacts.',
            ]}
          />
        </SurfaceCard>

        <SurfaceCard
          title="Why PRISM uses this data"
          icon={Lock}
          accent={colors.teal}
          hint="The goal is attribution and controlled access, not broad profile tracking."
        >
          <BulletList
            items={[
              'Authenticate users and restore their session on return.',
              'Display a stable name and provider so ownership, approvals, and future audit views can be attributed cleanly.',
              'Support password reset and identity-provider sign-in flows.',
              'Prepare the platform for clearer accountability on revisions, reports, proof tests, and reusable libraries.',
            ]}
          />
        </SurfaceCard>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <SurfaceCard
          title="Security and sharing"
          icon={ShieldCheck}
          accent={semantic.info}
          hint="The current code points to row-level and policy-based controls."
        >
          <BulletList
            items={[
              'Profile records are intended to be readable and writable only by the authenticated owner of that profile.',
              'Access to project data, revision snapshots, and artifacts should follow workspace authorization, storage policy, and deployment controls.',
              'Security-sensitive issues should be escalated privately through your incident process, not stored in ordinary feedback threads.',
            ]}
          />
        </SurfaceCard>

        <SurfaceCard
          title="Retention and deletion"
          icon={ScrollText}
          accent={colors.tealDim}
          hint="Practical rule for beta and on-prem environments."
        >
          <BulletList
            items={[
              'Keep profile and artifact retention aligned with your organization’s project retention schedule.',
              'If an account must be removed, review both identity-provider records and any connected application data or exports.',
              'For production policy wording, confirm the final retention and disclosure language with legal and security stakeholders.',
            ]}
          />
        </SurfaceCard>
      </div>
    </PageLayout>
  )
}

function renderPage(page: AuthFooterPageId) {
  switch (page) {
    case 'help':
      return <HelpPage />
    case 'contact':
      return <ContactPage />
    case 'release-notes':
      return <ReleaseNotesPage />
    case 'on-premise':
      return <OnPremisePage />
    case 'terms-of-use':
      return <TermsPage />
    case 'privacy':
      return <PrivacyPage />
  }
}

export function getAuthFooterPageLabel(page: AuthFooterPageId): string {
  return PAGE_META[page].label
}

export function AuthFooterPagePanel({ page, onClose, onNavigate }: FooterPagePanelProps) {
  return (
    // Viewport-level overlay — does NOT live inside the auth card
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{
        background: `
          radial-gradient(900px 400px at 0% 0%, ${withAlpha(colors.teal, '10')} 0%, transparent 60%),
          linear-gradient(180deg, ${dark.panel} 0%, ${dark.page} 100%)
        `,
      }}
    >
      {/* ── Top bar ─────────────────────────────────────────────────── */}
      <div
        className="shrink-0 border-b"
        style={{ borderColor: withAlpha(dark.border, 'CC'), background: withAlpha(dark.panel, 'F8') }}
      >
        {/* Row 1: back button + current page label */}
        <div className="flex items-center gap-4 px-5 py-3 md:px-8">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="gap-2 rounded-lg shrink-0"
            style={{
              borderColor: withAlpha(dark.border, 'CC'),
              background: withAlpha(dark.card2, 'CC'),
              color: dark.text,
            }}
          >
            <ArrowLeft size={13} />
            Back to sign in
          </Button>

          <div className="flex items-center gap-2 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] shrink-0" style={{ color: colors.tealDim }}>
              PRISM
            </p>
            <span style={{ color: withAlpha(dark.textDim, '40') }}>·</span>
            <p className="text-xs truncate" style={{ color: dark.textDim }}>
              {getAuthFooterPageLabel(page)}
            </p>
          </div>
        </div>

        {/* Row 2: tab switcher */}
        <div
          className="flex items-center gap-1.5 overflow-x-auto px-5 pb-3 md:px-8"
          style={{ scrollbarWidth: 'none' }}
        >
          {([...AUTH_FOOTER_PRIMARY_LINKS, ...AUTH_FOOTER_LEGAL_LINKS] as AuthFooterPageId[]).map(p => {
            const meta = PAGE_META[p]
            const active = p === page
            return (
              <button
                key={p}
                type="button"
                onClick={() => onNavigate(p)}
                className="shrink-0 rounded-full border px-3.5 py-1.5 text-[11px] font-semibold transition-colors"
                style={{
                  color: active ? dark.text : dark.textDim,
                  background: active ? withAlpha(meta.accent, '18') : withAlpha(dark.card2, 'B3'),
                  borderColor: active ? withAlpha(meta.accent, '40') : withAlpha(dark.border, 'C0'),
                }}
              >
                {meta.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Page content ────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-5xl px-5 py-6 md:px-8 md:py-8">
          {renderPage(page)}
        </div>
      </div>
    </div>
  )
}