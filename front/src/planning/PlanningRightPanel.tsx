/**
 * planning/PlanningRightPanel.tsx — PRISM
 *
 * Panneau droit du module Planning.
 * Même pattern que RightPanelShell + IntercalaireTabBar.
 * Affiche les détails d'une campagne sélectionnée ou le formulaire
 * de création d'une nouvelle campagne.
 */
import { useState, useMemo } from 'react'
import {
  CalendarDays, Users, ClipboardList, CheckCircle2,
  XCircle, AlertCircle, Clock, ExternalLink, Plus, X, Trash2,
} from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { usePrismTheme } from '@/styles/usePrismTheme'
import { RightPanelShell } from '@/components/layout/RightPanelShell'
import {
  usePlanningNavigation,
  CAMPAIGN_STATUS_META,
  formatDateFr,
  type PlanningCampaign,
  type NewCampaignDraft,
} from './PlanningNavigation'

// ─── Verdict chip ─────────────────────────────────────────────────────────

type VerdictValue = 'pass' | 'fail' | 'conditional' | null

function VerdictChip({
  value,
  onChange,
}: {
  value: VerdictValue
  onChange: (v: VerdictValue) => void
}) {
  const { TEXT_DIM } = usePrismTheme()

  const options: Array<{ v: VerdictValue; label: string; color: string; bg: string }> = [
    { v: 'pass',        label: 'OK',    color: '#4ADE80', bg: '#4ADE8018' },
    { v: 'conditional', label: 'Cond.', color: '#F59E0B', bg: '#F59E0B18' },
    { v: 'fail',        label: 'NOK',   color: '#EF4444', bg: '#EF444418' },
  ]

  return (
    <div className="flex gap-1">
      {options.map(opt => (
        <button
          key={opt.v}
          type="button"
          onClick={() => onChange(value === opt.v ? null : opt.v)}
          className="px-2 py-0.5 rounded-md text-[10px] font-bold border transition-all"
          style={{
            background: value === opt.v ? opt.bg : 'transparent',
            borderColor: value === opt.v ? `${opt.color}40` : 'transparent',
            color: value === opt.v ? opt.color : TEXT_DIM,
            opacity: value !== null && value !== opt.v ? 0.35 : 1,
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

// ─── Campaign detail panel ─────────────────────────────────────────────────

function CampaignDetailPanel({ campaign }: { campaign: PlanningCampaign }) {
  const { BORDER, CARD_BG, PAGE_BG, PANEL_BG, TEXT, TEXT_DIM, TEAL, semantic } = usePrismTheme()
  const navigate = useAppStore(s => s.navigate)
  const projects = useAppStore(s => s.projects)
  const meta = CAMPAIGN_STATUS_META[campaign.status]

  // Verdicts locaux (optimiste)
  const [verdicts, setVerdicts] = useState<Record<string, VerdictValue>>(
    () => campaign.verdicts ?? {},
  )

  const sifObjects = useMemo(() => {
    const proj = projects.find(p => p.id === campaign.projectId)
    return campaign.sifIds.map(id => proj?.sifs.find(s => s.id === id)).filter(Boolean)
  }, [projects, campaign])

  const passCount = Object.values(verdicts).filter(v => v === 'pass').length
  const failCount = Object.values(verdicts).filter(v => v === 'fail').length
  const totalSifs = campaign.sifIds.length

  return (
    <div className="flex h-full flex-col overflow-y-auto" style={{ scrollbarGutter: 'stable' }}>

      {/* ── Header campagne ── */}
      <div className="shrink-0 border-b px-4 pb-3 pt-4" style={{ borderColor: BORDER }}>
        <div className="flex items-start gap-2 mb-2">
          <span
            className="shrink-0 mt-0.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider"
            style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.border}` }}
          >
            {meta.label}
          </span>
        </div>
        <p className="text-[13px] font-bold leading-snug" style={{ color: TEXT }}>{campaign.title}</p>
        <p className="mt-1 text-[11px]" style={{ color: TEXT_DIM }}>
          {campaign.projectName}
        </p>
      </div>

      {/* ── Dates ── */}
      <div className="px-4 pt-3 pb-2">
        <div
          className="flex items-center gap-3 rounded-xl border px-3 py-2.5"
          style={{ borderColor: BORDER, background: PAGE_BG }}
        >
          <CalendarDays size={13} style={{ color: TEAL }} />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: TEXT_DIM }}>
              Période
            </p>
            <p className="text-[12px] font-semibold" style={{ color: TEXT }}>
              {formatDateFr(campaign.startDate)}
              {campaign.endDate !== campaign.startDate && (
                <> → {formatDateFr(campaign.endDate)}</>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* ── Progression ── */}
      {totalSifs > 0 && (
        <div className="px-4 pb-2">
          <div
            className="rounded-xl border px-3 py-2.5"
            style={{ borderColor: BORDER, background: PAGE_BG }}
          >
            <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: TEXT_DIM }}>
              Progression
            </p>
            <div className="flex gap-3 mb-2">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={11} style={{ color: semantic.success }} />
                <span className="text-[11px] font-semibold" style={{ color: semantic.success }}>{passCount} OK</span>
              </div>
              <div className="flex items-center gap-1.5">
                <XCircle size={11} style={{ color: semantic.error }} />
                <span className="text-[11px] font-semibold" style={{ color: semantic.error }}>{failCount} NOK</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock size={11} style={{ color: TEXT_DIM }} />
                <span className="text-[11px]" style={{ color: TEXT_DIM }}>
                  {totalSifs - passCount - failCount} restantes
                </span>
              </div>
            </div>
            {/* Barre de progression */}
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: BORDER }}>
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${totalSifs ? (passCount / totalSifs) * 100 : 0}%`,
                  background: `linear-gradient(90deg, ${semantic.success}, ${TEAL})`,
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Équipe ── */}
      {campaign.team.length > 0 && (
        <div className="px-4 pb-2">
          <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: TEXT_DIM }}>
            Équipe
          </p>
          <div className="flex flex-wrap gap-1.5">
            {campaign.team.map((member, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 rounded-lg border px-2 py-1"
                style={{ borderColor: BORDER, background: CARD_BG }}
              >
                <div
                  className="h-4 w-4 rounded-full flex items-center justify-center text-[9px] font-bold"
                  style={{ background: `${TEAL}20`, color: TEAL }}
                >
                  {member.charAt(0).toUpperCase()}
                </div>
                <span className="text-[11px]" style={{ color: TEXT }}>{member}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── SIFs & verdicts ── */}
      {sifObjects.length > 0 && (
        <div className="px-4 pb-2">
          <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: TEXT_DIM }}>
            SIFs testées
          </p>
          <div className="space-y-1.5">
            {sifObjects.map(sif => {
              if (!sif) return null
              return (
                <div
                  key={sif.id}
                  className="rounded-xl border px-3 py-2"
                  style={{ borderColor: BORDER, background: PAGE_BG }}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold" style={{ color: TEXT }}>{sif.sifNumber}</p>
                      {sif.title && (
                        <p className="text-[10px] truncate" style={{ color: TEXT_DIM }}>{sif.title}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate({
                        type: 'sif-dashboard',
                        projectId: campaign.projectId,
                        sifId: sif.id,
                        tab: 'exploitation',
                      })}
                      className="shrink-0 flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] transition-opacity hover:opacity-70"
                      style={{ color: TEAL }}
                    >
                      <ExternalLink size={9} />
                    </button>
                  </div>
                  <VerdictChip
                    value={verdicts[sif.id] ?? null}
                    onChange={v => setVerdicts(prev => ({ ...prev, [sif.id]: v }))}
                  />
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Notes ── */}
      {campaign.notes && (
        <div className="px-4 pb-3">
          <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: TEXT_DIM }}>
            Notes
          </p>
          <p className="text-[11px] leading-relaxed" style={{ color: TEXT_DIM }}>{campaign.notes}</p>
        </div>
      )}
    </div>
  )
}

// ─── New campaign form ─────────────────────────────────────────────────────

function NewCampaignForm({ draft }: { draft: NewCampaignDraft }) {
  const { BORDER, PAGE_BG, TEXT, TEXT_DIM, TEAL, CARD_BG } = usePrismTheme()
  const { closeCreate } = usePlanningNavigation()
  const projects = useAppStore(s => s.projects).filter(p => p.status === 'active')

  const [title,      setTitle]      = useState('')
  const [startDate,  setStartDate]  = useState(draft.startDate)
  const [endDate,    setEndDate]    = useState(draft.endDate)
  const [projectId,  setProjectId]  = useState(draft.projectId || projects[0]?.id || '')
  const [team,       setTeam]       = useState<string[]>([])
  const [newMember,  setNewMember]  = useState('')
  const [notes,      setNotes]      = useState('')
  const [selectedSifs, setSelectedSifs] = useState<string[]>([])

  const project = projects.find(p => p.id === projectId)

  const inputCls = `w-full rounded-xl border px-3 py-2 text-[12px] outline-none transition-all focus:ring-2`
  const inputStyle = {
    borderColor: BORDER,
    background: PAGE_BG,
    color: TEXT,
  }

  const handleAddMember = () => {
    if (newMember.trim()) {
      setTeam(t => [...t, newMember.trim()])
      setNewMember('')
    }
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto" style={{ scrollbarGutter: 'stable' }}>
      <div className="px-4 pt-4 pb-2 space-y-3">

        {/* Titre */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: TEXT_DIM }}>
            Titre
          </label>
          <input
            className={inputCls}
            style={inputStyle}
            placeholder="ex: Arrêt T2 2025 — Unité HP"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
        </div>

        {/* Dates */}
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="block text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: TEXT_DIM }}>
              Début
            </label>
            <input
              type="date"
              className={inputCls}
              style={inputStyle}
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
            />
          </div>
          <div className="flex-1">
            <label className="block text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: TEXT_DIM }}>
              Fin
            </label>
            <input
              type="date"
              className={inputCls}
              style={inputStyle}
              value={endDate}
              min={startDate}
              onChange={e => setEndDate(e.target.value)}
            />
          </div>
        </div>

        {/* Projet */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: TEXT_DIM }}>
            Projet
          </label>
          <select
            className={inputCls}
            style={inputStyle}
            value={projectId}
            onChange={e => { setProjectId(e.target.value); setSelectedSifs([]) }}
          >
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* SIFs */}
        {project && project.sifs.length > 0 && (
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: TEXT_DIM }}>
              SIFs concernées
            </label>
            <div className="rounded-xl border overflow-hidden" style={{ borderColor: BORDER }}>
              {project.sifs.filter(s => s.status !== 'archived').map((sif, i) => {
                const checked = selectedSifs.includes(sif.id)
                return (
                  <label
                    key={sif.id}
                    className="flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors hover:opacity-80"
                    style={{
                      background: checked ? `${TEAL}10` : i % 2 === 0 ? PAGE_BG : CARD_BG,
                      borderBottom: i < project.sifs.length - 1 ? `1px solid ${BORDER}` : 'none',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={e => {
                        setSelectedSifs(prev =>
                          e.target.checked
                            ? [...prev, sif.id]
                            : prev.filter(id => id !== sif.id),
                        )
                      }}
                      className="rounded"
                      style={{ accentColor: TEAL }}
                    />
                    <div>
                      <p className="text-[11px] font-semibold" style={{ color: TEXT }}>{sif.sifNumber}</p>
                      {sif.title && <p className="text-[10px]" style={{ color: TEXT_DIM }}>{sif.title}</p>}
                    </div>
                  </label>
                )
              })}
            </div>
          </div>
        )}

        {/* Équipe */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: TEXT_DIM }}>
            Équipe
          </label>
          <div className="flex gap-2 mb-2">
            <input
              className={`${inputCls} flex-1`}
              style={inputStyle}
              placeholder="Prénom Nom"
              value={newMember}
              onChange={e => setNewMember(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAddMember() }}
            />
            <button
              type="button"
              onClick={handleAddMember}
              className="shrink-0 flex h-9 w-9 items-center justify-center rounded-xl border transition-opacity hover:opacity-70"
              style={{ borderColor: BORDER, background: PAGE_BG, color: TEXT }}
            >
              <Plus size={14} />
            </button>
          </div>
          {team.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {team.map((m, i) => (
                <span
                  key={i}
                  className="flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[11px]"
                  style={{ borderColor: BORDER, background: CARD_BG, color: TEXT }}
                >
                  {m}
                  <button
                    type="button"
                    onClick={() => setTeam(t => t.filter((_, j) => j !== i))}
                    className="ml-0.5 opacity-50 hover:opacity-100 transition-opacity"
                  >
                    <X size={9} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Notes */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: TEXT_DIM }}>
            Notes
          </label>
          <textarea
            className={`${inputCls} resize-none`}
            style={inputStyle}
            rows={3}
            placeholder="Permis de feu requis, accès restreint…"
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </div>
      </div>

      {/* Actions */}
      <div
        className="shrink-0 flex gap-2 border-t px-4 py-3"
        style={{ borderColor: BORDER }}
      >
        <button
          type="button"
          onClick={closeCreate}
          className="flex-1 rounded-xl border py-2 text-[12px] font-semibold transition-opacity hover:opacity-70"
          style={{ borderColor: BORDER, color: TEXT_DIM }}
        >
          Annuler
        </button>
        <button
          type="button"
          disabled={!title.trim() || !startDate || !projectId}
          className="flex-1 rounded-xl py-2 text-[12px] font-bold transition-opacity hover:opacity-80 disabled:opacity-40"
          style={{ background: TEAL, color: '#041014' }}
          onClick={() => {
            // Ici tu brancheras sur addTestCampaign / ta mutation store
            closeCreate()
          }}
        >
          Créer
        </button>
      </div>
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────

function EmptyRightPanel() {
  const { TEXT_DIM, TEAL } = usePrismTheme()
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-4">
      <CalendarDays size={28} style={{ color: `${TEAL}50` }} strokeWidth={1.5} />
      <div className="text-center">
        <p className="text-[12px] font-semibold mb-1" style={{ color: TEXT_DIM }}>
          Sélectionnez une campagne
        </p>
        <p className="text-[11px] leading-relaxed" style={{ color: TEXT_DIM }}>
          ou cliquez sur un jour pour en planifier une nouvelle
        </p>
      </div>
    </div>
  )
}

// ─── Right panel shell ────────────────────────────────────────────────────

const RIGHT_PANEL_ITEMS = [
  { id: 'detail' as const, label: 'Campagne', Icon: ClipboardList },
] as const

export function PlanningRightPanel({ campaigns }: { campaigns: PlanningCampaign[] }) {
  const { PANEL_BG } = usePrismTheme()
  const { selectedId, isCreating, draft } = usePlanningNavigation()

  const selected = selectedId ? campaigns.find(c => c.id === selectedId) ?? null : null

  return (
    <RightPanelShell
      items={RIGHT_PANEL_ITEMS}
      active="detail"
      onSelect={() => {}}
      contentBg={PANEL_BG}
    >
      {isCreating && draft
        ? <NewCampaignForm draft={draft} />
        : selected
          ? <CampaignDetailPanel campaign={selected} />
          : <EmptyRightPanel />
      }
    </RightPanelShell>
  )
}
