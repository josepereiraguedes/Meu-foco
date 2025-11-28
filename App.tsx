
import React, { useState, useEffect, useRef } from 'react';
import { HashRouter } from 'react-router-dom';
import { differenceInSeconds, format, addHours, differenceInDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Settings, Droplet, Moon, Sun, Award, Flame, ChevronRight, X, History as HistoryIcon, Plus, Book, PenTool, BookOpen, Activity, Heart, Battery, Brain, Zap, Camera, Upload, Scale, TrendingDown, Info, Bell, Clock, Download, Smartphone, Sparkles, Play, ArrowRight, Minus, Wind, Smile, Meh, Frown, Utensils, Edit2, Trash2, Save, Target } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LineChart, Line, CartesianGrid } from 'recharts';

import { AppState, FastingSession, FastingType, Mood } from './types';
import { loadState, saveState, exportData, validateAndSanitizeImport } from './services/storageService';
import { FASTING_MODES, MOTIVATIONAL_QUOTES, SPIRITUAL_QUOTES, LEVEL_BASE_XP, XP_PER_HOUR, XP_BONUS_COMPLETION, METABOLIC_STAGES } from './constants';
import CircleTimer from './components/CircleTimer';
import Navbar from './components/Navbar';

// --- Confetti Utility ---
declare global {
  interface Window {
    confetti: any;
  }
}

const triggerConfetti = () => {
  if (window.confetti) {
    window.confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#0ea5e9', '#6366f1', '#10b981', '#f59e0b']
    });
  }
};

const triggerLevelUpConfetti = () => {
    if (window.confetti) {
        const duration = 2000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };
        
        const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;
        
        const interval: any = setInterval(function() {
            const timeLeft = animationEnd - Date.now();
            if (timeLeft <= 0) {
                return clearInterval(interval);
            }
            const particleCount = 50 * (timeLeft / duration);
            window.confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } }));
            window.confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } }));
        }, 250);
    }
}

// --- Haptics Utility ---
const vibrate = (pattern: number | number[] = 50) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(pattern);
    }
};

// --- Services (Internal) ---

const calculateLevel = (xp: number) => {
  return Math.floor(xp / LEVEL_BASE_XP) + 1;
};

const getQuote = (showSpiritual: boolean) => {
  const pool = showSpiritual ? [...MOTIVATIONAL_QUOTES, ...SPIRITUAL_QUOTES] : MOTIVATIONAL_QUOTES;
  const index = Math.floor(Math.random() * pool.length);
  return pool[index];
};

const formatTime = (totalSeconds: number) => {
  const isNegative = totalSeconds < 0;
  const absSeconds = Math.abs(totalSeconds);
  const h = Math.floor(absSeconds / 3600);
  const m = Math.floor((absSeconds % 3600) / 60);
  const s = absSeconds % 60;
  const sign = isNegative ? '-' : '';
  return `${sign}${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const getWaterRecommendation = (hours: number) => {
    const liters = (hours * 0.15).toFixed(1);
    return liters;
};

const calculateBMI = (weight: number, heightVal: number) => {
    if (!weight || !heightVal) return { value: 0, label: 'N/A', color: 'text-gray-400' };
    const heightM = heightVal < 3.0 ? heightVal : heightVal / 100;
    const bmi = weight / (heightM * heightM);
    let label = '';
    let color = '';

    if (bmi < 18.5) { label = 'Abaixo do peso'; color = 'text-blue-500'; }
    else if (bmi < 24.9) { label = 'Peso normal'; color = 'text-green-500'; }
    else if (bmi < 29.9) { label = 'Sobrepeso'; color = 'text-yellow-500'; }
    else { label = 'Obesidade'; color = 'text-red-500'; }

    return { value: bmi.toFixed(1), label, color };
};

const getCurrentMetabolicStage = (elapsedHours: number) => {
    const stage = METABOLIC_STAGES.find(s => elapsedHours >= s.startHour && elapsedHours < s.endHour) || METABOLIC_STAGES[METABOLIC_STAGES.length - 1];
    return stage;
};

// Helper for date inputs (YYYY-MM-DDTHH:mm)
const formatDateForInput = (timestamp: number) => {
    return new Date(timestamp).toISOString().slice(0, 16);
};

// Singleton AudioContext
let audioCtx: AudioContext | null = null;
const playSound = async (type: 'start' | 'success' | 'water' | 'breathe') => {
  try {
    const win = window as any;
    const AudioContextClass = win.AudioContext || win.webkitAudioContext;
    if (!AudioContextClass) return;
    if (!audioCtx) audioCtx = new AudioContextClass();
    if (audioCtx.state === 'suspended') await audioCtx.resume().catch(() => {});
    
    const ctx = audioCtx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;

    if (type === 'water') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(400, now + 0.1);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.2);
    } else if (type === 'start') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.1);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === 'breathe') {
      // Gentle hum
      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, now);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.2, now + 2);
      gain.gain.linearRampToValueAtTime(0, now + 4);
      osc.start(now);
      osc.stop(now + 4);
    } else {
      [523.25, 659.25, 783.99].forEach((freq, i) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.type = 'triangle';
          o.connect(g);
          g.connect(ctx.destination);
          o.frequency.value = freq;
          g.gain.setValueAtTime(0, now);
          g.gain.linearRampToValueAtTime(0.1, now + 0.1 + (i*0.05));
          g.gain.exponentialRampToValueAtTime(0.01, now + 1.5);
          o.start(now);
          o.stop(now + 1.5);
      });
    }
  } catch (e) { }
};

const requestNotificationPermission = async () => {
    try {
        if (!("Notification" in window)) return;
        if (Notification.permission !== "granted" && Notification.permission !== "denied") {
            await Notification.requestPermission();
        }
    } catch(e) {}
};

const sendNotification = (title: string, body: string) => {
    try {
        if (!("Notification" in window)) return;
        if (Notification.permission === "granted") {
            const iconUrl = 'https://cdn-icons-png.flaticon.com/512/4825/4825038.png';
            if (navigator.serviceWorker && navigator.serviceWorker.ready) {
                 navigator.serviceWorker.ready.then(registration => {
                     registration.showNotification(title, { body, icon: iconUrl, vibrate: [200, 100, 200] } as any).catch(() => {});
                 });
            } else {
                new Notification(title, { body, icon: iconUrl });
            }
        }
    } catch(e) {}
};

// --- App Component ---

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(loadState());
  const [activeTab, setActiveTab] = useState<'home' | 'history' | 'profile' | 'awards' | 'learn'>('home');
  const [dailyQuote, setDailyQuote] = useState<string>('');
  const [currentTime, setCurrentTime] = useState(Date.now());
  
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const wakeLockRef = useRef<any>(null);
  
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [showJournalModal, setShowJournalModal] = useState(false);
  const [showIntentionModal, setShowIntentionModal] = useState(false);
  const [showSOSModal, setShowSOSModal] = useState(false);
  const [showFinishModal, setShowFinishModal] = useState(false);
  
  // History Editing State
  const [showHistoryEditModal, setShowHistoryEditModal] = useState(false);
  const [editingSession, setEditingSession] = useState<Partial<FastingSession>>({});

  const [customHours, setCustomHours] = useState<number>(16);
  const [pendingFastMode, setPendingFastMode] = useState<{hours: number, type: FastingType} | null>(null);
  const [intentionInput, setIntentionInput] = useState('');
  const [notesInput, setNotesInput] = useState('');
  
  // Finish Fast States
  const [finishMood, setFinishMood] = useState<Mood>('good');
  const [finishMeal, setFinishMeal] = useState('');

  // SOS States
  const [sosPhase, setSosPhase] = useState<'inhale' | 'hold' | 'exhale'>('inhale');
  const [sosTimeLeft, setSosTimeLeft] = useState(60);

  useEffect(() => {
    saveState(state);
    if (state.user.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [state]);

  useEffect(() => {
    const handleInstallPrompt = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
  }, []);

  useEffect(() => {
    requestNotificationPermission();
  }, []);

  // Wake Lock
  useEffect(() => {
    const requestWakeLock = async () => {
      if ('wakeLock' in navigator && state.activeSession && !state.activeSession.completed) {
        try {
          if (wakeLockRef.current) await wakeLockRef.current.release().catch(() => {});
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        } catch (err) {}
      }
    };
    const releaseWakeLock = async () => {
        if(wakeLockRef.current) {
            try { await wakeLockRef.current.release(); } catch(e) {}
            wakeLockRef.current = null;
        }
    };
    if (state.activeSession && !state.activeSession.completed) requestWakeLock();
    else releaseWakeLock();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && state.activeSession && !state.activeSession.completed) requestWakeLock();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        releaseWakeLock();
    };
  }, [state.activeSession]);

  // Timer & Status Check
  useEffect(() => {
    const checkStatus = () => {
      const now = Date.now();
      setCurrentTime(now);

      if (state.activeSession) {
          if (!state.activeSession.completed) {
              const targetTime = addHours(state.activeSession.startTime, state.activeSession.targetDurationHours).getTime();
              if (now >= targetTime && now < targetTime + 2000) {
                 sendNotification("Jejum Concluído! 🎉", "Parabéns! Você alcançou sua meta.");
                 playSound('success');
                 triggerConfetti();
              }
          }
          if (state.user.waterNotificationEnabled) {
              const lastReferenceTime = state.lastWaterReminderTime > state.activeSession.startTime 
                  ? state.lastWaterReminderTime 
                  : state.activeSession.startTime;
              const intervalMs = (state.user.waterNotificationInterval || 60) * 60 * 1000;
              if (now - lastReferenceTime >= intervalMs) {
                  sendNotification("Hora de beber água! 💧", "Mantenha-se hidratado.");
                  playSound('water');
                  setState(prev => ({ ...prev, lastWaterReminderTime: now }));
              }
          }
      }
    };
    const timer = setInterval(checkStatus, 1000);
    const onVisChange = () => { if(document.visibilityState === 'visible') checkStatus(); };
    document.addEventListener('visibilitychange', onVisChange);
    setDailyQuote(getQuote(state.user.showSpiritualContent));
    return () => {
        clearInterval(timer);
        document.removeEventListener('visibilitychange', onVisChange);
    };
  }, [state.user.showSpiritualContent, state.activeSession, state.user.waterNotificationEnabled, state.user.waterNotificationInterval, state.lastWaterReminderTime]); 

  // SOS Logic
  useEffect(() => {
    let interval: any;
    if (showSOSModal && sosTimeLeft > 0) {
      interval = setInterval(() => {
        setSosTimeLeft(prev => prev - 1);
        // Simple 4-7-8 rhythm based on total time modulo
        // Cycle is 19s (4 in, 7 hold, 8 out) approx
        // Let's do simpler: 4 in, 4 hold, 4 out for simplicity in UI
        const cycle = Date.now() % 12000;
        if (cycle < 4000) setSosPhase('inhale');
        else if (cycle < 8000) setSosPhase('hold');
        else setSosPhase('exhale');
      }, 100);
    } else if (sosTimeLeft <= 0) {
      setShowSOSModal(false);
    }
    return () => clearInterval(interval);
  }, [showSOSModal, sosTimeLeft]);

  useEffect(() => {
    if (!state.user.onboardingCompleted && state.user.name === '') setActiveTab('profile');
  }, [state.user.onboardingCompleted, state.user.name]);

  // --- Logic ---

  const handleInstallClick = async () => {
      if (!installPrompt) return;
      try {
          installPrompt.prompt();
          const { outcome } = await installPrompt.userChoice;
          if (outcome === 'accepted') setInstallPrompt(null);
      } catch(e) {}
  };

  const initiateFastStart = async (hours: number, modeType: FastingType) => {
      vibrate(50);
      await requestNotificationPermission();
      if (state.user.showSpiritualContent) {
          setPendingFastMode({ hours, type: modeType });
          setIntentionInput('');
          setShowIntentionModal(true);
          setShowCustomModal(false);
      } else {
          completeFastStart(hours, modeType, '');
          setShowCustomModal(false);
      }
  };

  const completeFastStart = (hours: number, modeType: FastingType, intention: string) => {
    const startTime = Date.now();
    const newSession: FastingSession = {
      id: crypto.randomUUID(),
      startTime,
      endTime: null,
      targetDurationHours: hours,
      completed: false,
      mode: modeType,
      intention: intention || undefined,
      notes: '',
      waterCount: 0
    };
    setState(prev => ({ ...prev, activeSession: newSession, lastWaterReminderTime: startTime }));
    setActiveTab('home');
    setShowIntentionModal(false);
    setPendingFastMode(null);
    playSound('start');
    triggerConfetti();
    sendNotification("Jejum Iniciado", `Foco! Sua meta é ${hours} horas.`);
  };

  const handleStopFastClick = () => {
      setFinishMood('good');
      setFinishMeal('');
      setShowFinishModal(true);
  }

  const confirmStopFast = () => {
    if (!state.activeSession) return;
    vibrate([50, 50, 50]);
    const endTime = Date.now();
    const durationHours = differenceInSeconds(endTime, state.activeSession.startTime) / 3600;
    const isCompleted = durationHours >= state.activeSession.targetDurationHours;

    let xpEarned = Math.floor(durationHours * XP_PER_HOUR);
    if (isCompleted) xpEarned += XP_BONUS_COMPLETION;
    if (isCompleted && durationHours > 24) xpEarned += 50;

    let newStreak = state.user.streak;
    const lastFast = state.user.lastFastingDate;
    const daysSinceLast = lastFast ? differenceInDays(endTime, lastFast) : 0;
    if (daysSinceLast <= 1) { if (daysSinceLast === 1 || newStreak === 0) newStreak += 1; } 
    else { newStreak = 1; }

    const completedSession: FastingSession = { 
        ...state.activeSession, 
        endTime, 
        actualDurationHours: durationHours, 
        completed: isCompleted,
        mood: finishMood,
        lastMeal: finishMeal
    };

    const newUserXP = state.user.currentXP + xpEarned;
    const newLevel = calculateLevel(newUserXP);
    if(newLevel > state.user.level) triggerLevelUpConfetti();

    const updatedAchievements = state.achievements.map(ach => {
      let unlocked = ach.unlocked;
      if (!unlocked) {
        if (ach.id === 'first_fast') unlocked = true;
        if (ach.id === 'streak_3' && newStreak >= 3) unlocked = true;
        if (ach.id === 'streak_7' && newStreak >= 7) unlocked = true;
        if (ach.id === 'streak_30' && newStreak >= 30) unlocked = true;
        if (ach.id === 'fast_16' && durationHours >= 16) unlocked = true;
        if (ach.id === 'fast_24' && durationHours >= 24) unlocked = true;
        if (ach.id === 'xp_1000' && newUserXP >= 1000) unlocked = true;
      }
      return unlocked !== ach.unlocked ? { ...ach, unlocked: true, dateUnlocked: Date.now() } : ach;
    });

    setState(prev => ({
      ...prev,
      activeSession: null,
      history: [completedSession, ...prev.history],
      achievements: updatedAchievements,
      user: { ...prev.user, currentXP: newUserXP, level: newLevel, streak: newStreak, lastFastingDate: endTime, nextLevelXP: newLevel * 100 + 100 }
    }));
    setShowFinishModal(false);
    playSound('success');
  };

  const toggleTheme = () => setState(prev => ({ ...prev, user: { ...prev.user, theme: prev.user.theme === 'light' ? 'dark' : 'light' } }));
  const toggleSpiritualMode = () => setState(prev => ({ ...prev, user: { ...prev.user, showSpiritualContent: !prev.user.showSpiritualContent } }));
  const toggleHealthStats = () => setState(prev => ({ ...prev, user: { ...prev.user, showHealthStats: !prev.user.showHealthStats } }));
  const toggleWaterNotifications = () => setState(prev => ({ ...prev, user: { ...prev.user, waterNotificationEnabled: !prev.user.waterNotificationEnabled } }));
  const updateWaterInterval = (e: React.ChangeEvent<HTMLSelectElement>) => setState(prev => ({ ...prev, user: { ...prev.user, waterNotificationInterval: parseInt(e.target.value) } }));
  const saveJournal = () => { if(state.activeSession) setState(prev => ({ ...prev, activeSession: prev.activeSession ? { ...prev.activeSession, notes: notesInput } : null })); setShowJournalModal(false); };
  const openJournal = () => { setNotesInput(state.activeSession?.notes || ''); setShowJournalModal(true); };
  
  const handleAddWater = () => {
      if(state.activeSession) {
          vibrate(30);
          playSound('water');
          setState(prev => ({
              ...prev,
              activeSession: prev.activeSession ? { ...prev.activeSession, waterCount: (prev.activeSession.waterCount || 0) + 1 } : null
          }));
      }
  };

  const handleRemoveWater = () => {
    if(state.activeSession && (state.activeSession.waterCount || 0) > 0) {
        vibrate(30);
        setState(prev => ({
            ...prev,
            activeSession: prev.activeSession ? { ...prev.activeSession, waterCount: (prev.activeSession.waterCount || 0) - 1 } : null
        }));
    }
};

  const handleSOSClick = () => {
      vibrate(50);
      setSosTimeLeft(60);
      setShowSOSModal(true);
      playSound('breathe');
  }

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (readerEvent) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_SIZE = 300; 
            let width = img.width; let height = img.height;
            if (width > height) { if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; } } 
            else { if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; } }
            canvas.width = width; canvas.height = height;
            const ctx = canvas.getContext('2d');
            if(ctx) {
                ctx.drawImage(img, 0, 0, width, height);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                setState(prev => ({ ...prev, user: { ...prev.user, photo: dataUrl } }));
            }
        };
        if(typeof readerEvent.target?.result === 'string') img.src = readerEvent.target.result;
    };
    reader.readAsDataURL(file);
  };

  const triggerFileInput = () => fileInputRef.current?.click();
  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
          try {
              const json = JSON.parse(event.target?.result as string);
              const sanitizedState = validateAndSanitizeImport(json);
              if (sanitizedState && window.confirm("Isso substituirá todos os seus dados atuais. Deseja continuar?")) {
                  setState(sanitizedState);
                  alert("Backup restaurado com sucesso!");
              } else alert("Arquivo inválido.");
          } catch (err) { alert("Erro ao ler o arquivo."); }
      };
      reader.readAsText(file);
      if(importInputRef.current) importInputRef.current.value = '';
  };

  const saveWeightEntry = () => {
      const currentWeight = state.user.weight;
      if (currentWeight > 0) {
          const newEntry = { date: Date.now(), weight: currentWeight };
          const history = [...(state.user.weightHistory || [])];
          const lastEntry = history[history.length - 1];
          const isToday = lastEntry && differenceInDays(Date.now(), lastEntry.date) === 0;
          if (isToday) history[history.length - 1] = newEntry; else history.push(newEntry);
          setState(prev => ({ ...prev, user: { ...prev.user, weightHistory: history } }));
          triggerConfetti();
          alert("Peso registrado!");
      }
  };

  const resetData = () => {
    if(window.confirm("Isso apagará todo o seu progresso.")){ localStorage.clear(); window.location.reload(); }
  };

  const getMoodIcon = (mood?: Mood) => {
      switch(mood) {
          case 'great': return <Smile className="text-green-500" />;
          case 'good': return <Smile className="text-blue-500" />;
          case 'neutral': return <Meh className="text-gray-500" />;
          case 'bad': return <Frown className="text-orange-500" />;
          case 'terrible': return <Frown className="text-red-500" />;
          default: return null;
      }
  }

  // History CRUD
  const startEditingHistory = (session?: FastingSession) => {
      if(session) {
          setEditingSession(session);
      } else {
          // New session defaults
          const now = Date.now();
          setEditingSession({
              id: '', // Empty ID marks new
              startTime: now - (16 * 3600 * 1000), // Default to 16h ago
              endTime: now,
              targetDurationHours: 16,
              mode: FastingType.F16,
              completed: true
          });
      }
      setShowHistoryEditModal(true);
  };

  const handleDeleteHistory = () => {
      if(!editingSession.id) return;
      if(window.confirm("Tem certeza que deseja excluir este registro?")) {
          setState(prev => ({
              ...prev,
              history: prev.history.filter(h => h.id !== editingSession.id)
          }));
          setShowHistoryEditModal(false);
      }
  };

  const handleSaveHistory = () => {
      if(!editingSession.startTime || !editingSession.endTime) return;
      
      const durationHours = differenceInSeconds(editingSession.endTime, editingSession.startTime) / 3600;
      const isCompleted = durationHours >= (editingSession.targetDurationHours || 0);

      const finalSession: FastingSession = {
          id: editingSession.id || crypto.randomUUID(),
          startTime: editingSession.startTime,
          endTime: editingSession.endTime,
          targetDurationHours: editingSession.targetDurationHours || 16,
          actualDurationHours: durationHours,
          completed: isCompleted,
          mode: editingSession.mode || FastingType.CUSTOM,
          intention: editingSession.intention,
          notes: editingSession.notes,
          mood: editingSession.mood,
          lastMeal: editingSession.lastMeal
      } as FastingSession;

      setState(prev => {
          const newHistory = editingSession.id 
              ? prev.history.map(h => h.id === finalSession.id ? finalSession : h)
              : [finalSession, ...prev.history];
          
          return {
              ...prev,
              history: newHistory.sort((a, b) => b.startTime - a.startTime)
          };
      });
      setShowHistoryEditModal(false);
  };

  // --- Render Sections ---

  const renderHome = () => {
    if (state.activeSession) {
      const targetTime = addHours(state.activeSession.startTime, state.activeSession.targetDurationHours);
      const secondsElapsed = differenceInSeconds(currentTime, state.activeSession.startTime);
      const hoursElapsed = secondsElapsed / 3600;
      const totalSecondsTarget = state.activeSession.targetDurationHours * 3600;
      const percentage = Math.min(100, Math.max(0, (secondsElapsed / totalSecondsTarget) * 100));
      const secondsRemaining = totalSecondsTarget - secondsElapsed;
      const progressColor = secondsRemaining < 0 ? "#10b981" : "#0ea5e9";
      
      const currentStage = getCurrentMetabolicStage(hoursElapsed);
      const waterCount = state.activeSession.waterCount || 0;

      return (
        <div className="flex flex-col items-center justify-between h-full pt-10 pb-24 px-6 overflow-y-auto no-scrollbar relative animate-fade-in">
          {/* Animated Background Blob */}
          <div className="absolute top-[-20%] left-[-20%] w-96 h-96 bg-brand-400/20 dark:bg-brand-500/10 rounded-full blur-3xl animate-blob -z-10 pointer-events-none"></div>

          <div className="text-center space-y-3 shrink-0 relative z-10">
            <span className="inline-flex items-center gap-1.5 px-4 py-1.5 glass rounded-full text-xs font-bold tracking-wide uppercase text-brand-700 dark:text-brand-300 shadow-sm backdrop-blur-md">
              <Clock size={12} className="animate-pulse" />
              {state.activeSession.mode === FastingType.CUSTOM ? `${state.activeSession.targetDurationHours}h` : state.activeSession.mode}
            </span>
          </div>

          <div className="my-8 shrink-0 relative">
            <div className="absolute inset-0 bg-brand-500/20 rounded-full blur-2xl animate-pulse-slow"></div>
            <CircleTimer
              percentage={percentage}
              label={formatTime(secondsRemaining)}
              subLabel={secondsRemaining > 0 ? "Restante" : "Tempo Extra"}
              color={progressColor}
            >
               <div className="flex flex-col items-center animate-breathe">
                    <span className={`text-5xl font-bold font-mono tracking-tighter drop-shadow-sm ${secondsRemaining < 0 ? 'text-green-500' : 'text-gray-800 dark:text-white'}`}>
                        {formatTime(secondsRemaining)}
                    </span>
                    <span className="text-sm font-medium text-gray-400 mt-2 uppercase tracking-wide">
                         {secondsRemaining > 0 ? "Para o fim" : "Tempo Extra"}
                    </span>
               </div>
            </CircleTimer>
          </div>

          <div className="w-full space-y-4 shrink-0 max-w-sm">
             {/* SOS BUTTON */}
             <button 
                onClick={handleSOSClick}
                className="w-full py-2 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform"
             >
                 <Wind size={16} /> SOS Fome
             </button>

             {/* Metabolic Stage Card */}
             <div className="glass-card p-4 rounded-2xl relative overflow-hidden group">
                 <div className={`absolute top-0 left-0 bottom-0 w-1 ${currentStage.bg.split(' ')[0]} bg-current opacity-50`}></div>
                 <div className="flex items-center gap-4 mb-2">
                     <div className={`p-2 rounded-full ${currentStage.bg} ${currentStage.color} shrink-0`}>
                         <currentStage.icon size={20} />
                     </div>
                     <div>
                         <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Fase Atual</p>
                         <p className="font-bold text-gray-800 dark:text-gray-100 leading-tight">{currentStage.title}</p>
                     </div>
                 </div>
                 <p className="text-xs text-gray-500 dark:text-gray-400 pl-1">{currentStage.desc}</p>
                 {/* Mini progress bar for stage */}
                 <div className="w-full h-1 bg-gray-100 dark:bg-gray-700 rounded-full mt-3 overflow-hidden">
                      <div className={`h-full ${currentStage.color.replace('text', 'bg')} opacity-60`} style={{ width: '60%' }}></div> 
                 </div>
             </div>

             {/* Interactive Water Tracker */}
             <div className="glass-card p-4 rounded-2xl flex items-center justify-between">
                 <div className="flex items-center gap-4">
                     <div className="bg-blue-100 dark:bg-blue-900/50 p-3 rounded-full relative">
                         <Droplet size={24} className="text-blue-500 fill-blue-500" />
                         {waterCount > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full shadow-sm">{waterCount}</span>}
                     </div>
                     <div>
                         <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm">Água (250ml)</p>
                         <p className="text-xs text-gray-500 dark:text-gray-400">
                             {waterCount * 0.25}L bebidos
                         </p>
                     </div>
                 </div>
                 <div className="flex items-center gap-2">
                    {waterCount > 0 && (
                        <button onClick={handleRemoveWater} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500 hover:bg-gray-200 active:scale-95 transition-colors">
                            <Minus size={16} />
                        </button>
                    )}
                    <button onClick={handleAddWater} className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-lg shadow-blue-500/30 active:scale-90 transition-all hover:bg-blue-600">
                        <Plus size={20} />
                    </button>
                 </div>
             </div>

            <button
              onClick={handleStopFastClick}
              className="w-full py-4 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white font-bold rounded-2xl shadow-lg shadow-red-500/30 transition-all transform active:scale-95 flex items-center justify-center gap-2"
            >
              <X size={20} strokeWidth={3} />
              Finalizar Agora
            </button>
          </div>
        </div>
      );
    }

    // Not fasting
    return (
      <div className="flex flex-col h-full pt-8 pb-24 px-6 overflow-y-auto no-scrollbar animate-slide-up relative">
         <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl -z-10 pointer-events-none"></div>
         <div className="absolute bottom-20 left-0 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl -z-10 pointer-events-none"></div>

        <header className="flex justify-between items-center mb-8 shrink-0">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Olá, {state.user.name.split(' ')[0] || 'Jejumador'}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Vamos superar metas hoje?</p>
          </div>
          <div className="flex items-center gap-2 glass px-3 py-1.5 rounded-full shadow-sm">
             <Flame size={18} className="text-orange-500 fill-orange-500 animate-pulse" />
             <span className="font-bold text-gray-800 dark:text-white">{state.user.streak}</span>
          </div>
        </header>

        <div className={`rounded-3xl p-6 text-white shadow-xl shadow-brand-500/20 mb-8 relative overflow-hidden shrink-0 transition-all duration-500 bg-gradient-to-br ${state.user.showSpiritualContent ? 'from-purple-600 to-indigo-600' : 'from-brand-500 to-blue-600'}`}>
             <div className="absolute top-0 right-0 p-4 opacity-10">
                {state.user.showSpiritualContent ? <BookOpen size={100} /> : <Award size={100} />}
             </div>
             <div className="relative z-10">
                 <div className="flex justify-between items-end mb-2">
                     <span className="text-white/90 text-sm font-semibold uppercase tracking-wider">Nível {state.user.level}</span>
                     <span className="text-2xl font-bold">{state.user.currentXP} XP</span>
                 </div>
                 <div className="bg-black/20 rounded-full h-3 w-full overflow-hidden backdrop-blur-sm">
                     <div className="bg-white h-full rounded-full transition-all duration-1000 ease-out relative overflow-hidden" style={{ width: `${Math.min(100, (state.user.currentXP % 1000) / 10)}%` }}>
                        <div className="absolute inset-0 bg-white/30 animate-[shimmer_2s_infinite]"></div>
                     </div>
                 </div>
                 <p className="text-xs text-white/70 mt-2 text-right">Próximo nível em {1000 - (state.user.currentXP % 1000)} XP</p>
             </div>
        </div>

        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 shrink-0 flex items-center gap-2">
            <Clock size={18} className="text-brand-500" /> Escolha seu Jejum
        </h3>
        
        <div className="grid grid-cols-2 gap-3 mb-6 shrink-0">
          {FASTING_MODES.map((mode) => (
            <button
              key={mode.id}
              onClick={() => initiateFastStart(mode.hours, mode.type)}
              className={`${mode.color} p-4 rounded-2xl text-left transition-all active:scale-95 border-0 shadow-sm hover:shadow-md flex flex-col justify-between h-32 relative overflow-hidden group`}
            >
              <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                  <Clock size={60} />
              </div>
              <div className="flex justify-between items-start w-full relative z-10">
                <span className="font-bold text-xl">{mode.label}</span>
                {mode.difficulty === 'Iniciante' && <span className="text-[10px] bg-white/60 backdrop-blur-sm px-2 py-0.5 rounded-full font-bold">Fácil</span>}
              </div>
              <div className="relative z-10">
                <span className="text-sm opacity-90 font-medium block">{mode.hours} horas</span>
                <span className="text-[10px] opacity-75 leading-tight block mt-1 line-clamp-2">{mode.description}</span>
              </div>
            </button>
          ))}
           <button
              onClick={() => { vibrate(50); setShowCustomModal(true); }}
              className="bg-gray-100 dark:bg-gray-800/80 dark:text-white p-4 rounded-2xl text-left transition-all active:scale-95 shadow-sm hover:shadow-md flex flex-col justify-between h-32 border border-dashed border-gray-300 dark:border-gray-600"
            >
               <div className="flex justify-between items-start w-full">
                <span className="font-bold text-xl">Personalizar</span>
                <Settings size={20} className="opacity-50" />
              </div>
               <div>
                <span className="text-sm opacity-80 block font-medium">Do seu jeito</span>
                <span className="text-[10px] opacity-60 leading-tight block mt-1">Defina o tempo</span>
              </div>
            </button>
        </div>

         {state.user.lastFastingDate && (
             <div className="glass-card p-4 rounded-2xl flex items-center justify-between shrink-0 mb-4">
                <div className="flex items-center gap-3">
                    <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded-full">
                        <HistoryIcon className="text-gray-500" size={18} />
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 uppercase font-semibold">Último Jejum</p>
                        <p className="font-bold text-gray-800 dark:text-gray-200">
                            {format(state.user.lastFastingDate, "d 'de' MMMM", { locale: ptBR })}
                        </p>
                    </div>
                </div>
             </div>
         )}
      </div>
    );
  };

  const renderHistory = () => {
    const data = state.history.slice(0, 7).reverse().map(session => ({
        name: format(session.startTime, 'dd/MM'),
        hours: session.actualDurationHours ? parseFloat(session.actualDurationHours.toFixed(1)) : 0,
        target: session.targetDurationHours
    }));
    const totalFasts = state.history.length;
    const totalHours = state.history.reduce((acc, curr) => acc + (curr.actualDurationHours || 0), 0);
    const avgHours = totalFasts > 0 ? (totalHours / totalFasts).toFixed(1) : "0";

    return (
      <div className="flex flex-col h-full pt-8 pb-24 px-6 overflow-y-auto no-scrollbar animate-slide-up relative">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 shrink-0">Seu Progresso</h2>
        <div className="grid grid-cols-2 gap-4 mb-8 shrink-0">
            <div className="glass-card p-5 rounded-3xl">
                <p className="text-gray-500 dark:text-gray-400 text-xs uppercase font-bold mb-1">Total</p>
                <p className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-brand-500 to-blue-600">{totalFasts}</p>
                <p className="text-xs text-gray-400">Jejuns feitos</p>
            </div>
             <div className="glass-card p-5 rounded-3xl">
                <p className="text-gray-500 dark:text-gray-400 text-xs uppercase font-bold mb-1">Média</p>
                <p className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-500">{avgHours}h</p>
                <p className="text-xs text-gray-400">Por jejum</p>
            </div>
        </div>
        <div className="h-64 w-full mb-8 glass-card p-4 rounded-3xl shrink-0">
            <h3 className="text-sm font-semibold mb-4 text-gray-700 dark:text-gray-300">Resumo Semanal</h3>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
                    <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} stroke="#9ca3af" />
                    <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '12px', border: 'none', background: 'rgba(0,0,0,0.8)', color: '#fff' }} />
                    <Bar dataKey="hours" radius={[6, 6, 6, 6]}>
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.hours >= entry.target ? '#0ea5e9' : '#94a3b8'} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
        <div className="flex justify-between items-center mb-4 shrink-0">
             <h3 className="text-lg font-bold text-gray-800 dark:text-white">Histórico</h3>
        </div>
        
        <div className="space-y-3 shrink-0 pb-20">
            {state.history.length === 0 && <p className="text-gray-400 text-center py-8 italic">Comece seu primeiro jejum hoje!</p>}
            {state.history.map(session => (
                <div key={session.id} className="glass-card p-4 rounded-2xl flex flex-col group relative">
                    <button 
                        onClick={() => startEditingHistory(session)} 
                        className="absolute top-2 right-2 p-2 text-gray-400 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900 rounded-full opacity-0 group-hover:opacity-100 transition-all"
                    >
                        <Edit2 size={16} />
                    </button>

                    <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-3">
                            <div className={`w-1.5 h-10 rounded-full ${session.completed ? 'bg-green-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-yellow-500'}`}></div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <p className="font-bold text-gray-800 dark:text-white">{session.mode}</p>
                                    {session.intention && <Book size={14} className="text-purple-500"/>}
                                    {getMoodIcon(session.mood)}
                                </div>
                                <p className="text-xs text-gray-500">{format(session.startTime, "d MMM, HH:mm", { locale: ptBR })}</p>
                            </div>
                        </div>
                        <div className="text-right mr-8">
                            <p className="font-bold text-gray-800 dark:text-gray-200">{session.actualDurationHours?.toFixed(1)}h</p>
                            <span className="text-[10px] bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full text-gray-500">Meta: {session.targetDurationHours}h</span>
                        </div>
                    </div>
                </div>
            ))}
        </div>

        {/* Floating Add Button */}
        <button 
            onClick={() => startEditingHistory()} 
            className="fixed bottom-24 right-6 w-14 h-14 bg-brand-600 hover:bg-brand-700 text-white rounded-full shadow-xl flex items-center justify-center transition-transform active:scale-90 z-20"
        >
            <Plus size={28} />
        </button>
      </div>
    );
  };

  const renderAwards = () => {
      const earnedCount = state.achievements.filter(a => a.unlocked).length;
      return (
        <div className="flex flex-col h-full pt-8 pb-24 px-6 overflow-y-auto no-scrollbar animate-slide-up">
            <header className="mb-6 shrink-0 text-center">
                <div className="inline-block p-4 bg-yellow-100 dark:bg-yellow-900/30 rounded-full mb-4">
                    <Award size={40} className="text-yellow-600 dark:text-yellow-500" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Suas Conquistas</h2>
                <p className="text-sm text-gray-500">{earnedCount} de {state.achievements.length} desbloqueadas</p>
            </header>
            <div className="grid grid-cols-2 gap-4 shrink-0">
                {state.achievements.map(ach => (
                    <div key={ach.id} className={`p-5 rounded-3xl border flex flex-col items-center text-center gap-3 transition-all duration-300 ${ach.unlocked ? 'bg-gradient-to-br from-white to-yellow-50 dark:from-gray-800 dark:to-gray-900 border-yellow-200 dark:border-yellow-900/50 shadow-lg shadow-yellow-500/10 scale-100' : 'bg-gray-50 dark:bg-gray-900 border-gray-100 dark:border-gray-800 opacity-60 grayscale scale-95'}`}>
                        <div className="text-5xl mb-1 drop-shadow-sm">{ach.icon}</div>
                        <div>
                            <h3 className="font-bold text-sm text-gray-800 dark:text-gray-200">{ach.title}</h3>
                            <p className="text-xs text-gray-500 line-clamp-2 mt-1 leading-tight">{ach.description}</p>
                        </div>
                        {ach.unlocked && ach.dateUnlocked && (
                            <span className="text-[10px] text-yellow-700 dark:text-yellow-500 font-bold bg-yellow-100 dark:bg-yellow-900/40 px-2 py-0.5 rounded-full mt-1">
                                {format(ach.dateUnlocked, 'dd/MM')}
                            </span>
                        )}
                    </div>
                ))}
            </div>
        </div>
      );
  };

  const renderLearn = () => {
      const stages = [
          { time: '4-8h', title: 'Queda de Açúcar', desc: 'O açúcar no sangue cai. Toda comida foi digerida.', icon: Activity, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30' },
          { time: '12h', title: 'Queima de Gordura', desc: 'O corpo começa a buscar gordura como energia. HGH aumenta.', icon: Flame, color: 'text-orange-500', bg: 'bg-orange-100 dark:bg-orange-900/30' },
          { time: '16h', title: 'Cetose Inicial', desc: 'A queima de gordura acelera. Clareza mental.', icon: Zap, color: 'text-yellow-500', bg: 'bg-yellow-100 dark:bg-yellow-900/30' },
          { time: '24h', title: 'Autofagia', desc: 'Limpeza celular. Reciclagem de células.', icon: Battery, color: 'text-green-500', bg: 'bg-green-100 dark:bg-green-900/30' },
          { time: '48h', title: 'Pico de HGH', desc: 'Hormônio do crescimento máximo. Reparo acelerado.', icon: Heart, color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900/30' },
          { time: '72h', title: 'Imunidade', desc: 'Regeneração profunda do sistema imunológico.', icon: Brain, color: 'text-purple-500', bg: 'bg-purple-100 dark:bg-purple-900/30' },
      ];

      return (
        <div className="flex flex-col h-full pt-8 pb-24 px-6 overflow-y-auto no-scrollbar animate-slide-up">
            <header className="mb-8 shrink-0">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Jornada do Corpo</h2>
                <p className="text-sm text-gray-500">O que acontece hora a hora?</p>
            </header>
            <div className="space-y-6 relative ml-2">
                <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-gradient-to-b from-gray-200 via-brand-200 to-gray-200 dark:from-gray-800 dark:via-brand-900 dark:to-gray-800"></div>
                {stages.map((stage, idx) => (
                    <div key={idx} className="relative pl-12 group">
                        <div className={`absolute left-0 top-0 w-8 h-8 rounded-full ${stage.bg} flex items-center justify-center border-4 border-gray-50 dark:border-gray-900 z-10 shadow-sm group-hover:scale-110 transition-transform`}>
                            <stage.icon size={14} className={stage.color} />
                        </div>
                        <div className="glass-card p-4 rounded-2xl transition-all hover:translate-x-1">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${stage.bg} ${stage.color} mb-2 inline-block`}>{stage.time}</span>
                            <h3 className="font-bold text-gray-800 dark:text-gray-200 mb-1">{stage.title}</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{stage.desc}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      );
  };

  const renderProfile = () => {
    const weightData = (state.user.weightHistory || []).slice(-10).map(entry => ({ date: format(entry.date, 'dd/MM'), weight: entry.weight }));
    const bmi = calculateBMI(state.user.weight, state.user.height);
    
    // Weight Goal Logic
    const currentWeight = state.user.weight || 0;
    const targetWeight = state.user.targetWeight || 0;
    const startWeight = state.user.weightHistory?.[0]?.weight || currentWeight;
    
    // Progress Calculation (Assuming weight loss)
    // If target > current (weight gain), we flip the logic
    const isWeightLoss = startWeight > targetWeight;
    let progress = 0;
    if (targetWeight > 0 && startWeight > 0) {
        if (isWeightLoss) {
            progress = Math.max(0, Math.min(100, ((startWeight - currentWeight) / (startWeight - targetWeight)) * 100));
        } else {
             progress = Math.max(0, Math.min(100, ((currentWeight - startWeight) / (targetWeight - startWeight)) * 100));
        }
    }

    return (
      <div className="flex flex-col h-full pt-8 pb-24 px-6 overflow-y-auto no-scrollbar animate-slide-up">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 shrink-0">Seu Perfil</h2>
        <div className="glass-card rounded-3xl p-6 mb-6 shrink-0">
            <div className="flex items-center gap-5 mb-6">
                <div className="relative group cursor-pointer" onClick={triggerFileInput}>
                    <div className="w-24 h-24 bg-brand-100 dark:bg-brand-900 rounded-full flex items-center justify-center text-brand-600 dark:text-brand-300 text-4xl font-bold overflow-hidden border-4 border-white dark:border-gray-700 shadow-lg group-hover:scale-105 transition-transform">
                        {state.user.photo ? <img src={state.user.photo} alt="Perfil" className="w-full h-full object-cover" /> : state.user.name.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div className="absolute bottom-0 right-0 bg-brand-600 text-white p-2 rounded-full shadow-md border-2 border-white dark:border-gray-800">
                        <Camera size={14} />
                    </div>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                </div>
                <div className="flex-1">
                    <input 
                        type="text" 
                        value={state.user.name}
                        onChange={(e) => setState({...state, user: {...state.user, name: e.target.value}})}
                        placeholder="Seu Nome"
                        className="w-full bg-transparent text-2xl font-bold text-gray-900 dark:text-white border-b border-transparent focus:border-brand-500 focus:outline-none transition-colors placeholder-gray-300"
                    />
                    <p className="text-sm text-gray-500 font-medium mt-1">Nível {state.user.level} • {state.user.currentXP} XP</p>
                </div>
            </div>

            {state.user.showHealthStats && (
                <div className="animate-fade-in space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-2xl">
                            <label className="text-[10px] text-gray-500 uppercase block mb-1 font-bold">Peso Atual (kg)</label>
                            <div className="flex items-center justify-between">
                                <button onClick={() => { vibrate(20); setState(s => ({...s, user: {...s.user, weight: Math.max(0, (s.user.weight || 0) - 0.5)}}))}} className="w-8 h-8 rounded-full bg-white dark:bg-gray-700 shadow flex items-center justify-center text-gray-500">-</button>
                                <input type="number" value={state.user.weight || ''} onChange={(e) => setState({...state, user: {...state.user, weight: parseFloat(e.target.value)}})} className="w-12 bg-transparent text-center font-bold text-lg outline-none" placeholder="0" />
                                <button onClick={() => { vibrate(20); setState(s => ({...s, user: {...s.user, weight: (s.user.weight || 0) + 0.5}}))}} className="w-8 h-8 rounded-full bg-white dark:bg-gray-700 shadow flex items-center justify-center text-gray-500">+</button>
                            </div>
                        </div>
                         <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-2xl">
                            <label className="text-[10px] text-gray-500 uppercase block mb-1 font-bold">Meta (kg)</label>
                             <div className="flex items-center gap-2">
                                <Target size={16} className="text-brand-500" />
                                <input type="number" value={state.user.targetWeight || ''} onChange={(e) => setState({...state, user: {...state.user, targetWeight: parseFloat(e.target.value)}})} className="w-full bg-transparent font-bold text-lg outline-none h-8" placeholder="Ex: 70" />
                             </div>
                        </div>
                    </div>

                    {/* Weight Goal Progress Bar */}
                    {targetWeight > 0 && currentWeight > 0 && (
                        <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl relative overflow-hidden">
                             <div className="flex justify-between text-xs font-bold text-gray-500 uppercase mb-2 relative z-10">
                                 <span>Início: {startWeight}kg</span>
                                 <span>Meta: {targetWeight}kg</span>
                             </div>
                             <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden relative z-10">
                                 <div 
                                    className="h-full bg-gradient-to-r from-brand-400 to-purple-500 transition-all duration-1000 ease-out"
                                    style={{ width: `${progress}%` }}
                                 ></div>
                             </div>
                             <p className="text-center text-xs text-gray-400 mt-2 font-medium">
                                 {progress.toFixed(1)}% do objetivo alcançado
                             </p>
                        </div>
                    )}

                    <div className="flex items-center gap-2">
                        <button onClick={saveWeightEntry} className="flex-1 py-3 bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 rounded-xl text-sm font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform"><Scale size={16} /> Registrar Peso</button>
                    </div>

                    {state.user.weight > 0 && state.user.height > 0 && (
                        <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                            <div><p className="text-xs text-gray-500 uppercase font-bold">IMC</p><p className={`text-xl font-black ${bmi.color}`}>{bmi.value}</p></div>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${bmi.color} bg-white dark:bg-gray-700 shadow-sm`}>{bmi.label}</span>
                        </div>
                    )}
                    <div className="h-40 w-full mt-4 bg-white dark:bg-gray-800 p-2 rounded-2xl border border-gray-100 dark:border-gray-700">
                        {weightData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={weightData}>
                                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', background: '#333', color: '#fff' }} />
                                    <Line type="monotone" dataKey="weight" stroke="#0ea5e9" strokeWidth={3} dot={{r: 4, fill: '#0ea5e9'}} />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : <div className="h-full flex items-center justify-center text-xs text-gray-400">Sem dados</div>}
                    </div>
                </div>
            )}
        </div>

        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 shrink-0">Ajustes</h3>
        <div className="space-y-3 shrink-0 mb-6">
             {installPrompt && (
                <button onClick={handleInstallClick} className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-brand-600 to-brand-400 rounded-2xl shadow-lg text-white animate-pulse">
                    <div className="flex items-center gap-3"><Smartphone size={20} /><div className="text-left"><span className="block font-bold">Instalar App</span><span className="text-[10px]">Melhor experiência</span></div></div><Download size={20} />
                </button>
             )}
             <div className="glass-card rounded-2xl overflow-hidden divide-y divide-gray-100 dark:divide-gray-700">
                <button onClick={() => { vibrate(20); toggleTheme(); }} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <div className="flex items-center gap-3">{state.user.theme === 'dark' ? <Moon size={18} className="text-purple-500"/> : <Sun size={18} className="text-orange-500"/>}<span className="font-medium text-sm">Tema Escuro</span></div>
                    <div className={`w-10 h-6 rounded-full p-1 transition-colors ${state.user.theme === 'dark' ? 'bg-purple-500' : 'bg-gray-200 dark:bg-gray-700'}`}><div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${state.user.theme === 'dark' ? 'translate-x-4' : 'translate-x-0'}`} /></div>
                </button>
                <button onClick={() => { vibrate(20); toggleSpiritualMode(); }} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <div className="flex items-center gap-3"><Book size={18} className={state.user.showSpiritualContent ? "text-purple-500" : "text-gray-400"}/><span className="font-medium text-sm">Modo Espiritual</span></div>
                    <div className={`w-10 h-6 rounded-full p-1 transition-colors ${state.user.showSpiritualContent ? 'bg-purple-500' : 'bg-gray-200 dark:bg-gray-700'}`}><div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${state.user.showSpiritualContent ? 'translate-x-4' : 'translate-x-0'}`} /></div>
                </button>
                <button onClick={() => { vibrate(20); toggleHealthStats(); }} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <div className="flex items-center gap-3"><Activity size={18} className={state.user.showHealthStats ? "text-green-500" : "text-gray-400"}/><span className="font-medium text-sm">Saúde & Peso</span></div>
                    <div className={`w-10 h-6 rounded-full p-1 transition-colors ${state.user.showHealthStats ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'}`}><div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${state.user.showHealthStats ? 'translate-x-4' : 'translate-x-0'}`} /></div>
                </button>
                <button onClick={() => { vibrate(20); toggleWaterNotifications(); }} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                     <div className="flex items-center gap-3"><Droplet size={18} className={state.user.waterNotificationEnabled ? "text-blue-500" : "text-gray-400"}/><span className="font-medium text-sm">Lembrete Água</span></div>
                     <div className={`w-10 h-6 rounded-full p-1 transition-colors ${state.user.waterNotificationEnabled ? 'bg-blue-500' : 'bg-gray-200 dark:bg-gray-700'}`}><div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${state.user.waterNotificationEnabled ? 'translate-x-4' : 'translate-x-0'}`} /></div>
                </button>
             </div>
             
             {state.user.waterNotificationEnabled && (
                 <div className="glass-card p-4 rounded-2xl flex items-center gap-3 animate-slide-up">
                     <Clock size={18} className="text-gray-400" />
                     <select value={state.user.waterNotificationInterval} onChange={updateWaterInterval} className="bg-transparent text-sm font-medium w-full outline-none">
                         <option value={30}>A cada 30 minutos</option>
                         <option value={60}>A cada 1 hora</option>
                         <option value={120}>A cada 2 horas</option>
                     </select>
                 </div>
             )}

             <div className="grid grid-cols-2 gap-3">
                 <button onClick={() => exportData(state)} className="glass-card p-4 rounded-2xl flex flex-col items-center justify-center gap-2 active:scale-95 transition-transform"><Upload size={20} className="text-blue-500"/><span className="text-xs font-bold">Backup</span></button>
                 <button onClick={() => importInputRef.current?.click()} className="glass-card p-4 rounded-2xl flex flex-col items-center justify-center gap-2 active:scale-95 transition-transform"><TrendingDown size={20} className="text-green-500 rotate-180"/><span className="text-xs font-bold">Restaurar</span><input type="file" ref={importInputRef} className="hidden" accept=".json" onChange={handleImportData}/></button>
             </div>
             <button onClick={resetData} className="w-full p-4 glass-card rounded-2xl text-red-500 font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform"><Settings size={18}/> Resetar App</button>
        </div>
        <div className="text-center text-[10px] text-gray-400 shrink-0 pb-4">v1.3.0 • Premium Local Experience</div>
      </div>
    );
  };

  return (
    <HashRouter>
      <div className="fixed inset-0 w-full h-[100dvh] bg-gray-50 dark:bg-gray-950 overflow-hidden font-sans flex justify-center selection:bg-brand-500 selection:text-white">
        <main className="w-full max-w-md h-full relative bg-gray-50 dark:bg-gray-950 shadow-2xl overflow-hidden flex flex-col">
          <div className="flex-1 w-full h-full relative overflow-hidden">
            {activeTab === 'home' && renderHome()}
            {activeTab === 'learn' && renderLearn()}
            {activeTab === 'history' && renderHistory()}
            {activeTab === 'profile' && renderProfile()}
            {activeTab === 'awards' && renderAwards()}
          </div>
          <Navbar activeTab={activeTab} onTabChange={(t) => { vibrate(20); setActiveTab(t); }} />
          
          {/* Modals with Glassmorphism and Animations */}
          {showCustomModal && (
              <div className="absolute inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end justify-center sm:items-center animate-fade-in">
                  <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl w-full max-w-md rounded-t-3xl sm:rounded-3xl p-8 shadow-2xl animate-slide-up border-t border-white/20">
                      <div className="flex justify-between items-center mb-8">
                          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Tempo Personalizado</h3>
                          <button onClick={() => setShowCustomModal(false)} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full hover:rotate-90 transition-transform"><X size={24} /></button>
                      </div>
                      <div className="mb-10 text-center">
                          <div className="flex items-center justify-center gap-6 mb-8">
                              <button onClick={() => { vibrate(20); setCustomHours(Math.max(1, customHours - 1)); }} className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 text-2xl font-bold flex items-center justify-center shadow-sm active:scale-90 transition-transform">-</button>
                              <div><span className="text-6xl font-black text-brand-600 dark:text-brand-400 tracking-tighter">{customHours}</span><span className="text-xl text-gray-400 font-medium ml-1">h</span></div>
                              <button onClick={() => { vibrate(20); setCustomHours(Math.min(72, customHours + 1)); }} className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 text-2xl font-bold flex items-center justify-center shadow-sm active:scale-90 transition-transform">+</button>
                          </div>
                          <input type="range" min="1" max="72" value={customHours} onChange={(e) => setCustomHours(parseInt(e.target.value))} className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-brand-500" />
                      </div>
                      <button onClick={() => initiateFastStart(customHours, FastingType.CUSTOM)} className="w-full py-4 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-2xl shadow-lg shadow-brand-500/30 transition-all active:scale-95">Começar Agora</button>
                  </div>
              </div>
          )}

          {showHistoryEditModal && (
              <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center sm:items-center animate-fade-in">
                  <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl animate-slide-up border-t border-white/20 h-[80vh] overflow-y-auto">
                       <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                                {editingSession.id ? 'Editar Registro' : 'Novo Registro'}
                            </h3>
                            <button onClick={() => setShowHistoryEditModal(false)} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full"><X size={20}/></button>
                       </div>

                       <div className="space-y-4">
                           <div>
                               <label className="text-xs font-bold text-gray-500 uppercase">Início</label>
                               <input 
                                type="datetime-local" 
                                className="w-full p-3 bg-gray-100 dark:bg-gray-800 rounded-xl mt-1 text-gray-800 dark:text-white"
                                value={editingSession.startTime ? formatDateForInput(editingSession.startTime) : ''}
                                onChange={(e) => setEditingSession({...editingSession, startTime: new Date(e.target.value).getTime()})}
                               />
                           </div>
                           <div>
                               <label className="text-xs font-bold text-gray-500 uppercase">Fim</label>
                               <input 
                                type="datetime-local" 
                                className="w-full p-3 bg-gray-100 dark:bg-gray-800 rounded-xl mt-1 text-gray-800 dark:text-white"
                                value={editingSession.endTime ? formatDateForInput(editingSession.endTime) : ''}
                                onChange={(e) => setEditingSession({...editingSession, endTime: new Date(e.target.value).getTime()})}
                               />
                           </div>
                           <div>
                               <label className="text-xs font-bold text-gray-500 uppercase">Meta (horas)</label>
                               <input 
                                type="number" 
                                className="w-full p-3 bg-gray-100 dark:bg-gray-800 rounded-xl mt-1 text-gray-800 dark:text-white"
                                value={editingSession.targetDurationHours || 16}
                                onChange={(e) => setEditingSession({...editingSession, targetDurationHours: parseFloat(e.target.value)})}
                               />
                           </div>
                       </div>

                       <div className="flex gap-3 mt-8">
                           {editingSession.id && (
                               <button onClick={handleDeleteHistory} className="flex-1 py-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-bold rounded-xl flex items-center justify-center gap-2">
                                   <Trash2 size={18} /> Excluir
                               </button>
                           )}
                           <button onClick={handleSaveHistory} className="flex-[2] py-3 bg-brand-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-brand-500/30">
                               <Save size={18} /> Salvar
                           </button>
                       </div>
                  </div>
              </div>
          )}

          {showIntentionModal && pendingFastMode && (
               <div className="absolute inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end justify-center sm:items-center animate-fade-in">
                  <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl w-full max-w-md rounded-t-3xl sm:rounded-3xl p-8 shadow-2xl animate-slide-up border-t border-white/20">
                      <div className="flex justify-between items-center mb-6">
                          <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2"><Sparkles className="text-purple-500" /> Propósito</h3>
                          <button onClick={() => setShowIntentionModal(false)} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full"><X size={20}/></button>
                      </div>
                      <textarea className="w-full h-32 p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border-0 focus:ring-2 focus:ring-purple-500 outline-none resize-none text-gray-900 dark:text-white mb-6 text-lg" placeholder="Qual é sua intenção hoje?" value={intentionInput} onChange={(e) => setIntentionInput(e.target.value)} autoFocus />
                      <button onClick={() => completeFastStart(pendingFastMode.hours, pendingFastMode.type, intentionInput)} className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-2xl shadow-lg shadow-purple-500/30 transition-all active:scale-95">Consagrar Jejum</button>
                  </div>
               </div>
          )}

          {showJournalModal && (
               <div className="absolute inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end justify-center sm:items-center animate-fade-in">
                  <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl w-full max-w-md h-[85vh] sm:h-auto rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl animate-slide-up flex flex-col border-t border-white/20">
                      <div className="flex justify-between items-center mb-4 shrink-0">
                          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Diário / Oração</h3>
                          <button onClick={() => setShowJournalModal(false)} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full"><X size={20}/></button>
                      </div>
                      <div className="flex-1 mb-4 min-h-0">
                          <textarea className="w-full h-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border-0 focus:ring-2 focus:ring-purple-500 outline-none resize-none text-gray-900 dark:text-white text-base leading-relaxed" placeholder="Escreva seus pensamentos..." value={notesInput} onChange={(e) => setNotesInput(e.target.value)} />
                      </div>
                      <button onClick={saveJournal} className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-2xl shadow-lg shadow-purple-500/30 transition-all shrink-0 active:scale-95">Salvar</button>
                  </div>
               </div>
          )}

          {showFinishModal && (
              <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center sm:items-center animate-fade-in">
                  <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl animate-slide-up border-t border-white/20">
                       <h3 className="text-2xl font-bold text-center mb-6 text-gray-900 dark:text-white">Parabéns! Fim do Jejum</h3>
                       
                       <p className="text-sm font-bold text-gray-500 uppercase mb-3 text-center">Como você se sente?</p>
                       <div className="flex justify-between mb-8 px-2">
                           {['terrible', 'bad', 'neutral', 'good', 'great'].map((m) => (
                               <button 
                                key={m} 
                                onClick={() => { vibrate(20); setFinishMood(m as Mood); }}
                                className={`flex flex-col items-center gap-2 transition-transform active:scale-90 ${finishMood === m ? 'scale-110' : 'opacity-50 grayscale'}`}
                               >
                                   <div className="text-3xl">{getMoodIcon(m as Mood)}</div>
                               </button>
                           ))}
                       </div>

                       <div className="mb-8">
                           <p className="text-sm font-bold text-gray-500 uppercase mb-2">Primeira Refeição</p>
                           <div className="flex items-center gap-3 bg-gray-100 dark:bg-gray-800/80 p-3 rounded-2xl">
                               <Utensils className="text-gray-400" size={20} />
                               <input 
                                type="text" 
                                placeholder="O que você comeu?" 
                                className="bg-transparent w-full outline-none text-gray-800 dark:text-white font-medium"
                                value={finishMeal}
                                onChange={(e) => setFinishMeal(e.target.value)}
                               />
                           </div>
                       </div>

                       <button onClick={confirmStopFast} className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-2xl shadow-lg shadow-green-500/30 transition-all active:scale-95">
                           Registrar Conquista
                       </button>
                  </div>
              </div>
          )}

          {showSOSModal && (
             <div className="absolute inset-0 z-50 bg-brand-900/90 backdrop-blur-md flex flex-col items-center justify-center animate-fade-in p-6">
                 <button onClick={() => setShowSOSModal(false)} className="absolute top-6 right-6 p-2 bg-white/10 rounded-full text-white"><X size={24}/></button>
                 
                 <h2 className="text-3xl font-bold text-white mb-2">Respire</h2>
                 <p className="text-brand-200 mb-12 text-center">A vontade de comer vai passar em breve.</p>

                 <div className="relative flex items-center justify-center mb-16">
                     <div className={`w-64 h-64 bg-white/10 rounded-full absolute transition-all duration-[4000ms] ease-in-out ${sosPhase === 'inhale' ? 'scale-150 opacity-20' : sosPhase === 'hold' ? 'scale-150 opacity-20' : 'scale-100 opacity-5'}`}></div>
                     <div className={`w-48 h-48 bg-white/20 rounded-full absolute transition-all duration-[4000ms] ease-in-out ${sosPhase === 'inhale' ? 'scale-125 opacity-30' : sosPhase === 'hold' ? 'scale-125 opacity-30' : 'scale-100 opacity-10'}`}></div>
                     <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(255,255,255,0.3)] z-10">
                         <span className="text-brand-900 font-bold text-xl uppercase tracking-widest">
                             {sosPhase === 'inhale' ? 'Inspire' : sosPhase === 'hold' ? 'Segure' : 'Expire'}
                         </span>
                     </div>
                 </div>

                 <div className="text-center">
                     <p className="text-6xl font-mono font-bold text-white mb-2">{sosTimeLeft}</p>
                     <p className="text-sm text-brand-200 uppercase tracking-widest">Segundos restantes</p>
                 </div>
             </div>
          )}
        </main>
      </div>
    </HashRouter>
  );
};

export default App;
