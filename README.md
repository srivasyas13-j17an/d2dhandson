# TaskFlow — Simple Task Manager

A deliberately simple task manager for the GitHub + Vercel stack.

## Stack

- Next.js 14
- React 18
- TypeScript
- Browser `localStorage` for persistence

There is no Supabase, database, backend API, authentication provider, or environment-variable setup.

## Features

- Add, edit and delete tasks
- Task descriptions, start dates and due dates
- Low / Medium / High priority
- Not started / In progress / Completed / On hold statuses
- Progress slider from 0–100%
- Dashboard counts for total, active, completed and overdue
- Search and status filtering
- Export and import JSON backup

## Run locally

Install Node.js 18.17+ (Node 20 LTS recommended), then:

```bash
npm install
npm run dev
```

Open http://localhost:3000.

For a production build:

```bash
npm run build
npm start
```

## Deploy using GitHub + Vercel

1. Create a new empty repository on GitHub.
2. Extract this ZIP and put the contents of the `task-manager-simple` folder in the repository root.
3. Commit and push the files to GitHub.
4. In Vercel, select **Add New → Project** and import the GitHub repository.
5. Keep the framework preset as Next.js and click Deploy.

No environment variables or external services are required.

## Important storage limitation

This version saves tasks in the browser's localStorage. This is ideal for a simple personal starter app and requires no backend. However:

- Tasks are available only in the same browser and device.
- Clearing browser data can remove tasks.
- Tasks do not automatically sync between devices or users.
- Use **Export backup** periodically to download a JSON copy; **Import** restores it.

If you later want cross-device sync, shared tasks, sign-in or scheduled reminders, you will need a database/backend service. Vercel hosting and GitHub source control alone do not provide persistent shared application storage.
