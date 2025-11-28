
export enum FastingType {
  F12 = '12h',
  F14 = '14h',
  F16 = '16h',
  F18 = '18h',
  F20 = '20h',
  F24 = '24h',
  OMAD = 'OMAD',
  CUSTOM = 'Custom'
}

export enum Difficulty {
  EASY = 'Iniciante',
  MEDIUM = 'Intermediário',
  HARD = 'Avançado'
}

export interface FastingMode {
  id: string;
  type: FastingType;
  hours: number;
  label: string;
  description: string;
  difficulty: Difficulty;
  color: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  dateUnlocked?: number;
}

export type Mood = 'great' | 'good' | 'neutral' | 'bad' | 'terrible';

export interface FastingSession {
  id: string;
  startTime: number;
  endTime: number | null; // null if active
  targetDurationHours: number;
  actualDurationHours?: number;
  completed: boolean;
  mode: FastingType;
  intention?: string; // Purpose of the fast
  notes?: string; // Journaling during the fast
  waterCount?: number; // Number of 250ml glasses drunk during this session
  mood?: Mood; // How the user felt at the end
  lastMeal?: string; // What they ate to break the fast
}

export interface WeightEntry {
  date: number;
  weight: number;
}

export interface UserProfile {
  name: string;
  photo?: string;
  weight: number;
  weightHistory: WeightEntry[];
  targetWeight: number;
  height: number; // in cm
  level: number;
  currentXP: number;
  nextLevelXP: number;
  streak: number;
  lastFastingDate: number | null;
  theme: 'light' | 'dark';
  onboardingCompleted: boolean;
  showSpiritualContent: boolean; 
  showHealthStats: boolean; 
  waterNotificationEnabled: boolean;
  waterNotificationInterval: number;
}

export interface AppState {
  user: UserProfile;
  activeSession: FastingSession | null;
  history: FastingSession[];
  achievements: Achievement[];
  lastWaterReminderTime: number;
}
