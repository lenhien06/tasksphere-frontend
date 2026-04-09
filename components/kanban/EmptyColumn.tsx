"use client";

import { Inbox, Search } from "lucide-react";
import { useTranslation } from "react-i18next";

interface EmptyColumnProps {
  canAdd: boolean;
  onAdd?: () => void;
  isFiltered?: boolean;
  onClearFilters?: () => void;
}

export default function EmptyColumn({ canAdd, onAdd, isFiltered, onClearFilters }: EmptyColumnProps) {
  const { t } = useTranslation();

  if (isFiltered) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 bg-white p-5 text-center">
        <Search className="mx-auto mb-2 h-5 w-5 text-gray-400" />
        <div className="text-gray-600 text-sm">{t("kanban.noTaskAfterFilter", { defaultValue: "No tasks found" })}</div>
        <div className="mt-1 text-xs text-gray-400">{t("kanban.tryChangeFilter", { defaultValue: "Try changing the filters" })}</div>
        <button
          onClick={onClearFilters}
          className="mt-2 text-xs text-blue-600 hover:text-blue-700 transition-colors"
        >
          {t("kanban.clearFilters", { defaultValue: "Clear filters" })}
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-dashed border-gray-200 bg-white p-6 text-center text-gray-500 min-h-[220px] flex flex-col items-center justify-center">
      <Inbox className="mx-auto mb-2 h-10 w-10 opacity-30" />
      <p className="text-sm">{t("kanban.emptyColumn", { defaultValue: "No tasks yet" })}</p>
      {canAdd && (
        <button onClick={onAdd} className="mt-3 text-sm border border-gray-200 bg-white px-3 py-1.5 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
          + {t("kanban.addFirstTask", { defaultValue: "Add your first task" })}
        </button>
      )}
    </div>
  );
}
