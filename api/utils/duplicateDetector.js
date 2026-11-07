/**
 * Duplicate Prevention and Text Similarity Utility
 * Uses multi-algorithm similarity scoring:
 * - Normalized Levenshtein
 * - Token Sort Similarity (handles word reordering)
 * - Token Jaccard (word overlap)
 * - Bigram Dice Coefficient (sub-word typo tolerance)
 * to prevent duplicate flashcards within decks and deck hierarchies.
 */

function normalizeText(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/[^\w\s]/g, '') // remove punctuation
    .replace(/\s+/g, ' ') // collapse multiple whitespaces
    .trim();
}

/**
 * Computes Levenshtein distance between two strings
 */
function levenshteinDistance(s1, s2) {
  const m = s1.length;
  const n = s2.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,     // deletion
          dp[i][j - 1] + 1,     // insertion
          dp[i - 1][j - 1] + 1  // substitution
        );
      }
    }
  }

  return dp[m][n];
}

/**
 * Normalized Levenshtein similarity [0, 1]
 */
function levenshteinSimilarity(s1, s2) {
  if (s1 === s2) return 1.0;
  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 1.0;
  const dist = levenshteinDistance(s1, s2);
  return Math.max(0, 1 - dist / maxLen);
}

/**
 * Token Sort Similarity (Alphabetically sorts words to detect reordered sentences)
 */
function tokenSortSimilarity(s1, s2) {
  const sorted1 = s1.split(' ').filter(Boolean).sort().join(' ');
  const sorted2 = s2.split(' ').filter(Boolean).sort().join(' ');
  return levenshteinSimilarity(sorted1, sorted2);
}

/**
 * Token Jaccard similarity [0, 1]
 */
function jaccardSimilarity(s1, s2) {
  const tokens1 = new Set(s1.split(' ').filter(Boolean));
  const tokens2 = new Set(s2.split(' ').filter(Boolean));

  if (tokens1.size === 0 && tokens2.size === 0) return 1.0;
  if (tokens1.size === 0 || tokens2.size === 0) return 0.0;

  let intersectionCount = 0;
  for (const token of tokens1) {
    if (tokens2.has(token)) {
      intersectionCount++;
    }
  }

  const unionCount = new Set([...tokens1, ...tokens2]).size;
  return intersectionCount / unionCount;
}

/**
 * Bigram Dice Coefficient [0, 1]
 */
function diceCoefficient(s1, s2) {
  if (s1 === s2) return 1.0;
  if (s1.length < 2 || s2.length < 2) return 0.0;

  const getBigrams = (str) => {
    const bigrams = new Map();
    for (let i = 0; i < str.length - 1; i++) {
      const bigram = str.substring(i, i + 2);
      bigrams.set(bigram, (bigrams.get(bigram) || 0) + 1);
    }
    return bigrams;
  };

  const bg1 = getBigrams(s1);
  const bg2 = getBigrams(s2);

  let intersection = 0;
  for (const [bigram, count] of bg1) {
    if (bg2.has(bigram)) {
      intersection += Math.min(count, bg2.get(bigram));
    }
  }

  const total = (s1.length - 1) + (s2.length - 1);
  return (2.0 * intersection) / total;
}

/**
 * Computes composite similarity score between two card front texts
 */
function computeSimilarity(textA, textB) {
  const normA = normalizeText(textA);
  const normB = normalizeText(textB);

  if (normA === normB) return 1.0;
  if (!normA || !normB) return 0.0;

  const levSim = levenshteinSimilarity(normA, normB);
  const tokenSortSim = tokenSortSimilarity(normA, normB);
  const jacSim = jaccardSimilarity(normA, normB);
  const diceSim = diceCoefficient(normA, normB);

  // Take the maximum of direct character match or token-reordered match,
  // blended with Jaccard and Dice metrics
  const tokenReorderedScore = (tokenSortSim * 0.50) + (jacSim * 0.50);
  const sequentialScore = (levSim * 0.40) + (diceSim * 0.30) + (jacSim * 0.30);

  const bestScore = Math.max(tokenReorderedScore, sequentialScore);
  return Math.round(bestScore * 100) / 100;
}

/**
 * Scans a list of existing cards against a candidate text to identify duplicates
 * @param {string} candidateFront The card front text being created or edited
 * @param {Array} existingCards List of existing Card documents (with _id, front, back, deck)
 * @param {number} threshold Minimum similarity score to flag (default 0.70 / 70%)
 * @param {string} excludeCardId Optional card ID to exclude (when editing existing card)
 */
function findDuplicates(candidateFront, existingCards = [], threshold = 0.70, excludeCardId = null) {
  if (!candidateFront || !candidateFront.trim()) {
    return [];
  }

  const matches = [];

  for (const card of existingCards) {
    if (excludeCardId && card._id && card._id.toString() === excludeCardId.toString()) {
      continue;
    }

    const similarity = computeSimilarity(candidateFront, card.front);

    if (similarity >= threshold) {
      let severity = 'potential_duplicate';
      if (similarity >= 0.95) {
        severity = 'exact';
      } else if (similarity >= 0.85) {
        severity = 'high_similarity';
      }

      matches.push({
        cardId: card._id,
        front: card.front,
        back: card.back,
        deck: card.deck,
        similarityPercentage: Math.round(similarity * 100),
        severity,
      });
    }
  }

  // Sort by highest similarity first
  matches.sort((a, b) => b.similarityPercentage - a.similarityPercentage);
  return matches;
}

module.exports = {
  normalizeText,
  computeSimilarity,
  findDuplicates,
};
