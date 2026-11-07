import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';
import Navbar from '../components/Navbar';
import MasteryBadge from '../components/MasteryBadge';
import DuplicateWarningBadge from '../components/DuplicateWarningBadge';
import StudySessionModal from '../components/StudySessionModal';
import {
  Layers,
  ChevronRight,
  Play,
  Plus,
  Users,
  Settings,
  Trash2,
  FolderTree,
  Folder,
  Search,
  Clock,
  Sparkles,
  HelpCircle,
  AlertTriangle,
  Loader2,
  X,
  Edit2,
  Check,
  CornerDownRight,
  UserPlus,
  Download,
  Upload,
  FileText,
} from 'lucide-react';

const DeckDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [deck, setDeck] = useState(null);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cardSearchQuery, setCardSearchQuery] = useState('');
  const [selectedMasteryFilter, setSelectedMasteryFilter] = useState('');

  // Modals
  const [studyModalOpen, setStudyModalOpen] = useState(false);
  const [cardModalOpen, setCardModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  const [collabModalOpen, setCollabModalOpen] = useState(false);
  const [subDeckModalOpen, setSubDeckModalOpen] = useState(false);

  // Card Form State
  const [cardFront, setCardFront] = useState('');
  const [cardBack, setCardBack] = useState('');
  const [cardHints, setCardHints] = useState('');
  const [cardTags, setCardTags] = useState('');
  const [cardDifficulty, setCardDifficulty] = useState('medium');
  const [cardSubmitting, setCardSubmitting] = useState(false);
  const [cardFormError, setCardFormError] = useState('');

  // Real-Time Duplicate Prevention State
  const [duplicateMatches, setDuplicateMatches] = useState([]);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);
  const debounceTimerRef = useRef(null);

  // Collaborator State
  const [collabEmail, setCollabEmail] = useState('');
  const [collabRole, setCollabRole] = useState('viewer');
  const [collabLoading, setCollabLoading] = useState(false);
  const [collabMsg, setCollabMsg] = useState('');

  // Sub-deck Form State
  const [subDeckTitle, setSubDeckTitle] = useState('');
  const [subDeckDesc, setSubDeckDesc] = useState('');

  // Fetch Deck & Cards
  const loadDeckAndCards = async () => {
    try {
      setLoading(true);
      const [deckRes, cardsRes] = await Promise.all([
        api.get(`/api/decks/${id}`),
        api.get(`/api/cards/deck/${id}`),
      ]);

      if (deckRes.data.success) {
        setDeck(deckRes.data.deck);
      }
      if (cardsRes.data.success) {
        setCards(cardsRes.data.cards);
      }
    } catch (err) {
      console.error('Error fetching deck:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDeckAndCards();
  }, [id]);

  // Real-time Duplicate Check debounced as user types Front concept
  useEffect(() => {
    if (!cardFront.trim() || !id) {
      setDuplicateMatches([]);
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      try {
        setIsCheckingDuplicate(true);
        const res = await api.post('/api/cards/check-duplicate', {
          deckId: id,
          front: cardFront.trim(),
          excludeCardId: editingCard ? editingCard._id : null,
        });

        if (res.data.success && res.data.matches) {
          setDuplicateMatches(res.data.matches);
        }
      } catch (err) {
        console.warn('Duplicate check request error:', err.message);
      } finally {
        setIsCheckingDuplicate(false);
      }
    }, 400);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [cardFront, editingCard, id]);

  const openAddCardModal = () => {
    setEditingCard(null);
    setCardFront('');
    setCardBack('');
    setCardHints('');
    setCardTags('');
    setCardDifficulty('medium');
    setDuplicateMatches([]);
    setCardFormError('');
    setCardModalOpen(true);
  };

  const openEditCardModal = (card) => {
    setEditingCard(card);
    setCardFront(card.front);
    setCardBack(card.back);
    setCardHints(card.hints ? card.hints.join(', ') : '');
    setCardTags(card.tags ? card.tags.join(', ') : '');
    setCardDifficulty(card.difficulty || 'medium');
    setDuplicateMatches([]);
    setCardFormError('');
    setCardModalOpen(true);
  };

  const handleSaveCard = async (forceDuplicate = false) => {
    setCardFormError('');

    if (!cardFront.trim() || !cardBack.trim()) {
      setCardFormError('Both Front (question) and Back (answer) are required.');
      return;
    }

    try {
      setCardSubmitting(true);
      const payload = {
        deck: id,
        front: cardFront.trim(),
        back: cardBack.trim(),
        hints: cardHints ? cardHints.split(',').map((h) => h.trim()) : [],
        tags: cardTags ? cardTags.split(',').map((t) => t.trim()) : [],
        difficulty: cardDifficulty,
        forceDuplicate,
      };

      let res;
      if (editingCard) {
        res = await api.put(`/api/cards/${editingCard._id}`, payload);
      } else {
        res = await api.post('/api/cards', payload);
      }

      if (res.data.success) {
        setCardModalOpen(false);
        loadDeckAndCards();
      }
    } catch (err) {
      if (err.response?.status === 409 && err.response?.data?.duplicateDetected) {
        // Duplicate flagged by server validation
        setDuplicateMatches(err.response.data.matches || []);
        setCardFormError('Duplicate card detected! Review matches above or click "Create Anyway".');
      } else {
        setCardFormError(err.response?.data?.message || 'Failed to save card');
      }
    } finally {
      setCardSubmitting(false);
    }
  };

  const handleDeleteCard = async (cardId) => {
    if (!window.confirm('Are you sure you want to delete this flashcard?')) return;
    try {
      await api.delete(`/api/cards/${cardId}`);
      loadDeckAndCards();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete card');
    }
  };

  const handleDeleteDeck = async () => {
    if (
      !window.confirm(
        'Are you sure you want to delete this deck and all of its cards and sub-decks? This action cannot be undone.'
      )
    ) {
      return;
    }
    try {
      await api.delete(`/api/decks/${id}`);
      navigate('/dashboard');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete deck');
    }
  };

  const handleAddCollaborator = async (e) => {
    e.preventDefault();
    setCollabMsg('');
    if (!collabEmail.trim()) return;

    try {
      setCollabLoading(true);
      const res = await api.post(`/api/decks/${id}/collaborators`, {
        email: collabEmail.trim(),
        role: collabRole,
      });

      if (res.data.success) {
        setCollabMsg(res.data.message);
        setCollabEmail('');
        loadDeckAndCards();
      }
    } catch (err) {
      setCollabMsg(err.response?.data?.message || 'Failed to add collaborator');
    } finally {
      setCollabLoading(false);
    }
  };

  const handleRemoveCollaborator = async (userId) => {
    try {
      await api.delete(`/api/decks/${id}/collaborators/${userId}`);
      loadDeckAndCards();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to remove collaborator');
    }
  };

  const handleCreateSubDeck = async (e) => {
    e.preventDefault();
    if (!subDeckTitle.trim()) return;

    try {
      const res = await api.post('/api/decks', {
        title: subDeckTitle.trim(),
        description: subDeckDesc.trim(),
        parentDeck: id,
        color: deck.color || '#3b82f6',
      });

      if (res.data.success) {
        setSubDeckModalOpen(false);
        setSubDeckTitle('');
        setSubDeckDesc('');
        loadDeckAndCards();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create sub-deck');
    }
  };

  // Filter cards by search & mastery status
  const filteredCards = cards.filter((card) => {
    if (selectedMasteryFilter && card.masteryStatus !== selectedMasteryFilter) {
      return false;
    }
    if (cardSearchQuery.trim()) {
      const q = cardSearchQuery.toLowerCase();
      const matchFront = card.front.toLowerCase().includes(q);
      const matchBack = card.back.toLowerCase().includes(q);
      const matchTags = card.tags?.some((t) => t.toLowerCase().includes(q));
      if (!matchFront && !matchBack && !matchTags) return false;
    }
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-400 flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mb-3" />
        <p className="text-xs">Loading deck details...</p>
      </div>
    );
  }

  if (!deck) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <Navbar />
        <div className="max-w-xl mx-auto py-24 text-center">
          <h2 className="text-2xl font-bold">Deck Not Found</h2>
          <p className="text-xs text-slate-400 mt-2">
            The requested deck could not be found or you do not have permission to view it.
          </p>
          <Link
            to="/dashboard"
            className="mt-6 inline-block px-5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const dueCardsCount = deck.dueCardsCount || 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white pb-24">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 w-full">
        {/* Hierarchical Breadcrumbs Navigation */}
        <nav className="flex items-center gap-2 text-xs text-slate-400 mb-6 flex-wrap">
          <Link to="/dashboard" className="hover:text-white transition">
            Dashboard
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
          {deck.breadcrumbs &&
            deck.breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={crumb._id}>
                {idx < deck.breadcrumbs.length - 1 ? (
                  <>
                    <Link
                      to={`/decks/${crumb._id}`}
                      className="text-indigo-400 hover:text-indigo-300 transition"
                    >
                      {crumb.title}
                    </Link>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                  </>
                ) : (
                  <span className="text-slate-200 font-semibold truncate max-w-xs">
                    {crumb.title}
                  </span>
                )}
              </React.Fragment>
            ))}
        </nav>

        {/* Deck Header Banner */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 relative overflow-hidden mb-8 shadow-xl">
          {/* Top color accent */}
          <div
            className="absolute top-0 left-0 right-0 h-1.5"
            style={{ backgroundColor: deck.color || '#6366f1' }}
          />

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-3 max-w-3xl">
              <div className="flex items-center gap-3 flex-wrap">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-md"
                  style={{ backgroundColor: deck.color || '#6366f1' }}
                >
                  <Layers className="w-5 h-5" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  {deck.title}
                </h1>
                {deck.isPublic && (
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                    Public
                  </span>
                )}
              </div>

              {deck.description && (
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {deck.description}
                </p>
              )}

              {/* Tags & Hierarchy Info */}
              <div className="flex items-center gap-2 flex-wrap pt-1">
                {deck.tags &&
                  deck.tags.map((t, idx) => (
                    <span
                      key={idx}
                      className="text-xs px-2.5 py-0.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700"
                    >
                      #{t}
                    </span>
                  ))}
                {deck.owner && (
                  <span className="text-xs text-slate-400">
                    Created by <strong className="text-slate-300">{deck.owner.name}</strong>
                  </span>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-3 flex-wrap lg:flex-col lg:items-end">
              <button
                onClick={() => setStudyModalOpen(true)}
                disabled={cards.length === 0}
                className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-semibold text-xs transition shadow-lg shadow-indigo-600/30 flex items-center gap-2"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>
                  {dueCardsCount > 0 ? `Study Due Cards (${dueCardsCount})` : 'Practice Deck'}
                </span>
              </button>

              <div className="flex items-center gap-2">
                {deck.canEdit && (
                  <>
                    <button
                      onClick={openAddCardModal}
                      className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 text-xs font-semibold transition flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Card
                    </button>

                    <button
                      onClick={() => setSubDeckModalOpen(true)}
                      className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium transition flex items-center gap-1.5"
                      title="Create a nested child sub-deck"
                    >
                      <CornerDownRight className="w-3.5 h-3.5 text-indigo-400" /> Sub-Deck
                    </button>
                  </>
                )}

                {deck.isOwner && (
                  <>
                    <button
                      onClick={() => setCollabModalOpen(true)}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                      title="Collaborators & Permissions"
                    >
                      <Users className="w-4 h-4" />
                    </button>

                    <button
                      onClick={handleDeleteDeck}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-slate-700 transition"
                      title="Delete Deck"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Child Sub-Decks Section (Hierarchical Nesting) */}
        {deck.subDecks && deck.subDecks.length > 0 && (
          <div className="mb-8 bg-slate-900/60 border border-slate-800 rounded-3xl p-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Folder className="w-4 h-4 text-indigo-400" />
                  Nested Sub-Decks ({deck.subDecks.length})
                </h2>
                <p className="text-xs text-slate-400">
                  Child decks organized under this category.
                </p>
              </div>

              {deck.canEdit && (
                <button
                  onClick={() => setSubDeckModalOpen(true)}
                  className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Sub-Deck
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {deck.subDecks.map((sub) => (
                <div
                  key={sub._id}
                  onClick={() => navigate(`/decks/${sub._id}`)}
                  className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-indigo-500/50 transition cursor-pointer flex items-center justify-between group"
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs"
                      style={{ backgroundColor: sub.color || '#3b82f6' }}
                    >
                      <Layers className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-xs text-slate-200 group-hover:text-indigo-300 transition">
                        {sub.title}
                      </h4>
                      <span className="text-[11px] text-slate-400">
                        {sub.cardsCount || 0} cards
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cards Header & Filter Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-white">
              Flashcards <span className="text-slate-400 text-sm font-normal">({cards.length})</span>
            </h2>

            {/* Filter by Mastery Status */}
            <select
              value={selectedMasteryFilter}
              onChange={(e) => setSelectedMasteryFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
            >
              <option value="">All Mastery Levels</option>
              <option value="New">New</option>
              <option value="Learning">Learning</option>
              <option value="Reviewing">Reviewing</option>
              <option value="Mastered">Mastered</option>
            </select>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={cardSearchQuery}
                onChange={(e) => setCardSearchQuery(e.target.value)}
                placeholder="Search concepts or answers..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {deck.canEdit && (
              <button
                onClick={openAddCardModal}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition shadow-sm flex items-center gap-1.5 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Card</span>
              </button>
            )}
          </div>
        </div>

        {/* Cards List */}
        {filteredCards.length === 0 ? (
          <div className="text-center py-16 bg-slate-900/40 rounded-3xl border border-slate-800">
            <HelpCircle className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white">No flashcards found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {cardSearchQuery || selectedMasteryFilter
                ? 'Try adjusting your card filters or search keyword.'
                : 'Add your first concept card with automated duplicate checking.'}
            </p>
            {deck.canEdit && (
              <button
                onClick={openAddCardModal}
                className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Add First Card
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredCards.map((card) => {
              const isDue = new Date(card.dueDate) <= new Date();

              return (
                <div
                  key={card._id}
                  className="bg-slate-900/80 border border-slate-800/80 hover:border-slate-700 rounded-2xl p-4 sm:p-5 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1 pr-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <MasteryBadge status={card.masteryStatus} size="sm" />

                      {isDue && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Due Now
                        </span>
                      )}

                      <span className="text-[11px] text-slate-400 font-mono">
                        Rep: {card.repetition} • EF: {card.easeFactor.toFixed(2)} • Interval:{' '}
                        {card.interval}d
                      </span>
                    </div>

                    {/* Question / Front */}
                    <h3 className="font-semibold text-slate-100 text-sm leading-snug">
                      {card.front}
                    </h3>

                    {/* Answer / Back */}
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {card.back}
                    </p>

                    {/* Hints & Tags */}
                    {card.hints && card.hints.length > 0 && (
                      <div className="text-[11px] text-indigo-400 italic">
                        Hint: {card.hints[0]}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  {deck.canEdit && (
                    <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                      <button
                        onClick={() => openEditCardModal(card)}
                        className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                        title="Edit Card"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleDeleteCard(card._id)}
                        className="p-2 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 transition"
                        title="Delete Card"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Study Session Launcher Modal */}
      <StudySessionModal
        isOpen={studyModalOpen}
        onClose={() => setStudyModalOpen(false)}
        deck={deck}
      />

      {/* Add / Edit Card Modal with Real-time Duplicate Prevention */}
      {cardModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setCardModalOpen(false)}
              className="absolute top-5 right-5 p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold text-white mb-1">
              {editingCard ? 'Edit Flashcard' : 'Create New Flashcard'}
            </h2>
            <p className="text-xs text-slate-400 mb-5">
              Multi-algorithm deduplication actively guards against redundant knowledge entries.
            </p>

            {/* Real-Time Duplicate Warning Badge Widget */}
            <div className="mb-4">
              <DuplicateWarningBadge
                matches={duplicateMatches}
                onSelectExisting={(matched) => {
                  const card = cards.find((c) => c._id === matched.cardId);
                  if (card) openEditCardModal(card);
                }}
                onProceedAnyway={() => handleSaveCard(true)}
                isFormSubmitting={cardSubmitting}
              />
            </div>

            {cardFormError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-950/40 border border-rose-600/40 text-rose-300 text-xs">
                {cardFormError}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveCard(false);
              }}
              className="space-y-4"
            >
              {/* Question / Concept Front */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Front: Concept Question *
                  </label>
                  {isCheckingDuplicate && (
                    <span className="text-[11px] text-indigo-400 flex items-center gap-1 font-medium">
                      <Loader2 className="w-3 h-3 animate-spin" /> Checking for duplicates...
                    </span>
                  )}
                </div>
                <textarea
                  value={cardFront}
                  onChange={(e) => setCardFront(e.target.value)}
                  required
                  rows={3}
                  placeholder="e.g. What is the difference between Write-Through and Write-Back caching?"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition resize-none"
                />
              </div>

              {/* Answer / Explanation Back */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Back: Verified Answer & Explanation *
                </label>
                <textarea
                  value={cardBack}
                  onChange={(e) => setCardBack(e.target.value)}
                  required
                  rows={4}
                  placeholder="e.g. Write-Through updates cache and database synchronously, ensuring consistency. Write-Back writes only to cache initially and flushes to database asynchronously, optimizing latency."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition resize-none"
                />
              </div>

              {/* Hints & Tags */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Hints (Optional, comma-separated)
                  </label>
                  <input
                    type="text"
                    value={cardHints}
                    onChange={(e) => setCardHints(e.target.value)}
                    placeholder="Sync vs Async cache flush"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Tags (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={cardTags}
                    onChange={(e) => setCardTags(e.target.value)}
                    placeholder="Caching, Databases, Performance"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
              </div>

              {/* Difficulty */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Initial Difficulty
                </label>
                <div className="flex gap-2">
                  {['easy', 'medium', 'hard'].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setCardDifficulty(d)}
                      className={`flex-1 py-1.5 rounded-xl text-xs font-medium capitalize border transition ${
                        cardDifficulty === d
                          ? 'bg-indigo-600 border-indigo-500 text-white'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {/* Form Actions */}
              <div className="pt-4 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setCardModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={cardSubmitting}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white font-semibold text-xs transition shadow-md shadow-indigo-600/30 flex items-center gap-1.5"
                >
                  {cardSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingCard ? 'Update Card' : 'Save Flashcard'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Collaborators Modal */}
      {collabModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl relative">
            <button
              onClick={() => setCollabModalOpen(false)}
              className="absolute top-5 right-5 p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold text-white mb-1">Deck Collaborators</h2>
            <p className="text-xs text-slate-400 mb-5">
              Invite teammates to edit or review flashcards in this deck.
            </p>

            {collabMsg && (
              <div className="mb-4 p-3 rounded-xl bg-indigo-950/60 border border-indigo-700/50 text-indigo-300 text-xs">
                {collabMsg}
              </div>
            )}

            {/* Add Collaborator Form */}
            <form onSubmit={handleAddCollaborator} className="space-y-3 mb-6">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Invite by Email
                </label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={collabEmail}
                    onChange={(e) => setCollabEmail(e.target.value)}
                    required
                    placeholder="colleague@conceptcards.io"
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                  <select
                    value={collabRole}
                    onChange={(e) => setCollabRole(e.target.value)}
                    className="px-2.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-200"
                  >
                    <option value="viewer">Viewer</option>
                    <option value="editor">Editor</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={collabLoading}
                className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition flex items-center justify-center gap-1.5"
              >
                {collabLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <UserPlus className="w-3.5 h-3.5" />
                )}
                <span>Add Collaborator</span>
              </button>
            </form>

            {/* Existing Collaborators List */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Current Access ({deck.collaborators?.length || 0})
              </span>

              {(!deck.collaborators || deck.collaborators.length === 0) && (
                <div className="text-xs text-slate-500 py-2">
                  No external collaborators added yet.
                </div>
              )}

              {deck.collaborators &&
                deck.collaborators.map((c) => (
                  <div
                    key={c.user?._id || c._id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/60 border border-slate-800 text-xs"
                  >
                    <div>
                      <div className="font-semibold text-slate-200">{c.user?.name || 'User'}</div>
                      <div className="text-[11px] text-slate-400">{c.user?.email}</div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-indigo-950 text-indigo-300 font-medium capitalize border border-indigo-800">
                        {c.role}
                      </span>
                      {deck.isOwner && (
                        <button
                          type="button"
                          onClick={() => handleRemoveCollaborator(c.user?._id)}
                          className="text-slate-400 hover:text-rose-400 transition"
                          title="Remove collaborator"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Sub-deck Creation Modal */}
      {subDeckModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl relative">
            <button
              onClick={() => setSubDeckModalOpen(false)}
              className="absolute top-5 right-5 p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold text-white mb-1">Create Sub-Deck</h2>
            <p className="text-xs text-slate-400 mb-5">
              Nests a child deck directly inside <strong className="text-slate-200">{deck.title}</strong>.
            </p>

            <form onSubmit={handleCreateSubDeck} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Sub-Deck Title *
                </label>
                <input
                  type="text"
                  value={subDeckTitle}
                  onChange={(e) => setSubDeckTitle(e.target.value)}
                  required
                  placeholder="e.g. Raft Consensus Protocol"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Description
                </label>
                <textarea
                  value={subDeckDesc}
                  onChange={(e) => setSubDeckDesc(e.target.value)}
                  rows={2}
                  placeholder="Specific concepts or chapters for this sub-deck"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setSubDeckModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition shadow-md shadow-indigo-600/30"
                >
                  Create Sub-Deck
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeckDetailsPage;

