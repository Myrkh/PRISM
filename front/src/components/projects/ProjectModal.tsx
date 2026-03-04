import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
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
import { useAppStore } from '@/store/appStore'
import type { Project } from '@/core/types'

type FormValues = Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'sifs'>

export function ProjectModal() {
  const isOpen        = useAppStore(s => s.isProjectModalOpen)
  const editingId     = useAppStore(s => s.editingProjectId)
  const closeModal    = useAppStore(s => s.closeProjectModal)
  const createProject = useAppStore(s => s.createProject)
  const updateProject = useAppStore(s => s.updateProject)
  const projects      = useAppStore(s => s.projects)

  const editing = editingId ? projects.find(p => p.id === editingId) : undefined

  const {
    register, handleSubmit, reset, control,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      name: '', ref: '', client: '', site: '', unit: '',
      standard: 'IEC61511', revision: 'A', description: '', status: 'active',
    },
  })

  useEffect(() => {
    reset(editing
      ? {
          name: editing.name, ref: editing.ref, client: editing.client,
          site: editing.site, unit: editing.unit, standard: editing.standard,
          revision: editing.revision, description: editing.description, status: editing.status,
        }
      : {
          name: '', ref: '', client: '', site: '', unit: '',
          standard: 'IEC61511', revision: 'A', description: '', status: 'active',
        }
    )
  }, [editing, isOpen, reset])

  const onSubmit = (data: FormValues) => {
    editing ? updateProject(editing.id, data) : createProject(data)
    closeModal()
  }

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && closeModal()}>
      <DialogContent className="max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit Project' : 'New Project'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

          {/* Row 1 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="name">Project name <span className="text-destructive">*</span></Label>
              <Input
                id="name"
                placeholder="e.g. DMDS Unit 12"
                {...register('name', { required: true })}
                className={errors.name ? 'border-destructive' : ''}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ref">Reference</Label>
              <Input id="ref" placeholder="e.g. HTL-001" {...register('ref')} />
            </div>
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="client">Client</Label>
              <Input id="client" placeholder="Company name" {...register('client')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="site">Site</Label>
              <Input id="site" placeholder="e.g. Le Havre" {...register('site')} />
            </div>
          </div>

          {/* Row 3 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="unit">Unit / Area</Label>
              <Input id="unit" placeholder="e.g. Unit 12" {...register('unit')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="revision">Revision</Label>
              <Input id="revision" placeholder="A" {...register('revision')} />
            </div>
          </div>

          {/* Row 4 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Standard</Label>
              <Controller name="standard" control={control} render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IEC61511">IEC 61511 (Process)</SelectItem>
                    <SelectItem value="IEC61508">IEC 61508</SelectItem>
                    <SelectItem value="ISA84">ISA 84 / ANSI</SelectItem>
                  </SelectContent>
                </Select>
              )} />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Controller name="status" control={control} render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              )} />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              rows={2}
              placeholder="Project scope, objectives, notes…"
              {...register('description')}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeModal}>Cancel</Button>
            <Button type="submit">{editing ? 'Save' : 'Create Project'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}