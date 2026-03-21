import { create } from "zustand";

interface BoardStore {
    // Task Detail Panel
    selectedTaskId: string | null;
    selectedTaskEtag: string;
    setSelectedTask: (id: string | null, etag?: string) => void;

    // Optimistic drag state
    dragSourceColumnId: string | null;
    setDragSource: (columnId: string | null) => void;
}

export const useBoardStore = create<BoardStore>((set) => ({
    selectedTaskId: null,
    selectedTaskEtag: "",
    setSelectedTask: (id, etag = "") =>
        set({ selectedTaskId: id, selectedTaskEtag: etag }),

    dragSourceColumnId: null,
    setDragSource: (columnId) => set({ dragSourceColumnId: columnId }),
}));
