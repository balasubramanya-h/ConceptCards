import React, { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, Eye, ArrowRight } from 'lucide-react';

const DuplicateWarningBadge = ({
  matches = [],
  onSelectExisting,
  onProceedAnyway,
  isFormSubmitting = false,
}) => {
  const [expanded, setExpanded] = useState(false);

  if (!matches || matches.length === 0) {
    return null;
  }

  const topMatch = matches[0];
  const isExact = topMatch.similarityPercentage >= 95;

  return (
    <div
      className={`rounded-xl border p-4 transition-all duration-200 ${
        isExact
          ? 'bg-rose-950/40 border-rose-600/50 text-rose-200'
          : 'bg-amber-950/40 border-amber-600/50 text-amber-200'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div
            className={`p-2 rounded-lg shrink-0 ${
              isExact ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'
            }`}
          >
            <AlertTriangle className="w-5 h-5" />
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm">
                {isExact ? 'Exact Duplicate Detected!' : 'Potential Duplicate Detected'}
              </span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                  isExact
                    ? 'bg-rose-500/30 text-rose-300 border border-rose-500/50'
                    : 'bg-amber-500/30 text-amber-300 border border-amber-500/50'
                }`}
              >
                {topMatch.similarityPercentage}% Match
              </span>
            </div>

            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              A card with identical or closely related concept content already exists in this deck.
              Review the existing card to avoid duplicate study load.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="text-xs flex items-center gap-1 font-medium hover:underline shrink-0 text-slate-300"
        >
          {expanded ? 'Hide Match' : 'Inspect'}
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Expanded Match Details */}
      {expanded && (
        <div className="mt-4 pt-3 border-t border-slate-700/50 space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Existing Matched Card ({matches.length} found)
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {matches.map((match, idx) => (
              <div
                key={match.cardId || idx}
                className="bg-slate-900/90 rounded-lg p-3 border border-slate-800 text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-indigo-400 font-medium">Front (Question):</span>
                  <span className="text-amber-400 font-bold">{match.similarityPercentage}% match</span>
                </div>
                <p className="text-slate-100 font-medium pl-2 border-l-2 border-indigo-500">
                  {match.front}
                </p>

                <div className="font-mono text-emerald-400 font-medium pt-1">Back (Answer):</div>
                <p className="text-slate-300 pl-2 border-l-2 border-emerald-500 line-clamp-2">
                  {match.back}
                </p>

                {onSelectExisting && (
                  <div className="pt-1.5 flex justify-end">
                    <button
                      type="button"
                      onClick={() => onSelectExisting(match)}
                      className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 hover:underline text-xs"
                    >
                      <Eye className="w-3.5 h-3.5" /> View / Edit this card
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action CTA */}
      {onProceedAnyway && (
        <div className="mt-3 pt-3 border-t border-slate-700/50 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onProceedAnyway}
            disabled={isFormSubmitting}
            className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition flex items-center gap-1 font-medium disabled:opacity-50"
          >
            Create Anyway (Override Prevention)
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};

export default DuplicateWarningBadge;

