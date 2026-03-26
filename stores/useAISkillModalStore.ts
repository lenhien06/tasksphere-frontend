import { create } from "zustand";
import type { MemberSkillEntry } from "@/components/projects/AISkillAllocationModal";

interface AISkillModalState {
  isOpen: boolean;
  members: MemberSkillEntry[];
  canEdit: boolean;
  onConfirm: ((updatedMembers: MemberSkillEntry[]) => void) | null;
  open: (opts: {
    members: MemberSkillEntry[];
    canEdit?: boolean;
    onConfirm?: (updated: MemberSkillEntry[]) => void;
  }) => void;
  close: () => void;
}

export const useAISkillModalStore = create<AISkillModalState>((set) => ({
  isOpen: false,
  members: [],
  canEdit: true,
  onConfirm: null,
  open: ({ members, canEdit = true, onConfirm = () => {} }) =>
    set({ isOpen: true, members, canEdit, onConfirm }),
  close: () => set({ isOpen: false }),
}));
