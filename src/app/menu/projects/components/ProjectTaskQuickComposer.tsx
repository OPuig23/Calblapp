'use client'

import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TASK_PRIORITY_OPTIONS } from './project-shared'

type Props = {
  blockId?: string
  blocks?: Array<{ id: string; name: string; departments?: string[]; deadline?: string }>
  description: string
  department: string
  owner?: string
  deadline: string
  priority: string
  departments: string[]
  responsibleOptions?: Array<{ id: string; name: string }>
  maxDeadline?: string
  compact?: boolean
  disabled?: boolean
  showBlockSelector?: boolean
  onDescriptionChange: (value: string) => void
  onBlockChange?: (value: string) => void
  onDepartmentChange: (value: string) => void
  onOwnerChange?: (value: string) => void
  onDeadlineChange: (value: string) => void
  onPriorityChange: (value: string) => void
  onSubmit: () => void
}

export default function ProjectTaskQuickComposer({
  blockId = 'none',
  blocks = [],
  description,
  department,
  owner = '',
  deadline,
  priority,
  departments,
  responsibleOptions = [],
  maxDeadline,
  compact = false,
  disabled,
  showBlockSelector = false,
  onDescriptionChange,
  onBlockChange,
  onDepartmentChange,
  onOwnerChange,
  onDeadlineChange,
  onPriorityChange,
  onSubmit,
}: Props) {
  const selectedDepartment =
    department || (departments.length === 1 ? departments[0] : 'none')

  return (
    <div className="rounded-2xl bg-white px-4 py-4">
      {compact ? (
        <div className="space-y-3">
          <div
            className={`grid gap-3 ${
              showBlockSelector
                ? 'md:grid-cols-[160px_minmax(0,1fr)_140px_120px_auto]'
                : 'md:grid-cols-[minmax(0,1fr)_140px_120px_auto]'
            }`}
          >
            {showBlockSelector ? (
              <Select value={blockId} onValueChange={(value) => onBlockChange?.(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Bloc" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Selecciona bloc</SelectItem>
                  {blocks.map((block) => (
                    <SelectItem key={`task-draft-block-${block.id}`} value={block.id}>
                      {block.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
            <Input
              value={description}
              onChange={(event) => onDescriptionChange(event.target.value)}
              placeholder="Descripcio de la tasca"
            />
            <Input
              type="date"
              value={deadline}
              max={maxDeadline || undefined}
              onChange={(event) => onDeadlineChange(event.target.value)}
            />
            <Select value={priority || 'normal'} onValueChange={onPriorityChange}>
              <SelectTrigger>
                <SelectValue placeholder="Nivell" />
              </SelectTrigger>
              <SelectContent>
                {TASK_PRIORITY_OPTIONS.slice(0, 3).map((option) => (
                  <SelectItem key={`task-draft-priority-${option.value}`} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full border border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100 hover:text-violet-800"
              onClick={onSubmit}
              disabled={disabled || !description.trim()}
            >
              <Check className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_160px_150px]">
            <Select
              value={selectedDepartment}
              onValueChange={(value) => onDepartmentChange(value === 'none' ? '' : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Departament" />
              </SelectTrigger>
              <SelectContent>
                {departments.length > 1 ? (
                  <SelectItem value="none">Selecciona departament</SelectItem>
                ) : null}
                {departments.map((item) => (
                  <SelectItem key={`task-draft-${item}`} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={owner || 'none'} onValueChange={(value) => onOwnerChange?.(value === 'none' ? '' : value)}>
              <SelectTrigger>
                <SelectValue placeholder="Responsable" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sense responsable</SelectItem>
                {responsibleOptions.map((option) => (
                  <SelectItem key={`task-draft-owner-${option.id}-${option.name}`} value={option.name}>
                    {option.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex h-10 items-center rounded-md border border-input bg-background px-3 text-sm text-slate-500">
              {description
                .trim()
                .split(/\s+/)
                .filter(Boolean)
                .slice(0, 3)
                .join(' ') || 'Nom automatic'}
            </div>
          </div>
        </div>
      ) : (
        <div
          className={`grid gap-3 ${
            showBlockSelector
              ? 'md:grid-cols-[220px_minmax(0,1fr)_150px_160px_140px_120px_150px_auto]'
              : 'md:grid-cols-[minmax(0,1fr)_150px_160px_140px_120px_150px_auto]'
          }`}
        >
          {showBlockSelector ? (
            <Select value={blockId} onValueChange={(value) => onBlockChange?.(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Bloc" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Selecciona bloc</SelectItem>
                {blocks.map((block) => (
                  <SelectItem key={`task-draft-block-${block.id}`} value={block.id}>
                    {block.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
          <Input
            value={description}
            onChange={(event) => onDescriptionChange(event.target.value)}
            placeholder="Descripcio de la tasca"
          />
          <Select
            value={selectedDepartment}
            onValueChange={(value) => onDepartmentChange(value === 'none' ? '' : value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Departament" />
            </SelectTrigger>
            <SelectContent>
              {departments.length > 1 ? (
                <SelectItem value="none">Selecciona departament</SelectItem>
              ) : null}
              {departments.map((item) => (
                <SelectItem key={`task-draft-${item}`} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={owner || 'none'} onValueChange={(value) => onOwnerChange?.(value === 'none' ? '' : value)}>
            <SelectTrigger>
              <SelectValue placeholder="Responsable" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sense responsable</SelectItem>
              {responsibleOptions.map((option) => (
                <SelectItem key={`task-draft-owner-${option.id}-${option.name}`} value={option.name}>
                  {option.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="date"
            value={deadline}
            max={maxDeadline || undefined}
            onChange={(event) => onDeadlineChange(event.target.value)}
          />
          <Select value={priority || 'normal'} onValueChange={onPriorityChange}>
            <SelectTrigger>
              <SelectValue placeholder="Nivell" />
            </SelectTrigger>
            <SelectContent>
              {TASK_PRIORITY_OPTIONS.slice(0, 3).map((option) => (
                <SelectItem key={`task-draft-priority-${option.value}`} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex h-10 items-center rounded-md border border-input bg-background px-3 text-sm text-slate-500">
            {description
              .trim()
              .split(/\s+/)
              .filter(Boolean)
              .slice(0, 3)
              .join(' ') || 'Nom automatic'}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full border border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100 hover:text-violet-800"
            onClick={onSubmit}
            disabled={disabled || !description.trim()}
          >
            <Check className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
