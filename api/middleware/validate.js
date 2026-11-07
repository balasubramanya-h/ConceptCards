/**
 * Request validation middlewares
 */

const validateRegister = (req, res, next) => {
  const { name, email, password } = req.body;
  const errors = [];

  if (!name || !name.trim()) {
    errors.push('Name is required');
  }

  if (!email || !email.trim()) {
    errors.push('Email is required');
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      errors.push('Please provide a valid email address');
    }
  }

  if (!password || password.length < 6) {
    errors.push('Password must be at least 6 characters long');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors,
    });
  }

  next();
};

const validateLogin = (req, res, next) => {
  const { email, password } = req.body;
  const errors = [];

  if (!email || !email.trim()) {
    errors.push('Email is required');
  }

  if (!password) {
    errors.push('Password is required');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors,
    });
  }

  next();
};

const validateDeck = (req, res, next) => {
  const { title } = req.body;
  const errors = [];

  if (!title || !title.trim()) {
    errors.push('Deck title is required');
  } else if (title.trim().length > 100) {
    errors.push('Deck title cannot exceed 100 characters');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors,
    });
  }

  next();
};

const validateCard = (req, res, next) => {
  const { deck, front, back } = req.body;
  const errors = [];

  // Note: deck can be in req.body or req.params depending on route
  const deckId = deck || req.params.deckId;
  if (!deckId) {
    errors.push('Deck ID is required');
  }

  if (!front || !front.trim()) {
    errors.push('Card front (concept / question) is required');
  } else if (front.trim().length > 2000) {
    errors.push('Card front cannot exceed 2000 characters');
  }

  if (!back || !back.trim()) {
    errors.push('Card back (answer / explanation) is required');
  } else if (back.trim().length > 5000) {
    errors.push('Card back cannot exceed 5000 characters');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors,
    });
  }

  next();
};

const validateReview = (req, res, next) => {
  const { cardId, grade } = req.body;
  const errors = [];

  if (!cardId) {
    errors.push('Card ID is required');
  }

  if (grade === undefined || grade === null) {
    errors.push('Grade is required');
  } else {
    const numGrade = Number(grade);
    if (isNaN(numGrade) || numGrade < 0 || numGrade > 5) {
      errors.push('Grade must be an integer between 0 and 5');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors,
    });
  }

  next();
};

module.exports = {
  validateRegister,
  validateLogin,
  validateDeck,
  validateCard,
  validateReview,
};
