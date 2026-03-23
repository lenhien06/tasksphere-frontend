"use client"

import React, { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { TaskService } from "@/app/services/TaskService"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useTranslation } from "react-i18next"
import {
    Plus, GripVertical, Pencil, Trash2,
    Type, Hash, Calendar, CheckSquare, List,
    Layers, Link as LinkIcon, X, ChevronDown,
    AlertCircle, Info, Loader2, Eye
} from "lucide-react"
import type {
    CustomFieldDefinition,
    CustomFieldType,
    CreateCustomFieldRequest,
    UpdateCustomFieldRequest,
} from "@/app/types/task.schema"
import { canActAsProjectManager } from "@/lib/projectRole"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// ── Helpers ───────────────────────────────────────────────────

const TYPE_CONFIG: Record<CustomFieldType, { icon: React.ElementType, label: string, desc: string, color: string }> = {
    TEXT: {
        icon: Type,
        label: "TEXT",
        desc: "Văn bản tự do (VD: Link Design, Server IP)",
        color: "bg-gray-100 text-gray-600 border-gray-200"
    },
    NUMBER: {
        icon: Hash,
        label: "NUMBER",
        desc: "Số nguyên hoặc thập phân",
        color: "bg-blue-50 text-blue-600 border-blue-100"
    },
    DATE: {
        icon: Calendar,
        label: "DATE",
        desc: "Ngày tháng",
        color: "bg-purple-50 text-purple-600 border-purple-100"
    },
    BOOLEAN: {
        icon: CheckSquare,
        label: "BOOLEAN",
        desc: "Có / Không",
        color: "bg-green-50 text-green-700 border-green-100"
    },
    SELECT: {
        icon: List,
        label: "SELECT",
        desc: "Chọn một trong danh sách",
        color: "bg-orange-50 text-orange-600 border-orange-100"
    },
    MULTI_SELECT: {
        icon: Layers,
        label: "MULTI_SELECT",
        desc: "Chọn nhiều trong danh sách",
        color: "bg-indigo-50 text-indigo-600 border-indigo-100"
    },
    URL: {
        icon: LinkIcon,
        label: "URL",
        desc: "Đường dẫn web",
        color: "bg-cyan-50 text-cyan-600 border-cyan-100"
    },
}

const FIELD_TYPES: CustomFieldType[] = ["TEXT", "NUMBER", "DATE", "BOOLEAN", "SELECT", "MULTI_SELECT", "URL"]

// ── Sortable Row ──────────────────────────────────────────────

interface SortableRowProps {
  field: CustomFieldDefinition
  index: number
  canEdit: boolean
  onEdit: (field: CustomFieldDefinition) => void
  onDelete: (field: CustomFieldDefinition) => void
  onUnhide: (field: CustomFieldDefinition) => void
}

function SortableFieldRow({ field, index, canEdit, onEdit, onDelete, onUnhide }: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: field.id, disabled: !canEdit });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1 : 0,
    opacity: isDragging ? 0.5 : 1,
  };

  const cfg = TYPE_CONFIG[field.fieldType]
  const Icon = cfg.icon

  return (
    <TableRow 
      ref={setNodeRef} 
      style={style}
      className={cn("group transition-colors", field.hidden && "bg-gray-50/50 opacity-60")}
    >
      <TableCell className="w-[40px]">
        <div
          {...(canEdit ? { ...attributes, ...listeners } : {})}
          className={cn("text-xs font-medium text-gray-400 text-center select-none", canEdit && "cursor-grab active:cursor-grabbing")}
        >
          {index + 1}
        </div>
      </TableCell>
      <TableCell>
        <span className="font-semibold text-gray-800">{field.name}</span>
      </TableCell>
      <TableCell>
        <span className="text-xs font-medium text-gray-600">{cfg.label}</span>
      </TableCell>
      <TableCell>
        {field.required && (
          <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-600 text-[10px] font-bold border border-red-100 uppercase tracking-tighter">
            Bắt buộc
          </span>
        )}
      </TableCell>
      <TableCell>
        {field.hidden ? (
          <span className="px-2 py-0.5 rounded-full bg-gray-200 text-gray-600 text-[10px] font-bold border border-gray-300">
            Đang ẩn
          </span>
        ) : (
          <span className="px-2 py-0.5 rounded-full bg-green-50 text-green-600 text-[10px] font-bold border border-green-100">
            Hoạt động
          </span>
        )}
      </TableCell>
      <TableCell>
        <span className="text-xs text-gray-500 max-w-[200px] truncate block">
          {field.options?.join(", ") || "—"}
        </span>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1">
          <TooltipProvider>
            {field.hidden && canEdit && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onUnhide(field)}
                    className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all"
                  >
                    <Eye size={16} />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Hiện lại field</TooltipContent>
              </Tooltip>
            )}

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onEdit(field)}
                  disabled={!canEdit}
                  className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                >
                  <Pencil size={16} />
                </button>
              </TooltipTrigger>
              <TooltipContent>Sửa field</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onDelete(field)}
                  disabled={!canEdit}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                >
                  <Trash2 size={16} />
                </button>
              </TooltipTrigger>
              <TooltipContent>{field.hasValues && !field.hidden ? "Ẩn field" : "Xóa field"}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </TableCell>
    </TableRow>
  )
}

// ── Add/Edit Modal ─────────────────────────────────────────────

interface FieldModalProps {
    projectId: string
    existing?: CustomFieldDefinition
    onClose: () => void
}

function FieldModal({ projectId, existing, onClose }: FieldModalProps) {
    const queryClient = useQueryClient()
    const qKey = ["custom-fields", projectId]

    const [name, setName] = useState(existing?.name ?? "")
    const [fieldType, setFieldType] = useState<CustomFieldType>(existing?.fieldType ?? "TEXT")
    const [required, setRequired] = useState(existing?.required ?? false)
    const [options, setOptions] = useState<string[]>(existing?.options ?? ["", ""])
    const [errors, setErrors] = useState<Record<string, string>>({})

    const validate = () => {
        const newErrors: Record<string, string> = {}
        if (!name.trim()) newErrors.name = "Tên trường là bắt buộc"
        if (name.length > 100) newErrors.name = "Tên trường không quá 100 ký tự"

        if (fieldType === "SELECT" || fieldType === "MULTI_SELECT") {
            const validOptions = options.map(o => o.trim()).filter(Boolean)
            if (validOptions.length < 2) newErrors.options = "Cần ít nhất 2 options"
            if (validOptions.length > 20) newErrors.options = "Tối đa 20 options"
            
            // Unique check
            const unique = new Set(validOptions)
            if (unique.size !== validOptions.length) newErrors.options = "Các option không được trùng nhau"
            
            // Any empty check if not filtered
            if (options.some(o => !o.trim())) newErrors.options = "Mỗi option không được rỗng"
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const createMutation = useMutation({
        mutationFn: (data: CreateCustomFieldRequest) =>
            TaskService.createCustomField(projectId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: qKey })
            toast.success("Đã thêm custom field")
            onClose()
        },
        onError: (err: any) => {
            const status = err?.response?.status
            const code   = err?.response?.data?.meta?.code
            if (status === 409 || code === "TSK_011") {
                setErrors({ name: "Tên field này đã tồn tại trong dự án" })
            } else if (status === 422) {
                toast.error("Đã đạt giới hạn 20 fields")
            } else {
                toast.error("Lỗi khi tạo field")
            }
        },
    })

    const updateMutation = useMutation({
        mutationFn: (data: UpdateCustomFieldRequest) =>
            TaskService.updateCustomField(projectId, existing!.id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: qKey })
            toast.success("Lưu thay đổi thành công")
            onClose()
        },
        onError: (err: any) => {
            toast.error("Lỗi khi cập nhật field")
        },
    })

    const handleSubmit = () => {
        if (!validate()) return
        
        const cleanOptions = (fieldType === "SELECT" || fieldType === "MULTI_SELECT") 
            ? options.map(o => o.trim()).filter(Boolean) 
            : undefined

        if (existing) {
            updateMutation.mutate({
                name: name.trim(),
                options: cleanOptions,
                required,
            })
        } else {
            createMutation.mutate({
                name: name.trim(),
                fieldType,
                options: cleanOptions,
                required,
            })
        }
    }

    const isPending = createMutation.isPending || updateMutation.isPending

    return (
        <Dialog open onOpenChange={onClose}>
            <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden bg-white rounded-2xl">
                <DialogHeader className="px-6 py-4 border-b">
                    <DialogTitle className="text-xl font-bold text-gray-900">Thêm/Sửa Custom Field</DialogTitle>
                </DialogHeader>

                <div className="flex flex-col max-h-[70vh]">
                    {/* Form Side */}
                    <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
                        <div className="space-y-6">
                            <div className="space-y-4">
                                
                                {/* Name Input */}
                                <div>
                                    <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                                        Tên trường <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        placeholder="Nhập tên trường..."
                                        className={cn(
                                            "w-full px-3 py-2 text-sm border rounded-lg outline-none transition-all",
                                            errors.name ? "border-red-500 bg-red-50" : "border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-50"
                                        )}
                                    />
                                    {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                                </div>

                                {/* Type Selection */}
                                <div>
                                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                                        Loại dữ liệu <span className="text-red-500">*</span>
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {FIELD_TYPES.map(type => {
                                            const cfg = TYPE_CONFIG[type]
                                            const Icon = cfg.icon
                                            return (
                                                <button
                                                    key={type}
                                                    type="button"
                                                    disabled={!!existing}
                                                    onClick={() => setFieldType(type)}
                                                    className={cn(
                                                        "flex items-center gap-2 px-3 py-2 text-sm border rounded-lg transition-all text-left",
                                                        fieldType === type 
                                                            ? "border-blue-500 bg-blue-50 text-blue-700 font-semibold" 
                                                            : "border-gray-100 bg-white text-gray-600 hover:border-gray-200",
                                                        existing && "opacity-60 cursor-not-allowed"
                                                    )}
                                                >
                                                    <div className={cn("p-1 rounded bg-white border border-inherit shadow-sm", fieldType === type && "border-blue-200")}>
                                                        <Icon size={14} />
                                                    </div>
                                                    <span>{type}</span>
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>

                                {/* Options (Select/Multi-select) */}
                                {(fieldType === "SELECT" || fieldType === "MULTI_SELECT") && (
                                    <div className="space-y-3 pt-2">
                                        <label className="text-sm font-medium text-gray-700 block">Lựa chọn</label>
                                        <div className="space-y-2">
                                            {options.map((opt, i) => (
                                                <div key={i} className="flex items-center gap-2">
                                                    <GripVertical size={14} className="text-gray-300 shrink-0" />
                                                    <input
                                                        type="text"
                                                        value={opt}
                                                        onChange={e => {
                                                            const next = [...options]
                                                            next[i] = e.target.value
                                                            setOptions(next)
                                                        }}
                                                        placeholder={`Option ${i + 1}`}
                                                        className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-blue-400"
                                                    />
                                                    <button
                                                        onClick={() => setOptions(options.filter((_, idx) => idx !== i))}
                                                        className="p-1.5 text-gray-400 hover:text-red-500"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                        <button
                                            onClick={() => setOptions([...options, ""])}
                                            className="text-sm text-blue-600 font-medium flex items-center gap-1 hover:underline"
                                        >
                                            + Thêm lựa chọn
                                        </button>
                                        {errors.options && <p className="text-xs text-red-500 mt-1">{errors.options}</p>}
                                    </div>
                                )}

                                {/* Required Checkbox */}
                                <label className="flex items-center gap-2 pt-2 cursor-pointer group">
                                    <div className={cn(
                                        "w-4 h-4 border rounded transition-all flex items-center justify-center",
                                        required ? "bg-blue-500 border-blue-500 text-white" : "border-gray-300 bg-white group-hover:border-gray-400"
                                    )}>
                                        {required && <div className="w-2 h-2 bg-white rounded-sm" />}
                                    </div>
                                    <input
                                        type="checkbox"
                                        className="hidden"
                                        checked={required}
                                        onChange={e => setRequired(e.target.checked)}
                                    />
                                    <span className="text-sm font-medium text-gray-700">Bắt buộc</span>
                                </label>
                            </div>
                        </div>
                    </div>

                </div>

                <DialogFooter className="px-6 py-4 bg-gray-50 border-t flex justify-end gap-3 sm:justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                    >
                        Hủy
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isPending}
                        className="px-6 py-2 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-all shadow-md active:scale-95 disabled:opacity-50"
                    >
                        {isPending ? "Đang lưu..." : existing ? "Lưu thay đổi" : "Tạo field"}
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

// ── Confirm Dialog ───────────────────────────────────────────

interface ConfirmDialogProps {
    field: CustomFieldDefinition
    onConfirm: () => void
    onClose: () => void
    isLoading?: boolean
}

function DeleteConfirmDialog({ field, onConfirm, onClose, isLoading }: ConfirmDialogProps) {
    const isHide = field.hasValues === true
    
    return (
        <Dialog open onOpenChange={onClose}>
            <DialogContent className="max-w-md p-6 rounded-2xl bg-white">
                <div className="flex flex-col items-center text-center space-y-4">
                    <div className={cn("p-4 rounded-full", isHide ? "bg-orange-50 text-orange-600" : "bg-red-50 text-red-600")}>
                        <AlertCircle size={32} />
                    </div>
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold">
                            {isHide ? `Ẩn field [${field.name}]?` : `Xóa field [${field.name}]?`}
                        </DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-gray-500">
                        {isHide 
                            ? "Field này đang có dữ liệu trên một số task. Field sẽ được ẩn thay vì xóa hoàn toàn để bảo toàn dữ liệu."
                            : "Field này chưa có dữ liệu. Xóa sẽ không thể khôi phục."
                        }
                    </p>
                    <div className="flex w-full gap-3 pt-4">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-2 text-sm font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50"
                        >
                            Hủy
                        </button>
                        <button
                            onClick={onConfirm}
                            disabled={isLoading}
                            className={cn(
                                "flex-1 px-4 py-2 text-sm font-bold text-white rounded-xl transition-all active:scale-95 disabled:opacity-50",
                                isHide ? "bg-orange-500 hover:bg-orange-600" : "bg-red-500 hover:bg-red-600"
                            )}
                        >
                            {isLoading ? "Đang xử lý..." : (isHide ? "Ẩn field" : "Xóa field")}
                        </button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}

// ── Main Component ─────────────────────────────────────────────

interface Props {
    projectId: string
    myRole: string
    isOwner?: boolean
}

export default function CustomFieldsManager({ projectId, myRole, isOwner }: Props) {
    const canEdit = canActAsProjectManager(myRole, isOwner)
    const [showModal, setShowModal] = useState(false)
    const [editingField, setEditingField] = useState<CustomFieldDefinition | null>(null)
    const [confirmDelete, setConfirmDelete] = useState<CustomFieldDefinition | null>(null)
    const queryClient = useQueryClient()

    const { data: initialFields, isLoading } = useQuery({
        queryKey: ["custom-fields", projectId],
        queryFn:  () => TaskService.getCustomFields(projectId),
        enabled:  !!projectId,
    })

    // Local state for drag-and-drop reordering
    const [fields, setFields] = useState<CustomFieldDefinition[]>([])

    React.useEffect(() => {
        if (initialFields) setFields(initialFields)
    }, [initialFields])

    const count = fields.length
    const atLimit = count >= 20

    const updateMutation = useMutation({
      mutationFn: ({ id, pos }: { id: string, pos: number }) => 
        TaskService.updateCustomField(projectId, id, { position: pos }),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["custom-fields", projectId] })
      }
    })

    const hideMutation = useMutation({
        mutationFn: (fieldId: string) => TaskService.updateCustomField(projectId, fieldId, { hidden: true }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["custom-fields", projectId] })
            queryClient.invalidateQueries({ queryKey: ["task", projectId] })
            queryClient.invalidateQueries({ queryKey: ["tasks", projectId] })
            toast.info("Field đã được ẩn")
            setConfirmDelete(null)
        },
        onError: () => toast.error("Lỗi khi ẩn field"),
    })

    const unhideMutation = useMutation({
        mutationFn: (fieldId: string) => TaskService.updateCustomField(projectId, fieldId, { hidden: false }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["custom-fields", projectId] })
            queryClient.invalidateQueries({ queryKey: ["task", projectId] })
            queryClient.invalidateQueries({ queryKey: ["tasks", projectId] })
            toast.success("Field đã được hiện lại")
        },
        onError: () => toast.error("Lỗi khi hiện field"),
    })

    const deleteMutation = useMutation({
        mutationFn: (field: CustomFieldDefinition) => TaskService.deleteCustomField(projectId, field.id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["custom-fields", projectId] })
            queryClient.invalidateQueries({ queryKey: ["task", projectId] })
            queryClient.invalidateQueries({ queryKey: ["tasks", projectId] })
            toast.success("Đã xóa custom field")
            setConfirmDelete(null)
        },
        onError: () => toast.error("Lỗi khi xóa field"),
    })

    // Sensors for DND
    const sensors = useSensors(
      useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
      useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragEnd = (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = fields.findIndex((f) => f.id === active.id);
      const newIndex = fields.findIndex((f) => f.id === over.id);

      const newFields = arrayMove(fields, oldIndex, newIndex);
      setFields(newFields);

      // Call API to update position
      // Position is usually 1-based or based on index
      updateMutation.mutate({ id: active.id as string, pos: newIndex + 1 });
    };

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Header */}
                <div className="px-6 py-3.5 border-b border-slate-100 bg-slate-100/80 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <h2 className="text-xl font-bold text-slate-900">Custom Fields</h2>
                        <span className="bg-white text-slate-600 px-2.5 py-0.5 rounded-full text-xs font-bold border border-slate-200 shadow-sm">
                            {count} / 20
                        </span>
                    </div>
                    {canEdit && (
                        <button
                            onClick={() => setShowModal(true)}
                            disabled={atLimit}
                            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Plus size={16} strokeWidth={3} /> Thêm field
                        </button>
                    )}
                </div>

                <DndContext 
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <Table>
                      <TableHeader className="bg-gray-50/50">
                          <TableRow>
                              <TableHead className="w-[40px]"></TableHead>
                              <TableHead className="text-[11px] font-bold text-gray-500">Field Name</TableHead>
                              <TableHead className="text-[11px] font-bold text-gray-500">Type</TableHead>
                              <TableHead className="text-[11px] font-bold text-gray-500">Required</TableHead>
                              <TableHead className="text-[11px] font-bold text-gray-500">Status</TableHead>
                              <TableHead className="text-[11px] font-bold text-gray-500">Options</TableHead>
                              <TableHead className="text-right text-[11px] font-bold text-gray-500">Actions</TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {isLoading ? (
                              Array.from({ length: 3 }).map((_, i) => (
                                  <TableRow key={i}>
                                      <TableCell colSpan={7} className="h-16 py-4 px-6">
                                          <div className="w-full h-8 bg-gray-50 animate-pulse rounded-lg" />
                                      </TableCell>
                                  </TableRow>
                              ))
                          ) : fields.length === 0 ? (
                              <TableRow>
                                  <TableCell colSpan={7} className="h-40 text-center text-gray-400">
                                      <div className="flex flex-col items-center gap-2">
                                          <Info size={32} className="opacity-20" />
                                          <p>Chưa có custom field nào. Hãy tạo field đầu tiên!</p>
                                      </div>
                                  </TableCell>
                              </TableRow>
                          ) : (
                            <SortableContext 
                              items={fields.map(f => f.id)}
                              strategy={verticalListSortingStrategy}
                            >
                              {fields.map((field, idx) => (
                                <SortableFieldRow
                                  key={field.id}
                                  field={field}
                                  index={idx}
                                  canEdit={canEdit}
                                  onEdit={setEditingField}
                                  onDelete={setConfirmDelete}
                                  onUnhide={f => unhideMutation.mutate(f.id)}
                                />
                              ))}
                            </SortableContext>
                          )}
                      </TableBody>
                  </Table>
                </DndContext>
            </div>

            {/* Modals */}
            {showModal && (
                <FieldModal
                    projectId={projectId}
                    onClose={() => setShowModal(false)}
                />
            )}
            
            {editingField && (
                <FieldModal
                    projectId={projectId}
                    existing={editingField}
                    onClose={() => setEditingField(null)}
                />
            )}

            {confirmDelete && (
                <DeleteConfirmDialog
                    field={confirmDelete}
                    onConfirm={() => {
                        if (confirmDelete.hasValues === true && !confirmDelete.hidden) {
                            hideMutation.mutate(confirmDelete.id)
                        } else {
                            deleteMutation.mutate(confirmDelete)
                        }
                    }}
                    onClose={() => setConfirmDelete(null)}
                    isLoading={hideMutation.isPending || deleteMutation.isPending}
                />
            )}
        </div>
    )
}
