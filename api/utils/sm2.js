/**
 * SuperMemo SM-2 Spaced Repetition Scheduling Algorithm
 * 
 * Grades:
 * 0 - Total blackout; complete failure to recall
 * 1 - Incorrect response; the correct answer is remembered upon seeing it
 * 2 - Incorrect response; correct answer seemed familiar
 * 3 - Correct response recalled with serious difficulty
 * 4 - Correct response after hesitation
 * 5 - Perfect recall, instant recognition
 */

function getMasteryStatus(repetition, interval) {
  if (!repetition || repetition === 0) {
    return 'New';
  }
  if (repetition < 3) {
    return 'Learning';
  }
  if (interval >= 21 || repetition >= 5) {
    return 'Mastered';
  }
  return 'Reviewing';
}

/**
 * Calculates new SM-2 parameters after a review
 * @param {Object} params
 * @param {number} params.repetition Current repetition count
 * @param {number} params.interval Current interval in days
 * @param {number} params.easeFactor Current ease factor (default: 2.5, min: 1.3)
 * @param {number} params.grade Review grade (0 to 5)
 * @returns {Object} Updated spaced repetition schedule
 */
function calculateSM2({ repetition = 0, interval = 0, easeFactor = 2.5, grade }) {
  const numericGrade = Number(grade);
  if (isNaN(numericGrade) || numericGrade < 0 || numericGrade > 5) {
    throw new Error('Grade must be a number between 0 and 5.');
  }

  let nextRepetition = repetition;
  let nextInterval = interval;
  let nextEaseFactor = easeFactor || 2.5;

  if (numericGrade >= 3) {
    // Successful recall
    if (repetition === 0) {
      nextInterval = 1;
    } else if (repetition === 1) {
      nextInterval = 6;
    } else {
      nextInterval = Math.round(interval * nextEaseFactor);
    }
    nextRepetition = repetition + 1;
  } else {
    // Recall failure - reset interval and repetition
    nextRepetition = 0;
    nextInterval = 1;
  }

  // Calculate new Ease Factor:
  // EF' = EF + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02))
  nextEaseFactor = nextEaseFactor + (0.1 - (5 - numericGrade) * (0.08 + (5 - numericGrade) * 0.02));
  if (nextEaseFactor < 1.3) {
    nextEaseFactor = 1.3;
  }
  nextEaseFactor = Math.round(nextEaseFactor * 100) / 100;

  // Calculate next due date
  const now = new Date();
  const dueDate = new Date(now.getTime() + nextInterval * 24 * 60 * 60 * 1000);

  const masteryStatus = getMasteryStatus(nextRepetition, nextInterval);

  return {
    repetition: nextRepetition,
    interval: nextInterval,
    easeFactor: nextEaseFactor,
    dueDate,
    lastReviewed: now,
    masteryStatus,
  };
}

/**
 * Previews what the next interval would be for each grade (0-5)
 * Useful for displaying interval hints on study buttons
 */
function previewNextIntervals({ repetition = 0, interval = 0, easeFactor = 2.5 }) {
  const previews = {};
  for (let g = 0; g <= 5; g++) {
    const res = calculateSM2({ repetition, interval, easeFactor, grade: g });
    previews[g] = {
      interval: res.interval,
      label: res.interval === 1 ? '1 day' : `${res.interval} days`,
      masteryStatus: res.masteryStatus,
    };
  }
  return previews;
}

module.exports = {
  calculateSM2,
  getMasteryStatus,
  previewNextIntervals,
};

