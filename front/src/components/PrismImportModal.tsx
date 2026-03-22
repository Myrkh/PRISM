/**
 * PrismImportModal.tsx
 *
 * Modal for importing .prism files (SIF export or full project bundle).
 *
 * SIF  → lets user pick target project → calls createSIF()
 * Project → creates new project + all its SIFs → calls createProject() + createSIF()
 */
import { useState, useRef, useEffect } from 'react'
import {
  Upload, FileText, FolderOpen, X, ChevronDown,
  AlertCircle, CheckCircle2, Loader2,
} from 'lucide-react'
import { usePrismTheme } from '@/styles/usePrismTheme'
import { useAppStore } from '@/store/appStore'
import {
  parsePrismFile,
  PrismFormatError,
  type PrismFile,
  type PrismSIFPayload,
  type PrismProjectPayload,
} from '@/lib/prismFormat'

interface Props {
  onClose: () => void
  /** Pre-select a target project for SIF imports */
  defaultProjectId?: string
}

export function PrismImportModal({ onClose, defaultProjectId }: Props) {
  const { BORDER, CARD_BG, TEAL, TEXT, TEXT_DIM, isDark } = usePrismTheme()
  const projects   = useAppStore(s => s.projects)
  const createSIF  = useAppStore(s => s.createSIF)
  const createProject = useAppStore(s => s.createProject)
  const navigate   = useAppStore(s => s.navigate)

  const inputRef = useRef<HTMLInputElement>(null)
  const [parsed,          setParsed]          = useState<PrismFile | null>(null)
  const [parseError,      setParseError]      = useState<string | null>(null)
  const [targetProjectId, setTargetProjectId] = useState(defaultProjectId ?? projects[0]?.id ?? '')
  const [importing,       setImporting]       = useState(false)
  const [done,            setDone]            = useState(false)
  const [importError,     setImportError]     = useState<string | null>(null)

  // Close on Escape
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', fn)
    return () => document.removeEventListener('keydown', fn)
  }, [onClose])

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setParsed(null); setParseError(null); setDone(false); setImportError(null)
    try {
      const text = await file.text()
      setParsed(parsePrismFile(text))
    } catch (err) {
      setParseError(err instanceof PrismFormatError ? err.message : 'Erreur de lecture du fichier.')
    }
    e.target.value = ''
  }

  const handleImport = async () => {
    if (!parsed || importing) return
    setImporting(true); setImportError(null)
    try {
      if (parsed.type === 'sif') {
        const { sif } = parsed.payload as PrismSIFPayload
        if (!targetProjectId) throw new Error('Sélectionnez un projet cible.')
        // Strip internal IDs — new ones will be generated
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id: _id, projectId: _pid, revisionLockedAt: _rl, lockedRevisionId: _li, ...sifData } = sif
        const created = await createSIF(targetProjectId, { ...sifData, status: 'draft' })
        setDone(true)
        setTimeout(() => {
          navigate({ type: 'sif-dashboard', projectId: targetProjectId, sifId: created.id, tab: 'cockpit' })
          onClose()
        }, 900)

      } else if (parsed.type === 'project') {
        const { projectMeta, sifs } = parsed.payload as PrismProjectPayload
        const newProj = await createProject({ ...projectMeta, status: 'active' })
        for (const sif of sifs) {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { id: _id, projectId: _pid, revisionLockedAt: _rl, lockedRevisionId: _li, ...sifData } = sif
          await createSIF(newProj.id, { ...sifData, status: 'draft' })
        }
        setDone(true)
        setTimeout(() => {
          navigate({ type: 'projects' })
          onClose()
        }, 900)
      }
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Erreur d'import.")
    } finally {
      setImporting(false)
    }
  }

  const sifPayload  = parsed?.type === 'sif'     ? parsed.payload as PrismSIFPayload     : null
  const projPayload = parsed?.type === 'project' ? parsed.payload as PrismProjectPayload : null
  const canImport   = !!parsed && !importing && !done
    && (parsed.type === 'project' || !!targetProjectId)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-md rounded-xl"
        style={{
          background: CARD_BG,
          border: `1px solid ${BORDER}`,
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b px-5 py-4" style={{ borderColor: BORDER }}>
          <Upload size={16} style={{ color: TEAL, flexShrink: 0 }} />
          <span className="flex-1 text-[14px] font-semibold" style={{ color: TEXT }}>
            Importer un fichier .prism
          </span>
          <button
            type="button" onClick={onClose}
            className="flex h-6 w-6 items-center justify-center rounded"
            style={{ color: TEXT_DIM }}
            onMouseEnter={e => { e.currentTarget.style.color = TEXT }}
            onMouseLeave={e => { e.currentTarget.style.color = TEXT_DIM }}
          >
            <X size={14} />
          </button>
        </div>

        <div className="space-y-4 p-5">
          {/* File picker zone */}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 text-[13px] transition-colors"
            style={{
              borderColor: `${BORDER}AA`,
              color: TEXT_DIM,
              background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = TEAL; e.currentTarget.style.color = TEXT }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = `${BORDER}AA`; e.currentTarget.style.color = TEXT_DIM }}
          >
            <Upload size={16} />
            Choisir un fichier .prism
          </button>
          <input ref={inputRef} type="file" accept=".prism" className="hidden" onChange={handleFile} />

          {/* Parse error */}
          {parseError && (
            <div
              className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-[12px]"
              style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.25)' }}
            >
              <AlertCircle size={13} className="shrink-0" />
              {parseError}
            </div>
          )}

          {/* Parsed file summary */}
          {parsed && !parseError && (
            <div className="space-y-3">
              {/* Info card */}
              <div
                className="space-y-1.5 rounded-lg p-3"
                style={{
                  background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                  border: `1px solid ${BORDER}`,
                }}
              >
                <div className="flex items-center gap-2">
                  {parsed.type === 'sif'
                    ? <FileText size={14} style={{ color: TEAL }} />
                    : <FolderOpen size={14} style={{ color: TEAL }} />}
                  <span className="text-[12px] font-semibold" style={{ color: TEXT }}>
                    {parsed.type === 'sif' ? 'SIF' : 'Projet'}
                  </span>
                  <span className="ml-auto text-[10px]" style={{ color: TEXT_DIM }}>
                    v{parsed.prismVersion} · {new Date(parsed.exportedAt).toLocaleDateString('fr')}
                  </span>
                </div>

                {sifPayload && (
                  <>
                    <p className="text-[13px] font-medium" style={{ color: TEXT }}>
                      {sifPayload.sif.sifNumber}
                      {sifPayload.sif.title ? ` — ${sifPayload.sif.title}` : ''}
                    </p>
                    <p className="text-[11px]" style={{ color: TEXT_DIM }}>
                      SIL {sifPayload.sif.targetSIL}
                      {' · '}{sifPayload.sif.subsystems.length} sous-système{sifPayload.sif.subsystems.length !== 1 ? 's' : ''}
                    </p>
                    <p className="text-[10px]" style={{ color: TEXT_DIM }}>
                      Source : {sifPayload.sourceProjectName}
                      {sifPayload.sourceProjectRef ? ` (${sifPayload.sourceProjectRef})` : ''}
                    </p>
                  </>
                )}

                {projPayload && (
                  <>
                    <p className="text-[13px] font-medium" style={{ color: TEXT }}>
                      {projPayload.projectMeta.name}
                    </p>
                    <p className="text-[11px]" style={{ color: TEXT_DIM }}>
                      {projPayload.sifs.length} SIF{projPayload.sifs.length !== 1 ? 's' : ''}
                      {' · '}{projPayload.projectMeta.standard}
                    </p>
                    {projPayload.projectMeta.client && (
                      <p className="text-[10px]" style={{ color: TEXT_DIM }}>
                        Client : {projPayload.projectMeta.client}
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* Project selector (SIF import only) */}
              {parsed.type === 'sif' && projects.length > 0 && (
                <div className="space-y-1">
                  <label className="block text-[11px] font-medium" style={{ color: TEXT_DIM }}>
                    Importer dans le projet
                  </label>
                  <div className="relative">
                    <select
                      value={targetProjectId}
                      onChange={e => setTargetProjectId(e.target.value)}
                      className="w-full appearance-none rounded-lg px-3 py-2 pr-8 text-[13px] outline-none"
                      style={{
                        background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                        border: `1px solid ${BORDER}`,
                        color: TEXT,
                      }}
                    >
                      {projects.map(p => (
                        <option key={p.id} value={p.id} style={{ background: CARD_BG, color: TEXT }}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={12}
                      className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2"
                      style={{ color: TEXT_DIM }}
                    />
                  </div>
                </div>
              )}

              {parsed.type === 'sif' && projects.length === 0 && (
                <p className="text-[12px]" style={{ color: '#F59E0B' }}>
                  Aucun projet existant. Créez un projet avant d'importer une SIF.
                </p>
              )}

              {/* Import error */}
              {importError && (
                <div
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-[12px]"
                  style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.25)' }}
                >
                  <AlertCircle size={13} className="shrink-0" />
                  {importError}
                </div>
              )}

              {/* Success */}
              {done && (
                <div
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-[12px]"
                  style={{ background: 'rgba(52,211,153,0.1)', color: '#34D399', border: '1px solid rgba(52,211,153,0.25)' }}
                >
                  <CheckCircle2 size={13} className="shrink-0" />
                  Importé avec succès !
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t px-5 py-3" style={{ borderColor: BORDER }}>
          <button
            type="button" onClick={onClose}
            className="rounded-lg px-4 py-1.5 text-[12px] transition-colors"
            style={{ color: TEXT_DIM }}
            onMouseEnter={e => { e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={!canImport}
            className="flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-[12px] font-medium"
            style={{
              background: TEAL,
              color: '#fff',
              opacity: canImport ? 1 : 0.45,
              cursor: canImport ? 'pointer' : 'not-allowed',
            }}
          >
            {importing && <Loader2 size={12} className="animate-spin" />}
            {done ? 'Importé !' : importing ? 'Import…' : 'Importer'}
          </button>
        </div>
      </div>
    </div>
  )
}
