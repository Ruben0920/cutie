import { create } from 'zustand';

interface ChatState {
  isOpen: boolean;
  unreadCount: number;
  setOpen: (open: boolean) => void;
  setUnreadCount: (count: number) => void;
  incrementUnread: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  isOpen: false,
  unreadCount: 0,
  setOpen: (isOpen) => set({ isOpen }),
  setUnreadCount: (unreadCount) =>
    set({ unreadCount: Math.max(0, unreadCount) }),
  incrementUnread: () =>
    set((state) => ({ unreadCount: state.unreadCount + 1 })),
}));
