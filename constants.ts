
import { Achievement, Difficulty, FastingMode, FastingType } from './types';
import { Activity, Flame, Zap, Battery, Heart, Brain, Sparkles } from 'lucide-react';

export const LEVEL_BASE_XP = 100;
export const XP_PER_HOUR = 10;
export const XP_BONUS_COMPLETION = 50;

export const MOTIVATIONAL_QUOTES = [
  "Seu corpo é capaz de muito, seu cérebro precisa acreditar.",
  "Disciplina constrói liberdade.",
  "Cada jejum concluído é uma vitória sobre sua versão de ontem.",
  "O segredo do futuro está escondido na sua rotina diária.",
  "Não pare quando estiver cansado, pare quando tiver terminado.",
  "A dor é temporária, a glória é eterna.",
  "Comer é uma necessidade, jejuar é uma arte.",
  "Sua saúde é o seu maior investimento.",
  "Foco no progresso, não na perfeição.",
  "Você é mais forte do que sua vontade de comer.",
  "Transformação requer paciência e persistência.",
  "O corpo cura a si mesmo quando damos uma pausa.",
  "Controle sua mente e conquistará seu corpo.",
  "Pequenos progressos diários somam grandes resultados.",
  "Hoje é um ótimo dia para começar.",
  "Jejum não é passar fome, é dar um tempo.",
  "A melhor versão de você está te esperando.",
  "Respeite seu corpo.",
  "A fome é uma onda, ela vem e passa.",
  "Sinta a clareza mental.",
  "Desafie seus limites.",
  "Se fosse fácil, todo mundo faria.",
  "Você está no controle.",
  "Autodisciplina é amor próprio.",
  "Um dia de cada vez.",
  "Respire fundo e continue.",
  "Beba água e mantenha o foco.",
  "Seus objetivos estão mais perto do que imagina.",
  "Não negocie com a preguiça.",
  "A consistência é a chave.",
  "Você consegue fazer coisas difíceis.",
  "O desconforto traz crescimento.",
  "Limpe seu corpo, limpe sua mente.",
  "Seja sua própria inspiração.",
  "Acredite no processo.",
  "Resultados vêm com o tempo.",
  "Mantenha-se hidratado.",
  "Você está construindo um novo hábito.",
  "Nada muda se nada mudar.",
  "Faça por você."
];

export const SPIRITUAL_QUOTES = [
  "Nem só de pão viverá o homem. (Mateus 4:4)",
  "Quando jejuarem, não mostrem uma aparência triste. (Mateus 6:16)",
  "O jejum que desejo não é este: soltar as correntes da injustiça... (Isaías 58:6)",
  "Humilhai-vos, pois, debaixo da potente mão de Deus. (1 Pedro 5:6)",
  "Tudo posso naquele que me fortalece. (Filipenses 4:13)",
  "O espírito está pronto, mas a carne é fraca. (Mateus 26:41)",
  "Busquem, pois, em primeiro lugar o Reino de Deus. (Mateus 6:33)",
  "Aquietai-vos, e sabei que eu sou Deus. (Salmos 46:10)",
  "O jejum desconecta do mundo e conecta com Deus.",
  "Alimente seu espírito enquanto seu corpo descansa.",
  "Orar é falar com Deus; jejuar é demonstrar que você fala sério.",
  "Menos de mim, mais de Ti.",
  "O silêncio do corpo é a voz do espírito.",
  "Santificai um jejum, convocai uma assembleia solene. (Joel 1:14)",
  "Que a minha oração suba a ti como incenso. (Salmos 141:2)",
  "Fortalecei as mãos frouxas e firmai os joelhos vacilantes. (Isaías 35:3)",
  "Aquele que habita no esconderijo do Altíssimo... (Salmos 91:1)",
  "Não andeis ansiosos por coisa alguma. (Filipenses 4:6)",
  "O temor do Senhor é o princípio da sabedoria. (Provérbios 9:10)",
  "Renovai-vos pelo espírito do vosso entendimento. (Efésios 4:23)"
];

export const FASTING_MODES: FastingMode[] = [
  {
    id: '12h',
    type: FastingType.F12,
    hours: 12,
    label: '12:12',
    description: 'Janela equilibrada. Metade do dia jejuando.',
    difficulty: Difficulty.EASY,
    color: 'bg-green-100 text-green-800 border-green-200'
  },
  {
    id: '14h',
    type: FastingType.F14,
    hours: 14,
    label: '14:10',
    description: 'Um pouco mais desafiador, ótimo para começar.',
    difficulty: Difficulty.EASY,
    color: 'bg-emerald-100 text-emerald-800 border-emerald-200'
  },
  {
    id: '16h',
    type: FastingType.F16,
    hours: 16,
    label: '16:8',
    description: 'O método mais popular (Leangains).',
    difficulty: Difficulty.MEDIUM,
    color: 'bg-blue-100 text-blue-800 border-blue-200'
  },
  {
    id: '18h',
    type: FastingType.F18,
    hours: 18,
    label: '18:6',
    description: 'Para quem já está acostumado com o 16:8.',
    difficulty: Difficulty.MEDIUM,
    color: 'bg-indigo-100 text-indigo-800 border-indigo-200'
  },
  {
    id: '20h',
    type: FastingType.F20,
    hours: 20,
    label: '20:4',
    description: 'Dieta do Guerreiro. Janela curta de alimentação.',
    difficulty: Difficulty.HARD,
    color: 'bg-violet-100 text-violet-800 border-violet-200'
  },
  {
    id: '23h',
    type: FastingType.OMAD,
    hours: 23,
    label: 'OMAD',
    description: 'Uma refeição ao dia (One Meal A Day).',
    difficulty: Difficulty.HARD,
    color: 'bg-purple-100 text-purple-800 border-purple-200'
  },
];

export const METABOLIC_STAGES = [
    { startHour: 0, endHour: 4, title: 'Digestão', desc: 'Níveis de açúcar no sangue aumentam.', icon: Activity, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30' },
    { startHour: 4, endHour: 8, title: 'Queda de Açúcar', desc: 'A insulina cai. O corpo começa a se acalmar.', icon: Activity, color: 'text-cyan-500', bg: 'bg-cyan-100 dark:bg-cyan-900/30' },
    { startHour: 8, endHour: 12, title: 'Queima de Gordura', desc: 'Início da lipólise. O corpo busca gordura.', icon: Flame, color: 'text-orange-500', bg: 'bg-orange-100 dark:bg-orange-900/30' },
    { startHour: 12, endHour: 18, title: 'Cetose Inicial', desc: 'Queima de gordura acelerada. Clareza mental.', icon: Zap, color: 'text-yellow-500', bg: 'bg-yellow-100 dark:bg-yellow-900/30' },
    { startHour: 18, endHour: 24, title: 'Autofagia', desc: 'Limpeza celular profunda.', icon: Battery, color: 'text-green-500', bg: 'bg-green-100 dark:bg-green-900/30' },
    { startHour: 24, endHour: 48, title: 'Pico de HGH', desc: 'Hormônio do crescimento máximo.', icon: Heart, color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900/30' },
    { startHour: 48, endHour: 72, title: 'Imunidade', desc: 'Regeneração do sistema imune.', icon: Brain, color: 'text-purple-500', bg: 'bg-purple-100 dark:bg-purple-900/30' },
    { startHour: 72, endHour: 999, title: 'Estado Profundo', desc: 'Benefícios espirituais e físicos máximos.', icon: Sparkles, color: 'text-indigo-500', bg: 'bg-indigo-100 dark:bg-indigo-900/30' },
];

export const INITIAL_ACHIEVEMENTS: Achievement[] = [
  { id: 'first_fast', title: 'O Início', description: 'Complete seu primeiro jejum.', icon: '🌱', unlocked: false },
  { id: 'streak_3', title: 'Consistência', description: '3 dias seguidos de jejum.', icon: '🔥', unlocked: false },
  { id: 'streak_7', title: 'Imparável', description: '7 dias seguidos de jejum.', icon: '🚀', unlocked: false },
  { id: 'streak_30', title: 'Mestre do Hábito', description: '30 dias seguidos de jejum.', icon: '👑', unlocked: false },
  { id: 'fast_16', title: 'Intermediário', description: 'Complete um jejum de 16h.', icon: '⭐', unlocked: false },
  { id: 'fast_24', title: 'Guerreiro', description: 'Complete um jejum de 24h.', icon: '🛡️', unlocked: false },
  { id: 'xp_1000', title: 'Level Up', description: 'Alcance 1000 de XP total.', icon: '📈', unlocked: false },
];
