import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Play, Clock, Sparkles, Flame, Check, FolderTree } from 'lucide-react';

const StudySessionModal = ({ isOpen, onClose, deck }) => {
  const navigate = useNavigate();
  const [mode, setMode] = useState('due'); // 'due' | 'cram' | 'new'
  const [includeSubDecks, setIncludeSubDecks] = useState(true);
  const [limit, setLimit] = useState(25);

  if (!isOpen || !deck) return null;

  const handleStartStudy = () => {
    navigate(
      `/study/${deck._id}?mode=${mode}&includeSubDecks=${includeSubDecks}&limit=${limit}`
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="mb-5">
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
            Study Session Launcher
          </span>
          <h2 className="text-xl font-bold text-white mt-1">{deck.title}</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure your spaced repetition algorithm preferences.
          </p>
        </div>

        {/* Study Mode Selection */}
        <div className="space-y-3 mb-6">
          <label className="text-xs font-semibold text-slate-300">Choose Study Mode</label>

          <div className="grid grid-cols-1 gap-2.5">
            {/* Mode 1: Due Cards */}
            <div
              onClick={() => setMode('due')}
              className={`p-3.5 rounded-2xl border cursor-pointer transition flex items-center justify-between ${
                mode === 'due'
                  ? 'bg-indigo-950/40 border-indigo-500 text-white shadow-sm'
                  : 'bg-slate-800/40 border-slate-700/60 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-xl ${
                    mode === 'due' ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-400'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-sm">Due for Review (SM-2)</div>
                  <div className="text-xs text-slate-400">
                    Cards scheduled for retention reinforcement today
                  </div>
                </div>
              </div>
              {mode === 'due' && <Check className="w-4 h-4 text-indigo-400" />}
            </div>

            {/* Mode 2: Cram Mode */}
            <div
              onClick={() => setMode('cram')}
              className={`p-3.5 rounded-2xl border cursor-pointer transition flex items-center justify-between ${
                mode === 'cram'
                  ? 'bg-indigo-950/40 border-indigo-500 text-white shadow-sm'
                  : 'bg-slate-800/40 border-slate-700/60 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-xl ${
                    mode === 'cram' ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-400'
                  }`}
                >
                  <Flame className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-sm">Cram All Cards</div>
                  <div className="text-xs text-slate-400">
                    Review all cards in deck regardless of due date
                  </div>
                </div>
              </div>
              {mode === 'cram' && <Check className="w-4 h-4 text-indigo-400" />}
            </div>

            {/* Mode 3: New Cards Only */}
            <div
              onClick={() => setMode('new')}
              className={`p-3.5 rounded-2xl border cursor-pointer transition flex items-center justify-between ${
                mode === 'new'
                  ? 'bg-indigo-950/40 border-indigo-500 text-white shadow-sm'
                  : 'bg-slate-800/40 border-slate-700/60 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-xl ${
                    mode === 'new' ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-400'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-sm">New Cards Only</div>
                  <div className="text-xs text-slate-400">
                    Focus strictly on cards you haven't reviewed yet
                  </div>
                </div>
              </div>
              {mode === 'new' && <Check className="w-4 h-4 text-indigo-400" />}
            </div>
          </div>
        </div>

        {/* Options */}
        <div className="space-y-4 mb-6 pt-3 border-t border-slate-800">
          {/* Include child sub-decks */}
          <label className="flex items-center justify-between cursor-pointer">
            <span className="flex items-center gap-2 text-xs font-medium text-slate-300">
              <FolderTree className="w-4 h-4 text-indigo-400" />
              Include child sub-decks
            </span>
            <input
              type="checkbox"
              checked={includeSubDecks}
              onChange={(e) => setIncludeSubDecks(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-800 border-slate-700"
            />
          </label>

          {/* Session Card Limit */}
          <div>
            <div className="flex justify-between items-center text-xs text-slate-400 mb-1.5">
              <span className="font-medium text-slate-300">Session Limit</span>
              <span className="text-indigo-400 font-bold">{limit} cards</span>
            </div>
            <div className="flex gap-2">
              {[10, 20, 30, 50].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setLimit(val)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition ${
                    limit === val
                      ? 'bg-indigo-600 border-indigo-500 text-white'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  {val}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Start Button */}
        <button
          onClick={handleStartStudy}
          className="w-full py-3.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2"
        >
          <Play className="w-4 h-4 fill-current" />
          Launch Study Session
        </button>
      </div>
    </div>
  );
};

export default StudySessionModal;

