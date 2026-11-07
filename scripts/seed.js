const dotenv = require('dotenv');
dotenv.config();

const connectDB = require('../api/config/db');
const User = require('../api/models/User');
const Deck = require('../api/models/Deck');
const Card = require('../api/models/Card');
const ReviewLog = require('../api/models/ReviewLog');
const { calculateSM2 } = require('../api/utils/sm2');

async function seedData() {
  try {
    await connectDB();
    console.log('🌱 Connected to database for seeding...');

    // Clear existing collections
    await ReviewLog.deleteMany({});
    await Card.deleteMany({});
    await Deck.deleteMany({});
    await User.deleteMany({});

    console.log('🧹 Cleared existing database records.');

    // 1. Create Demo Users
    const demoUser = await User.create({
      name: 'Alex Rivera',
      email: 'demo@conceptcards.io',
      password: 'Password123!',
      bio: 'Full-stack software architect & cognitive learning enthusiast.',
      streak: { current: 5, longest: 14, lastStudiedDate: new Date() },
      preferences: { dailyTarget: 25 },
    });

    const collabUser = await User.create({
      name: 'Sarah Chen',
      email: 'sarah.chen@conceptcards.io',
      password: 'Password123!',
      bio: 'Distributed systems engineer and researcher.',
      streak: { current: 3, longest: 8, lastStudiedDate: new Date() },
      preferences: { dailyTarget: 20 },
    });

    console.log(`👤 Created Demo User: ${demoUser.email} (Password: Password123!)`);
    console.log(`👤 Created Collaborator: ${collabUser.email} (Password: Password123!)`);

    // 2. Create Hierarchical Decks
    // Root Deck 1: Computer Science Mastery
    const csRootDeck = await Deck.create({
      title: 'Computer Science Core',
      description: 'Foundational concepts in software engineering, systems, and algorithms.',
      parentDeck: null,
      owner: demoUser._id,
      collaborators: [{ user: collabUser._id, role: 'editor' }],
      tags: ['CS', 'Engineering', 'Architecture'],
      color: '#6366f1', // Indigo
      isPublic: true,
    });

    // Sub-Deck 1: Distributed Systems (Child of CS Core)
    const distSysDeck = await Deck.create({
      title: 'Distributed Systems & Cloud Architecture',
      description: 'Consensus protocols, replication, CAP theorem, and fault tolerance in scale-out systems.',
      parentDeck: csRootDeck._id,
      owner: demoUser._id,
      collaborators: [{ user: collabUser._id, role: 'editor' }],
      tags: ['Distributed Systems', 'Cloud', 'Scalability'],
      color: '#3b82f6', // Blue
      isPublic: true,
    });

    // Sub-Deck 2: Algorithms & Data Structures (Child of CS Core)
    const dsaDeck = await Deck.create({
      title: 'Advanced Algorithms & Data Structures',
      description: 'Graph algorithms, balanced trees, amortized complexity, and dynamic programming.',
      parentDeck: csRootDeck._id,
      owner: demoUser._id,
      collaborators: [{ user: collabUser._id, role: 'viewer' }],
      tags: ['Algorithms', 'Data Structures', 'LeetCode'],
      color: '#10b981', // Emerald
      isPublic: true,
    });

    // Root Deck 2: Cognitive Neuroscience & Learning
    const neuroDeck = await Deck.create({
      title: 'Cognitive Science & Memory Retention',
      description: 'Neuroscience of memory consolidation, active recall, and spaced retrieval.',
      parentDeck: null,
      owner: demoUser._id,
      tags: ['Psychology', 'Neuroscience', 'Learning'],
      color: '#f59e0b', // Amber
      isPublic: true,
    });

    console.log('📁 Created Hierarchical Decks (Root -> Sub-decks).');

    // 3. Create High-Quality Flashcards with SM-2 Repetition Schedules
    const cardsToInsert = [
      // Distributed Systems Deck
      {
        deck: distSysDeck._id,
        front: 'What does the CAP Theorem state regarding distributed data stores?',
        back: 'In the event of a network partition (P), a distributed system must choose between Consistency (C - every read receives the most recent write or an error) and Availability (A - every non-failing node returns a non-error response, without guaranteeing it is the most recent write). You cannot guarantee both simultaneously in a partitionable network.',
        hints: ['Formulated by Eric Brewer in 2000', 'Consistency vs Availability under Partition Tolerance'],
        tags: ['Distributed Systems', 'Architecture', 'Theory'],
        difficulty: 'medium',
        createdBy: demoUser._id,
        repetition: 2,
        interval: 6,
        easeFactor: 2.6,
        dueDate: new Date(), // Due today
        masteryStatus: 'Learning',
      },
      {
        deck: distSysDeck._id,
        front: 'How does the Raft consensus algorithm guarantee leader election safety?',
        back: 'Raft guarantees safety through Election Restrictions: a candidate can only be elected if its log contains all committed entries. During voting, nodes reject RequestVote RPCs if the candidate’s log is less up-to-date than the voter’s log (comparing last log term first, then last log index).',
        hints: ['Log completeness check during RequestVote RPC'],
        tags: ['Consensus', 'Raft', 'Safety'],
        difficulty: 'hard',
        createdBy: demoUser._id,
        repetition: 4,
        interval: 16,
        easeFactor: 2.5,
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // Due in 3 days
        masteryStatus: 'Reviewing',
      },
      {
        deck: distSysDeck._id,
        front: 'What problem does Consistent Hashing solve in distributed caches, and how does it achieve O(K/N) key remapping?',
        back: 'In traditional hash mod N, adding or removing a node invalidates almost 100% of keys. Consistent Hashing maps both servers and keys to a uniform circular hash ring (e.g. 0 to 2^32-1). When a server node is added or removed, only K/N keys (where K is total keys and N is number of servers) are remapped to neighboring nodes on the ring. Virtual nodes are utilized to prevent data skew.',
        hints: ['Virtual nodes on circular hash ring', 'Minimizes cache thrashing on rebalance'],
        tags: ['Caching', 'Hash Ring', 'Scalability'],
        difficulty: 'hard',
        createdBy: demoUser._id,
        repetition: 6,
        interval: 35,
        easeFactor: 2.7,
        dueDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
        masteryStatus: 'Mastered',
      },
      {
        deck: distSysDeck._id,
        front: 'What is a Write-Ahead Log (WAL) and why is it crucial for ACID durability?',
        back: 'A Write-Ahead Log is an append-only log on non-volatile storage where database mutations must be written and synced (fsync) before modifying the in-memory data structures (like B-Tree pages). If the database crashes, the engine replays the log to restore uncommitted state to a consistent point.',
        hints: ['Append-only sequential disk writes before in-place mutation'],
        tags: ['Storage', 'Databases', 'ACID'],
        difficulty: 'medium',
        createdBy: demoUser._id,
        repetition: 0,
        interval: 0,
        easeFactor: 2.5,
        dueDate: new Date(),
        masteryStatus: 'New',
      },

      // Algorithms Deck
      {
        deck: dsaDeck._id,
        front: 'Explain the internal architecture and time complexities of an LRU (Least Recently Used) Cache.',
        back: 'An LRU cache combines a Hash Map and a Doubly Linked List:\n- Hash Map provides O(1) key-to-node lookup.\n- Doubly Linked List maintains access recency order.\n\nOperations:\n- get(key): Lookup in map in O(1), move node to head (most recent) in O(1).\n- put(key, val): Insert/update in map, place at head. If capacity is exceeded, evict node from tail in O(1) and delete key from map.',
        hints: ['Combination of HashMap and Doubly Linked List', 'O(1) get and put'],
        tags: ['Data Structures', 'Caching', 'Interviews'],
        difficulty: 'medium',
        createdBy: demoUser._id,
        repetition: 3,
        interval: 12,
        easeFactor: 2.5,
        dueDate: new Date(),
        masteryStatus: 'Reviewing',
      },
      {
        deck: dsaDeck._id,
        front: 'Why do relational databases prefer B+ Trees over standard B-Trees for disk-based table storage?',
        back: '1. Leaf-only records: All data pointers/rows reside strictly in the leaf nodes, while internal nodes store only search keys, maximizing fanout and reducing tree height.\n2. Sequential scan: Leaf nodes are doubly linked in order, allowing O(log N + K) range queries without traversing back up through parent nodes.\n3. Predictable disk I/O: Fixed traversal path length for all queries.',
        hints: ['Internal nodes store only keys; leaves are linked lists'],
        tags: ['B+Tree', 'Indexes', 'Databases'],
        difficulty: 'medium',
        createdBy: demoUser._id,
        repetition: 5,
        interval: 24,
        easeFactor: 2.6,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        masteryStatus: 'Mastered',
      },

      // Cognitive Science Deck
      {
        deck: neuroDeck._id,
        front: 'What does the Ebbinghaus Forgetting Curve demonstrate about human memory decay?',
        back: 'Hermann Ebbinghaus demonstrated that humans lose approximately 50% of newly learned information within 20 minutes and up to 70% within 24 hours without reinforcement. Spaced repetition counteracts this exponential decay by scheduling active reviews right before memory traces decay below retrieval thresholds, progressively flattening the forgetting curve.',
        hints: ['Exponential memory decay over time; flattened by periodic recall'],
        tags: ['Memory', 'SM-2', 'Psychology'],
        difficulty: 'easy',
        createdBy: demoUser._id,
        repetition: 1,
        interval: 1,
        easeFactor: 2.5,
        dueDate: new Date(),
        masteryStatus: 'Learning',
      },
      {
        deck: neuroDeck._id,
        front: 'What is the Testing Effect (Retrieval Practice Effect) in cognitive psychology?',
        back: 'The testing effect states that the active effort of retrieving information from memory produces significantly stronger and more durable long-term retention compared to passive restudying or re-reading, because retrieval activates neural pathways and triggers reconsolidation.',
        hints: ['Active recall produces deeper memory traces than passive reading'],
        tags: ['Active Recall', 'Cognitive Science'],
        difficulty: 'easy',
        createdBy: demoUser._id,
        repetition: 0,
        interval: 0,
        easeFactor: 2.5,
        dueDate: new Date(),
        masteryStatus: 'New',
      },
    ];

    const createdCards = await Card.insertMany(cardsToInsert);
    console.log(`🃏 Created ${createdCards.length} high-yield flashcards with SM-2 metrics.`);

    // 4. Update Deck card counts and mastery scores
    for (const d of [distSysDeck, dsaDeck, neuroDeck]) {
      const cards = await Card.find({ deck: d._id });
      const mastered = cards.filter((c) => c.masteryStatus === 'Mastered').length;
      d.cardsCount = cards.length;
      d.masteryScore = cards.length > 0 ? Math.round((mastered / cards.length) * 100) : 0;
      await d.save();
    }

    // Update root CS deck cardsCount (sum of subdecks)
    csRootDeck.cardsCount = (await Card.countDocuments({ deck: distSysDeck._id })) + (await Card.countDocuments({ deck: dsaDeck._id }));
    await csRootDeck.save();

    // 5. Seed some initial ReviewLogs for realistic dashboard analytics
    const sampleReviews = [
      {
        card: createdCards[0]._id,
        deck: distSysDeck._id,
        user: demoUser._id,
        rating: 4,
        responseTimeMs: 3200,
        repetitionBefore: 1,
        repetitionAfter: 2,
        intervalBefore: 1,
        intervalAfter: 6,
        easeFactorBefore: 2.5,
        easeFactorAfter: 2.6,
        reviewedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      },
      {
        card: createdCards[1]._id,
        deck: distSysDeck._id,
        user: demoUser._id,
        rating: 5,
        responseTimeMs: 2400,
        repetitionBefore: 3,
        repetitionAfter: 4,
        intervalBefore: 6,
        intervalAfter: 16,
        easeFactorBefore: 2.5,
        easeFactorAfter: 2.5,
        reviewedAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
      },
    ];

    await ReviewLog.insertMany(sampleReviews);
    console.log('📊 Seeded sample study review logs.');

    console.log('\n=============================================');
    console.log('✅ DATABASE SEEDING COMPLETED SUCCESSFULLY!');
    console.log('=============================================');
    console.log('Demo Credentials:');
    console.log('  Email:    demo@conceptcards.io');
    console.log('  Password: Password123!');
    console.log('=============================================\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seedData();

