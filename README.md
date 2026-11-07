# ConceptCards 🧠⚡

> **A collaborative, production-grade flashcard platform featuring multi-algorithm duplicate prevention, hierarchical organization, and automated SuperMemo SM-2 spaced-repetition scheduling.**

Built with **MongoDB Atlas**, **Express.js**, **React 18**, **Tailwind CSS**, and architected as a **unified monorepo for instant zero-config deployment on Vercel**.

---

## 🌟 Core Architectural Features

### 1. Automated SuperMemo SM-2 Spaced Repetition Engine
- Mathematical implementation of the **SuperMemo SM-2 algorithm** (`api/utils/sm2.js`).
- Adjusts repetition intervals ($I$), repetition counts ($n$), and card Ease Factors ($EF \ge 1.3$) based on 6 recall quality grades ($q \in [0, 5]$):
  $$EF' = EF + (0.1 - (5 - q) \cdot (0.08 + (5 - q) \cdot 0.02))$$
- Categorizes mastery levels automatically:
  - **New Concept**: $n = 0$
  - **Learning**: $1 \le n < 3$
  - **Reviewing**: $n \ge 3, I < 21\text{ days}$
  - **Mastered**: $I \ge 21\text{ days}$ or $n \ge 5$
- Telemetry logging in `ReviewLog` captures recall response times in milliseconds and before/after interval tracking.

### 2. Multi-Algorithm Duplicate Prevention Engine
- Prevents redundant study load by screening candidate cards before creation:
  - **Text Normalization**: Strips accents, punctuation, diacritics, and normalizes spacing.
  - **Token Sort Similarity**: Alphabetically sorts tokens to detect reordered sentences (e.g. *"What is the CAP Theorem?"* vs *"Explain what the CAP theorem is"*).
  - **Token Jaccard Coefficient**: Measures word-set overlap ($|A \cap B| / |A \cup B|$).
  - **Bigram Dice Coefficient**: Sub-word typo resilience ($2 \cdot |bigrams(A) \cap bigrams(B)| / (|A| + |B|)$).
  - **Normalized Levenshtein Distance**: String edit distance.
- Debounced live checking endpoint (`POST /api/cards/check-duplicate`) powers the real-time `DuplicateWarningBadge` component.

### 3. Recursive Hierarchical Organization
- Self-referencing tree structure (`parentDeck` reference in `Deck` model).
- Enables limitless folder-like nesting (e.g. `Computer Science` $\rightarrow$ `Distributed Systems` $\rightarrow$ `Consensus Protocols`).
- Automated ancestor breadcrumb resolution for navigation.
- Hierarchy Tree Explorer view on the dashboard.
- Study session launcher supports branch aggregation (studying a parent deck can include all child sub-decks).

### 4. Real-Time Collaboration & Permissions
- Decks support granular collaboration roles:
  - **Owner**: Full administrative control, collaborator management, deletion.
  - **Editor**: Can create cards, edit cards, and add sub-decks.
  - **Viewer**: Read-only study access.
- 1-click invitation modal by email address.

---

## 📂 Repository Monorepo Structure

```text
conceptcards/
├── vercel.json                   # Vercel Serverless Function & SPA routing
├── package.json                  # Root monorepo scripts (build, dev, seed, verify)
├── .env.example                  # Environment variable reference
├── .env                          # Local credentials configuration
├── api/
│   ├── index.js                  # Express serverless entrypoint for Vercel
│   ├── config/
│   │   └── db.js                 # Cached Mongoose connection handler with DNS fallback
│   ├── middleware/
│   │   ├── auth.js               # JWT bearer verification & user extraction
│   │   ├── validate.js           # Request body validation middleware
│   │   └── errorHandler.js       # Centralized error handler
│   ├── models/
│   │   ├── User.js               # User model with bcrypt & streak tracking
│   │   ├── Deck.js               # Hierarchical deck model with collaborators
│   │   ├── Card.js               # Flashcard model with SM-2 scheduling parameters
│   │   └── ReviewLog.js          # Telemetry and review audit trail
│   ├── routes/
│   │   ├── auth.routes.js        # Register, login, profile, me
│   │   ├── deck.routes.js        # Decks CRUD, breadcrumbs, hierarchy tree, collaborators
│   │   ├── card.routes.js        # Cards CRUD, duplicate check, batch import
│   │   └── study.routes.js       # SM-2 session generation, review logging, analytics
│   └── utils/
│       ├── sm2.js                # SM-2 spaced repetition calculation
│       └── duplicateDetector.js  # Multi-algorithm text similarity & deduplication
├── client/
│   ├── package.json              # React 18, Vite, Tailwind CSS, Lucide icons
│   ├── vite.config.js            # Vite build & local API proxy configuration
│   ├── tailwind.config.js        # Custom typography, colors, animations
│   ├── index.html                # App shell
│   └── src/
│       ├── App.jsx               # Client router & page navigation
│       ├── main.jsx              # DOM root mount
│       ├── index.css             # Tailwind imports & 3D card flip styles
│       ├── context/
│       │   └── AuthContext.jsx   # Persistent auth state & token interceptor
│       ├── components/
│       │   ├── Navbar.jsx        # Navigation header, streak pill, profile menu
│       │   ├── ProtectedRoute.jsx # Authentication route guard
│       │   ├── DeckCard.jsx      # Deck card with mastery progress & due badges
│       │   ├── StudySessionModal.jsx # Launcher for Due / Cram / Sub-deck study
│       │   ├── DuplicateWarningBadge.jsx # Real-time duplicate alert banner
│       │   └── MasteryBadge.jsx  # SM-2 mastery status pills
│       ├── pages/
│       │   ├── LandingPage.jsx   # High-converting landing page with 3D demo
│       │   ├── LoginPage.jsx     # Login with 1-click pre-seeded credentials fill
│       │   ├── RegisterPage.jsx  # Registration with password strength meter
│       │   ├── DashboardPage.jsx # Study telemetry, tree explorer, deck library
│       │   ├── DeckDetailsPage.jsx # Card management table, live duplicate check
│       │   └── StudyPage.jsx     # 3D Flip Card study mode with hotkeys & confetti
│       └── utils/
│           └── api.js            # Axios client with JWT auto-injection
└── scripts/
    ├── seed.js                   # High-yield CS, Systems, & Neuro flashcard seeds
    └── verify.js                 # 29-point automated end-to-end verification suite
```

---

## 🚀 Quickstart & Local Development

### 1. Prerequisites
- **Node.js** >= 18.0.0
- **npm** >= 9.0.0

### 2. Installation
From the root repository directory:
```bash
# Install root backend dependencies
npm install

# Install client frontend dependencies
npm --prefix client install
```

### 3. Verify Database & Logic
Execute the 29-point test suite covering MongoDB connectivity, auth, SM-2 math, duplicate detection, and permissions:
```bash
npm run verify
```

### 4. Populate Seed Data
Seed the database with pre-configured hierarchical decks and high-yield flashcards:
```bash
npm run seed
```

**Pre-seeded Demo Credentials:**
- **Email**: `demo@conceptcards.io`
- **Password**: `Password123!`

**Collaborator Account:**
- **Email**: `sarah.chen@conceptcards.io`
- **Password**: `Password123!`

### 5. Launch Full-Stack Application
Start both Express API server (port 5000) and Vite React client (port 5173) concurrently:
```bash
npm run dev
```

Visit [http://localhost:5173](http://localhost:5173) in your browser.

---

## ⚡ Instant Vercel Deployment

This repository is unified for **zero-configuration deployment on Vercel**:

1. Push this repository to GitHub or GitLab.
2. In the **Vercel Dashboard**, click **Add New Project** and import the repository.
3. Add the following **Environment Variables** in Vercel project settings:
   - `MONGODB_URI`: `your_mongodb_connection_string`
   - `JWT_SECRET`: `your_secure_jwt_secret`
   - `NODE_ENV`: `production`
4. Click **Deploy**. Vercel will build the React client (`client/dist`) and deploy the Express API (`api/index.js`) as a Serverless Function automatically.

---

## ⌨️ Study Mode Keyboard Shortcuts

When studying flashcards in `StudyPage`:
| Key | Action |
| :--- | :--- |
| `[Space]` | Flip flashcard between Concept (Front) and Answer (Back) |
| `[1]` | Rate: **Again** ($q=1$, resets interval to $<1$ day) |
| `[2]` | Rate: **Hard** ($q=2$, sets interval to $1$ day) |
| `[3]` | Rate: **Good** ($q=3$, standard interval progression) |
| `[4]` | Rate: **Easy** ($q=4$, accelerated interval progression) |
| `[5]` | Rate: **Perfect** ($q=5$, exponential interval scale) |

