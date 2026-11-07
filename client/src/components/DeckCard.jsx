import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Folder,
  Layers,
  Clock,
  Sparkles,
  Users,
  ChevronRight,
  Play,
  CornerDownRight,
} from 'lucide-react';

const DeckCard = ({ deck, onStudy, onEdit, onDelete }) => {
  const navigate = useNavigate();

  const dueCount = deck.dueCardsCount || 0;
  const totalCards = deck.cardsCount || 0;
  const masteryScore = deck.masteryScore || 0;
  const subDecksCount = deck.subDecksCount || (deck.subDecks ? deck.subDecks.length : 0);

  const handleCardClick = (e) => {
    // If user clicked inside an action button, don't trigger card navigation
    if (e.target.closest('button')) return;
    navigate(`/decks/${deck._id}`);
  };

  return (
    <div
      onClick={handleCardClick}
      className="group relative bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-2xl p-5 transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/10 cursor-pointer flex flex-col justify-between"
    >
      {/* Top accent line with deck color */}
      <div
        className="absolute top-0 left-6 right-6 h-1 rounded-b-full opacity-70 group-hover:opacity-100 transition"
        style={{ backgroundColor: deck.color || '#6366f1' }}
      />

      <div>
        {/* Hierarchical parent pill if this is a sub-deck */}
        {deck.parentDeck && (
          <div className="flex items-center gap-1.5 text-xs text-indigo-400 font-medium mb-2.5">
            <CornerDownRight className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Sub-deck of {deck.parentDeck.title || 'Parent Deck'}</span>
          </div>
        )}

        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2.5">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white shadow-inner"
              style={{
                backgroundColor: deck.color || '#6366f1',
                boxShadow: `0 4px 14px ${deck.color || '#6366f1'}33`,
              }}
            >
              {subDecksCount > 0 ? <Folder className="w-5 h-5" /> : <Layers className="w-5 h-5" />}
            </div>

            <div>
              <h3 className="font-semibold text-slate-100 group-hover:text-indigo-300 transition text-base line-clamp-1">
                {deck.title}
              </h3>
              <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                <span>{totalCards} cards</span>
                {subDecksCount > 0 && (
                  <>
                    <span>•</span>
                    <span className="text-indigo-400">{subDecksCount} sub-decks</span>
                  </>
                )}
                {deck.collaborators && deck.collaborators.length > 0 && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-slate-400">
                      <Users className="w-3 h-3" /> {deck.collaborators.length}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Due count alert badge */}
          {dueCount > 0 ? (
            <span className="inline-flex items-center gap-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs px-2.5 py-1 rounded-full font-semibold animate-pulse-subtle">
              <Clock className="w-3 h-3" />
              {dueCount} due
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs px-2 py-0.5 rounded-full font-medium">
              Caught up
            </span>
          )}
        </div>

        {/* Description */}
        {deck.description && (
          <p className="text-xs text-slate-400 line-clamp-2 mt-2 leading-relaxed">
            {deck.description}
          </p>
        )}

        {/* Tags */}
        {deck.tags && deck.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {deck.tags.slice(0, 3).map((tag, idx) => (
              <span
                key={idx}
                className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700/60"
              >
                #{tag}
              </span>
            ))}
            {deck.tags.length > 3 && (
              <span className="text-[11px] text-slate-400 self-center">
                +{deck.tags.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Footer & Actions */}
      <div className="mt-5 pt-4 border-t border-slate-800/80">
        {/* Mastery Progress Bar */}
        <div className="mb-3">
          <div className="flex justify-between items-center text-[11px] text-slate-400 mb-1">
            <span className="flex items-center gap-1 font-medium">
              <Sparkles className="w-3 h-3 text-indigo-400" /> Mastery Level
            </span>
            <span className="font-semibold text-slate-200">{masteryScore}%</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-indigo-500 to-emerald-400"
              style={{ width: `${Math.min(100, Math.max(5, masteryScore))}%` }}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onStudy ? onStudy(deck) : navigate(`/study/${deck._id}`);
            }}
            disabled={totalCards === 0}
            className="flex-1 inline-flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-medium text-xs py-2 px-3 rounded-xl transition shadow-sm shadow-indigo-600/30"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            {dueCount > 0 ? `Study (${dueCount})` : 'Practice'}
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/decks/${deck._id}`);
            }}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition border border-slate-700/60"
            title="View Deck Details"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeckCard;

