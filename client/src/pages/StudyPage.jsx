import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';
import confetti from 'canvas-confetti';
import {
  RotateCcw,
  HelpCircle,
  Clock,
  Flame,
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  XCircle,
  Layers,
  ChevronRight,
  Loader2,
  Volume2,
} from 'lucide-react';
import MasteryBadge from '../components/MasteryBadge';

const StudyPage = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const mode = searchParams.get('mode') || 'due';
  const includeSubDecks = searchParams.get('includeSubDecks') || 'true';
  const limit = searchParams.get('limit') || '30';

  const [cards, setCards] = useState([]);
  const [deckTitle, setDeckTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [submittingRating, setSubmittingRating] = useState(false);

  // Telemetry & Session tracking
  const [sessionStartTime, setSessionStartTime] = useState(Date.now());
  const [cardStartTime, setCardStartTime] = useState(Date.now());
  const [sessionResults, setSessionResults] = useState([]);
  const [sessionCompleted, setSessionCompleted] = useState(false);

  // Fetch session cards
  useEffect(() => {
    const fetchSession = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/api/study/deck/${id}/session`, {
          params: { mode, includeSubDecks, limit },
        });

        if (res.data.success) {
          setCards(res.data.cards || []);
          setDeckTitle(res.data.deckTitle || 'Flashcards');
          setSessionStartTime(Date.now());
          setCardStartTime(Date.now());
        }
      } catch (err) {
        console.error('Failed to load study session:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, [id, mode, includeSubDecks, limit]);

  // Keyboard Shortcuts: Space = Flip, 1-5 = SM-2 Grade
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (sessionCompleted || submittingRating || cards.length === 0) return;

      // Don't intercept if user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        setIsFlipped((prev) => !prev);
      } else if (isFlipped) {
        if (e.key === '1') handleRateCard(1);
        else if (e.key === '2') handleRateCard(2);
        else if (e.key === '3') handleRateCard(3);
        else if (e.key === '4') handleRateCard(4);
        else if (e.key === '5') handleRateCard(5);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFlipped, sessionCompleted, submittingRating, cards, currentIndex]);

  const currentCard = cards[currentIndex];

  // Submit SM-2 Review Rating
  const handleRateCard = async (grade) => {
    if (!currentCard || submittingRating) return;

    const responseTimeMs = Date.now() - cardStartTime;

    try {
      setSubmittingRating(true);

      const res = await api.post('/api/study/review', {
        cardId: currentCard._id,
        grade,
        responseTimeMs,
      });

      // Track session statistics
      const resultEntry = {
        cardId: currentCard._id,
        front: currentCard.front,
        grade,
        isSuccess: grade >= 3,
        responseTimeMs,
      };

      const updatedResults = [...sessionResults, resultEntry];
      setSessionResults(updatedResults);

      // Advance to next card or complete session
      if (currentIndex + 1 < cards.length) {
        setIsFlipped(false);
        setShowHint(false);
        setCurrentIndex((prev) => prev + 1);
        setCardStartTime(Date.now());
      } else {
        // Session complete!
        setSessionCompleted(true);
        triggerConfetti();
      }
    } catch (err) {
      console.error('Failed to record review:', err);
      alert('Failed to submit card review. Please try again.');
    } finally {
      setSubmittingRating(false);
    }
  };

  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#6366f1', '#10b981', '#f59e0b', '#3b82f6'],
      });
    } catch (e) {
      // Ignore if confetti fails
    }
  };

  // SM-2 Rating Button Configurations
  const ratingButtons = [
    {
      grade: 1,
      label: 'Again',
      shortcut: '1',
      desc: '<1 day (Reset)',
      bg: 'bg-rose-950/60 border-rose-800/60 text-rose-300 hover:bg-rose-900',
    },
    {
      grade: 2,
      label: 'Hard',
      shortcut: '2',
      desc: '1 day',
      bg: 'bg-orange-950/60 border-orange-800/60 text-orange-300 hover:bg-orange-900',
    },
    {
      grade: 3,
      label: 'Good',
      shortcut: '3',
      desc: currentCard?.intervalPreviews?.[3]?.label || '3-6 days',
      bg: 'bg-blue-950/60 border-blue-800/60 text-blue-300 hover:bg-blue-900',
    },
    {
      grade: 4,
      label: 'Easy',
      shortcut: '4',
      desc: currentCard?.intervalPreviews?.[4]?.label || '6-12 days',
      bg: 'bg-indigo-950/60 border-indigo-800/60 text-indigo-300 hover:bg-indigo-900',
    },
    {
      grade: 5,
      label: 'Perfect',
      shortcut: '5',
      desc: currentCard?.intervalPreviews?.[5]?.label || 'Exp. scale',
      bg: 'bg-emerald-950/60 border-emerald-800/60 text-emerald-300 hover:bg-emerald-900',
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-400 flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mb-3" />
        <p className="text-xs">Assembling your SM-2 study session...</p>
      </div>
    );
  }

  // Empty Session State
  if (cards.length === 0) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-emerald-950 border border-emerald-700/50 flex items-center justify-center text-emerald-400 mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-white">All Caught Up!</h2>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            There are currently no cards due for review in <strong className="text-slate-200">{deckTitle}</strong> according to your SM-2 schedule.
          </p>

          <div className="mt-6 flex flex-col gap-2.5">
            <Link
              to={`/study/${id}?mode=cram&includeSubDecks=${includeSubDecks}`}
              className="py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition"
            >
              Practice in Cram Mode (Review All Cards)
            </Link>
            <Link
              to={`/decks/${id}`}
              className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition"
            >
              Return to Deck
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Session Completed Screen
  if (sessionCompleted) {
    const total = sessionResults.length;
    const successful = sessionResults.filter((r) => r.isSuccess).length;
    const accuracy = total > 0 ? Math.round((successful / total) * 100) : 100;
    const totalTimeSec = Math.round((Date.now() - sessionStartTime) / 1000);

    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
        <div className="max-w-lg w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center shadow-2xl relative overflow-hidden">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-indigo-600 to-emerald-500 flex items-center justify-center text-white mx-auto mb-4 shadow-xl shadow-indigo-600/30">
            <Sparkles className="w-8 h-8" />
          </div>

          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
            Session Completed
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
            Excellent Retention Work!
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Your spaced-repetition schedules have been updated in the database.
          </p>

          {/* Session Metrics Grid */}
          <div className="grid grid-cols-3 gap-3 my-6 pt-2">
            <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-800">
              <div className="text-2xl font-bold text-white">{total}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Cards Reviewed</div>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-800">
              <div className="text-2xl font-bold text-emerald-400">{accuracy}%</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Recall Accuracy</div>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-800">
              <div className="text-2xl font-bold text-indigo-400">{totalTimeSec}s</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Time Spent</div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => {
                setSessionCompleted(false);
                setCurrentIndex(0);
                setIsFlipped(false);
                setSessionResults([]);
                setSessionStartTime(Date.now());
                setCardStartTime(Date.now());
              }}
              className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Review Again</span>
            </button>

            <Link
              to="/dashboard"
              className="flex-1 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-1.5"
            >
              <span>Dashboard</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const progressPercent = Math.round(((currentIndex + 1) / cards.length) * 100);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-indigo-500 selection:text-white p-4 sm:p-6 lg:p-8">
      {/* Top Session Navigation & Progress Bar */}
      <header className="max-w-4xl w-full mx-auto flex items-center justify-between gap-4">
        <Link
          to={`/decks/${id}`}
          className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition flex items-center gap-1.5 text-xs font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Exit Session</span>
        </Link>

        {/* Center Progress Telemetry */}
        <div className="flex-1 max-w-md">
          <div className="flex justify-between items-center text-xs text-slate-400 mb-1.5">
            <span className="font-semibold text-white truncate max-w-[180px]">
              {deckTitle}
            </span>
            <span className="font-mono text-indigo-400 font-medium">
              {currentIndex + 1} / {cards.length}
            </span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Card Mastery Badge */}
        <div>
          <MasteryBadge status={currentCard?.masteryStatus} size="sm" />
        </div>
      </header>

      {/* Main 3D Interactive Flashcard Area */}
      <main className="max-w-3xl w-full mx-auto my-auto perspective-1000 py-6">
        <div
          onClick={() => setIsFlipped(!isFlipped)}
          className="relative w-full min-h-[380px] sm:min-h-[420px] cursor-pointer transition-transform duration-700 transform-style-3d group"
          style={{
            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          }}
        >
          {/* Card Front (Concept / Question) */}
          <div className="absolute inset-0 backface-hidden rounded-3xl bg-slate-900 border border-slate-800 group-hover:border-indigo-500/50 p-7 sm:p-10 flex flex-col justify-between shadow-2xl transition">
            <div>
              <div className="flex justify-between items-center text-xs text-slate-400 font-semibold mb-6">
                <span className="uppercase tracking-wider text-indigo-400 font-mono">
                  Concept • Front
                </span>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 capitalize">
                  {currentCard.difficulty || 'medium'}
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl font-bold text-white leading-relaxed">
                {currentCard.front}
              </h2>

              {/* Collapsible Hint */}
              {currentCard.hints && currentCard.hints.length > 0 && (
                <div className="mt-6">
                  {showHint ? (
                    <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-700/40 text-indigo-200 text-xs">
                      <strong>Hint:</strong> {currentCard.hints[0]}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowHint(true);
                      }}
                      className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 font-medium"
                    >
                      <HelpCircle className="w-3.5 h-3.5" /> Reveal Hint
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-between items-center text-xs text-slate-500 pt-6 border-t border-slate-800">
              <span className="hidden sm:inline">Press [Space] to flip</span>
              <span className="text-indigo-400 font-semibold flex items-center gap-1">
                <RotateCcw className="w-3.5 h-3.5" /> Click or tap to reveal answer
              </span>
            </div>
          </div>

          {/* Card Back (Verified Answer & Explanation) */}
          <div className="absolute inset-0 backface-hidden rotate-y-180 rounded-3xl bg-gradient-to-br from-indigo-950/30 via-slate-900 to-slate-950 border border-emerald-500/40 p-7 sm:p-10 flex flex-col justify-between shadow-2xl">
            <div>
              <div className="flex justify-between items-center text-xs text-emerald-400 font-semibold mb-4">
                <span className="uppercase tracking-wider font-mono">Verified Answer • Back</span>
                <span className="text-xs text-slate-400">
                  EF: {currentCard.easeFactor.toFixed(2)}
                </span>
              </div>

              <div className="text-sm sm:text-base text-slate-100 leading-relaxed whitespace-pre-line max-h-56 overflow-y-auto pr-1">
                {currentCard.back}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 text-xs text-slate-400 flex justify-between items-center">
              <span>Rate your recall quality below to schedule next review</span>
              <span className="text-slate-500 hidden sm:inline">Keys [1 - 5]</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer SM-2 Rating Controls */}
      <footer className="max-w-3xl w-full mx-auto">
        {isFlipped ? (
          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="text-center text-xs text-slate-400 font-medium">
              How well did you recall this concept?
            </div>

            <div className="grid grid-cols-5 gap-2 sm:gap-3">
              {ratingButtons.map((btn) => (
                <button
                  key={btn.grade}
                  disabled={submittingRating}
                  onClick={() => handleRateCard(btn.grade)}
                  className={`p-3 rounded-2xl border transition-all text-center flex flex-col items-center justify-center disabled:opacity-50 ${btn.bg}`}
                >
                  <div className="font-bold text-xs sm:text-sm">{btn.label}</div>
                  <div className="text-[10px] opacity-80 mt-0.5">{btn.desc}</div>
                  <span className="text-[9px] font-mono mt-1 opacity-50 hidden sm:inline">
                    [{btn.shortcut}]
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center">
            <button
              onClick={() => setIsFlipped(true)}
              className="px-8 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs sm:text-sm transition shadow-lg shadow-indigo-600/30 inline-flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Show Answer (Space)</span>
            </button>
          </div>
        )}
      </footer>
    </div>
  );
};

export default StudyPage;

