import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { useAppStore } from '@/store/appStore'
import type { SIF, SIFStatus, SILLevel } from '@/core/types'

type FormValues = Omit<SIF, 'id' | 'projectId' | 'subsystems'>

interface SIFModalProps {
  projectId: string
}

export function SIFModal({ projectId }: SIFModalProps) {
  const isOpen      = useAppStore(s => s.isSIFModalOpen)
  const editingId   = useAppStore(s => s.editingSIFId)
  const closeModal  = useAppStore(s => s.closeSIFModal)
  const createSIF   = useAppStore(s => s.createSIF)
  const updateSIF   = useAppStore(s => s.updateSIF)
  const navigate    = useAppStore(s => s.navigate)
  const project     = useAppStore(s => s.projects.find(p => p.id === projectId))

  const editing = editingId
    ? project?.sifs.find(s => s.id === editingId)
    : undefined

  const nextRef = `SIF-${String((project?.sifs.length ?? 0) + 1).padStart(3, '0')}`

  const { register, handleSubmit, reset, setValue, watch } = useForm<FormValues>({
    defaultValues: {
      sifNumber: nextRef, revision: 'A', title: '', description: '',
      pid: '', location: '', processTag: '', hazardousEvent: '',
      demandRate: 0.1, targetSIL: 2, rrfRequired: 100,
      madeBy: '', verifiedBy: '', approvedBy: '',
      date: new Date().toISOString().split('T')[0], status: 'draft',
    },
  })

  useEffect(() => {
    if (editing) {
      reset({
        sifNumber: editing.sifNumber, revision: editing.revision, title: editing.title,
        description: editing.description, pid: editing.pid, location: editing.location,
        processTag: editing.processTag, hazardousEvent: editing.hazardousEvent,
        demandRate: editing.demandRate, targetSIL: editing.targetSIL, rrfRequired: editing.rrfRequired,
        madeBy: editing.madeBy, verifiedBy: editing.verifiedBy, approvedBy: editing.approvedBy,
        date: editing.date, status: editing.status,
      })
    } else {
      reset({
        sifNumber: nextRef, revision: 'A', title: '', description: '',
        pid: '', location: '', processTag: '', hazardousEvent: '',
        demandRate: 0.1, targetSIL: 2, rrfRequired: 100,
        madeBy: '', verifiedBy: '', approvedBy: '',
        date: new Date().toISOString().split('T')[0], status: 'draft',
      })
    }
  }, [editing, isOpen, reset, nextRef])

  const onSubmit = (data: FormValues) => {
    if (editing) {
      updateSIF(projectId, editing.id, data)
      closeModal()
    } else {
      const sif = createSIF(projectId, data)
      closeModal()
      navigate({ type: 'sif-dashboard', projectId, sifId: sif.id, tab: 'architecture' })
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && closeModal()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? `Edit ${editing.sifNumber}` : 'New Safety Instrumented Function'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <Tabs defaultValue="identification" className="space-y-4">
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="identification">Identification</TabsTrigger>
              <TabsTrigger value="process">Process</TabsTrigger>
              <TabsTrigger value="traceability">Traceability</TabsTrigger>
            </TabsList>

            {/* ── Identification ── */}
            <TabsContent value="identification" className="space-y-5 pt-2">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label>SIF Number *</Label>
                  <Input placeholder={nextRef} {...register('sifNumber', { required: true })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Revision</Label>
                  <Input placeholder="A" {...register('revision')} />
                </div>
                <div className="space-y-1.5">
                  <Label>Date</Label>
                  <Input type="date" {...register('date')} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Title *</Label>
                <Input placeholder="Short description of the SIF" {...register('title', { required: true })} />
              </div>

              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea rows={3} placeholder="Detailed description of the safety function" {...register('description')} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select defaultValue={watch('status')} onValueChange={v => setValue('status', v as SIFStatus)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="in_review">In Review</SelectItem>
                      <SelectItem value="verified">Verified</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Target SIL</Label>
                  <Select
                    defaultValue={String(watch('targetSIL'))}
                    onValueChange={v => setValue('targetSIL', Number(v) as SILLevel)}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[1,2,3,4].map(s => (
                        <SelectItem key={s} value={String(s)}>SIL {s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            {/* ── Process ── */}
            <TabsContent value="process" className="space-y-5 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>P&ID Reference</Label>
                  <Input placeholder="e.g. P&ID-0001-Rev.B" {...register('pid')} />
                </div>
                <div className="space-y-1.5">
                  <Label>Location / Unit</Label>
                  <Input placeholder="e.g. Unit 12 — Reactor section" {...register('location')} />
                </div>
                <div className="space-y-1.5">
                  <Label>Process tag</Label>
                  <Input placeholder="e.g. PT-1023" {...register('processTag')} />
                </div>
                <div className="space-y-1.5">
                  <Label>Demand rate (yr⁻¹)</Label>
                  <Input
                    type="number" step="0.001"
                    placeholder="0.1"
                    {...register('demandRate', { valueAsNumber: true })}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Hazardous event description</Label>
                <Textarea
                  rows={3}
                  placeholder="Describe the process hazard this SIF is designed to mitigate…"
                  {...register('hazardousEvent')}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Required Risk Reduction Factor (RRF)</Label>
                <Input
                  type="number"
                  placeholder="100"
                  {...register('rrfRequired', { valueAsNumber: true })}
                />
                <p className="text-xs text-muted-foreground">
                  RRF = 1 / PFD<sub>avg</sub> required. E.g. SIL 2 → RRF between 100 and 1 000.
                </p>
              </div>
            </TabsContent>

            {/* ── Traceability ── */}
            <TabsContent value="traceability" className="space-y-5 pt-2">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label>Made by</Label>
                  <Input placeholder="Name / initials" {...register('madeBy')} />
                </div>
                <div className="space-y-1.5">
                  <Label>Verified by</Label>
                  <Input placeholder="Name / initials" {...register('verifiedBy')} />
                </div>
                <div className="space-y-1.5">
                  <Label>Approved by</Label>
                  <Input placeholder="Name / initials" {...register('approvedBy')} />
                </div>
              </div>

              <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-1">Document control</p>
                <p>Revision history and change management can be configured after creating the SIF.</p>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={closeModal}>Cancel</Button>
            <Button type="submit">{editing ? 'Save Changes' : 'Create SIF'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
