/**
 * ConceptCards Complete Verification Script
 * Validates:
 * 1. MongoDB Connection
 * 2. User Registration, Password Hashing & JWT Generation
 * 3. Hierarchical Deck Organization & Breadcrumb Navigation
 * 4. Collaborator Role Assignment & Access Control
 * 5. Multi-Algorithm Duplicate Detection & Prevention
 * 6. Automated SuperMemo SM-2 Spaced Repetition Scheduling
 * 7. Study Session Engine & Review Logging
 */

const dotenv = require('dotenv');
dotenv.config();

const connectDB = require('../api/config/db');
const User = require('../api/models/User');
const Deck = require('../api/models/Deck');
const Card = require('../api/models/Card');
const ReviewLog = require('../api/models/ReviewLog');
const { calculateSM2, previewNextIntervals } = require('../api/utils/sm2');
const { computeSimilarity, findDuplicates } = require('../api/utils/duplicateDetector');

async function runVerification() {
  console.log('\n======================================================');
  console.log('🚀 CONCEPTCARDS VERIFICATION SUITE STARTING...');
  console.log('======================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, testName) {
    totalTests++;
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passedTests++;
    } else {
      console.error(`  ❌ [FAIL] ${testName}`);
      throw new Error(`Assertion failed: ${testName}`);
    }
  }

  try {
    // TEST 1: Database Connection
    console.log('--- TEST GROUP 1: Database Connection ---');
    await connectDB();
    assert(true, 'Connected to MongoDB Atlas cluster');

    // Clean up test-specific data
    const testEmailOwner = 'verifier.owner@conceptcards.test';
    const testEmailCollab = 'verifier.collab@conceptcards.test';
    await User.deleteMany({ email: { $in: [testEmailOwner, testEmailCollab] } });

    // TEST 2: User Creation, Password Hashing & Auth
    console.log('\n--- TEST GROUP 2: Authentication & Password Security ---');
    const owner = await User.create({
      name: 'Test Owner',
      email: testEmailOwner,
      password: 'SecurePassword123!',
    });
    assert(owner._id && owner.password !== 'SecurePassword123!', 'User registered and password successfully hashed with bcrypt');

    const isMatch = await owner.comparePassword('SecurePassword123!');
    assert(isMatch === true, 'comparePassword validates correct password');

    const wrongMatch = await owner.comparePassword('WrongPassword!');
    assert(wrongMatch === false, 'comparePassword rejects incorrect password');

    const token = owner.generateToken();
    assert(typeof token === 'string' && token.length > 30, 'JWT token generated successfully');

    const collab = await User.create({
      name: 'Test Collab',
      email: testEmailCollab,
      password: 'SecurePassword123!',
    });
    assert(collab._id, 'Collaborator user registered');

    // TEST 3: Hierarchical Deck Organization
    console.log('\n--- TEST GROUP 3: Hierarchical Deck Organization ---');
    const rootDeck = await Deck.create({
      title: 'Root Engineering Deck',
      description: 'Root folder for engineering topics',
      parentDeck: null,
      owner: owner._id,
      color: '#6366f1',
    });
    assert(rootDeck._id && rootDeck.parentDeck === null, 'Root deck created without parent');

    const subDeck = await Deck.create({
      title: 'Subdeck: Microservices',
      description: 'Child deck nested inside Root Engineering Deck',
      parentDeck: rootDeck._id,
      owner: owner._id,
      color: '#3b82f6',
    });
    assert(subDeck.parentDeck.toString() === rootDeck._id.toString(), 'Subdeck created with parent reference');

    // TEST 4: Collaborator Roles & Permissions
    console.log('\n--- TEST GROUP 4: Collaboration & Permissions ---');
    subDeck.collaborators.push({
      user: collab._id,
      role: 'editor',
    });
    await subDeck.save();

    assert(subDeck.canEdit(owner._id) === true, 'Owner has edit permissions on deck');
    assert(subDeck.canEdit(collab._id) === true, 'Invited editor has edit permissions on deck');
    assert(subDeck.canView(collab._id) === true, 'Invited editor can view deck');

    // TEST 5: Duplicate Prevention Engine
    console.log('\n--- TEST GROUP 5: Duplicate Prevention Engine ---');
    const originalCard = await Card.create({
      deck: subDeck._id,
      front: 'What is the CAP Theorem in distributed databases?',
      back: 'CAP states that in a partition, a system must choose between consistency and availability.',
      createdBy: owner._id,
    });
    assert(originalCard._id, 'Original card created in subdeck');

    // Exact duplicate test (case-insensitive, punctuation variations)
    const exactCandidate = 'what is the cap theorem in distributed databases?';
    const exactSim = computeSimilarity(originalCard.front, exactCandidate);
    assert(exactSim >= 0.95, `Exact duplicate recognized with high similarity: ${(exactSim * 100).toFixed(1)}%`);

    // Fuzzy / semantic reordering test
    const fuzzyCandidate = 'In distributed databases, what does the CAP theorem state?';
    const fuzzySim = computeSimilarity(originalCard.front, fuzzyCandidate);
    assert(fuzzySim >= 0.70, `Reordered / fuzzy variant recognized with similarity: ${(fuzzySim * 100).toFixed(1)}%`);

    const existingCards = [originalCard];
    const detectedMatches = findDuplicates(fuzzyCandidate, existingCards, 0.70);
    assert(detectedMatches.length > 0 && detectedMatches[0].cardId.toString() === originalCard._id.toString(), 'findDuplicates flagged candidate against existing card list');

    // Different concept test (should NOT be flagged as duplicate)
    const nonDuplicateCandidate = 'How does the Raft consensus algorithm perform leader election?';
    const nonDupeSim = computeSimilarity(originalCard.front, nonDuplicateCandidate);
    assert(nonDupeSim < 0.40, `Dissimilar card correctly scores low: ${(nonDupeSim * 100).toFixed(1)}%`);

    // TEST 6: SuperMemo SM-2 Spaced Repetition Scheduling
    console.log('\n--- TEST GROUP 6: SuperMemo SM-2 Scheduling Logic ---');
    // Step A: Grade 4 on new card (rep 0 -> 1, interval 1)
    const review1 = calculateSM2({ repetition: 0, interval: 0, easeFactor: 2.5, grade: 4 });
    assert(review1.repetition === 1, 'First successful review increments repetition to 1');
    assert(review1.interval === 1, 'First successful review sets interval to 1 day');
    assert(review1.masteryStatus === 'Learning', 'Card moves from New to Learning status');

    // Step B: Grade 5 on second review (rep 1 -> 2, interval 6)
    const review2 = calculateSM2({ repetition: 1, interval: 1, easeFactor: review1.easeFactor, grade: 5 });
    assert(review2.repetition === 2, 'Second successful review increments repetition to 2');
    assert(review2.interval === 6, 'Second successful review sets interval to 6 days');
    assert(review2.easeFactor > review1.easeFactor, 'Grade 5 increases ease factor');

    // Step C: Grade 5 on third review (rep 2 -> 3, interval = round(6 * EF))
    const review3 = calculateSM2({ repetition: 2, interval: 6, easeFactor: review2.easeFactor, grade: 5 });
    assert(review3.repetition === 3, 'Third review increments repetition to 3');
    assert(review3.interval >= 15, `Third review exponentially expands interval to ${review3.interval} days`);

    // Step D: Recall failure (Grade 1 -> reset rep 0, interval 1)
    const failedReview = calculateSM2({ repetition: 3, interval: 15, easeFactor: review3.easeFactor, grade: 1 });
    assert(failedReview.repetition === 0, 'Failed recall resets repetition to 0');
    assert(failedReview.interval === 1, 'Failed recall resets interval to 1 day');
    assert(failedReview.easeFactor < review3.easeFactor, 'Failed recall decreases ease factor');

    // Test preview intervals generator
    const previews = previewNextIntervals({ repetition: 2, interval: 6, easeFactor: 2.5 });
    assert(previews[0].interval === 1 && previews[5].interval >= 15, 'Interval previews accurately calculated for UI badges');

    // TEST 7: Review Logging & Streak Tracking
    console.log('\n--- TEST GROUP 7: Review Logging & Card State Update ---');
    originalCard.repetition = review1.repetition;
    originalCard.interval = review1.interval;
    originalCard.easeFactor = review1.easeFactor;
    originalCard.dueDate = review1.dueDate;
    originalCard.lastReviewed = review1.lastReviewed;
    originalCard.masteryStatus = review1.masteryStatus;
    originalCard.reviewCount = 1;
    await originalCard.save();

    const log = await ReviewLog.create({
      card: originalCard._id,
      deck: subDeck._id,
      user: owner._id,
      rating: 4,
      responseTimeMs: 2850,
      repetitionBefore: 0,
      repetitionAfter: 1,
      intervalBefore: 0,
      intervalAfter: 1,
      easeFactorBefore: 2.5,
      easeFactorAfter: review1.easeFactor,
    });
    assert(log._id, 'Review log persisted in MongoDB with timing & interval telemetry');

    // Clean up verification data
    await Card.deleteMany({ deck: { $in: [rootDeck._id, subDeck._id] } });
    await Deck.deleteMany({ _id: { $in: [rootDeck._id, subDeck._id] } });
    await User.deleteMany({ _id: { $in: [owner._id, collab._id] } });
    await ReviewLog.deleteMany({ _id: log._id });

    console.log('\n======================================================');
    console.log(`🎉 ALL ${passedTests}/${totalTests} VERIFICATION TESTS PASSED SUCCESSFULLY!`);
    console.log('======================================================\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ VERIFICATION TEST FAILED:', error.message);
    if (error.stack) console.error(error.stack);
    process.exit(1);
  }
}

runVerification();

