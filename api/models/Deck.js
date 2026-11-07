const mongoose = require('mongoose');

const collaboratorSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      enum: ['viewer', 'editor'],
      default: 'viewer',
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const deckSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide a deck title'],
      trim: true,
      maxlength: [100, 'Deck title cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    // Hierarchical Organization: parent deck reference
    parentDeck: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Deck',
      default: null,
      index: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // Collaborative permissions
    collaborators: [collaboratorSchema],
    tags: {
      type: [String],
      default: [],
    },
    color: {
      type: String,
      default: '#6366f1', // Indigo default
    },
    icon: {
      type: String,
      default: 'Layers',
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    cardsCount: {
      type: Number,
      default: 0,
    },
    masteryScore: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual to find child decks (sub-decks)
deckSchema.virtual('subDecks', {
  ref: 'Deck',
  localField: '_id',
  foreignField: 'parentDeck',
});

// Virtual to find deck's cards
deckSchema.virtual('cards', {
  ref: 'Card',
  localField: '_id',
  foreignField: 'deck',
});

// Helper method to check if a user has editor permission
deckSchema.methods.canEdit = function (userId) {
  if (!userId) return false;
  const uid = userId.toString();
  if (this.owner.toString() === uid) return true;
  const collab = this.collaborators.find((c) => c.user.toString() === uid);
  return collab && collab.role === 'editor';
};

// Helper method to check if a user can view this deck
deckSchema.methods.canView = function (userId) {
  if (this.isPublic) return true;
  if (!userId) return false;
  const uid = userId.toString();
  if (this.owner.toString() === uid) return true;
  return this.collaborators.some((c) => c.user.toString() === uid);
};

module.exports = mongoose.model('Deck', deckSchema);

