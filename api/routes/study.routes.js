const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Card = require('../models/Card');
const Deck = require('../models/Deck');
const User = require('../models/User');
const ReviewLog = require('../models/ReviewLog');
const { protect } = require('../middleware/auth');
const { validateReview } = require('../middleware/validate');
const { calculateSM2, previewNextIntervals } = require('../utils/sm2');

/**
 * Helper to update user study streak
 */
async function updateUserStreak(userId) {
  const user = await User.findById(userId);
  if (!user) return;

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  if (!user.streak.lastStudiedDate) {
    user.streak.current = 1;
    user.streak.longest = 1;
    user.streak.lastStudiedDate = now;
  } else {
    const lastDateStr = new Date(user.streak.lastStudiedDate).toISOString().split('T')[0];
    const diffDays = Math.floor((new Date(todayStr) - new Date(lastDateStr)) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      // Studied consecutive day
      user.streak.current += 1;
      if (user.streak.current > user.streak.longest) {
        user.streak.longest = user.streak.current;
      }
      user.streak.lastStudiedDate = now;
    } else if (diffDays > 1) {
      // Streak broken
      user.streak.current = 1;
      user.streak.lastStudiedDate = now;
    } else {
      // Already studied earlier today - keep current streak, just touch timestamp
      user.streak.lastStudiedDate = now;
    }
  }

  await user.save();
  return user.streak;
}

/**
 * @route   GET /api/study/deck/:deckId/session
 * @desc    Fetch cards for an interactive study session (due cards or cram)
 * @access  Private
 */
router.get('/deck/:deckId/session', protect, async (req, res, next) => {
  try {
    const { deckId } = req.params;
    const { mode = 'due', includeSubDecks = 'true', limit = 30 } = req.query;

    const deck = await Deck.findById(deckId);
    if (!deck) {
      return res.status(404).json({ success: false, message: 'Deck not found' });
    }

    if (!deck.canView(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to study this deck',
      });
    }

    // Determine deck IDs to include (include child sub-decks if requested)
    let targetDeckIds = [deck._id];
    if (includeSubDecks === 'true') {
      const childDecks = await Deck.find({ parentDeck: deck._id }).select('_id');
      targetDeckIds = targetDeckIds.concat(childDecks.map((d) => d._id));
    }

    const now = new Date();
    const query = { deck: { $in: targetDeckIds } };

    if (mode === 'due') {
      // Due cards: cards whose dueDate <= now, or new cards that have never been reviewed
      query.$or = [
        { dueDate: { $lte: now } },
        { repetition: 0, lastReviewed: null },
      ];
    } else if (mode === 'new') {
      query.repetition = 0;
    }

    const cards = await Card.find(query)
      .sort({ dueDate: 1, repetition: 1 })
      .limit(Number(limit))
      .populate('deck', 'title color');

    // Attach SM-2 next intervals preview to each card
    const sessionCards = cards.map((c) => {
      const cardObj = c.toObject();
      cardObj.intervalPreviews = previewNextIntervals({
        repetition: c.repetition,
        interval: c.interval,
        easeFactor: c.easeFactor,
      });
      return cardObj;
    });

    res.json({
      success: true,
      deckTitle: deck.title,
      sessionMode: mode,
      count: sessionCards.length,
      cards: sessionCards,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/study/review
 * @desc    Submit review rating for a card, execute SM-2 algorithm & log result
 * @access  Private
 */
router.post('/review', protect, validateReview, async (req, res, next) => {
  try {
    const { cardId, grade, responseTimeMs = 0 } = req.body;

    const card = await Card.findById(cardId);
    if (!card) {
      return res.status(404).json({ success: false, message: 'Card not found' });
    }

    const deck = await Deck.findById(card.deck);
    if (!deck || !deck.canView(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to review this card',
      });
    }

    // Save previous state for review log
    const prevRepetition = card.repetition;
    const prevInterval = card.interval;
    const prevEaseFactor = card.easeFactor;

    // Calculate next SM-2 parameters
    const sm2Result = calculateSM2({
      repetition: card.repetition,
      interval: card.interval,
      easeFactor: card.easeFactor,
      grade,
    });

    // Update card document
    card.repetition = sm2Result.repetition;
    card.interval = sm2Result.interval;
    card.easeFactor = sm2Result.easeFactor;
    card.dueDate = sm2Result.dueDate;
    card.lastReviewed = sm2Result.lastReviewed;
    card.masteryStatus = sm2Result.masteryStatus;
    card.reviewCount += 1;

    if (grade < 3) {
      card.lapses += 1;
    }

    await card.save();

    // Log review event in ReviewLog
    const reviewLog = await ReviewLog.create({
      card: card._id,
      deck: deck._id,
      user: req.user._id,
      rating: Number(grade),
      responseTimeMs: Number(responseTimeMs),
      repetitionBefore: prevRepetition,
      repetitionAfter: card.repetition,
      intervalBefore: prevInterval,
      intervalAfter: card.interval,
      easeFactorBefore: prevEaseFactor,
      easeFactorAfter: card.easeFactor,
      reviewedAt: new Date(),
    });

    // Update user streak
    const updatedStreak = await updateUserStreak(req.user._id);

    // Update Deck mastery score percentage
    const allDeckCards = await Card.find({ deck: deck._id }).select('masteryStatus');
    if (allDeckCards.length > 0) {
      const masteredCount = allDeckCards.filter((c) => c.masteryStatus === 'Mastered').length;
      deck.masteryScore = Math.round((masteredCount / allDeckCards.length) * 100);
      await deck.save();
    }

    res.json({
      success: true,
      message: 'Review recorded successfully',
      schedule: {
        repetition: card.repetition,
        interval: card.interval,
        easeFactor: card.easeFactor,
        dueDate: card.dueDate,
        masteryStatus: card.masteryStatus,
      },
      card,
      streak: updatedStreak,
      reviewLogId: reviewLog._id,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/study/stats
 * @desc    Comprehensive user study analytics, retention rate, streaks & forecast
 * @access  Private
 */
router.get('/stats', protect, async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Today's start and end timestamps
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    // Cards reviewed today by this user
    const reviewsToday = await ReviewLog.countDocuments({
      user: userId,
      reviewedAt: { $gte: startOfToday, $lte: endOfToday },
    });

    // Total lifetime reviews
    const totalReviews = await ReviewLog.countDocuments({ user: userId });

    // Retention rate (% of reviews with grade >= 3)
    const successfulReviews = await ReviewLog.countDocuments({
      user: userId,
      rating: { $gte: 3 },
    });
    const retentionRate = totalReviews > 0 ? Math.round((successfulReviews / totalReviews) * 100) : 100;

    // Find all decks owned or collaborated by this user
    const userDecks = await Deck.find({
      $or: [{ owner: userId }, { 'collaborators.user': userId }],
    }).select('_id');
    const deckIds = userDecks.map((d) => d._id);

    // Cards counts & mastery breakdown across user decks
    const totalCards = await Card.countDocuments({ deck: { $in: deckIds } });
    const newCards = await Card.countDocuments({ deck: { $in: deckIds }, masteryStatus: 'New' });
    const learningCards = await Card.countDocuments({ deck: { $in: deckIds }, masteryStatus: 'Learning' });
    const reviewingCards = await Card.countDocuments({ deck: { $in: deckIds }, masteryStatus: 'Reviewing' });
    const masteredCards = await Card.countDocuments({ deck: { $in: deckIds }, masteryStatus: 'Mastered' });

    // Due cards forecast
    const dueToday = await Card.countDocuments({
      deck: { $in: deckIds },
      dueDate: { $lte: endOfToday },
    });

    const tomorrow = new Date(startOfToday);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const endOfTomorrow = new Date(tomorrow);
    endOfTomorrow.setHours(23, 59, 59, 999);

    const dueTomorrow = await Card.countDocuments({
      deck: { $in: deckIds },
      dueDate: { $gt: endOfToday, $lte: endOfTomorrow },
    });

    const in7Days = new Date(startOfToday);
    in7Days.setDate(in7Days.getDate() + 7);
    const dueNext7Days = await Card.countDocuments({
      deck: { $in: deckIds },
      dueDate: { $gt: endOfToday, $lte: in7Days },
    });

    const user = await User.findById(userId);

    res.json({
      success: true,
      stats: {
        reviewsToday,
        totalReviews,
        retentionRate,
        streak: user.streak,
        dailyTarget: user.preferences?.dailyTarget || 20,
        dueToday,
        dueTomorrow,
        dueNext7Days,
        cardsBreakdown: {
          total: totalCards,
          new: newCards,
          learning: learningCards,
          reviewing: reviewingCards,
          mastered: masteredCards,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

