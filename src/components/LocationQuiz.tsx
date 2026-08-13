import { useState, useCallback, useEffect, useRef } from 'react';
import { Trophy, XCircle, CheckCircle2, ArrowRight, RotateCcw, Brain, Shield, Wallet, Medal, Crown, Timer, Tv, Globe } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { knowledgeQuestions, roadMarkingsQuestions, shuffleArray, DIFFICULTY_CONFIG, type QuizQuestion, type Difficulty } from '@/lib/quizData';
import { trafficQuestions } from '@/lib/trafficQuestions';
import { trafficQuestions2 } from '@/lib/trafficQuestions2';
import { trafficQuestions3 } from '@/lib/trafficQuestions3';
import { extraRoadQuestions } from '@/lib/extraQuestions';
import { extraRoadQuestions2 } from '@/lib/extraQuestions2';
import { bulkRoadQuestions } from '@/lib/extraQuestions3';
import { roadQuestions4 } from '@/lib/roadQuestions4';
import { roadQuestions5 } from '@/lib/roadQuestions5';
import { roadQuestions6 } from '@/lib/roadQuestions6';
import { roadQuestions7 } from '@/lib/roadQuestions7';
import { trafficQuestions7 } from '@/lib/trafficQuestions7';
import { hardQuizQuestions } from '@/lib/hardQuestions';
import { hardQuestions2 } from '@/lib/hardQuestions2';
import { hardQuestions3 } from '@/lib/hardQuestions3';
import { mediumQuestions } from '@/lib/mediumQuestions';
import { easyQuestions } from '@/lib/easyQuestions';
import { economicsQuestions } from '@/lib/economicsQuestions';

const allQuestionPool = [...trafficQuestions, ...trafficQuestions2, ...trafficQuestions3, ...roadMarkingsQuestions, ...extraRoadQuestions, ...extraRoadQuestions2, ...bulkRoadQuestions, ...roadQuestions4, ...roadQuestions5, ...roadQuestions6, ...roadQuestions7, ...trafficQuestions7, ...hardQuizQuestions, ...hardQuestions2, ...hardQuestions3, ...mediumQuestions, ...easyQuestions];
import { imageRoadQuestions, imageLandmarkQuestions, type ImageQuizQuestion } from '@/lib/quizImages';
import { imageRoadQuestions2 } from '@/lib/imageRoadQuestions2';
import { imageRoadQuestions3 } from '@/lib/imageRoadQuestions3';
import { imageRoadQuestions4 } from '@/lib/imageRoadQuestions4';
import WithdrawalForm, { type WithdrawalData } from './WithdrawalForm';
import InstagramGate from './InstagramGate';
import type { PostcodeResult } from '@/lib/postcodeGenerator';
import { supabase } from '@/integrations/supabase/client';
import { getUserIp } from '@/lib/ipAddress';
import quizTrafficImg from '@/assets/quiz-traffic-rules.jpg';
import quizRoadImg from '@/assets/quiz-road-markings.jpg';
import { useUserAccess } from '@/hooks/useUserAccess';

type QuizMode = 'select' | 'playing' | 'finished' | 'leaderboard' | 'withdraw' | 'ad';

const ANSWERED_KEY = 'loca8tor-answered';
const DAILY_GAME_LIMIT = 2;
const DAILY_GAME_KEY = 'loca8tor-daily-games';
const DAILY_EARNING_CAP = 250;
const GAMES_BEFORE_AD = 1;
// Quiz earnings expire server-side after 24 hours; client display is refreshed from the backend.
const EARNING_EXPIRY_MS = Number.POSITIVE_INFINITY;

const TIMER_SECONDS = 20;
const AD_DURATION = 30;
const REWARD_PER_CORRECT = 10;
const PENALTY_PER_WRONG = 10;
const QUESTIONS_PER_GAME = 10;

function getDailyGameData(): { count: number; date: string } {
  try {
    const raw = localStorage.getItem(DAILY_GAME_KEY);
    if (!raw) return { count: 0, date: '' };
    const parsed = JSON.parse(raw);
    const today = new Date().toISOString().slice(0, 10);
    if (parsed.date !== today) return { count: 0, date: today };
    return parsed;
  } catch { return { count: 0, date: '' }; }
}

function incrementDailyGames(): number {
  const today = new Date().toISOString().slice(0, 10);
  const data = getDailyGameData();
  const newCount = (data.date === today ? data.count : 0) + 1;
  localStorage.setItem(DAILY_GAME_KEY, JSON.stringify({ count: newCount, date: today }));
  return newCount;
}

function getDailyGamesRemaining(): number {
  const data = getDailyGameData();
  const today = new Date().toISOString().slice(0, 10);
  if (data.date !== today) return DAILY_GAME_LIMIT;
  return Math.max(0, DAILY_GAME_LIMIT - data.count);
}

interface LeaderboardEntry {
  id?: string;
  name: string;
  score: number;
  category: string;
  difficulty: string;
  accuracy: number;
  created_at?: string;
}

// Balance is server-side: see public.quiz_balance_ledger and rpc('get_quiz_balance').
async function fetchServerBalance(): Promise<number> {
  try {
    const { data, error } = await (supabase as any).rpc('get_quiz_balance');
    if (error) return 0;
    return Number(data ?? 0);
  } catch { return 0; }
}

function loadAnswered(): string[] {
  try { return JSON.parse(localStorage.getItem(ANSWERED_KEY) || '[]'); } catch { return []; }
}
function saveAnswered(ids: string[]) { localStorage.setItem(ANSWERED_KEY, JSON.stringify(ids)); }

// Neutral clauses appended to short wrong options so length never reveals the correct answer.
const FILLER_CLAUSES = [
  ' under normal road conditions',
  ' as defined by the highway code',
  ' in most driving situations',
  ' according to standard traffic rules',
  ' when approaching the area',
  ' for all classes of vehicles',
  ' unless otherwise indicated',
  ' on public roads and highways',
  ' as required by traffic regulations',
  ' in standard driving practice',
];

function padToLength(text: string, target: number, seed: number): string {
  if (text.length >= target) return text;
  let result = text;
  let i = seed;
  while (result.length < target - 4) {
    const clause = FILLER_CLAUSES[i % FILLER_CLAUSES.length];
    if (result.includes(clause.trim())) { i++; continue; }
    result += clause;
    i++;
    if (i - seed > FILLER_CLAUSES.length) break;
  }
  return result;
}

function shuffleQuestionOptions<T extends QuizQuestion | ImageQuizQuestion>(q: T, recentLetters: number[] = []): T {
  const correctOption = q.options[q.correctAnswer];
  const opts = [...q.options];
  const correctLen = correctOption.length;
  const avgWrongLen = opts.reduce((sum, o, i) => i === q.correctAnswer ? sum : sum + o.length, 0) / Math.max(opts.length - 1, 1);

  // If the correct answer is noticeably longer than the wrong ones, pad wrongs to neutralize the length tell.
  const shouldPad = correctLen > 30 && correctLen > avgWrongLen * 1.4;
  const targetLen = shouldPad ? Math.max(correctLen - 2, Math.floor(correctLen * 0.85)) : 0;

  const normalizedOpts = opts.map((opt, i) => {
    if (i === q.correctAnswer) return opt;
    if (!shouldPad) return opt;
    return padToLength(opt, targetLen, i + q.id.length);
  });

  // Also occasionally trim a verbose correct answer at a sentence boundary if it remains the longest.
  let workingOpts = [...normalizedOpts];
  const maxLen = Math.max(...workingOpts.map(o => o.length));
  if (workingOpts[q.correctAnswer].length === maxLen && correctLen > 60) {
    const trimmed = correctOption.replace(/\s*[—–-]\s.*$/, '').replace(/,\s[^,]+$/, '');
    if (trimmed.length >= 20 && trimmed.length < correctLen) {
      workingOpts[q.correctAnswer] = trimmed;
    }
  }

  const finalCorrect = workingOpts[q.correctAnswer];
  let shuffledOptions = shuffleArray([...workingOpts]);
  let newCorrectIndex = shuffledOptions.indexOf(finalCorrect);

  // Bias placement to avoid the same letter (A/B/C/D) being correct repeatedly.
  const total = shuffledOptions.length;
  const last = recentLetters[recentLetters.length - 1];
  const secondLast = recentLetters[recentLetters.length - 2];
  const thirdLast = recentLetters[recentLetters.length - 3];
  const tripleRepeat = last !== undefined && last === secondLast && secondLast === thirdLast;
  const doubleRepeat = last !== undefined && last === secondLast;

  const forbidden = new Set<number>();
  if (tripleRepeat) forbidden.add(last);
  else if (doubleRepeat && newCorrectIndex === last) forbidden.add(last);

  if (forbidden.has(newCorrectIndex)) {
    // Choose the least-used letter from recent history that isn't forbidden.
    const counts = new Array(total).fill(0);
    for (const l of recentLetters.slice(-5)) if (l >= 0 && l < total) counts[l]++;
    const candidates = Array.from({ length: total }, (_, i) => i).filter(i => !forbidden.has(i));
    candidates.sort((a, b) => counts[a] - counts[b]);
    const target = candidates[0];
    if (target !== undefined && target !== newCorrectIndex) {
      const swap = shuffledOptions[target];
      shuffledOptions[target] = finalCorrect;
      shuffledOptions[newCorrectIndex] = swap;
      newCorrectIndex = target;
    }
  }

  return { ...q, options: shuffledOptions, correctAnswer: newCorrectIndex };
}


function buildMixedQuestions(pool: (QuizQuestion | ImageQuizQuestion)[], answeredIds: string[], count: number): (QuizQuestion | ImageQuizQuestion)[] {
  const byDiff: Record<Difficulty, (QuizQuestion | ImageQuizQuestion)[]> = { easy: [], medium: [], hard: [] };
  // Quizzes are a shared easy/medium mix, weighted toward easy questions.
  const filteredPool = pool.filter(q => q.difficulty !== 'hard');
  for (const q of filteredPool) {
    const unanswered = !answeredIds.includes(q.id);
    if (unanswered) byDiff[q.difficulty].push(q);
  }
  // Target ~60% easy, ~40% medium of the per-game count.
  const easyTarget = Math.ceil(count * 0.7);
  const mediumTarget = count - easyTarget;
  const targets: Record<Difficulty, number> = { easy: easyTarget, medium: mediumTarget, hard: 0 };
  for (const diff of ['easy', 'medium'] as Difficulty[]) {
    if (byDiff[diff].length < targets[diff]) {
      byDiff[diff] = shuffleArray(filteredPool.filter(q => q.difficulty === diff));
    } else {
      byDiff[diff] = shuffleArray(byDiff[diff]);
    }
  }

  const result: (QuizQuestion | ImageQuizQuestion)[] = [];
  const indices: Record<Difficulty, number> = { easy: 0, medium: 0, hard: 0 };

  // Build the order: take easyTarget easy then mediumTarget medium, then shuffle.
  const ordered: Difficulty[] = [
    ...Array(easyTarget).fill('easy' as Difficulty),
    ...Array(mediumTarget).fill('medium' as Difficulty),
  ];
  const shuffledOrder = shuffleArray(ordered);

  for (let i = 0; i < count; i++) {
    const diff = shuffledOrder[i];
    if (indices[diff] < byDiff[diff].length) {
      result.push(byDiff[diff][indices[diff]]);
      indices[diff]++;
    } else {
      for (const d of ['easy', 'medium'] as Difficulty[]) {
        if (indices[d] < byDiff[d].length) {
          result.push(byDiff[d][indices[d]]);
          indices[d]++;
          break;
        }
      }
    }
  }

  // Thread recent-correct-letter history through the shuffler so no letter dominates the session.
  const recentLetters: number[] = [];
  return result.map(q => {
    const shuffled = shuffleQuestionOptions(q, recentLetters);
    recentLetters.push(shuffled.correctAnswer);
    return shuffled;
  });
}

// Weighted question builder that supports easy/medium/hard distribution targets.
function buildWeightedQuestions(
  pool: (QuizQuestion | ImageQuizQuestion)[],
  answeredIds: string[],
  count: number,
  weights: { easy: number; medium: number; hard: number },
): (QuizQuestion | ImageQuizQuestion)[] {
  const byDiff: Record<Difficulty, (QuizQuestion | ImageQuizQuestion)[]> = { easy: [], medium: [], hard: [] };
  for (const q of pool) {
    if (!answeredIds.includes(q.id)) byDiff[q.difficulty].push(q);
  }
  const easyTarget = Math.round(count * weights.easy);
  const hardTarget = Math.round(count * weights.hard);
  const mediumTarget = Math.max(0, count - easyTarget - hardTarget);
  const targets: Record<Difficulty, number> = { easy: easyTarget, medium: mediumTarget, hard: hardTarget };

  (['easy', 'medium', 'hard'] as Difficulty[]).forEach(diff => {
    if (byDiff[diff].length < targets[diff]) {
      byDiff[diff] = shuffleArray(pool.filter(q => q.difficulty === diff));
    } else {
      byDiff[diff] = shuffleArray(byDiff[diff]);
    }
  });

  const ordered: Difficulty[] = [
    ...Array(easyTarget).fill('easy' as Difficulty),
    ...Array(mediumTarget).fill('medium' as Difficulty),
    ...Array(hardTarget).fill('hard' as Difficulty),
  ];
  const shuffledOrder = shuffleArray(ordered);
  const indices: Record<Difficulty, number> = { easy: 0, medium: 0, hard: 0 };
  const result: (QuizQuestion | ImageQuizQuestion)[] = [];
  for (let i = 0; i < count; i++) {
    const diff = shuffledOrder[i];
    if (indices[diff] < byDiff[diff].length) {
      result.push(byDiff[diff][indices[diff]]);
      indices[diff]++;
    } else {
      for (const d of ['medium', 'easy', 'hard'] as Difficulty[]) {
        if (indices[d] < byDiff[d].length) {
          result.push(byDiff[d][indices[d]]);
          indices[d]++;
          break;
        }
      }
    }
  }
  const recentLetters: number[] = [];
  return result.map(q => {
    const shuffled = shuffleQuestionOptions(q, recentLetters);
    recentLetters.push(shuffled.correctAnswer);
    return shuffled;
  });
}

type QuizCategory = 'traffic' | 'economics';
const CATEGORY_LABELS: Record<QuizCategory, string> = {
  traffic: 'Traffic & Road Markings',
  economics: 'Global Economics & Policy',
};

interface LocationQuizProps {
  onSaveToHistory?: (item: PostcodeResult) => void;
}

export default function LocationQuiz({ onSaveToHistory }: LocationQuizProps) {
  const { isSuperAdmin } = useUserAccess();
  const [mode, setMode] = useState<QuizMode>('select');
  const [selectedCategory, setSelectedCategory] = useState<QuizCategory>('traffic');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const scoreRef = useRef(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [penaltyApplied, setPenaltyApplied] = useState(false);
  const penaltyRef = useRef(false);
  const [answered, setAnswered] = useState(false);
  const [totalBalance, setTotalBalance] = useState(0);
  const totalBalanceRef = useRef(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [answeredIds, setAnsweredIds] = useState<string[]>(loadAnswered);
  const [playerName, setPlayerName] = useState('');
  const [showNameInput, setShowNameInput] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [adTimeLeft, setAdTimeLeft] = useState(0);
  const adTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const adTimeLeftRef = useRef(0);
  const adContinueTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startQuizRef = useRef<() => void>(() => {});
  const currentPlayIdRef = useRef<string | null>(null);
  const [dailyGamesLeft, setDailyGamesLeft] = useState(getDailyGamesRemaining());
  const [ipLimited, setIpLimited] = useState(false);
  const [ipSessionBlocked, setIpSessionBlocked] = useState(false);
  // Social gate must be re-passed for every withdrawal attempt — never persisted.
  const [socialGatePassed, setSocialGatePassed] = useState(false);

  const refreshBalance = useCallback(async () => {
    const bal = await fetchServerBalance();
    totalBalanceRef.current = bal;
    setTotalBalance(bal);
    return bal;
  }, []);

  // Fetch authoritative server balance on mount
  useEffect(() => { void refreshBalance(); }, [refreshBalance]);

  // Check IP-based earning limit and active session on mount
  useEffect(() => {
    (async () => {
      try {
        const ip = await getUserIp();
        if (ip === 'unknown') return;

        // Generate a unique session ID for this browser tab
        const SESSION_KEY = 'loca8tor-session-id';
        let sessionId = sessionStorage.getItem(SESSION_KEY);
        if (!sessionId) {
          sessionId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
          sessionStorage.setItem(SESSION_KEY, sessionId);
        }

        // Register this session - check if another session from same IP is active
        const activeKey = `loca8tor-active-${ip}`;
        const existingSession = localStorage.getItem(activeKey);
        const existingTimestamp = Number(localStorage.getItem(`${activeKey}-ts`) || '0');
        const SESSION_TIMEOUT = 5 * 60 * 1000; // 5 minutes

        if (existingSession && existingSession !== sessionId && (Date.now() - existingTimestamp) < SESSION_TIMEOUT) {
          setIpSessionBlocked(true);
        } else {
          localStorage.setItem(activeKey, sessionId);
          localStorage.setItem(`${activeKey}-ts`, String(Date.now()));
        }

        // Keep session alive with heartbeat
        const heartbeat = setInterval(() => {
          const currentSession = localStorage.getItem(activeKey);
          if (currentSession === sessionId) {
            localStorage.setItem(`${activeKey}-ts`, String(Date.now()));
          }
        }, 30000);

        // Check total earnings from this IP in last 24 hours
        const { data: totalFromIp } = await (supabase as any)
          .rpc('get_ip_quiz_total_24h', { _ip: ip });
        if (typeof totalFromIp === 'number' && totalFromIp >= DAILY_EARNING_CAP) {
          setIpLimited(true);
        }

        return () => clearInterval(heartbeat);
      } catch {}
    })();
  }, []);

  // Load leaderboard from DB
  useEffect(() => {
    fetchLeaderboard();
  }, []);

  // Quiz earnings expiry is enforced server-side when balances are refreshed.

  const fetchLeaderboard = async () => {
    const { data } = await (supabase as any)
      .from('leaderboard')
      .select('id, name, score, category, difficulty, accuracy, created_at')
      .order('score', { ascending: false })
      .limit(50);
    if (data) {
      setLeaderboard(data.map((r: any) => ({
        id: r.id,
        name: r.name,
        score: r.score,
        category: r.category,
        difficulty: r.difficulty,
        accuracy: r.accuracy,
        created_at: r.created_at,
      })));
    }
  };

  // Refresh daily games remaining periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setDailyGamesLeft(getDailyGamesRemaining());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  const startTimer = useCallback(() => {
    stopTimer();
    setTimeLeft(TIMER_SECONDS);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { stopTimer(); return 0; }
        return prev - 1;
      });
    }, 1000);
  }, [stopTimer]);

  useEffect(() => { return () => stopTimer(); }, [stopTimer]);

  const startQuiz = useCallback(async (categoryOverride?: QuizCategory) => {
    const cat: QuizCategory = categoryOverride ?? selectedCategory;
    if (categoryOverride) setSelectedCategory(categoryOverride);
    if (ipSessionBlocked && !isSuperAdmin) {
      toast({ title: 'Session active elsewhere', description: 'Another browser/tab on this device is already playing. Close it first.', variant: 'destructive' });
      setMode('select');
      return;
    }
    if (ipLimited && !isSuperAdmin) {
      toast({ title: 'Daily limit reached', description: `You have reached your ₦${DAILY_EARNING_CAP} daily earning limit. Try again tomorrow.`, variant: 'destructive' });
      setMode('select');
      return;
    }
    if (dailyGamesLeft <= 0 && !isSuperAdmin) {
      toast({ title: 'Daily game limit reached', description: `You've played ${DAILY_GAME_LIMIT} games today. Come back tomorrow!`, variant: 'destructive' });
      setMode('select');
      return;
    }

    // Server-side enforcement: one game/day per signed-in user across both quiz categories.
    // This blocks bypassing the local-storage counter by clearing cookies / using multiple browsers.
    try {
      const ip = await getUserIp().catch(() => null);
      const { data, error } = await (supabase as any).rpc('register_quiz_play', { _ip: ip });
      const row = Array.isArray(data) ? data[0] : data;
      if (error || !row) {
        toast({ title: 'Could not start game', description: 'Please sign in and try again.', variant: 'destructive' });
        setMode('select');
        return;
      }
      if (!row.allowed) {
        toast({ title: 'Daily game limit reached', description: `You've played ${DAILY_GAME_LIMIT} games today. Come back tomorrow!`, variant: 'destructive' });
        setDailyGamesLeft(0);
        setMode('select');
        return;
      }
      currentPlayIdRef.current = row.play_id || null;
      // Keep local counter in sync with server
      localStorage.setItem(DAILY_GAME_KEY, JSON.stringify({
        count: row.plays_today, date: new Date().toISOString().slice(0, 10),
      }));
      setDailyGamesLeft(row.plays_remaining);
    } catch (e) {
      toast({ title: 'Could not start game', description: 'Network error. Try again.', variant: 'destructive' });
      setMode('select');
      return;
    }

    const allImg = [...imageRoadQuestions, ...imageRoadQuestions2, ...imageRoadQuestions3, ...imageLandmarkQuestions];
    const trafficPool = [...allQuestionPool, ...allImg, ...imageRoadQuestions4] as (QuizQuestion | ImageQuizQuestion)[];

    const mixed = cat === 'economics'
      ? buildWeightedQuestions(economicsQuestions, answeredIds, QUESTIONS_PER_GAME, { easy: 0.1, medium: 0.4, hard: 0.5 })
      : buildWeightedQuestions(trafficPool, answeredIds, QUESTIONS_PER_GAME, { easy: 0.1, medium: 0.4, hard: 0.5 });

    setQuestions(mixed as QuizQuestion[]);
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setScore(0);
    scoreRef.current = 0;
    setCorrectCount(0);
    setWrongCount(0);
    setPenaltyApplied(false);
    penaltyRef.current = false;
    setAnswered(false);
    setMode('playing');
    startTimer();
  }, [answeredIds, startTimer, ipLimited, ipSessionBlocked, dailyGamesLeft, selectedCategory, isSuperAdmin]);

  useEffect(() => { startQuizRef.current = startQuiz; }, [startQuiz]);

  const handleAnswer = useCallback((index: number) => {
    if (answered) return;
    stopTimer();
    setSelectedAnswer(index);
    setAnswered(true);
    const q = questions[currentIndex];
    const isCorrect = index === q.correctAnswer;

    const newAnswered = [...answeredIds, q.id];
    setAnsweredIds(newAnswered);
    saveAnswered(newAnswered);

    if (isCorrect) {
      scoreRef.current = scoreRef.current + REWARD_PER_CORRECT;
      setScore(scoreRef.current);
      setCorrectCount(c => c + 1);
      penaltyRef.current = false;
      setPenaltyApplied(false);
    } else {
      if (!penaltyRef.current) {
        scoreRef.current = Math.max(0, scoreRef.current - PENALTY_PER_WRONG);
        setScore(scoreRef.current);
        penaltyRef.current = true;
        setPenaltyApplied(true);
      }
      setWrongCount(c => c + 1);
    }
  }, [answered, questions, currentIndex, answeredIds, stopTimer]);

  // Auto-submit wrong when timer runs out
  useEffect(() => {
    if (mode === 'playing' && !answered && timeLeft === 0) {
      setAnswered(true);
      setSelectedAnswer(-1);
      const q = questions[currentIndex];
      const newAnsweredIds = [...answeredIds, q.id];
      setAnsweredIds(newAnsweredIds);
      saveAnswered(newAnsweredIds);
      if (!penaltyRef.current) {
        scoreRef.current = Math.max(0, scoreRef.current - PENALTY_PER_WRONG);
        setScore(scoreRef.current);
        penaltyRef.current = true;
        setPenaltyApplied(true);
      }
      setWrongCount(c => c + 1);
    }
  }, [timeLeft, mode, answered, questions, currentIndex, answeredIds]);

  const nextQuestion = useCallback(() => {
    if (currentIndex + 1 >= questions.length) {
      stopTimer();
      setMode('finished');
      setShowNameInput(true);
      // Persist final score against this game's server-side play row;
      // the RPC credits the ledger atomically. Then refresh balance from server.
      if (currentPlayIdRef.current) {
        (supabase as any).rpc('record_quiz_score', {
          _play_id: currentPlayIdRef.current,
          _score: scoreRef.current,
        }).then(({ error }: { error?: { message?: string } | null }) => {
          if (error) {
            console.error('Quiz score save failed:', error);
            toast({
              title: 'Earnings not saved',
              description: error.message || 'Please stay on this screen and try again.',
              variant: 'destructive',
            });
            return;
          }
          currentPlayIdRef.current = null;
          void refreshBalance();
        });
      } else {
        void refreshBalance();
      }
    } else {
      setCurrentIndex(i => i + 1);
      setSelectedAnswer(null);
      setAnswered(false);
      setPenaltyApplied(false);
      startTimer();
    }
  }, [currentIndex, questions.length, stopTimer, startTimer, refreshBalance]);

  const startAd = useCallback(() => {
    setAdTimeLeft(AD_DURATION);
    adTimeLeftRef.current = AD_DURATION;
    setMode('ad');

    if (adTimerRef.current) {
      clearInterval(adTimerRef.current);
      adTimerRef.current = null;
    }
    if (adContinueTimeoutRef.current) {
      clearTimeout(adContinueTimeoutRef.current);
      adContinueTimeoutRef.current = null;
    }

    adTimerRef.current = setInterval(() => {
      adTimeLeftRef.current -= 1;
      const next = Math.max(adTimeLeftRef.current, 0);
      setAdTimeLeft(next);

      if (next <= 0) {
        if (adTimerRef.current) {
          clearInterval(adTimerRef.current);
          adTimerRef.current = null;
        }

        adContinueTimeoutRef.current = setTimeout(() => {
          adContinueTimeoutRef.current = null;
          startQuizRef.current();
        }, 500);
      }
    }, 1000);
  }, []);

  useEffect(() => {
    return () => {
      if (adTimerRef.current) clearInterval(adTimerRef.current);
      if (adContinueTimeoutRef.current) clearTimeout(adContinueTimeoutRef.current);
    };
  }, []);

  const saveToLeaderboard = useCallback(async () => {
    const name = playerName.trim() || 'Anonymous';
    const ip = await getUserIp();
    const entry = {
      name,
      score,
      category: CATEGORY_LABELS[selectedCategory],
      difficulty: 'Mixed',
      accuracy: Math.round((correctCount / questions.length) * 100),
      ip_address: ip,
    };

    await (supabase as any).from('leaderboard').insert(entry);
    setShowNameInput(false);
    fetchLeaderboard();
  }, [playerName, score, selectedCategory, correctCount, questions.length]);

  const handleWithdraw = useCallback(async (data: WithdrawalData) => {
    const ip = await getUserIp();

    const { error } = await (supabase as any).rpc('create_withdrawal_request', {
      _type: data.type,
      _full_name: data.fullName,
      _phone: data.phone,
      _network_provider: data.networkProvider,
      _state_of_residence: data.stateOfResidence,
      _address: data.address,
      _postcode: data.postcode,
      _amount: data.amount,
      _ip_address: ip,
    });

    if (error) {
      console.error('Withdrawal insert failed:', error);
      toast({ title: 'Withdrawal failed', description: error.message || 'Could not save your request. Please try again.', variant: 'destructive' });
      return false;
    }

    // Ledger debit happens server-side atomically inside create_withdrawal_request.
    await refreshBalance();
    toast({ title: 'Withdrawal submitted', description: 'Your request is pending admin approval.' });

    if (onSaveToHistory && data.address && data.postcode) {
      onSaveToHistory({
        postcode: data.postcode,
        state: data.stateOfResidence,
        areaCode: data.postcode.split(' ')[0] || data.postcode.slice(0, 2),
        lat: 9.082,
        lng: 8.6753,
        address: data.address,
        country: 'Nigeria',
        isGenerated: true,
      });
    }
    return true;
  }, [onSaveToHistory, refreshBalance]);

  const current = questions[currentIndex];

  // ─── Withdraw ───
  if (mode === 'withdraw') {
    if (!socialGatePassed) {
      return (
        <InstagramGate
          onBack={() => setMode('select')}
          onContinue={() => setSocialGatePassed(true)}
        />
      );
    }
    return <WithdrawalForm balance={totalBalance} onBack={() => setMode('select')} onSubmit={handleWithdraw} />;
  }

  // ─── Quiz Paused Notice ───
  // The quiz is currently paused while we resolve a generation issue. Existing
  // balances can still be withdrawn via the button below.
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md bg-card rounded-2xl ring-1 ring-border p-6 text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-amber-500/15 ring-1 ring-amber-500/30 flex items-center justify-center mx-auto">
          <Brain className="w-7 h-7 text-amber-500" />
        </div>
        <div>
          <h2 className="font-heading text-xl font-bold text-foreground">Quiz Temporarily Paused</h2>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            We are currently experiencing difficulty in generating quiz, please try again later.
          </p>
        </div>
        {totalBalance > 0 && (
          <button
            onClick={() => setMode('withdraw')}
            className="w-full py-2.5 bg-primary text-primary-foreground font-heading font-bold rounded-lg hover:brightness-110 transition flex items-center justify-center gap-2"
          >
            <Wallet className="w-4 h-4" /> Withdraw Balance (₦{totalBalance})
          </button>
        )}
        <p className="text-[11px] text-muted-foreground">Thanks for your patience.</p>
      </div>
    </div>
  );

  // ─── Ad Screen (FULLSCREEN) ───
  if (mode === 'ad') {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md flex-1 flex flex-col items-center justify-center space-y-6 text-center">
          <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto">
            <Tv className="w-8 h-8 text-muted-foreground" />
          </div>
          <div>
            <h2 className="font-heading text-xl font-bold text-foreground">Watch to Continue</h2>
            <p className="text-sm text-muted-foreground mt-1">Watch this short ad to play again</p>
          </div>

          <div className="bg-card rounded-lg ring-1 ring-border p-8 w-full">
            <div className="aspect-video bg-secondary rounded-md flex items-center justify-center mb-4">
              <div className="text-center">
                <Tv className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-xs text-muted-foreground font-medium">Advertisement</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-1000 ease-linear rounded-full"
                  style={{ width: `${((AD_DURATION - adTimeLeft) / AD_DURATION) * 100}%` }}
                />
              </div>
              <p className="text-sm font-heading font-bold text-foreground tabular-nums">
                {adTimeLeft > 0 ? `${adTimeLeft}s remaining` : 'Starting next game…'}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Leaderboard ───
  if (mode === 'leaderboard') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg font-bold text-foreground flex items-center gap-2">
            <Crown className="w-5 h-5 text-primary" /> Leaderboard
          </h2>
          <button onClick={() => setMode('select')} className="text-sm text-muted-foreground hover:text-foreground transition-colors">← Back</button>
        </div>

        {leaderboard.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">No scores yet. Play a quiz to get on the leaderboard!</div>
        ) : (
          <div className="space-y-2">
            {leaderboard.slice(0, 50).map((entry, i) => (
              <div key={entry.id || i} className="flex items-center gap-3 bg-card rounded-lg ring-1 ring-border p-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${i === 0 ? 'bg-primary/10 text-primary' : i === 1 ? 'bg-accent/15 text-accent-foreground' : i === 2 ? 'bg-destructive/10 text-destructive' : 'bg-secondary text-muted-foreground'}`}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-heading font-bold text-sm text-foreground truncate">{entry.name}</p>
                  <p className="text-[10px] text-muted-foreground">{entry.category} • {entry.difficulty} • {entry.accuracy}%</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-heading font-bold text-sm text-primary">₦{entry.score.toLocaleString()}</p>
                  <p className="text-[10px] text-muted-foreground">{entry.created_at ? new Date(entry.created_at).toLocaleDateString() : ''}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ─── Category Selection ───
  if (mode === 'select') {
    const quizLocked = !isSuperAdmin && (dailyGamesLeft <= 0 || ipLimited || ipSessionBlocked);

    return (
      <div className="space-y-4">
        <div className="text-center mb-4">
          <h2 className="font-heading text-xl font-bold text-foreground">Location Quiz</h2>
          <p className="text-sm text-muted-foreground mt-1">Test your knowledge and earn ₦{REWARD_PER_CORRECT} per correct answer!</p>
          <div className="mt-3 inline-flex items-center gap-2 bg-card rounded-lg ring-1 ring-border px-4 py-2">
            <Wallet className="w-4 h-4 text-primary" />
            <span className="font-heading font-bold text-foreground">₦{totalBalance.toLocaleString()}</span>
          </div>
        </div>

        {ipSessionBlocked && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 text-center">
            <Shield className="w-6 h-6 text-destructive mx-auto mb-2" />
            <p className="text-sm font-bold text-destructive">Session Active Elsewhere</p>
            <p className="text-xs text-muted-foreground mt-1">Another browser or tab on this IP is already playing. Close it first.</p>
          </div>
        )}

        {ipLimited && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 text-center">
            <Shield className="w-6 h-6 text-destructive mx-auto mb-2" />
            <p className="text-sm font-bold text-destructive">Daily Earning Limit Reached (₦{DAILY_EARNING_CAP})</p>
            <p className="text-xs text-muted-foreground mt-1">You've earned the maximum amount for today. Come back tomorrow!</p>
          </div>
        )}

        {dailyGamesLeft <= 0 && !ipLimited && !isSuperAdmin && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 text-center">
            <Timer className="w-6 h-6 text-destructive mx-auto mb-2" />
            <p className="text-sm font-bold text-destructive">Daily Game Limit Reached</p>
            <p className="text-xs text-muted-foreground mt-1">You've played {DAILY_GAME_LIMIT} games today. Come back tomorrow!</p>
          </div>
        )}

        <button
          onClick={() => startQuiz('traffic')}
          disabled={quizLocked}
          className={`w-full bg-card rounded-lg ring-1 ring-border shadow-sm overflow-hidden transition-all active:scale-[0.98] ${quizLocked ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md hover:ring-primary/40'}`}
        >
          <img src={quizTrafficImg} alt="Quiz" className="w-full h-32 object-cover" />
          <div className="flex items-center gap-4 p-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Brain className="w-5 h-5 text-primary" />
            </div>
            <div className="text-left">
               <p className="font-heading font-bold text-foreground">Traffic & Road Markings Quiz</p>
              <p className="text-xs text-muted-foreground mt-0.5">{QUESTIONS_PER_GAME} mixed questions • ₦{REWARD_PER_CORRECT}/correct • 1st wrong = -₦{PENALTY_PER_WRONG}</p>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground ml-auto shrink-0" />
          </div>
        </button>

        <button
          onClick={() => startQuiz('economics')}
          disabled={quizLocked}
          className={`w-full bg-card rounded-lg ring-1 ring-border shadow-sm overflow-hidden transition-all active:scale-[0.98] ${quizLocked ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md hover:ring-primary/40'}`}
        >
          <div className="flex items-center gap-4 p-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Globe className="w-5 h-5 text-primary" />
            </div>
            <div className="text-left">
              <p className="font-heading font-bold text-foreground">Global Economics & Policy Quiz</p>
              <p className="text-xs text-muted-foreground mt-0.5">{QUESTIONS_PER_GAME} mixed questions • ₦{REWARD_PER_CORRECT}/correct • shares daily limit</p>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground ml-auto shrink-0" />
          </div>
        </button>

        <div className="flex gap-2">
          <button
            onClick={() => { fetchLeaderboard(); setMode('leaderboard'); }}
            className="flex-1 flex items-center justify-center gap-2 bg-card ring-1 ring-border py-3 rounded-lg text-sm font-heading font-semibold text-foreground hover:bg-secondary transition-all active:scale-[0.97]"
          >
            <Medal className="w-4 h-4 text-primary" /> Leaderboard
          </button>
          <button
            onClick={() => { setSocialGatePassed(false); setMode('withdraw'); }}
            disabled={totalBalance < 50}
            className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3 rounded-lg text-sm font-heading font-semibold hover:bg-primary/90 transition-all active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Wallet className="w-4 h-4" /> Withdraw
          </button>
        </div>
      </div>
    );
  }

  // ─── Finished ───
  if (mode === 'finished') {
    const total = questions.length;
    const percentage = Math.round((correctCount / total) * 100);
    const maxPossible = total * REWARD_PER_CORRECT;

    return (
      <div className="text-center space-y-5">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <Trophy className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h2 className="font-heading text-2xl font-bold text-foreground">Quiz Complete!</h2>
          <p className="text-sm text-muted-foreground mt-1">
             {CATEGORY_LABELS[selectedCategory]} Quiz
            <span className="ml-2 inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-secondary">
              Mixed Difficulty
            </span>
          </p>
        </div>

        <div className="bg-card rounded-lg ring-1 ring-border p-5 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Round Winnings</span>
            <span className="font-heading font-bold text-2xl text-primary">₦{score.toLocaleString()}</span>
          </div>
          <div className="text-xs text-muted-foreground text-right">out of ₦{maxPossible.toLocaleString()} possible</div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Total Balance</span>
            <span className="font-heading font-bold text-foreground">₦{totalBalance.toLocaleString()}</span>
          </div>
          <div className="h-px bg-border" />
          <div className="grid grid-cols-3 gap-3 text-center text-xs">
            <div>
              <p className="font-bold text-primary text-lg">{correctCount}</p>
              <p className="text-muted-foreground">Correct</p>
            </div>
            <div>
              <p className="font-bold text-destructive text-lg">{wrongCount}</p>
              <p className="text-muted-foreground">Wrong</p>
            </div>
            <div>
              <p className="font-bold text-foreground text-lg">{percentage}%</p>
              <p className="text-muted-foreground">Accuracy</p>
            </div>
          </div>
          <div className="pt-2">
            <p className="text-sm font-medium text-foreground">
              {percentage >= 90 ? '🏆 Outstanding! You\'re a true expert!' :
               percentage >= 70 ? '🌟 Great job! Very impressive knowledge!' :
               percentage >= 50 ? '👍 Not bad! Keep learning!' :
               '💪 Keep practicing, you\'ll get better!'}
            </p>
          </div>
        </div>

        {showNameInput && (
          <div className="bg-card rounded-lg ring-1 ring-border p-4 space-y-3">
            <p className="text-sm font-medium text-foreground">Save your score to the leaderboard</p>
            <input
              value={playerName}
              onChange={e => setPlayerName(e.target.value)}
              placeholder="Enter your name"
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
            <button
              onClick={saveToLeaderboard}
              className="w-full bg-primary text-primary-foreground font-heading font-semibold text-sm px-5 py-2.5 rounded-lg shadow-md hover:shadow-lg transition-all active:scale-[0.97]"
            >
              Save Score
            </button>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => {
              const remaining = getDailyGamesRemaining();
              setDailyGamesLeft(remaining);
              if (remaining <= 0) {
                toast({ title: 'Daily game limit reached', description: `You've played ${DAILY_GAME_LIMIT} games today. Come back tomorrow!`, variant: 'destructive' });
                return;
              }
              const data = getDailyGameData();
              const today = new Date().toISOString().slice(0, 10);
              const played = data.date === today ? data.count : 0;
              if (played > 0 && played % GAMES_BEFORE_AD === 0) {
                startAd();
              } else {
                startQuiz();
              }
            }}
            className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground font-heading font-semibold text-sm px-5 py-3 rounded-lg shadow-md hover:shadow-lg transition-all active:scale-[0.97]"
          >
            <RotateCcw className="w-4 h-4" /> Play Again
          </button>
        </div>
        <button onClick={() => setMode('select')} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Back to categories
        </button>
      </div>
    );
  }

  // ─── Playing ───
  const imgQ = current as ImageQuizQuestion;
  const hasImageOptions = !!imgQ.imageOptions;
  const timerPercent = (timeLeft / TIMER_SECONDS) * 100;
  const timerColor = timeLeft <= 5 ? 'bg-destructive' : timeLeft <= 10 ? 'bg-accent-foreground' : 'bg-primary';
  const currentDiff = current.difficulty;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">
              Question {currentIndex + 1}/{questions.length}
            </p>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full bg-secondary font-medium ${currentDiff === 'easy' ? 'text-primary' : currentDiff === 'medium' ? 'text-accent-foreground' : 'text-destructive'}`}>
              {currentDiff === 'easy' ? '🟢' : currentDiff === 'medium' ? '🟡' : '🔴'} {currentDiff.charAt(0).toUpperCase() + currentDiff.slice(1)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Traffic & Road Markings Quiz
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${timeLeft <= 5 ? 'bg-destructive/10 text-destructive' : timeLeft <= 10 ? 'bg-accent/15 text-accent-foreground' : 'bg-secondary text-foreground'}`}>
            <Timer className="w-3.5 h-3.5" />
            <span className="font-heading font-bold text-sm tabular-nums">{timeLeft}s</span>
          </div>
          <div className="text-right">
            <p className="font-heading font-bold text-lg text-primary">₦{score.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">Winnings</p>
          </div>
        </div>
      </div>

      {/* Timer bar */}
      <div className="w-full h-1 bg-secondary rounded-full overflow-hidden">
        <div
          className={`h-full ${timerColor} transition-all duration-1000 ease-linear rounded-full`}
          style={{ width: `${timerPercent}%` }}
        />
      </div>

      {/* Progress */}
      <div className="w-full h-1 bg-secondary rounded-full overflow-hidden">
        <div
          className="h-full bg-muted-foreground/30 transition-all duration-300 rounded-full"
          style={{ width: `${((currentIndex + (answered ? 1 : 0)) / questions.length) * 100}%` }}
        />
      </div>

      <div className="bg-card rounded-lg ring-1 ring-border p-5 shadow-sm">
        <h3 className="font-heading font-bold text-base text-foreground leading-snug">{current.question}</h3>
      </div>

      {answered && selectedAnswer === -1 && (
        <div className="text-center py-2 text-destructive text-sm font-semibold animate-fade-up">
          ⏰ Time's up!
        </div>
      )}

      {hasImageOptions ? (
        <div className="grid grid-cols-2 gap-2.5">
          {imgQ.imageOptions!.map((img, i) => {
            let ringClass = 'ring-1';
            if (!answered) {
              ringClass += ' ring-border hover:ring-primary/40';
            } else if (i === selectedAnswer && i === current.correctAnswer) {
              ringClass += ' ring-2 ring-primary';
            } else if (i === selectedAnswer && i !== current.correctAnswer) {
              ringClass += ' ring-2 ring-destructive';
            } else {
              ringClass += ' ring-border opacity-50';
            }
            return (
              <button
                key={i}
                onClick={() => handleAnswer(i)}
                disabled={answered}
                className={`relative rounded-lg overflow-hidden ${ringClass} transition-all active:scale-[0.97]`}
              >
                <img src={img} alt={`Option ${String.fromCharCode(65 + i)}`} className="w-full h-28 sm:h-36 object-cover" />
                <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-card/90 ring-1 ring-border flex items-center justify-center text-xs font-bold text-foreground">
                  {String.fromCharCode(65 + i)}
                </div>
                {answered && i === selectedAnswer && i === current.correctAnswer && (
                  <div className="absolute top-2 right-2"><CheckCircle2 className="w-5 h-5 text-primary drop-shadow" /></div>
                )}
                {answered && i === selectedAnswer && i !== current.correctAnswer && (
                  <div className="absolute top-2 right-2"><XCircle className="w-5 h-5 text-destructive drop-shadow" /></div>
                )}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="grid gap-2.5">
          {current.options.map((option, i) => {
            let classes = 'w-full text-left px-4 py-3.5 rounded-lg ring-1 text-sm font-medium transition-all active:scale-[0.98]';
            if (!answered) {
              classes += ' ring-border bg-card hover:ring-primary/40 hover:shadow-sm text-foreground';
            } else if (i === selectedAnswer && i === current.correctAnswer) {
              classes += ' ring-primary bg-primary/10 text-primary';
            } else if (i === selectedAnswer && i !== current.correctAnswer) {
              classes += ' ring-destructive bg-destructive/10 text-destructive';
            } else {
              classes += ' ring-border bg-card text-muted-foreground opacity-60';
            }
            return (
              <button key={i} onClick={() => handleAnswer(i)} disabled={answered} className={classes}>
                <span className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full ring-1 ring-current flex items-center justify-center text-xs font-bold shrink-0">
                    {String.fromCharCode(65 + i)}
                  </span>
                  {option}
                  {answered && i === selectedAnswer && i === current.correctAnswer && <CheckCircle2 className="w-4 h-4 text-primary ml-auto shrink-0" />}
                  {answered && i === selectedAnswer && i !== current.correctAnswer && <XCircle className="w-4 h-4 text-destructive ml-auto shrink-0" />}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {answered && (
        <div className="flex items-center justify-between animate-fade-up">
          <p className={`text-sm font-semibold ${selectedAnswer === current.correctAnswer ? 'text-primary' : 'text-destructive'}`}>
            {selectedAnswer === -1
              ? `Time's up!${!penaltyApplied ? '' : ' -₦' + PENALTY_PER_WRONG}`
              : selectedAnswer === current.correctAnswer
                ? `Correct! +₦${REWARD_PER_CORRECT}`
                : `Wrong!${penaltyApplied ? ' -₦' + PENALTY_PER_WRONG : ''}`}
          </p>
          <button
            onClick={nextQuestion}
            className="flex items-center gap-1.5 bg-primary text-primary-foreground font-heading font-semibold text-sm px-5 py-2.5 rounded-lg shadow-md hover:shadow-lg transition-all active:scale-[0.97]"
          >
            {currentIndex + 1 >= questions.length ? 'See Results' : 'Next'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
