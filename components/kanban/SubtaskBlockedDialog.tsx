"use client";

import { AlertTriangle, ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import StatusBadge from "@/components/project-overview/shared/StatusBadge";
import type { SubTaskResponse } from "@/app/types/task.schema";

interface SubtaskBlockedDialogProps {
  open: boolean;
  taskTitle: string;
  pendingSubtasks: SubTaskResponse[];
  onClose: () => void;
  onViewSubtasks: () => void;
}

export function SubtaskBlockedDialog({
  open,
  taskTitle,
  pendingSubtasks,
  onClose,
  onViewSubtasks,
}: SubtaskBlockedDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-[480px] gap-0 overflow-hidden border-none p-0 shadow-2xl">
        <div className="p-6">
          <div className="mb-6 flex items-start gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full border border-amber-100 bg-amber-50">
              <AlertTriangle className="h-6 w-6 text-amber-600" />
            </div>
            <div className="pt-1">
              <DialogTitle className="mb-1 text-xl font-bold text-gray-900">
                Cannot complete task
              </DialogTitle>
              <p className="text-sm leading-relaxed text-gray-500">
                You must finish all sub-tasks before moving
                <span className="mx-1 font-semibold italic text-gray-700">&quot;{taskTitle}&quot;</span>
                to Done.
              </p>
            </div>
          </div>

          <div className="mb-6 rounded-2xl border border-gray-100 bg-gray-50/80 p-4">
            <div className="mb-3 flex items-center justify-between px-1">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
                {pendingSubtasks.length} unfinished sub-task{pendingSubtasks.length === 1 ? "" : "s"}
              </p>
            </div>

            <ScrollArea className="h-full max-h-[220px] pr-4">
              <div className="space-y-2.5">
                {pendingSubtasks.map((sub) => (
                  <div
                    key={sub.id}
                    className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-2.5 shadow-sm transition-all hover:border-gray-200"
                  >
                    <div className="h-5 w-5 flex-shrink-0 rounded border-2 border-gray-200 bg-gray-50" />
                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex items-center gap-2">
                        <span className="rounded border border-gray-100 bg-gray-50 px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase text-gray-400">
                          {sub.taskCode}
                        </span>
                        <span className="truncate text-sm font-medium text-gray-700">
                          {sub.title}
                        </span>
                      </div>
                    </div>
                    <StatusBadge
                      status={sub.taskStatus.toLowerCase() as any}
                      className="flex-shrink-0"
                    />
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          <p className="mb-8 mt-2 text-center text-sm text-gray-500">
            Complete every sub-task listed above to continue.
          </p>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="h-12 flex-1 rounded-xl border-gray-200 font-semibold text-gray-600 transition-all hover:bg-gray-50 hover:text-gray-900"
            >
              Close
            </Button>
            <Button
              onClick={() => {
                onViewSubtasks();
                onClose();
              }}
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-gray-900 font-semibold text-white shadow-lg shadow-gray-200 transition-all hover:bg-gray-800"
            >
              <ExternalLink className="h-4 w-4" />
              View sub-tasks
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
