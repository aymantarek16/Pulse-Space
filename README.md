# 🚀 PulseSpace — Premium Social Platform

A premium, production-ready social platform built with Next.js 14, Firebase, and TypeScript.

## ✨ Features (Phase 1)

- 🔐 **Auth System** — Email/password + Google OAuth
- 👤 **User Profiles** — Avatar, bio, cover, stats
- 🌍 **i18n** — Arabic (RTL) + English (LTR), auto-detect
- 🎨 **Premium Dark UI** — Glass morphism, smooth animations
- 📱 **Responsive** — Mobile-first with PWA support
- 🔒 **Secure** — Firebase Authentication + Firestore rules

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Animations | Framer Motion |
| Backend | Firebase (Auth + Firestore) |
| Forms | React Hook Form + Zod |
| Icons | Lucide React |

## 📁 Project Structure

```
pulsespace/
├── app/                    # Next.js App Router
│   ├── (auth)/             # Login, Register pages
│   ├── (protected)/        # Authenticated routes
│   │   ├── home/           # Feed page
│   │   ├── profile/        # Profile + Edit profile
│   │   ├── explore/        # Explore (Phase 2)
│   │   ├── notifications/  # Notifications (Phase 6)
│   │   ├── messages/       # Chat (Phase 5)
│   │   ├── spaces/         # Spaces (Phase 4)
│   │   ├── saved/          # Saved posts (Phase 6)
│   │   └── settings/       # Settings (Phase 6)
│   └── onboarding/         # New user onboarding
├── components/
│   ├── auth/               # Auth-specific components
│   ├── layout/             # Sidebar, mobile nav
│   ├── profile/            # Profile components
│   └── ui/                 # Reusable UI (Button, Input, Avatar...)
├── contexts/               # React Context providers
├── hooks/                  # Custom React hooks
├── lib/
│   ├── firebase/           # Firebase client, auth, firestore
│   ├── i18n/               # Translations + useTranslation hook
│   └── utils.ts            # Utility functions
├── services/               # Firebase service layer
│   ├── users.service.ts
│   ├── posts.service.ts
│   ├── comments.service.ts
│   ├── reactions.service.ts
│   ├── follows.service.ts
│   ├── messages.service.ts
│   └── notifications.service.ts
└── types/                  # TypeScript type definitions
```

## 🚀 Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Firebase Setup

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable **Authentication** (Email/Password + Google)
3. Create a **Firestore** database (start in production mode)
4. Copy your Firebase config

### 3. Configure environment

Fill in `.env.local`:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
```

### 4. Deploy Firestore rules

```bash
npm install -g firebase-tools
firebase login
firebase use your-project-id
firebase deploy --only firestore:rules
```

### 5. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 🔒 Security

- Firestore rules enforce authentication on all collections
- Users can only write to their own data
- Username squatting is prevented (once set, locked)
- Images and media use external HTTPS URLs stored in Firestore fields
- No `allow: true` rules anywhere

## 📱 PWA

The app is PWA-ready with:
- Web manifest (`/public/manifest.json`)
- Mobile-optimized viewport
- Theme color matching the dark UI

## 🗺 Roadmap

| Phase | Features | Status |
|-------|----------|--------|
| 1 | Auth, Profiles, i18n | ✅ Done |
| 2 | Posts, Feed, Reactions, Comments | 🔜 Next |
| 3 | Follow system, Feed improvements | 🔜 |
| 4 | Spaces / Communities | 🔜 |
| 5 | Real-time Chat | 🔜 |
| 6 | Notifications, Search, Saved | 🔜 |
| 7 | PWA polish, Performance | 🔜 |
