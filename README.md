# 🎓 Faculty Selection Portal

A production-ready full-stack faculty selection portal built with React + Firebase Firestore + Express (Render).

---

## ✨ Features

- **Student Login** — PIN + DOB (DD/MM/YYYY) authentication
- **Real-time Seat Counts** — Firestore onSnapshot listeners
- **Countdown Timer** — Synced from Firestore `settings/config`
- **Accordion UI** — Subject-by-subject faculty selection
- **One-time Submission** — Firestore transaction prevents duplicates & overbooking
- **Admin Dashboard** — Stats / Subjects / Faculty / Students / Settings tabs
- **Excel Import** — Bulk upload students from `.xlsx` (Name, PIN, DOB)
- **CSV Export** — Selections, Subjects, Faculty, Students
- **Concurrency Safe** — Firestore transactions handle race conditions

---

## 🗂️ Project Structure

```
faculty-portal/
├── frontend/                  # React app (deploy to Vercel)
│   └── src/
│       ├── components/
│       ├── pages/
│       ├── services/          # firebase.js, api.js
│       ├── context/           # AuthContext
│       └── hooks/             # useCountdown, useRealtimeData
├── functions/                 # Firebase Cloud Functions (local emulator only)
├── faculty-portal-server/     # Standalone Express API (deploy to Render)
│   ├── controllers/
│   ├── middlewares/
│   └── server.js
├── firestore.rules
├── firestore.indexes.json
└── firebase.json
```

---

## 🚀 Local Development (Emulator)

### Prerequisites
- Node.js 18+
- Firebase CLI: `npm install -g firebase-tools`
- Java 21+ (for Firestore emulator)

### Install dependencies
```powershell
cd frontend
npm install

cd ..\functions
npm install
```

### Configure environment
Create `functions/.env`:
```env
JWT_SECRET=your_strong_random_secret
ADMIN_USER=your_admin_username
ADMIN_PASS=your_strong_password
```

Create `frontend/.env`:
```env
REACT_APP_FIREBASE_API_KEY=...
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=...
REACT_APP_FIREBASE_APP_ID=...
REACT_APP_API_URL=http://127.0.0.1:5001/your-project-id/us-central1/api
REACT_APP_USE_EMULATOR=true
```

### Start emulators
```powershell
# Set Java PATH (Windows)
$env:PATH = $env:PATH + ";C:\Users\<you>\AppData\Local\Programs\Eclipse Adoptium\jdk-21...\bin"

firebase emulators:start --import=./emulator-data --export-on-exit=./emulator-data
```

### Start frontend (second terminal)
```powershell
cd frontend
npm start
```

---

## ☁️ Production Deployment

### Architecture
| Service | Platform | Cost |
|---|---|---|
| Frontend | Vercel | Free |
| Backend API | Render | Free |
| Firestore Database | Firebase Spark | Free |

### Step 1 — Deploy Firestore rules
```powershell
firebase deploy --only firestore:rules,firestore:indexes
```

### Step 2 — Deploy Backend to Render
1. Push `faculty-portal-server/` folder to a GitHub repo
2. Go to [render.com](https://render.com) → New Web Service → connect repo
3. Build command: `npm install`
4. Start command: `node server.js`
5. Add environment variables:

| Key | Value |
|---|---|
| `FIREBASE_SERVICE_ACCOUNT` | Contents of Firebase service account JSON (one line) |
| `JWT_SECRET` | Strong random secret (min 32 chars) |
| `ADMIN_USER` | Your admin username |
| `ADMIN_PASS` | Your admin password |

### Step 3 — Deploy Frontend to Vercel
Update `frontend/.env` for production:
```env
REACT_APP_API_URL=https://your-render-app.onrender.com
REACT_APP_USE_EMULATOR=false
```

```powershell
cd frontend
npm run build
npx vercel --prod
```

---

## 🔐 Security

- ✅ Admin credentials stored in **environment variables only** — never in code
- ✅ JWT secret stored in **environment variables only**
- ✅ All submissions go through backend API — no direct Firestore writes from client
- ✅ Firestore transactions prevent race conditions
- ✅ Server-side timestamps — client time never trusted
- ✅ `.env` files excluded from git via `.gitignore`
- ✅ Admin token: 24h expiry, student token: 8h expiry

---

## 📋 Excel Import Format

Columns (any order, case-insensitive):

| Name | PIN | DOB |
|---|---|---|
| student1 | 23091A05XX | 0X/0X/20XX |
| student2 | 23091A05XX | 0X/0X/20XX |

- **PIN format:** `YYCCCSRR` → Year(2) + College(3) + Branch(3) + Roll
- **DOB format:** `DD/MM/YYYY`
- Name column is optional

---

## 🗄️ Firestore Collections

| Collection | Doc ID | Key Fields |
|---|---|---|
| `students` | PIN | pin, dob, name, branch, year, has_submitted |
| `subjects` | auto | name, code |
| `faculty` | auto | name, subject_id, max_limit, current_count, experience |
| `selections` | auto | pin, subject_id, faculty_id, timestamp |
| `settings` | config | selection_open, end_time |

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

- Mobile + Desktop responsive
- Clean professional UI — DM Sans + Sora fonts
- Framer Motion animations
- Color-coded seat availability (Green / Yellow / Red)