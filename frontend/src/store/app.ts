import { create } from "zustand";
import type { User } from "firebase/auth";
import type { DailyCheckin, Goal, AppNotification } from "@/models";

interface AppState {
  user: User | null;
  authLoading: boolean;
  online: boolean;
  checkins: DailyCheckin[];
  goals: Goal[];
  notifications: AppNotification[];
  setUser: (u: User | null) => void;
  setAuthLoading: (v: boolean) => void;
  setOnline: (v: boolean) => void;
  setCheckins: (c: DailyCheckin[]) => void;
  setGoals: (g: Goal[]) => void;
  setNotifications: (n: AppNotification[]) => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  authLoading: true,
  online: true,
  checkins: [],
  goals: [],
  notifications: [],
  setUser: (user) => set({ user }),
  setAuthLoading: (authLoading) => set({ authLoading }),
  setOnline: (online) => set({ online }),
  setCheckins: (checkins) => set({ checkins }),
  setGoals: (goals) => set({ goals }),
  setNotifications: (notifications) => set({ notifications }),
}));
