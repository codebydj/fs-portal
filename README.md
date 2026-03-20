# 🎓 Faculty Selection Portal

A production-ready full-stack faculty selection portal built with **React + Firebase**.

## ✨ Features

- **Student Login** — PIN + DOB (DD/MM/YYYY) authentication
- **Real-time Seat Counts** — Firestore `onSnapshot` listeners
- **Countdown Timer** — Synced from Firestore `settings/config`
- **Accordion UI** — Subject-by-subject faculty selection with dropdowns
- **One-time Submission** — Firestore transaction prevents duplicates & overbooking
- **Admin Dashboard** — Tabbed: Stats / Subjects / Faculty / Settings
- **Excel Import** — Bulk upload students from `.xlsx` file
- **CSV Export** — Download all selections
- **Concurrency Safe** — Firebase transactions handle race conditions

---

## 🗂️ Project Structure

```
faculty-portal/
├── frontend/              # React app
│   └── src/
│       ├── components/
│       │   ├── shared/    # Navbar, Timer, Modal
│       │   └── student/   # SubjectAccordionList
│       ├── pages/
│       │   ├── student/   # Login, Dashboard
│       │   └── admin/     # Login, Dashboard
│       ├── services/      # firebase.js, api.js
│       ├── context/       # AuthContext
│       ├── hooks/         # useCountdown
│       └── App.js
├── functions/             # Firebase Cloud Functions
│   ├── controllers/       # Auth, Selection, Admin, Export
│   ├── middlewares/       # JWT verification
│   └── index.js
├── firestore.rules        # Security rules
├── firestore.indexes.json # Query indexes
└── firebase.json          # Firebase config
```

---

## 🚀 Setup & Deployment

### Prerequisites
- Node.js 18+
- Firebase CLI: `npm install -g firebase-tools`
- A Firebase project with **Firestore** and **Functions** enabled

---

### 1. Clone & Install

```bash
# Install frontend dependencies
cd frontend && npm install

# Install functions dependencies
cd ../functions && npm install
```

---

### 2. Firebase Setup

```bash
# Login to Firebase
firebase login

# Initialize project (select your project)
firebase use --add
```

---

### 3. Configure Frontend

```bash
cd frontend
cp .env.example .env
# Edit .env with your Firebase project values from:
# Firebase Console → Project Settings → Your Apps → SDK config
```

---

### 4. Configure Functions

Change admin credentials in `functions/controllers/adminAuthController.js`:
```js
const ADMIN_USERNAME = "admin";          // ← change this
const ADMIN_PASSWORD = "FacultyPortal@2024"; // ← change this
```

Set JWT secret for production:
```bash
firebase functions:config:set jwt.secret="your_super_secret_key"
```

Then update `functions/controllers/authController.js` and `adminAuthController.js`:
```js
process.env.JWT_SECRET // already reads from env
```

---

### 5. Run Locally (Emulators)

```bash
# Terminal 1 — Start emulators
firebase emulators:start

# Terminal 2 — Start frontend
cd frontend
REACT_APP_API_URL=http://localhost:5001/YOUR_PROJECT_ID/us-central1/api npm start
```

---

### 6. Deploy to Production

```bash
# Build frontend
cd frontend && npm run build

# Deploy everything
cd .. && firebase deploy
```

---

## 🔐 Admin Login

- **URL:** `/admin/login`
- **Username:** `admin`
- **Password:** `FacultyPortal@2024`
- ⚠️ Change these in `adminAuthController.js` before deploying!

---

## 📋 Excel Import Format

Your `.xlsx` file must have these column headers (case-insensitive):

| PIN        | DOB        |
|------------|------------|
| 23091A05R4 | 15/08/2003 |
| 22091A05B2 | 22/11/2002 |

- **PIN format:** `YYCCCSRR` → Year(2) + College(3) + Branch(3) + Roll(variable)
- **DOB format:** `DD/MM/YYYY`

---

## 🗄️ Firestore Collections

| Collection | Doc ID | Key Fields |
|---|---|---|
| `students` | PIN | pin, dob, branch, year, has_submitted |
| `subjects` | auto | name, code |
| `faculty` | auto | name, subject_id, max_limit, current_count |
| `selections` | auto | pin, subject_id, faculty_id, timestamp |
| `settings` | `config` | selection_open, end_time |

---

## 🔒 Security

- All student submissions go through **Cloud Functions only**
- Client cannot directly write to `selections`, `faculty`, or `students`
- **Firestore transactions** prevent race conditions and overbooking
- **Server-side timestamps** — never trust client time
- **JWT tokens** expire after 8 hours
- Admin credentials stored **only in backend**, never exposed to frontend

---

## ⚠️ Error Codes

| Code | Meaning |
|---|---|
| `INVALID_CREDENTIALS` | Wrong PIN or DOB |
| `ALREADY_SUBMITTED` | Student already submitted |
| `SELECTION_CLOSED` | Window closed or expired |
| `SEATS_FULL` | Faculty has no seats left |
| `UNAUTHORIZED` | Missing or invalid token |
| `FORBIDDEN` | Wrong role |
| `NOT_FOUND` | Resource not found |
| `SERVER_ERROR` | Internal error |

---

## 📱 Responsive Design

- Mobile-first, tested on 320px–1440px
- Clean professional UI with DM Sans + Sora fonts
- Smooth Framer Motion animations
- Color-coded seat availability (Green/Yellow/Red)
