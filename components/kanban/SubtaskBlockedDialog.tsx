"use client";

import { AlertTriangle, ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
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
      <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden gap-0 border-none shadow-2xl">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 rounded-full bg-amber-50
                            flex items-center justify-center flex-shrink-0 border border-amber-100">
              <AlertTriangle className="w-6 h-6 text-amber-600" />
            </div>
            <div className="pt-1">
              <DialogTitle className="text-xl font-bold text-gray-900 mb-1">
                Không thể hoàn thành task
              </DialogTitle>
              <p className="text-sm text-gray-500 leading-relaxed">
                Bạn cần hoàn thành tất cả sub-task trước khi có thể chuyển task 
                <span className="font-semibold text-gray-700 mx-1 italic">"{taskTitle}"</span> 
                sang trạng thái Done.
              </p>
            </div>
          </div>

          {/* Pending Subtasks List */}
          <div className="bg-gray-50/80 rounded-2xl p-4 border border-gray-100 mb-6">
            <div className="flex items-center justify-between mb-3 px-1">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                {pendingSubtasks.length} sub-task chưa hoàn thành
              </p>
            </div>

            <ScrollArea className="h-full max-h-[220px] pr-4">
              <div className="space-y-2.5">
                {pendingSubtasks.map((sub) => (
                  <div 
                    key={sub.id}
                    className="flex items-center gap-3 p-2.5 bg-white rounded-xl border border-gray-100 shadow-sm transition-all hover:border-gray-200"
                  >
                    <div className="w-5 h-5 rounded border-2 border-gray-200 flex-shrink-0 bg-gray-50" />
                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] font-bold text-gray-400 px-1.5 py-0.5 bg-gray-50 rounded border border-gray-100 uppercase">
                          {sub.taskCode}
                        </span>
                        <span className="text-sm font-medium text-gray-700 truncate">
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

          <p className="text-sm text-gray-500 text-center mt-2 mb-8">
            Hoàn thành tất cả sub-task bên trên để tiếp tục.
          </p>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 h-12 rounded-xl border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900 font-semibold transition-all"
            >
              Đóng
            </Button>
            <Button
              onClick={() => {
                onViewSubtasks();
                onClose();
              }}
              className="flex-1 h-12 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800 transition-all flex items-center justify-center gap-2 shadow-lg shadow-gray-200"
            >
              <ExternalLink className="w-4 h-4" />
              Xem sub-tasks
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
