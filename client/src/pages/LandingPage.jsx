import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import {
  Brain,
  ShieldAlert,
  FolderTree,
  Users2,
  Sparkles,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
  Play,
  Zap,
} from 'lucide-react';

const LandingPage = () => {
  const navigate = useNavigate();
  const [flipped, setFlipped] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28">
        {/* Glow ambient background lights */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-indigo-600/15 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute top-1/3 left-1/4 w-[350px] h-[350px] bg-violet-600/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            {/* Tagline Pill */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-950/60 border border-indigo-700/50 text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-6 shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Next-Generation Spaced Repetition Platform</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.15]">
              Master Complex Concepts{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-violet-300 to-indigo-200">
                Without Forgetting
              </span>
            </h1>

            <p className="mt-6 text-base sm:text-lg text-slate-400 leading-relaxed">
              ConceptCards combines the mathematical precision of the{' '}
              <strong className="text-slate-200">SuperMemo SM-2 algorithm</strong>, real-time{' '}
              <strong className="text-slate-200">multi-algorithm duplicate prevention</strong>, and{' '}
              <strong className="text-slate-200">hierarchical sub-deck nesting</strong> into a
              collaborative learning experience.
            </p>

            {/* CTAs */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/register"
                className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 group"
              >
                <span>Get Started Free</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
              </Link>
              <Link
                to="/login"
                className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 font-semibold text-sm transition flex items-center justify-center gap-2"
              >
                <Zap className="w-4 h-4 text-amber-400" />
                <span>Try Demo Account</span>
              </Link>
            </div>
          </div>

          {/* Interactive Hero Flashcard Demo */}
          <div className="mt-14 max-w-xl mx-auto perspective-1000">
            <div className="text-center mb-3">
              <span className="text-xs font-medium text-slate-400 flex items-center justify-center gap-1.5">
                <RotateCcw className="w-3.5 h-3.5 text-indigo-400 animate-spin-reverse" />
                Click card below to interactively test the 3D flip animation
              </span>
            </div>

            <div
              onClick={() => setFlipped(!flipped)}
              className="relative w-full h-72 cursor-pointer transition-transform duration-700 transform-style-3d group"
              style={{
                transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
              }}
            >
              {/* Front of Card */}
              <div className="absolute inset-0 backface-hidden rounded-3xl bg-gradient-to-br from-slate-900 to-slate-950 border border-indigo-500/30 p-7 flex flex-col justify-between shadow-2xl shadow-indigo-950/40 group-hover:border-indigo-500/60 transition">
                <div>
                  <div className="flex justify-between items-center text-xs text-indigo-400 font-semibold mb-4">
                    <span className="uppercase tracking-wider">Concept Question • Front</span>
                    <span className="bg-indigo-950/80 px-2.5 py-0.5 rounded-full border border-indigo-800/50">
                      Distributed Systems
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-white leading-snug">
                    What does the CAP Theorem state regarding partition tolerance in distributed data stores?
                  </h3>
                </div>

                <div className="flex justify-between items-center text-xs text-slate-400 pt-4 border-t border-slate-800">
                  <span>Press Space or Click to Flip</span>
                  <span className="text-indigo-400 font-medium">Reveal Explanation →</span>
                </div>
              </div>

              {/* Back of Card */}
              <div
                className="absolute inset-0 backface-hidden rotate-y-180 rounded-3xl bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-950 border border-emerald-500/40 p-7 flex flex-col justify-between shadow-2xl shadow-emerald-950/20"
              >
                <div>
                  <div className="flex justify-between items-center text-xs text-emerald-400 font-semibold mb-3">
                    <span className="uppercase tracking-wider">Verified Answer • Back</span>
                    <span className="bg-emerald-950/80 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-800/50">
                      SM-2 Ready
                    </span>
                  </div>
                  <p className="text-sm text-slate-200 leading-relaxed">
                    Under a network partition (P), a distributed system must choose between{' '}
                    <strong className="text-emerald-300">Consistency</strong> (every read receives the latest write) and{' '}
                    <strong className="text-indigo-300">Availability</strong> (every non-failing node responds without error). Both cannot be guaranteed simultaneously.
                  </p>
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-slate-800 text-xs">
                  <span className="text-slate-400">Next Scheduled Interval:</span>
                  <span className="font-bold text-emerald-400">+6 Days (Ease: 2.6)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Pillar Grid */}
      <section className="py-20 bg-slate-900/40 border-t border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-white tracking-tight">
              Engineered for Cognitive Retention
            </h2>
            <p className="text-sm text-slate-400 mt-2">
              Every detail is calibrated to eliminate redundant work and maximize long-term recall.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Feature 1: SM-2 */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 hover:border-indigo-500/40 transition">
              <div className="w-12 h-12 rounded-xl bg-indigo-950 border border-indigo-700/50 flex items-center justify-center text-indigo-400 mb-5">
                <Brain className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-lg text-white mb-2">Automated SM-2</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Implementation of SuperMemo SM-2 mathematical spacing. Intelligently expands intervals based on your recall rating (0-5) to beat the forgetting curve.
              </p>
            </div>

            {/* Feature 2: Duplicate Prevention */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 hover:border-amber-500/40 transition">
              <div className="w-12 h-12 rounded-xl bg-amber-950 border border-amber-700/50 flex items-center justify-center text-amber-400 mb-5">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-lg text-white mb-2">Duplicate Prevention</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Multi-algorithm deduplication combining Normalized Levenshtein, Token Sort, and Jaccard word sets. Flags redundant concepts before you create them.
              </p>
            </div>

            {/* Feature 3: Hierarchical Structure */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 hover:border-blue-500/40 transition">
              <div className="w-12 h-12 rounded-xl bg-blue-950 border border-blue-700/50 flex items-center justify-center text-blue-400 mb-5">
                <FolderTree className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-lg text-white mb-2">Hierarchical Nesting</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Nest sub-decks inside parent categories (e.g. Computer Science → Distributed Systems → Consensus). Study a single sub-deck or aggregate the entire branch.
              </p>
            </div>

            {/* Feature 4: Collaboration */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 hover:border-emerald-500/40 transition">
              <div className="w-12 h-12 rounded-xl bg-emerald-950 border border-emerald-700/50 flex items-center justify-center text-emerald-400 mb-5">
                <Users2 className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-lg text-white mb-2">Team Collaboration</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Invite teammates as Editors or Viewers. Build collective flashcard repositories for exams, engineering onboarding, and technical certifications.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Banner */}
      <section className="py-16 bg-gradient-to-b from-slate-950 to-indigo-950/20 border-t border-slate-800">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white">Start Building Your Knowledge Vault</h2>
          <p className="mt-3 text-slate-400 text-sm max-w-xl mx-auto">
            Join developers, medical students, and researchers retaining critical knowledge with automated spaced intervals.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link
              to="/register"
              className="px-8 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition shadow-lg shadow-indigo-600/30"
            >
              Create Free Account
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto py-8 border-t border-slate-900 bg-slate-950 text-slate-500 text-xs text-center">
        <p>© 2026 ConceptCards. Built with Express, MongoDB Atlas, React & SuperMemo SM-2.</p>
      </footer>
    </div>
  );
};

export default LandingPage;

