# AAS Staff Portal — Setup Guide

## What you're getting

A complete, production-ready staff management web app built with:
- **Next.js 15** (React, App Router, TypeScript)
- **Supabase** (PostgreSQL database, authentication, file storage)
- **Tailwind CSS** (AAS blue-and-white branding)
- **Progressive Web App** — staff can install it on their phone like an app
- **Free hosting on Vercel** (generous free tier, no credit card required)

---

## Step 1 — Create your Supabase project (free)

1. Go to **supabase.com** and sign up (free)
2. Click **New project**
3. Name it `aas-staff-app`, choose a strong database password, select the nearest region (EU West)
4. Wait ~2 minutes for provisioning

### Run the database schema

1. In your Supabase dashboard, click **SQL Editor** in the left sidebar
2. Click **New query**
3. Open `supabase/migrations/001_initial_schema.sql` from this project
4. Paste the entire contents and click **Run**
5. Repeat for `supabase/migrations/002_bank_holidays_2025_2026.sql`

### Get your API keys

1. Go to **Settings → API** in Supabase
2. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon / public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` (keep this secret!)

### Enable email auth

1. Go to **Authentication → Providers**
2. Ensure **Email** is enabled
3. Go to **Authentication → Email Templates** and customise if desired
4. Go to **Authentication → URL Configuration** and add your app URL to "Site URL" once you have it

---

## Step 2 — Deploy to Vercel (free)

### Option A: GitHub (recommended)

1. Create a free **GitHub** account if you don't have one
2. Create a new repository called `aas-staff-app`
3. Upload this entire project folder to the repository
4. Go to **vercel.com**, sign up with GitHub
5. Click **Add New Project**, import your repository
6. Add environment variables (Settings → Environment Variables):
   ```
   NEXT_PUBLIC_SUPABASE_URL    = https://your-ref.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJ...
   SUPABASE_SERVICE_ROLE_KEY   = eyJ...
   NEXT_PUBLIC_APP_URL         = https://your-app.vercel.app
   ```
7. Click **Deploy**

Vercel gives you a URL like `aas-staff-app.vercel.app`. You can use this immediately.

### Option B: Vercel CLI (local machine)

```bash
# Install Node.js 18+ from nodejs.org if you don't have it
# Then install dependencies:
npm install

# Install Vercel CLI
npm install -g vercel

# Log in and deploy
vercel login
vercel --prod
```

---

## Step 3 — Create your administrator account

1. Open the app (your Vercel URL)
2. Click **Request access** and register with your email
3. Your account starts as `pending` — you need to approve it directly in Supabase:
   - Go to Supabase → **SQL Editor**
   - Run:
     ```sql
     update profiles
     set status = 'active', role = 'administrator'
     where email = 'your@email.com';
     ```
4. Sign back in — you now have full administrator access

---

## Step 4 — Set up the company

1. Sign in as administrator
2. Go to **Settings** → set the mileage rate, default holiday allowance, and timesheet defaults
3. Go to **Staff** → any self-registered users will appear as pending for you to approve
4. Go to **Vehicles** and **Customers** to add your resources

---

## Step 5 — Install on phones (PWA)

### iPhone (Safari)
1. Open the app in Safari
2. Tap the **Share** button (box with arrow)
3. Scroll down and tap **Add to Home Screen**
4. Name it "AAS Staff" and tap **Add**

### Android (Chrome)
1. Open the app in Chrome
2. Tap the **⋮** menu
3. Tap **Add to Home screen** or **Install app**

---

## Staying free — what to watch

| Service | Free limit | Notes |
|---------|-----------|-------|
| Supabase | 500MB database, 1GB storage, 50,000 MAU | Plenty for 4–10 users |
| Vercel | 100GB bandwidth/month | Easily enough for internal use |
| Supabase Auth | 50,000 MAU | No issue at your scale |

**Things that may eventually cost money:**
- Receipt/attachment storage: if you upload many large photos, you'll hit the 1GB Supabase free limit
- Email delivery: Supabase includes basic email auth; if you add notification emails, consider Resend (free tier: 3,000 emails/month)
- Custom domain: ~£10/year from Namecheap or Cloudflare

---

## Domain setup (when ready)

If you want to use `staff.autonomousagrisolutions.co.uk`:

1. Log in to your domain registrar (wherever you bought autonomousagrisolutions.co.uk)
2. Add a **CNAME record**:
   - Name: `staff`
   - Value: `cname.vercel-dns.com`
3. In Vercel → your project → **Settings → Domains**, add `staff.autonomousagrisolutions.co.uk`
4. Vercel automatically provisions an SSL certificate

---

## Local development (optional)

```bash
# Clone your repository
git clone https://github.com/your-username/aas-staff-app.git
cd aas-staff-app

# Install dependencies
npm install

# Create .env.local from the example
cp .env.example .env.local
# Edit .env.local and add your Supabase keys

# Run the development server
npm run dev
# Open http://localhost:3000
```

---

## File structure overview

```
aas-staff-app/
├── src/
│   ├── app/
│   │   ├── (auth)/           # Login, register, pending pages
│   │   └── (app)/            # All authenticated pages
│   │       ├── dashboard/    # Home screen
│   │       ├── calendar/     # Day/week/month/timeline views
│   │       ├── holidays/     # Holiday requests & approvals
│   │       ├── sickness/     # Sickness records
│   │       ├── tasks/        # Task management
│   │       ├── staff/        # User management (admin/manager)
│   │       ├── customers/    # Customer database
│   │       ├── locations/    # Work sites
│   │       ├── vehicles/     # Fleet & equipment
│   │       ├── timesheets/   # Time tracking
│   │       ├── expenses/     # Expense claims
│   │       ├── mileage/      # Mileage claims
│   │       ├── reports/      # Excel exports
│   │       ├── notifications/# Notification centre
│   │       └── settings/     # Company settings (admin)
│   ├── components/           # Reusable UI components
│   ├── lib/                  # Supabase client, utilities
│   └── types/                # TypeScript type definitions
├── supabase/
│   └── migrations/           # SQL schema files
├── public/
│   └── manifest.json         # PWA manifest
├── .env.example              # Environment variable template
├── package.json
└── SETUP.md                  # This file
```

---

## Adding the second phase features

The codebase is designed for easy extension. Database tables for timesheets and expenses are already created. To add:

- **Timesheet locking workflow**: add a "Lock period" button for managers in `/timesheets`
- **Expense receipt uploads**: wire up `supabase.storage.from('receipts').upload(...)` in the expense form
- **Push notifications**: add a `push_subscriptions` table and use the Web Push API
- **Customer-specific time allocation on timesheets**: the `customer_id` column already exists on `timesheet_entries`

---

*Built for Autonomous Agri Solutions Ltd — July 2026*
