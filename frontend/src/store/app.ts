import { create } from "zustand";
import type { User } from "firebase/auth";
import type { DailyCheckin, Goal, AppNotification } from "@/models";

export type LanguageCode = "en" | "ta" | "hi";

function getInitialLanguage(): LanguageCode {
  if (typeof window === "undefined") return "en";
  try {
    const saved = localStorage.getItem("healthguardian_language");
    if (saved === "ta" || saved === "hi" || saved === "en") {
      return saved;
    }
  } catch {
    // Ignore storage errors
  }
  return "en";
}

interface AppState {
  user: User | null;
  authLoading: boolean;
  online: boolean;
  language: LanguageCode;
  checkins: DailyCheckin[];
  goals: Goal[];
  notifications: AppNotification[];
  setUser: (u: User | null) => void;
  setAuthLoading: (v: boolean) => void;
  setOnline: (v: boolean) => void;
  setLanguage: (lang: LanguageCode) => void;
  setCheckins: (c: DailyCheckin[]) => void;
  setGoals: (g: Goal[]) => void;
  setNotifications: (n: AppNotification[]) => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  authLoading: true,
  online: true,
  language: getInitialLanguage(),
  checkins: [],
  goals: [],
  notifications: [],
  setUser: (user) => set({ user }),
  setAuthLoading: (authLoading) => set({ authLoading }),
  setOnline: (online) => set({ online }),
  setLanguage: (language) => {
    try {
      localStorage.setItem("healthguardian_language", language);
    } catch {
      // Ignore storage errors
    }
    set({ language });
  },
  setCheckins: (checkins) => set({ checkins }),
  setGoals: (goals) => set({ goals }),
  setNotifications: (notifications) => set({ notifications }),
}));
