const mongoose = require('mongoose');
const { normalizeText } = require('../utils/duplicateDetector');

const cardSchema = new mongoose.Schema(
  {
    deck: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Deck',
      required: [true, 'Card must belong to a deck'],
      index: true,
    },
    front: {
      type: String,
      required: [true, 'Please provide the question / concept front'],
      trim: true,
      maxlength: [2000, 'Front content cannot exceed 2000 characters'],
    },
    back: {
      type: String,
      required: [true, 'Please provide the answer / explanation back'],
      trim: true,
      maxlength: [5000, 'Back content cannot exceed 5000 characters'],
    },
    // Indexed normalized front for fast duplicate lookups
    normalizedFront: {
      type: String,
      index: true,
    },
    hints: {
      type: [String],
      default: [],
    },
    tags: {
      type: [String],
      default: [],
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    // Automated Spaced-Repetition (SM-2) Fields
    repetition: {
      type: Number,
      default: 0,
    },
    interval: {
      type: Number,
      default: 0, // Days
    },
    easeFactor: {
      type: Number,
      default: 2.5,
      min: 1.3,
    },
    dueDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    lastReviewed: {
      type: Date,
      default: null,
    },
    masteryStatus: {
      type: String,
      enum: ['New', 'Learning', 'Reviewing', 'Mastered'],
      default: 'New',
      index: true,
    },
    reviewCount: {
      type: Number,
      default: 0,
    },
    lapses: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to populate normalizedFront automatically
cardSchema.pre('save', function () {
  if (this.isModified('front')) {
    this.normalizedFront = normalizeText(this.front);
  }
});

// Compound index to help query due cards for a deck efficiently
cardSchema.index({ deck: 1, dueDate: 1 });

module.exports = mongoose.model('Card', cardSchema);
