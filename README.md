# Digeon AI

An AI tools platform and agent marketplace. Users can browse and purchase AI agents, run them through a secure backend proxy, read and engage with the blog, and get in touch through the contact form. Developers can register their own agents through a portal with an admin approval pipeline.

This repository is a refactor of the original Flask + HTML/CSS app into a modern split-stack architecture: a React frontend deployed to Vercel and a Node/Express backend deployed to Render, backed by Supabase Postgres.

---

## Tech stack

**Frontend**
- React + Vite
- Tailwind CSS v4
- React Router
- Deployed to **Vercel**

**Backend**
- Node.js + Express
- Supabase (Postgres + Storage)
- Stripe (Checkout)
- Nodemailer (Gmail SMTP)
- JWT auth
- Deployed to **Render**

**Infrastructure**
- Database & storage: Supabase
- Media bucket: `blog-media` (public)
- Payments: Stripe (currently test mode)

---

## Features

- **Authentication** — register, login, forgot-password flow, profile management, enforced password rules and password history (no reuse).
- **Blog** — public blog list with search, sort, date and likes filters; single post pages rendering rich (TipTap) HTML content; post likes; a flat comment system with one level of replies, comment likes, and an admin moderation view.
- **Newsletter** — branded HTML email template and a context-aware subscription toast system.
- **Contact** — contact form that sends dual emails (a branded notification to the owner and a confirmation to the sender).
- **Marketplace** — agent cards, a cart backed by local storage, Stripe Checkout, and quota-based agent ownership.
- **My Agents** — run purchased agents through a backend proxy so the agent's endpoint URL is never exposed to the browser; only successful runs decrement the quota.
- **Developer Portal** — register agents with a dynamic input schema, a health-check gate, and an admin approval pipeline; soft-delete lifecycle that keeps deleted agents available to existing buyers until their quota is depleted; typed output rendering for text, JSON, image, and file responses.

---

## Project structure

```
digeon-web/
├── backend/                  # Node/Express API (deploys to Render)
│   ├── src/
│   │   ├── index.js          # server entry
│   │   ├── app.js            # express app, middleware, route mounting
│   │   ├── routes/           # one file per resource
│   │   ├── controllers/      # request/response logic
│   │   ├── services/         # business logic, external calls
│   │   ├── models/           # DB queries
│   │   └── middleware/       # auth, error handling
│   ├── package.json
│   └── .env                  # secrets (not committed)
│
├── frontend/                 # React + Vite app (deploys to Vercel)
│   ├── src/
│   │   ├── pages/            # route-level components
│   │   ├── components/       # shared UI
│   │   ├── context/          # React context (cart, toast, auth)
│   │   └── App.jsx
│   ├── package.json
│   └── .env                  # VITE_ vars (not committed)
│
├── .gitignore
└── README.md
```

---

## Local development

### Prerequisites
- Node.js (LTS)
- A Supabase project
- A Stripe account (test mode)
- A Gmail account with an app password (for sending mail)

### 1. Backend

```bash
cd backend
npm install
npm start
```

Create `backend/.env` with:

```
SUPABASE_URL=...
SUPABASE_SERVICE_KEY=...
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
JWT_SECRET=...
GMAIL_USER=...
GMAIL_APP_PASSWORD=...
FRONTEND_URL=http://localhost:5173
```

> The server reads `process.env.PORT` when provided (used in production by Render) and falls back to a local port otherwise.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Create `frontend/.env` with:

```
VITE_API_URL=http://localhost:5000
```

(Set this to your backend's local URL/port.)

---

## Environment variables reference

| Variable | Where | Purpose |
|---|---|---|
| `SUPABASE_URL` | backend | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | backend | Supabase service role key (server-side only) |
| `STRIPE_SECRET_KEY` | backend | Stripe API secret |
| `STRIPE_WEBHOOK_SECRET` | backend | Verifies incoming Stripe webhook signatures |
| `JWT_SECRET` | backend | Signs/verifies auth tokens |
| `GMAIL_USER` | backend | Sending email address |
| `GMAIL_APP_PASSWORD` | backend | Gmail app password for SMTP |
| `FRONTEND_URL` | backend | Allowed CORS origin + Stripe redirect base |
| `VITE_API_URL` | frontend | Backend base URL (baked in at build time) |

> **Never commit `.env` files.** They are excluded via `.gitignore`.

---

## Deployment

The app deploys as two services from this single repository.

### Backend → Render
- New Web Service pointing at this repo, **Root Directory: `backend`**
- Build command: `npm install`
- Start command: `npm start`
- Add all backend environment variables listed above
- Set `FRONTEND_URL` to the Vercel URL once the frontend is deployed

### Frontend → Vercel
- New Project pointing at this repo, **Root Directory: `frontend`**
- Framework preset: Vite (auto-detected)
- Add `VITE_API_URL` set to the Render backend URL

### Stripe webhook
- Add a webhook endpoint in the Stripe dashboard pointing at the backend's webhook route on Render
- Subscribe to `checkout.session.completed`
- Copy the signing secret into `STRIPE_WEBHOOK_SECRET` on Render

After both services are live, redeploys happen automatically on every push to `main`.

---

## Notes & known tradeoffs

- **Render free tier cold starts**: the first request after a period of inactivity can take 30–60s while the service wakes up.
- **Gmail sending limit**: roughly 500 emails/day on a standard Gmail account.
- **Stripe** is currently in **test mode**.
- The Stripe webhook route must receive the **raw** request body (registered before the global JSON body parser) for signature verification to succeed.

---

## License

_Proprietary — Digeon Technologies LLC. All rights reserved._