<div align="center">

# TaskSphere Frontend

**Agile project management platform — Next.js web application**

[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=nextdotjs)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-3.3-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
[![React Query](https://img.shields.io/badge/TanStack%20Query-5-red?logo=reactquery)](https://tanstack.com/query)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[Live App](https://tasksphere.io.vn) · [Backend Repo](https://github.com/lenhien06/tasksphere-backend)

</div>

---

## Overview

TaskSphere is a full-featured project management platform for software teams following Agile/Scrum methodology. This repository contains the Next.js 15 frontend — a responsive, real-time web application with an integrated AI assistant.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript 5.6 |
| Styling | Tailwind CSS 3.3 + shadcn/ui + Radix UI |
| State | Zustand (global) + TanStack Query v5 (server state) |
| Forms | React Hook Form + Zod validation |
| Rich text | Tiptap (mentions, images, links) |
| Drag & drop | dnd-kit (Kanban board) |
| Charts | Recharts (burndown, burnup, velocity) |
| Real-time | STOMP over SockJS (WebSocket) |
| Animations | Framer Motion |
| i18n | react-i18next |
| Auth | Email/OTP · Google OAuth (`@react-oauth/google`) · Cloudflare Turnstile |
| HTTP | Axios with interceptor-based JWT refresh |
| Build | Docker multi-stage (Node 20 Alpine, standalone output) |

---

## Features

### Authentication
- Email + OTP verification flow
- Google OAuth2 one-click sign-in
- Cloudflare Turnstile bot protection
- Persistent sessions via secure HTTP-only cookie + JWT refresh

### Workspace & Project Management
- Create and switch between multiple workspaces
- Workspace health metrics dashboard
- Create projects, manage members, configure roles
- Project invitation via email link

### Kanban Board
- Drag-and-drop task cards between columns (dnd-kit)
- Customisable columns per project
- Inline task creation and quick status update
- Subtask progress bar, priority dot, type badge on each card

### Task Detail
- Rich-text description editor (Tiptap) with @mentions
- Sub-tasks, checklists, worklogs
- File attachments with upload progress
- Task dependencies (blocks / blocked-by)
- Custom fields
- Activity log and comment thread
- Optimistic UI updates with ETag-based conflict detection

### Sprint Management
- Create, start, and complete sprints
- Drag tasks from backlog into active sprint
- Burndown chart, burnup chart, velocity report with forecasting

### Calendar View
- Monthly calendar with tasks rendered on their due dates
- Click to open task detail panel

### Reports & Export
- Member performance report (tasks, story points, hours logged)
- Project overview summary
- One-click export to **PDF** or **Excel** (async job with download link)

### AI Features
- **AI Task Generator** — describe a feature; AI generates a full backlog with type, priority, story points, skill tags, and acceptance criteria
- **AI Project Planner** — conversational flow that builds a complete sprint plan from a natural-language project description
- **Smart Assignment** — AI suggests the best team member for each task with a scored rationale
- **Skill Tags Editor** — manage member skill profiles used by the assignment engine

### Real-time & Notifications
- Live notifications via WebSocket (STOMP)
- In-app notification panel with read/unread tracking
- Real-time board updates when teammates move or update tasks

### Settings & Personalisation
- Dark / light theme (next-themes)
- Language switching (Vietnamese / English)
- Profile management with avatar upload

---

## Project Structure

```
├── app/                        # Next.js App Router pages
│   ├── (auth)/                 # Login, register, OTP pages
│   ├── dashboard/              # Personal dashboard
│   ├── workspaces/             # Workspace list & creation
│   ├── projects/[id]/
│   │   ├── board/              # Kanban board
│   │   ├── backlog/            # Sprint backlog
│   │   ├── sprints/            # Sprint management
│   │   ├── calendar/           # Calendar view
│   │   ├── tasks/              # Task list
│   │   ├── reports/            # Charts and reports
│   │   ├── members/            # Team members
│   │   └── settings/           # Project settings
│   ├── my-tasks/               # Personal task view
│   ├── profile/                # User profile
│   └── settings/               # App settings
├── components/
│   ├── ai/                     # AI task generator, project planner, assignment review
│   ├── kanban/                 # Board, column, task card components
│   ├── task-detail/            # Full task detail panel
│   ├── dashboard/              # Workspace and personal dashboards
│   ├── notifications/          # Real-time notification panel
│   ├── auth/                   # Auth forms and OAuth buttons
│   └── ui/                     # shadcn/ui primitives
├── hooks/                      # Custom React hooks
├── stores/                     # Zustand global state
├── app/api/                    # Next.js route handlers (proxy layer)
└── app/services/               # Axios API clients
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- A running instance of the [TaskSphere Backend](https://github.com/lenhien06/tasksphere-backend)

### Environment Variables

Create `.env` in the project root:

```env
NEXT_PUBLIC_API_URL=http://localhost:8080/api
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_oauth_client_id
NEXT_PUBLIC_TURNSTILE_SITE_KEY=your_cloudflare_turnstile_site_key
```

### Run in Development

```bash
git clone https://github.com/lenhien06/tasksphere-frontend.git
cd tasksphere-frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Run with Docker Compose

```bash
cp .env .env.production   # ensure production values are set
docker compose up -d --build
```

The container runs the Next.js standalone output on port 3000.

---

## Deployment

The production build uses Docker multi-stage:

1. **deps** — `npm ci` (Node 20 Alpine)
2. **builder** — `next build` with `NEXT_PUBLIC_*` baked in at build time
3. **runner** — minimal Node image with standalone output, non-root user

`NEXT_PUBLIC_*` variables must be set as Docker build args because Next.js inlines them at compile time.

For a full server setup (Nginx, SSL, Docker), see [`docs/SERVER_MIGRATION.md`](https://github.com/lenhien06/tasksphere-backend/blob/main/docs/SERVER_MIGRATION.md) in the backend repo.

Quick deploy on an existing server:

```bash
bash /root/deploy-frontend.sh
```

---

## License

[MIT](LICENSE)
