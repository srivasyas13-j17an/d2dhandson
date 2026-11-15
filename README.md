# TaskFlow — Task Manager

A lightweight personal task manager built with **Next.js + TypeScript + Supabase**, ready to push to GitHub and deploy on Vercel.

## What is included

- Email/password sign-up and sign-in
- Create, edit and delete tasks
- Start date, due date / deadline, priority and status
- Progress tracking from 0–100%
- Quick progress updates from each task card
- Dashboard counts for total, active, completed and overdue tasks
- Search and status filters
- Supabase Row Level Security so each account can access only its own tasks
- Responsive layout for desktop and mobile

## 1. Create the Supabase backend

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor → New query**.
3. Copy and run the complete script from `supabase/schema.sql`.
4. Go to **Project Settings → API** (or API Keys, depending on the dashboard version).
5. Copy the Project URL and the public anon/publishable key.

The SQL enables Row Level Security and adds policies that restrict task records to the signed-in owner. Do not put a Supabase `service_role` key in this app.

## 2. Run locally

Install Node.js 18.17+ (Node 20 LTS recommended).

```bash
npm install
```

Copy `.env.example` to `.env.local`, then fill in your Supabase values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_KEY
```

Start the app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Create an account in TaskFlow. Depending on your Supabase Authentication email-confirmation setting, you may need to confirm your email before signing in. For a production app, keep email confirmation enabled and configure your SMTP provider.

## 3. Push to GitHub

Create an empty repository on GitHub, then from this project folder:

```bash
git init
git add .
git commit -m "Initial TaskFlow app"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
git push -u origin main
```

Do not commit `.env.local`. It is excluded by `.gitignore`.

## 4. Deploy to Vercel

1. Sign in at [vercel.com](https://vercel.com) and choose **Add New → Project**.
2. Import your GitHub repository.
3. Add these Environment Variables in the Vercel project settings:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy. Vercel will detect Next.js automatically.
5. In Supabase → Authentication → URL Configuration, set your production Vercel URL as the Site URL and add it to the Redirect URLs list.

After changing environment variables, redeploy the Vercel project.

## Notes / next improvements

- Tasks are stored in Supabase, not just in browser storage. Sign in with the same account on another device to see the same tasks.
- The dashboard calculates overdue tasks from the due date when it loads. It does not send push/email reminders yet.
- This starter does not include recurring tasks, team sharing, calendar integration, file attachments or automatic scheduled notifications. These can be added as a next iteration.
- Progress is manually updated; the app does not infer progress from subtasks or elapsed time.
