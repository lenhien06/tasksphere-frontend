import { create } from "zustand";
import type { MemberSkillEntry } from "@/components/projects/AISkillAllocationModal";

interface AISkillModalState {
  isOpen: boolean;
  projectId: string;
  members: MemberSkillEntry[];
  canEdit: boolean;
  onConfirm: ((updatedMembers: MemberSkillEntry[]) => void) | null;
  open: (opts: {
    projectId: string;
    canEdit?: boolean;
    onConfirm?: (updated: MemberSkillEntry[]) => void;
  }) => void;
  close: () => void;
}

export const useAISkillModalStore = create<AISkillModalState>((set) => ({
  isOpen: false,
  projectId: "",
  members: [],
  canEdit: true,
  onConfirm: null,
  open: ({ projectId, canEdit = true, onConfirm = () => {} }) =>
    set({ isOpen: true, projectId, canEdit, onConfirm }),
  close: () => set({ isOpen: false }),
}));
