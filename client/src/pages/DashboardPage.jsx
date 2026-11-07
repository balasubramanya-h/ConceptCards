import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../utils/api';
import Navbar from '../components/Navbar';
import DeckCard from '../components/DeckCard';
import StudySessionModal from '../components/StudySessionModal';
import {
  Layers,
  Clock,
  Flame,
  Sparkles,
  TrendingUp,
  Search,
  Plus,
  FolderTree,
  Folder,
  LayoutGrid,
  Filter,
  Users,
  CornerDownRight,
  Loader2,
  Play,
  X,
} from 'lucide-react';

const DashboardPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [decks, setDecks] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState(searchParams.get('view') === 'tree' ? 'tree' : 'all'); // 'all' | 'root' | 'sub' | 'shared' | 'tree'
  const [activeTag, setActiveTag] = useState('');
  const [treeData, setTreeData] = useState([]);

  // Study Modal state
  const [selectedDeckForStudy, setSelectedDeckForStudy] = useState(null);
  const [studyModalOpen, setStudyModalOpen] = useState(false);

  // Create Deck Modal state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newDeckTitle, setNewDeckTitle] = useState('');
  const [newDeckDesc, setNewDeckDesc] = useState('');
  const [newDeckParent, setNewDeckParent] = useState('');
  const [newDeckTags, setNewDeckTags] = useState('');
  const [newDeckColor, setNewDeckColor] = useState('#6366f1');
  const [newDeckPublic, setNewDeckPublic] = useState(false);
  const [isCreatingDeck, setIsCreatingDeck] = useState(false);
  const [createError, setCreateError] = useState('');

  const colors = [
    '#6366f1', // Indigo
    '#3b82f6', // Blue
    '#10b981', // Emerald
    '#f59e0b', // Amber
    '#ec4899', // Pink
    '#8b5cf6', // Violet
    '#06b6d4', // Cyan
  ];

  // Fetch decks & study telemetry
  const fetchData = async () => {
    try {
      setLoading(true);
      const [decksRes, statsRes, treeRes] = await Promise.all([
        api.get('/api/decks'),
        api.get('/api/study/stats'),
        api.get('/api/decks/tree'),
      ]);

      if (decksRes.data.success) {
        setDecks(decksRes.data.decks);
      }
      if (statsRes.data.success) {
        setStats(statsRes.data.stats);
      }
      if (treeRes.data.success) {
        setTreeData(treeRes.data.tree);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter Decks based on active tab, search, and tags
  const filteredDecks = decks.filter((deck) => {
    // Tab filters
    if (activeTab === 'root' && deck.parentDeck) return false;
    if (activeTab === 'sub' && !deck.parentDeck) return false;
    if (activeTab === 'shared' && deck.isOwner) return false;

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = deck.title.toLowerCase().includes(q);
      const matchDesc = deck.description?.toLowerCase().includes(q);
      const matchTags = deck.tags?.some((t) => t.toLowerCase().includes(q));
      if (!matchTitle && !matchDesc && !matchTags) return false;
    }

    // Tag filter
    if (activeTag && (!deck.tags || !deck.tags.includes(activeTag))) {
      return false;
    }

    return true;
  });

  // Extract unique tags across all decks
  const allTags = Array.from(new Set(decks.flatMap((d) => d.tags || []))).slice(0, 10);

  // Handle deck creation
  const handleCreateDeck = async (e) => {
    e.preventDefault();
    setCreateError('');

    if (!newDeckTitle.trim()) {
      setCreateError('Deck title is required');
      return;
    }

    try {
      setIsCreatingDeck(true);
      const res = await api.post('/api/decks', {
        title: newDeckTitle.trim(),
        description: newDeckDesc.trim(),
        parentDeck: newDeckParent || null,
        tags: newDeckTags ? newDeckTags.split(',').map((t) => t.trim()) : [],
        color: newDeckColor,
        isPublic: newDeckPublic,
      });

      if (res.data.success) {
        setCreateModalOpen(false);
        setNewDeckTitle('');
        setNewDeckDesc('');
        setNewDeckParent('');
        setNewDeckTags('');
        fetchData();
      }
    } catch (err) {
      setCreateError(err.response?.data?.message || 'Failed to create deck');
    } finally {
      setIsCreatingDeck(false);
    }
  };

  const handleStudyDeck = (deck) => {
    setSelectedDeckForStudy(deck);
    setStudyModalOpen(true);
  };

  // Find deck with most cards due for quick daily study
  const highestDueDeck = [...decks].sort((a, b) => (b.dueCardsCount || 0) - (a.dueCardsCount || 0))[0];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white pb-20">
      <Navbar onOpenCreateDeck={() => setCreateModalOpen(true)} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 w-full">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Study Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Automated spaced-repetition memory scheduling & hierarchical deck management.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setCreateModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition shadow-md shadow-indigo-600/30 flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Create Deck</span>
            </button>
          </div>
        </div>

        {/* Telemetry Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Card 1: Due Today */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 relative overflow-hidden group">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Cards Due
              </span>
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-white">
              {stats?.dueToday !== undefined ? stats.dueToday : 0}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <span>{stats?.dueTomorrow || 0} scheduled tomorrow</span>
            </div>
          </div>

          {/* Card 2: Current Streak */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Active Streak
              </span>
              <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <Flame className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-white">
              {stats?.streak?.current || 0}{' '}
              <span className="text-sm font-normal text-slate-400">days</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Best streak: {stats?.streak?.longest || 0} days
            </div>
          </div>

          {/* Card 3: Retention Rate */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Recall Rate
              </span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-white">
              {stats?.retentionRate !== undefined ? `${stats.retentionRate}%` : '100%'}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {stats?.totalReviews || 0} lifetime reviews
            </div>
          </div>

          {/* Card 4: Mastered Concepts */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Mastered Cards
              </span>
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Sparkles className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-white">
              {stats?.cardsBreakdown?.mastered || 0}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              out of {stats?.cardsBreakdown?.total || 0} total cards
            </div>
          </div>
        </div>

        {/* Quick Review Banner if cards are due */}
        {highestDueDeck && (highestDueDeck.dueCardsCount || 0) > 0 && (
          <div className="mb-8 rounded-2xl bg-gradient-to-r from-indigo-950/70 via-indigo-900/30 to-slate-900 border border-indigo-700/50 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl shadow-indigo-950/30">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shrink-0 shadow-lg shadow-indigo-600/40">
                <Play className="w-5 h-5 fill-current ml-0.5" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-300">
                  Ready For Review
                </span>
                <h3 className="text-lg font-bold text-white mt-0.5">
                  {highestDueDeck.title}
                </h3>
                <p className="text-xs text-slate-300">
                  {highestDueDeck.dueCardsCount} cards ready for spaced recall reinforcement.
                </p>
              </div>
            </div>

            <button
              onClick={() => handleStudyDeck(highestDueDeck)}
              className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition shadow-md shadow-indigo-600/30 flex items-center justify-center gap-2 shrink-0"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Review Now ({highestDueDeck.dueCardsCount})</span>
            </button>
          </div>
        )}

        {/* Deck Navigation & Filter Toolbar */}
        <div className="space-y-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* View Tabs */}
            <div className="flex items-center p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs overflow-x-auto">
              <button
                onClick={() => {
                  setActiveTab('all');
                  setSearchParams({});
                }}
                className={`px-3.5 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 ${
                  activeTab === 'all'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                All Decks ({decks.length})
              </button>

              <button
                onClick={() => {
                  setActiveTab('root');
                  setSearchParams({});
                }}
                className={`px-3.5 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 ${
                  activeTab === 'root'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Folder className="w-3.5 h-3.5" />
                Root Decks
              </button>

              <button
                onClick={() => {
                  setActiveTab('sub');
                  setSearchParams({});
                }}
                className={`px-3.5 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 ${
                  activeTab === 'sub'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <CornerDownRight className="w-3.5 h-3.5" />
                Sub-Decks
              </button>

              <button
                onClick={() => {
                  setActiveTab('tree');
                  setSearchParams({ view: 'tree' });
                }}
                className={`px-3.5 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 ${
                  activeTab === 'tree'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <FolderTree className="w-3.5 h-3.5" />
                Hierarchy Tree
              </button>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search decks, tags, descriptions..."
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>
          </div>

          {/* Tag Filter Pills */}
          {allTags.length > 0 && activeTab !== 'tree' && (
            <div className="flex items-center gap-1.5 flex-wrap text-xs">
              <span className="text-slate-400 text-[11px] font-medium mr-1 flex items-center gap-1">
                <Filter className="w-3 h-3" /> Filter by tag:
              </span>
              <button
                onClick={() => setActiveTag('')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                  activeTag === ''
                    ? 'bg-slate-800 text-white border border-slate-700'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                All
              </button>
              {allTags.map((t) => (
                <button
                  key={t}
                  onClick={() => setActiveTag(activeTag === t ? '' : t)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
                    activeTag === t
                      ? 'bg-indigo-950 text-indigo-300 border-indigo-700'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  #{t}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Content Area */}
        {loading ? (
          <div className="py-24 text-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mx-auto mb-3" />
            <p className="text-xs">Loading flashcard library...</p>
          </div>
        ) : activeTab === 'tree' ? (
          /* Hierarchy Tree Explorer View */
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6">
            <div className="mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <FolderTree className="w-5 h-5 text-indigo-400" />
                Hierarchical Knowledge Tree
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Recursive view of nested root decks and sub-decks with aggregated concept cards.
              </p>
            </div>

            {treeData.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                No decks found in the hierarchy.
              </div>
            ) : (
              <div className="space-y-4">
                {treeData.map((node) => (
                  <div
                    key={node._id}
                    className="border border-slate-800/80 rounded-2xl p-4 bg-slate-900/80"
                  >
                    {/* Root Node */}
                    <div className="flex items-center justify-between">
                      <div
                        onClick={() => navigate(`/decks/${node._id}`)}
                        className="flex items-center gap-3 cursor-pointer group"
                      >
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
                          style={{ backgroundColor: node.color || '#6366f1' }}
                        >
                          <Folder className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-semibold text-white group-hover:text-indigo-300 transition text-sm">
                            {node.title}
                          </span>
                          <span className="text-xs text-slate-400 ml-2">
                            ({node.cardsCount || 0} cards)
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setNewDeckParent(node._id);
                            setCreateModalOpen(true);
                          }}
                          className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-400 font-medium transition flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add Sub-Deck
                        </button>
                        <button
                          onClick={() => navigate(`/decks/${node._id}`)}
                          className="text-xs px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition"
                        >
                          Open
                        </button>
                      </div>
                    </div>

                    {/* Child Sub-Decks */}
                    {node.children && node.children.length > 0 && (
                      <div className="mt-3 ml-6 pl-4 border-l-2 border-indigo-500/30 space-y-2.5">
                        {node.children.map((child) => (
                          <div
                            key={child._id}
                            className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/40 hover:bg-slate-950/80 border border-slate-800/50 transition cursor-pointer"
                            onClick={() => navigate(`/decks/${child._id}`)}
                          >
                            <div className="flex items-center gap-2.5">
                              <CornerDownRight className="w-4 h-4 text-indigo-400 shrink-0" />
                              <div
                                className="w-6 h-6 rounded-md flex items-center justify-center text-white text-xs"
                                style={{ backgroundColor: child.color || '#3b82f6' }}
                              >
                                <Layers className="w-3 h-3" />
                              </div>
                              <span className="text-xs font-medium text-slate-200 hover:text-white">
                                {child.title}
                              </span>
                              <span className="text-[11px] text-slate-400">
                                ({child.cardsCount || 0} cards)
                              </span>
                            </div>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/decks/${child._id}`);
                              }}
                              className="text-xs text-indigo-400 hover:underline"
                            >
                              View →
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : filteredDecks.length === 0 ? (
          /* Empty State */
          <div className="text-center py-20 bg-slate-900/40 rounded-3xl border border-slate-800">
            <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-400 mx-auto mb-3">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">No decks found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {searchQuery || activeTag
                ? 'Try clearing your search query or tag filter.'
                : 'Create your first flashcard deck to begin your spaced repetition journey.'}
            </p>
            <button
              onClick={() => setCreateModalOpen(true)}
              className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Create Deck
            </button>
          </div>
        ) : (
          /* Decks Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDecks.map((deck) => (
              <DeckCard
                key={deck._id}
                deck={deck}
                onStudy={handleStudyDeck}
                onDelete={() => fetchData()}
              />
            ))}
          </div>
        )}
      </main>

      {/* Study Session Launcher Modal */}
      <StudySessionModal
        isOpen={studyModalOpen}
        onClose={() => setStudyModalOpen(false)}
        deck={selectedDeckForStudy}
      />

      {/* Create Deck Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl relative">
            <button
              onClick={() => setCreateModalOpen(false)}
              className="absolute top-5 right-5 p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold text-white mb-1">Create New Flashcard Deck</h2>
            <p className="text-xs text-slate-400 mb-5">
              Organize your concepts hierarchically or nest as a sub-deck.
            </p>

            {createError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-950/40 border border-rose-600/40 text-rose-300 text-xs">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateDeck} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Deck Title *
                </label>
                <input
                  type="text"
                  value={newDeckTitle}
                  onChange={(e) => setNewDeckTitle(e.target.value)}
                  required
                  placeholder="e.g. Distributed Consensus & Raft"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Description
                </label>
                <textarea
                  value={newDeckDesc}
                  onChange={(e) => setNewDeckDesc(e.target.value)}
                  rows={2}
                  placeholder="What knowledge or subject does this deck cover?"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition resize-none"
                />
              </div>

              {/* Hierarchical Parent Deck Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Parent Deck (Hierarchical Nesting)
                </label>
                <select
                  value={newDeckParent}
                  onChange={(e) => setNewDeckParent(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition"
                >
                  <option value="">None (Top-Level Root Deck)</option>
                  {decks
                    .filter((d) => d.isOwner)
                    .map((d) => (
                      <option key={d._id} value={d._id}>
                        {d.title}
                      </option>
                    ))}
                </select>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Select a parent deck to organize this as a nested sub-deck.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={newDeckTags}
                  onChange={(e) => setNewDeckTags(e.target.value)}
                  placeholder="CS, Systems, Algorithms, Certification"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                />
              </div>

              {/* Color Theme */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Color Theme Accent
                </label>
                <div className="flex gap-2">
                  {colors.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewDeckColor(c)}
                      className={`w-7 h-7 rounded-full transition-transform ${
                        newDeckColor === c ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-slate-900' : 'hover:scale-110'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              {/* Public Toggle */}
              <div className="pt-2">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newDeckPublic}
                    onChange={(e) => setNewDeckPublic(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-800 border-slate-700"
                  />
                  <span className="text-xs text-slate-300 font-medium">
                    Make Deck Public (Allow others to view and practice)
                  </span>
                </label>
              </div>

              <div className="pt-4 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingDeck}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white font-semibold text-xs transition shadow-md shadow-indigo-600/30 flex items-center gap-1.5"
                >
                  {isCreatingDeck && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isCreatingDeck ? 'Creating...' : 'Create Deck'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;

