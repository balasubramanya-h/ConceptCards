const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Card = require('../models/Card');
const Deck = require('../models/Deck');
const { protect, optionalAuth } = require('../middleware/auth');
const { validateCard } = require('../middleware/validate');
const { findDuplicates } = require('../utils/duplicateDetector');

/**
 * @route   POST /api/cards/check-duplicate
 * @desc    Real-time check for duplicate / similar cards in a deck or hierarchy
 * @access  Private
 */
router.post('/check-duplicate', protect, async (req, res, next) => {
  try {
    const { deckId, front, excludeCardId } = req.body;

    if (!deckId || !front || !front.trim()) {
      return res.json({
        success: true,
        isDuplicate: false,
        matches: [],
      });
    }

    // Fetch existing cards from this deck
    const existingCards = await Card.find({ deck: deckId }).select('_id front back deck');

    const matches = findDuplicates(front.trim(), existingCards, 0.70, excludeCardId);

    res.json({
      success: true,
      isDuplicate: matches.length > 0,
      matches,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/cards/deck/:deckId
 * @desc    Get all cards for a deck
 * @access  Private / Optional
 */
router.get('/deck/:deckId', optionalAuth, async (req, res, next) => {
  try {
    const { deckId } = req.params;
    const { search, masteryStatus, difficulty, sort = 'createdAt' } = req.query;

    if (!mongoose.Types.ObjectId.isValid(deckId)) {
      return res.status(400).json({ success: false, message: 'Invalid deck ID' });
    }

    const deck = await Deck.findById(deckId);
    if (!deck) {
      return res.status(404).json({ success: false, message: 'Deck not found' });
    }

    const userId = req.user ? req.user._id : null;
    if (!deck.canView(userId)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view cards in this deck',
      });
    }

    const query = { deck: deckId };

    if (masteryStatus) {
      query.masteryStatus = masteryStatus;
    }

    if (difficulty) {
      query.difficulty = difficulty;
    }

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [{ front: regex }, { back: regex }, { tags: regex }];
    }

    let sortOptions = { createdAt: -1 };
    if (sort === 'dueDate') {
      sortOptions = { dueDate: 1 };
    } else if (sort === 'repetition') {
      sortOptions = { repetition: -1 };
    } else if (sort === 'difficulty') {
      sortOptions = { difficulty: 1 };
    }

    const cards = await Card.find(query).sort(sortOptions);

    res.json({
      success: true,
      count: cards.length,
      cards,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/cards
 * @desc    Create a new card with Duplicate Prevention check
 * @access  Private
 */
router.post('/', protect, validateCard, async (req, res, next) => {
  try {
    const { deck, front, back, hints, tags, difficulty, forceDuplicate } = req.body;

    const deckDoc = await Deck.findById(deck);
    if (!deckDoc) {
      return res.status(404).json({ success: false, message: 'Deck not found' });
    }

    if (!deckDoc.canEdit(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to add cards to this deck',
      });
    }

    // Duplicate Prevention Check: scan deck for existing similar cards
    if (forceDuplicate !== true) {
      const existingCards = await Card.find({ deck }).select('_id front back');
      const matches = findDuplicates(front.trim(), existingCards, 0.80);

      if (matches.length > 0) {
        return res.status(409).json({
          success: false,
          duplicateDetected: true,
          message: 'Potential duplicate card detected. Confirm creation if intentional.',
          matches,
        });
      }
    }

    const card = await Card.create({
      deck,
      front: front.trim(),
      back: back.trim(),
      hints: Array.isArray(hints) ? hints : typeof hints === 'string' && hints ? [hints] : [],
      tags: Array.isArray(tags) ? tags : typeof tags === 'string' && tags ? tags.split(',').map((t) => t.trim()) : [],
      difficulty: difficulty || 'medium',
      createdBy: req.user._id,
      dueDate: new Date(), // New cards are immediately ready to study
    });

    // Update cardsCount on deck
    await Deck.findByIdAndUpdate(deck, { $inc: { cardsCount: 1 } });

    res.status(201).json({
      success: true,
      message: 'Card created successfully',
      card,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/cards/:id
 * @desc    Get single card details
 * @access  Private / Optional
 */
router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const card = await Card.findById(id).populate('deck', 'title owner isPublic collaborators');

    if (!card) {
      return res.status(404).json({ success: false, message: 'Card not found' });
    }

    const userId = req.user ? req.user._id : null;
    if (!card.deck.canView(userId)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view this card',
      });
    }

    res.json({
      success: true,
      card,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/cards/:id
 * @desc    Update an existing card
 * @access  Private
 */
router.put('/:id', protect, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { front, back, hints, tags, difficulty, forceDuplicate } = req.body;

    const card = await Card.findById(id).populate('deck');
    if (!card) {
      return res.status(404).json({ success: false, message: 'Card not found' });
    }

    if (!card.deck.canEdit(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to edit this card',
      });
    }

    // If front is modified, verify duplicate check against other cards
    if (front && front.trim() !== card.front && forceDuplicate !== true) {
      const otherCards = await Card.find({ deck: card.deck._id, _id: { $ne: card._id } }).select('_id front back');
      const matches = findDuplicates(front.trim(), otherCards, 0.80);

      if (matches.length > 0) {
        return res.status(409).json({
          success: false,
          duplicateDetected: true,
          message: 'Potential duplicate card detected. Confirm update if intentional.',
          matches,
        });
      }
    }

    if (front) card.front = front.trim();
    if (back) card.back = back.trim();
    if (hints !== undefined) {
      card.hints = Array.isArray(hints) ? hints : typeof hints === 'string' && hints ? [hints] : [];
    }
    if (tags !== undefined) {
      card.tags = Array.isArray(tags) ? tags : typeof tags === 'string' && tags ? tags.split(',').map((t) => t.trim()) : [];
    }
    if (difficulty) card.difficulty = difficulty;

    await card.save();

    res.json({
      success: true,
      message: 'Card updated successfully',
      card,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/cards/:id
 * @desc    Delete a card
 * @access  Private
 */
router.delete('/:id', protect, async (req, res, next) => {
  try {
    const { id } = req.params;
    const card = await Card.findById(id).populate('deck');

    if (!card) {
      return res.status(404).json({ success: false, message: 'Card not found' });
    }

    if (!card.deck.canEdit(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this card',
      });
    }

    const deckId = card.deck._id;
    await Card.findByIdAndDelete(id);

    // Decrement deck cardsCount
    await Deck.findByIdAndUpdate(deckId, { $inc: { cardsCount: -1 } });

    res.json({
      success: true,
      message: 'Card deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/cards/batch
 * @desc    Batch import flashcards with automated duplicate filtering
 * @access  Private
 */
router.post('/batch', protect, async (req, res, next) => {
  try {
    const { deckId, cards, skipDuplicates = true } = req.body;

    if (!deckId || !Array.isArray(cards) || cards.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid deckId and an array of cards',
      });
    }

    const deck = await Deck.findById(deckId);
    if (!deck) {
      return res.status(404).json({ success: false, message: 'Deck not found' });
    }

    if (!deck.canEdit(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to add cards to this deck',
      });
    }

    const existingCards = await Card.find({ deck: deckId }).select('_id front back');
    const createdCards = [];
    const skippedCards = [];

    for (const item of cards) {
      if (!item.front || !item.back) continue;

      const matches = findDuplicates(item.front.trim(), existingCards, 0.85);

      if (matches.length > 0 && skipDuplicates) {
        skippedCards.push({
          front: item.front,
          reason: 'Duplicate matched with existing card',
          match: matches[0],
        });
        continue;
      }

      const newCard = await Card.create({
        deck: deckId,
        front: item.front.trim(),
        back: item.back.trim(),
        hints: item.hints || [],
        tags: item.tags || [],
        difficulty: item.difficulty || 'medium',
        createdBy: req.user._id,
      });

      createdCards.push(newCard);
      existingCards.push(newCard); // Update in-memory list for next loop checks
    }

    // Update deck card count
    if (createdCards.length > 0) {
      await Deck.findByIdAndUpdate(deckId, { $inc: { cardsCount: createdCards.length } });
    }

    res.status(201).json({
      success: true,
      message: `Batch processed: ${createdCards.length} created, ${skippedCards.length} skipped`,
      createdCount: createdCards.length,
      skippedCount: skippedCards.length,
      skippedCards,
      cards: createdCards,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

