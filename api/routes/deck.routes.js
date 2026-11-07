const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Deck = require('../models/Deck');
const Card = require('../models/Card');
const User = require('../models/User');
const { protect, optionalAuth } = require('../middleware/auth');
const { validateDeck } = require('../middleware/validate');

/**
 * Helper: Recursively build breadcrumb ancestor chain for hierarchical navigation
 */
async function getDeckBreadcrumbs(deckId) {
  const breadcrumbs = [];
  let currentId = deckId;
  const visited = new Set();

  while (currentId && !visited.has(currentId.toString())) {
    visited.add(currentId.toString());
    const deck = await Deck.findById(currentId).select('_id title parentDeck');
    if (!deck) break;
    breadcrumbs.unshift({ _id: deck._id, title: deck.title });
    currentId = deck.parentDeck;
  }

  return breadcrumbs;
}

/**
 * @route   GET /api/decks
 * @desc    Get all decks accessible to user (owned, collaborated, or public)
 * @access  Private / Optional
 */
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const { parentDeck, search, tag, isPublic, filter } = req.query;
    const userId = req.user ? req.user._id : null;

    const query = {};

    // Filter by ownership or access
    if (filter === 'public' || (!userId && isPublic === 'true')) {
      query.isPublic = true;
    } else if (userId) {
      if (filter === 'shared') {
        query['collaborators.user'] = userId;
      } else if (filter === 'owned') {
        query.owner = userId;
      } else {
        // Default: owned by user, collaborated with user, or public
        query.$or = [
          { owner: userId },
          { 'collaborators.user': userId },
          { isPublic: true },
        ];
      }
    } else {
      query.isPublic = true;
    }

    // Hierarchical filter: root decks (parentDeck is null/empty) or sub-decks of specific parent
    if (parentDeck === 'root' || parentDeck === 'null') {
      query.parentDeck = null;
    } else if (parentDeck && mongoose.Types.ObjectId.isValid(parentDeck)) {
      query.parentDeck = parentDeck;
    }

    // Search by title or description
    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$and = query.$and || [];
      query.$and.push({
        $or: [{ title: regex }, { description: regex }, { tags: regex }],
      });
    }

    // Filter by tag
    if (tag && tag.trim()) {
      query.tags = tag.trim();
    }

    const decks = await Deck.find(query)
      .populate('owner', 'name email avatar')
      .populate('collaborators.user', 'name email avatar')
      .populate('parentDeck', 'title')
      .sort({ updatedAt: -1 });

    // Calculate due cards count for each deck for the current user
    const now = new Date();
    const decksWithStats = await Promise.all(
      decks.map(async (deck) => {
        const totalCards = await Card.countDocuments({ deck: deck._id });
        const dueCards = await Card.countDocuments({
          deck: deck._id,
          dueDate: { $lte: now },
        });
        const subDecksCount = await Deck.countDocuments({ parentDeck: deck._id });

        const isOwner = userId ? deck.owner._id.toString() === userId.toString() : false;
        const canEdit = deck.canEdit(userId);

        return {
          ...deck.toObject(),
          cardsCount: totalCards,
          dueCardsCount: dueCards,
          subDecksCount,
          isOwner,
          canEdit,
        };
      })
    );

    res.json({
      success: true,
      count: decksWithStats.length,
      decks: decksWithStats,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/decks/tree
 * @desc    Get hierarchical tree of user decks
 * @access  Private
 */
router.get('/tree', protect, async (req, res, next) => {
  try {
    const userId = req.user._id;
    const allUserDecks = await Deck.find({
      $or: [{ owner: userId }, { 'collaborators.user': userId }],
    }).select('_id title parentDeck color cardsCount');

    // Build hierarchy tree
    const deckMap = new Map();
    allUserDecks.forEach((d) => {
      deckMap.set(d._id.toString(), { ...d.toObject(), children: [] });
    });

    const rootDecks = [];
    allUserDecks.forEach((d) => {
      const current = deckMap.get(d._id.toString());
      if (d.parentDeck && deckMap.has(d.parentDeck.toString())) {
        deckMap.get(d.parentDeck.toString()).children.push(current);
      } else {
        rootDecks.push(current);
      }
    });

    res.json({
      success: true,
      tree: rootDecks,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/decks
 * @desc    Create a new deck (with optional parentDeck for hierarchy)
 * @access  Private
 */
router.post('/', protect, validateDeck, async (req, res, next) => {
  try {
    const { title, description, parentDeck, tags, color, isPublic } = req.body;

    // Verify parent deck if provided
    let parentDeckId = null;
    if (parentDeck && mongoose.Types.ObjectId.isValid(parentDeck)) {
      const parent = await Deck.findById(parentDeck);
      if (!parent) {
        return res.status(404).json({
          success: false,
          message: 'Specified parent deck not found',
        });
      }
      if (!parent.canEdit(req.user._id)) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to add sub-decks to this deck',
        });
      }
      parentDeckId = parent._id;
    }

    const deck = await Deck.create({
      title: title.trim(),
      description: description ? description.trim() : '',
      parentDeck: parentDeckId,
      owner: req.user._id,
      tags: Array.isArray(tags) ? tags : typeof tags === 'string' && tags ? tags.split(',').map((t) => t.trim()) : [],
      color: color || '#6366f1',
      isPublic: Boolean(isPublic),
    });

    res.status(201).json({
      success: true,
      message: 'Deck created successfully',
      deck,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/decks/:id
 * @desc    Get deck details by ID with breadcrumb trail & sub-decks
 * @access  Private / Optional
 */
router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid deck ID' });
    }

    const deck = await Deck.findById(id)
      .populate('owner', 'name email avatar')
      .populate('collaborators.user', 'name email avatar')
      .populate('parentDeck', 'title');

    if (!deck) {
      return res.status(404).json({ success: false, message: 'Deck not found' });
    }

    const userId = req.user ? req.user._id : null;
    if (!deck.canView(userId)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view this deck',
      });
    }

    // Fetch breadcrumb hierarchy chain
    const breadcrumbs = await getDeckBreadcrumbs(deck._id);

    // Fetch child sub-decks
    const subDecks = await Deck.find({ parentDeck: deck._id })
      .populate('owner', 'name email')
      .sort({ title: 1 });

    // Fetch card metrics
    const totalCards = await Card.countDocuments({ deck: deck._id });
    const now = new Date();
    const dueCards = await Card.countDocuments({
      deck: deck._id,
      dueDate: { $lte: now },
    });

    const isOwner = userId ? deck.owner._id.toString() === userId.toString() : false;
    const canEdit = deck.canEdit(userId);

    res.json({
      success: true,
      deck: {
        ...deck.toObject(),
        cardsCount: totalCards,
        dueCardsCount: dueCards,
        breadcrumbs,
        subDecks,
        isOwner,
        canEdit,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/decks/:id/export
 * @desc    Export deck and cards as JSON or CSV
 * @access  Private / Optional
 */
router.get('/:id/export', optionalAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { format = 'json' } = req.query;

    const deck = await Deck.findById(id);
    if (!deck) {
      return res.status(404).json({ success: false, message: 'Deck not found' });
    }

    const userId = req.user ? req.user._id : null;
    if (!deck.canView(userId)) {
      return res.status(403).json({ success: false, message: 'Permission denied' });
    }

    const cards = await Card.find({ deck: id }).select('front back hints tags difficulty masteryStatus');

    if (format === 'csv') {
      const csvHeader = '"Front","Back","Hints","Tags","Difficulty"\n';
      const csvRows = cards
        .map((c) => {
          const escapeCsv = (val) => `"${(val || '').replace(/"/g, '""')}"`;
          return [
            escapeCsv(c.front),
            escapeCsv(c.back),
            escapeCsv((c.hints || []).join('; ')),
            escapeCsv((c.tags || []).join('; ')),
            escapeCsv(c.difficulty || 'medium'),
          ].join(',');
        })
        .join('\n');

      const safeTitle = deck.title.replace(/[^a-zA-Z0-9_-]/g, '_');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}_cards.csv"`);
      return res.send(csvHeader + csvRows);
    }

    res.json({
      success: true,
      exportedAt: new Date().toISOString(),
      deck: {
        title: deck.title,
        description: deck.description,
        tags: deck.tags,
        color: deck.color,
      },
      cardsCount: cards.length,
      cards: cards.map((c) => ({
        front: c.front,
        back: c.back,
        hints: c.hints,
        tags: c.tags,
        difficulty: c.difficulty,
        masteryStatus: c.masteryStatus,
      })),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/decks/:id
 * @desc    Update deck details (and move in hierarchy)
 * @access  Private
 */
router.put('/:id', protect, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, parentDeck, tags, color, isPublic } = req.body;

    const deck = await Deck.findById(id);
    if (!deck) {
      return res.status(404).json({ success: false, message: 'Deck not found' });
    }

    if (!deck.canEdit(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to modify this deck',
      });
    }

    if (title && title.trim()) deck.title = title.trim();
    if (description !== undefined) deck.description = description.trim();
    if (tags !== undefined) {
      deck.tags = Array.isArray(tags) ? tags : typeof tags === 'string' && tags ? tags.split(',').map((t) => t.trim()) : [];
    }
    if (color) deck.color = color;
    if (isPublic !== undefined) deck.isPublic = Boolean(isPublic);

    // Prevent circular hierarchy (deck cannot be its own parent or child's parent)
    if (parentDeck !== undefined) {
      if (!parentDeck || parentDeck === 'null' || parentDeck === '') {
        deck.parentDeck = null;
      } else if (parentDeck.toString() === id.toString()) {
        return res.status(400).json({
          success: false,
          message: 'A deck cannot be its own parent deck',
        });
      } else if (mongoose.Types.ObjectId.isValid(parentDeck)) {
        deck.parentDeck = parentDeck;
      }
    }

    await deck.save();

    res.json({
      success: true,
      message: 'Deck updated successfully',
      deck,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/decks/:id
 * @desc    Delete deck and recursively clean up child decks and cards
 * @access  Private
 */
router.delete('/:id', protect, async (req, res, next) => {
  try {
    const { id } = req.params;
    const deck = await Deck.findById(id);

    if (!deck) {
      return res.status(404).json({ success: false, message: 'Deck not found' });
    }

    // Only owner can delete deck
    if (deck.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only the deck owner can delete this deck',
      });
    }

    // Collect all descendant sub-deck IDs to clean up
    const deckIdsToDelete = [deck._id];
    let queue = [deck._id];

    while (queue.length > 0) {
      const currentParent = queue.shift();
      const children = await Deck.find({ parentDeck: currentParent }).select('_id');
      for (const child of children) {
        deckIdsToDelete.push(child._id);
        queue.push(child._id);
      }
    }

    // Delete all cards associated with this deck and its child sub-decks
    await Card.deleteMany({ deck: { $in: deckIdsToDelete } });

    // Delete decks
    await Deck.deleteMany({ _id: { $in: deckIdsToDelete } });

    res.json({
      success: true,
      message: `Deleted deck and ${deckIdsToDelete.length - 1} sub-decks successfully`,
      deletedDeckCount: deckIdsToDelete.length,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/decks/:id/collaborators
 * @desc    Invite/add collaborator to deck by email
 * @access  Private (Owner only)
 */
router.post('/:id/collaborators', protect, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { email, role } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: 'Collaborator email is required' });
    }

    const deck = await Deck.findById(id);
    if (!deck) {
      return res.status(404).json({ success: false, message: 'Deck not found' });
    }

    if (deck.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only the owner can manage collaborators',
      });
    }

    const collaboratorUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (!collaboratorUser) {
      return res.status(404).json({
        success: false,
        message: 'No registered user found with that email address',
      });
    }

    if (collaboratorUser._id.toString() === deck.owner.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Owner cannot be added as a collaborator',
      });
    }

    const existingCollab = deck.collaborators.find(
      (c) => c.user.toString() === collaboratorUser._id.toString()
    );

    if (existingCollab) {
      existingCollab.role = role === 'editor' ? 'editor' : 'viewer';
    } else {
      deck.collaborators.push({
        user: collaboratorUser._id,
        role: role === 'editor' ? 'editor' : 'viewer',
        addedAt: new Date(),
      });
    }

    await deck.save();

    const updatedDeck = await Deck.findById(id).populate('collaborators.user', 'name email avatar');

    res.json({
      success: true,
      message: `Collaborator ${collaboratorUser.name} added successfully as ${role || 'viewer'}`,
      collaborators: updatedDeck.collaborators,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/decks/:id/collaborators/:userId
 * @desc    Remove collaborator from deck
 * @access  Private (Owner only)
 */
router.delete('/:id/collaborators/:userId', protect, async (req, res, next) => {
  try {
    const { id, userId } = req.params;
    const deck = await Deck.findById(id);

    if (!deck) {
      return res.status(404).json({ success: false, message: 'Deck not found' });
    }

    if (deck.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only the owner can remove collaborators',
      });
    }

    deck.collaborators = deck.collaborators.filter(
      (c) => c.user.toString() !== userId.toString()
    );

    await deck.save();

    res.json({
      success: true,
      message: 'Collaborator removed successfully',
      collaborators: deck.collaborators,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

