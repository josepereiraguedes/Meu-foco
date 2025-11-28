
import { AppState, UserProfile, Achievement, FastingSession, WeightEntry } from '../types';
import { INITIAL_ACHIEVEMENTS } from '../constants';

const STORAGE_KEY = 'MEU_FOCO_DATA_V1';

const DEFAULT_USER: UserProfile = {
  name: '',
  photo: undefined,
  weight: 0,
  weightHistory: [],
  targetWeight: 0,
  height: 0,
  level: 1,
  currentXP: 0,
  nextLevelXP: 100,
  streak: 0,
  lastFastingDate: null,
  theme: 'light',
  onboardingCompleted: false,
  showSpiritualContent: false, 
  showHealthStats: false,
  waterNotificationEnabled: true, // Default ON
  waterNotificationInterval: 60, // Default 1 hour
};

const DEFAULT_STATE: AppState = {
  user: DEFAULT_USER,
  activeSession: null,
  history: [],
  achievements: INITIAL_ACHIEVEMENTS,
  lastWaterReminderTime: 0,
};

// Helper to ensure weight history has valid numbers
const sanitizeWeightHistory = (history: any[]): WeightEntry[] => {
    if (!Array.isArray(history)) return [];
    return history.map(h => ({
        date: typeof h.date === 'string' ? new Date(h.date).getTime() : h.date, // Recover from JSON string dates
        weight: Number(h.weight) || 0
    })).filter(h => h.weight > 0);
};

// Helper to ensure history sessions have valid numbers
const sanitizeHistory = (history: any[]): FastingSession[] => {
    if (!Array.isArray(history)) return [];
    return history.map(h => ({
        ...h,
        startTime: typeof h.startTime === 'string' ? new Date(h.startTime).getTime() : h.startTime,
        endTime: h.endTime && typeof h.endTime === 'string' ? new Date(h.endTime).getTime() : h.endTime,
    }));
};

export const saveState = (state: AppState) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error("Failed to save state", e);
    if (e instanceof DOMException && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
        alert("Espaço de armazenamento cheio. Tente remover algumas fotos ou dados antigos.");
    }
  }
};

export const loadState = (): AppState => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      // Deep merge / Sanitize to prevent crashes on updates
      return {
        ...DEFAULT_STATE,
        ...parsed,
        user: { 
            ...DEFAULT_USER, 
            ...parsed.user,
            weightHistory: sanitizeWeightHistory(parsed.user?.weightHistory)
        },
        history: sanitizeHistory(parsed.history),
        achievements: parsed.achievements || INITIAL_ACHIEVEMENTS,
        lastWaterReminderTime: parsed.lastWaterReminderTime || 0
      };
    }
  } catch (e) {
    console.error("Failed to load state", e);
  }
  return DEFAULT_STATE;
};

// Validate imported JSON structure
export const validateAndSanitizeImport = (json: any): AppState | null => {
    if (!json || typeof json !== 'object') return null;
    
    // Basic structural check
    if (!json.user || !Array.isArray(json.history)) return null;

    return {
        ...DEFAULT_STATE,
        ...json,
        user: { 
            ...DEFAULT_USER, 
            ...json.user,
            weightHistory: sanitizeWeightHistory(json.user?.weightHistory)
        },
        history: sanitizeHistory(json.history),
        // Ensure achievements exist, merge with defaults to keep new achievements available
        achievements: Array.isArray(json.achievements) 
            ? INITIAL_ACHIEVEMENTS.map(def => {
                const found = json.achievements.find((a: Achievement) => a.id === def.id);
                return found || def;
            })
            : INITIAL_ACHIEVEMENTS,
        lastWaterReminderTime: json.lastWaterReminderTime || 0
    };
};

export const exportData = (state: AppState) => {
  const dataStr = JSON.stringify(state);
  const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
  const exportFileDefaultName = `meu_foco_backup_${new Date().toISOString().slice(0,10)}.json`;

  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', exportFileDefaultName);
  linkElement.click();
};
