import { useMemo, useState } from 'react'
import {
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock,
  ExternalLink,
  Plus,
  X,
  XCircle,
} from 'lucide-react'
import { createDefaultProofTestCampaignArtifact } from '@/core/models/proofTestCampaignWorkflow'
import type { TestCampaign } from '@/core/types'
import { RightPanelSection, RightPanelShell } from '@/components/layout/RightPanelShell'
import { useAppStore } from '@/store/appStore'
import { usePrismTheme } from '@/styles/usePrismTheme'
import {
  CAMPAIGN_STATUS_META,
  formatDateFr,
  usePlanningData,
  usePlanningNavigation,
  type NewCampaignDraft,
  type PlanningCampaign,
} from './PlanningNavigation'

type VerdictValue = 'pass' | 'fail' | 'conditional' | null

function VerdictChip({ value, onChange }: { value: VerdictValue; onChange: (value: VerdictValue) => void }) {
  const { TEXT_DIM } = usePrismTheme()

  const options: Array<{ value: VerdictValue; label: string; color: string; bg: string }> = [
    { value: 'pass', label: 'OK', color: '#4ADE80', bg: '#4ADE8018' },
    { value: 'conditional', label: 'Cond.', color: '#F59E0B', bg: '#F59E0B18' },
    { value: 'fail', label: 'NOK', color: '#EF4444', bg: '#EF444418' },
  ]

  return (
    <div className="flex gap-1">
      {options.map(option => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(value === option.value ? null : option.value)}
          className="rounded-md border px-2 py-0.5 text-[10px] font-bold transition-all"
          style={{
            background: value === option.value ? option.bg : 'transparent',
            borderColor: value === option.value ? `${option.color}40` : 'transparent',
            color: value === option.value ? option.color : TEXT_DIM,
            opacity: value !== null && value !== option.value ? 0.35 : 1,
          }}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

function CampaignDetailPanel({ campaign }: { campaign: PlanningCampaign }) {
  const { BORDER, CARD_BG, PAGE_BG, TEXT, TEXT_DIM, TEAL, semantic } = usePrismTheme()
  const navigate = useAppStore(state => state.navigate)
  const projects = useAppStore(state => state.projects)
  const meta = CAMPAIGN_STATUS_META[campaign.status]
  const [verdicts, setVerdicts] = useState<Record<string, VerdictValue>>(() => campaign.verdicts ?? {})

  const sifObjects = useMemo(() => {
    const project = projects.find(entry => entry.id === campaign.projectId)
    return campaign.sifIds.map(id => project?.sifs.find(sif => sif.id === id)).filter(Boolean)
  }, [campaign, projects])

  const passCount = Object.values(verdicts).filter(value => value === 'pass').length
  const failCount = Object.values(verdicts).filter(value => value === 'fail').length
  const totalSifs = campaign.sifIds.length

  return (
    <div className="flex h-full flex-col overflow-y-auto" style={{ scrollbarGutter: 'stable' }}>
      <div className="shrink-0 border-b px-4 pb-3 pt-4" style={{ borderColor: BORDER }}>
        <div className="mb-2 flex items-start gap-2">
          <span
            className="mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider"
            style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.border}` }}
          >
            {meta.label}
          </span>
        </div>
        <p className="text-[13px] font-bold leading-snug" style={{ color: TEXT }}>{campaign.title}</p>
        <p className="mt-1 text-[11px]" style={{ color: TEXT_DIM }}>{campaign.projectName}</p>
      </div>

      <div className="px-4 pb-2 pt-3">
        <div
          className="flex items-center gap-3 rounded-xl border px-3 py-2.5"
          style={{ borderColor: BORDER, background: PAGE_BG }}
        >
          <CalendarDays size={13} style={{ color: TEAL }} />
          <div>
            <p className="mb-0.5 text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>
              Période
            </p>
            <p className="text-[12px] font-semibold" style={{ color: TEXT }}>
              {formatDateFr(campaign.startDate)}
              {campaign.endDate !== campaign.startDate && <> → {formatDateFr(campaign.endDate)}</>}
            </p>
          </div>
        </div>
      </div>

      {totalSifs > 0 && (
        <div className="px-4 pb-2">
          <div className="rounded-xl border px-3 py-2.5" style={{ borderColor: BORDER, background: PAGE_BG }}>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>
              Progression
            </p>
            <div className="mb-2 flex gap-3">
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
            <div className="h-1.5 overflow-hidden rounded-full" style={{ background: BORDER }}>
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

      {campaign.team.length > 0 && (
        <div className="px-4 pb-2">
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>
            Équipe
          </p>
          <div className="flex flex-wrap gap-1.5">
            {campaign.team.map(member => (
              <div
                key={member}
                className="flex items-center gap-1.5 rounded-lg border px-2 py-1"
                style={{ borderColor: BORDER, background: CARD_BG }}
              >
                <div
                  className="flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold"
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

      {sifObjects.length > 0 && (
        <div className="px-4 pb-2">
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>
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
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold" style={{ color: TEXT }}>{sif.sifNumber}</p>
                      {sif.title && <p className="truncate text-[10px]" style={{ color: TEXT_DIM }}>{sif.title}</p>}
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
                    onChange={value => setVerdicts(current => ({ ...current, [sif.id]: value }))}
                  />
                </div>
              )
            })}
          </div>
        </div>
      )}

      {campaign.notes && (
        <div className="px-4 pb-3">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>
            Notes
          </p>
          <p className="text-[11px] leading-relaxed" style={{ color: TEXT_DIM }}>{campaign.notes}</p>
        </div>
      )}
    </div>
  )
}

function NewCampaignForm({ draft }: { draft: NewCampaignDraft }) {
  const { BORDER, CARD_BG, PAGE_BG, TEXT, TEXT_DIM, TEAL } = usePrismTheme()
  const addTestCampaign = useAppStore(state => state.addTestCampaign)
  const { closeCreate } = usePlanningNavigation()
  const projects = useAppStore(state => state.projects).filter(project => project.status === 'active')

  const [title, setTitle] = useState('')
  const [startDate, setStartDate] = useState(draft.startDate)
  const [endDate, setEndDate] = useState(draft.endDate)
  const [projectId, setProjectId] = useState(draft.projectId || projects[0]?.id || '')
  const [team, setTeam] = useState<string[]>([])
  const [newMember, setNewMember] = useState('')
  const [notes, setNotes] = useState('')
  const [selectedSifs, setSelectedSifs] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const project = projects.find(entry => entry.id === projectId)
  const availableSifs = useMemo(
    () => (project?.sifs ?? []).filter(sif => sif.status !== 'archived' && Boolean(sif.proofTestProcedure)),
    [project],
  )

  const inputCls = 'w-full rounded-xl border px-3 py-2 text-[12px] outline-none transition-all focus:ring-2'
  const inputStyle = { borderColor: BORDER, background: PAGE_BG, color: TEXT }

  const handleAddMember = () => {
    if (!newMember.trim()) return
    setTeam(current => [...current, newMember.trim()])
    setNewMember('')
  }

  const handleCreate = async () => {
    if (!project || selectedSifs.length === 0 || !startDate) return
    setErrorMessage(null)
    setIsSubmitting(true)

    try {
      const selected = availableSifs.filter(sif => selectedSifs.includes(sif.id) && sif.proofTestProcedure)
      for (const sif of selected) {
        const procedureSnapshot = JSON.parse(JSON.stringify({
          ...sif.proofTestProcedure,
          planningMeta: {
            title: title.trim() || null,
            endDate,
          },
        }))

        const payload = {
          id: crypto.randomUUID(),
          date: startDate,
          team: team.join(', '),
          operatingMode: 'planned',
          verdict: null,
          notes: notes.trim(),
          stepResults: [],
          responseMeasurements: [],
          procedureSnapshot,
          pdfArtifact: createDefaultProofTestCampaignArtifact(),
          closedAt: null,
          conductedBy: '',
          witnessedBy: '',
          reviewedBy: '',
          processLoad: '',
        } as unknown as TestCampaign

        await addTestCampaign(project.id, sif.id, payload)
      }
      closeCreate()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto" style={{ scrollbarGutter: 'stable' }}>
      <div className="space-y-3 px-4 pb-2 pt-4">
        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>
            Titre
          </label>
          <input
            className={inputCls}
            style={inputStyle}
            placeholder="ex: Arrêt T2 2025 — Unité HP"
            value={title}
            onChange={event => setTitle(event.target.value)}
          />
        </div>

        <div className="flex gap-2">
          <div className="flex-1">
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>
              Début
            </label>
            <input
              type="date"
              className={inputCls}
              style={inputStyle}
              value={startDate}
              onChange={event => setStartDate(event.target.value)}
            />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>
              Fin
            </label>
            <input
              type="date"
              className={inputCls}
              style={inputStyle}
              value={endDate}
              min={startDate}
              onChange={event => setEndDate(event.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>
            Projet
          </label>
          <select
            className={inputCls}
            style={inputStyle}
            value={projectId}
            onChange={event => {
              setProjectId(event.target.value)
              setSelectedSifs([])
            }}
          >
            {projects.map(projectOption => (
              <option key={projectOption.id} value={projectOption.id}>{projectOption.name}</option>
            ))}
          </select>
        </div>

        {project && (
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>
              SIFs concernées
            </label>
            {availableSifs.length > 0 ? (
              <div className="overflow-hidden rounded-xl border" style={{ borderColor: BORDER }}>
                {availableSifs.map((sif, index) => {
                  const checked = selectedSifs.includes(sif.id)
                  return (
                    <label
                      key={sif.id}
                      className="flex cursor-pointer items-center gap-3 px-3 py-2 transition-colors hover:opacity-80"
                      style={{
                        background: checked ? `${TEAL}10` : index % 2 === 0 ? PAGE_BG : CARD_BG,
                        borderBottom: index < availableSifs.length - 1 ? `1px solid ${BORDER}` : 'none',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={event => {
                          setSelectedSifs(current => (
                            event.target.checked
                              ? [...current, sif.id]
                              : current.filter(id => id !== sif.id)
                          ))
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
            ) : (
              <div className="rounded-xl border px-3 py-3 text-[11px]" style={{ borderColor: BORDER, background: PAGE_BG, color: TEXT_DIM }}>
                Aucune SIF active avec procédure de proof test disponible dans ce projet.
              </div>
            )}
          </div>
        )}

        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>
            Équipe
          </label>
          <div className="mb-2 flex gap-2">
            <input
              className={`${inputCls} flex-1`}
              style={inputStyle}
              placeholder="Prénom Nom"
              value={newMember}
              onChange={event => setNewMember(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  handleAddMember()
                }
              }}
            />
            <button
              type="button"
              onClick={handleAddMember}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-opacity hover:opacity-70"
              style={{ borderColor: BORDER, background: PAGE_BG, color: TEXT }}
            >
              <Plus size={14} />
            </button>
          </div>
          {team.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {team.map((member, index) => (
                <span
                  key={`${member}-${index}`}
                  className="flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[11px]"
                  style={{ borderColor: BORDER, background: CARD_BG, color: TEXT }}
                >
                  {member}
                  <button
                    type="button"
                    onClick={() => setTeam(current => current.filter((_, currentIndex) => currentIndex !== index))}
                    className="ml-0.5 transition-opacity hover:opacity-100"
                    style={{ opacity: 0.5 }}
                  >
                    <X size={9} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest" style={{ color: TEXT_DIM }}>
            Notes
          </label>
          <textarea
            className={`${inputCls} resize-none`}
            style={inputStyle}
            rows={3}
            placeholder="Permis de feu requis, accès restreint…"
            value={notes}
            onChange={event => setNotes(event.target.value)}
          />
        </div>

        {errorMessage && (
          <div className="rounded-xl border px-3 py-2 text-[11px]" style={{ borderColor: '#EF444440', background: '#EF444410', color: '#EF4444' }}>
            {errorMessage}
          </div>
        )}
      </div>

      <div className="flex shrink-0 gap-2 border-t px-4 py-3" style={{ borderColor: BORDER }}>
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
          disabled={isSubmitting || !projectId || !startDate || selectedSifs.length === 0}
          className="flex-1 rounded-xl py-2 text-[12px] font-bold transition-opacity hover:opacity-80 disabled:opacity-40"
          style={{ background: TEAL, color: '#041014' }}
          onClick={() => { void handleCreate() }}
        >
          {isSubmitting ? 'Création…' : 'Créer'}
        </button>
      </div>
    </div>
  )
}

function EmptyRightPanel() {
  const { TEXT_DIM, TEAL } = usePrismTheme()
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-4">
      <CalendarDays size={28} style={{ color: `${TEAL}50` }} strokeWidth={1.5} />
      <div className="text-center">
        <p className="mb-1 text-[12px] font-semibold" style={{ color: TEXT_DIM }}>
          Sélectionnez une campagne
        </p>
        <p className="text-[11px] leading-relaxed" style={{ color: TEXT_DIM }}>
          ou cliquez sur un jour pour en planifier une nouvelle
        </p>
      </div>
    </div>
  )
}

export function PlanningRightPanel() {
  const { PANEL_BG } = usePrismTheme()
  const { campaigns } = usePlanningData()
  const { selectedId, isCreating, draft } = usePlanningNavigation()
  const selected = selectedId ? campaigns.find(campaign => campaign.id === selectedId) ?? null : null

  return (
    <RightPanelShell contentBg={PANEL_BG}>
      <RightPanelSection id="detail" label="Campagne" Icon={ClipboardList} noPadding>
        {isCreating && draft
          ? <NewCampaignForm draft={draft} />
          : selected
            ? <CampaignDetailPanel campaign={selected} />
            : <EmptyRightPanel />}
      </RightPanelSection>
    </RightPanelShell>
  )
}
