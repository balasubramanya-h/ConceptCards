const mongoose = require('mongoose');

const reviewLogSchema = new mongoose.Schema(
  {
    card: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Card',
      required: true,
      index: true,
    },
    deck: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Deck',
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 0,
      max: 5,
    },
    responseTimeMs: {
      type: Number,
      default: 0,
    },
    repetitionBefore: {
      type: Number,
      default: 0,
    },
    repetitionAfter: {
      type: Number,
      default: 0,
    },
    intervalBefore: {
      type: Number,
      default: 0,
    },
    intervalAfter: {
      type: Number,
      default: 0,
    },
    easeFactorBefore: {
      type: Number,
      default: 2.5,
    },
    easeFactorAfter: {
      type: Number,
      default: 2.5,
    },
    reviewedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for user study analytics
reviewLogSchema.index({ user: 1, reviewedAt: -1 });

module.exports = mongoose.model('ReviewLog', reviewLogSchema);

