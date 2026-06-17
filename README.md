# Kith Real-Time Messaging Workspace

Kith is a smart real-time messaging application with integrated AI assistance, scheduled reminders, live location sharing, disappearing chats, custom polls, and mood statuses. This repository contains both the backend services and the mobile-first frontend concept mockup.

## Tech Stack

- **Backend**: Node.js 20+, Express with TypeScript, Prisma ORM, Socket.IO, BullMQ, Redis.
- **Frontend**: React, Vite, Tailwind CSS v4, Lucide Icons.
- **AI Integrations**: Anthropic Claude API (3.5 Sonnet).

---

## Workspace Structure

- `backend/` - Node.js Express server + Socket.IO server + BullMQ workers
- `frontend/` - React Vite client showcasing the side-by-side 4-screen concept mockup

---

## Local Setup & Installation

### 1. Prerequisites
Ensure you have the following installed on your machine:
- Node.js 20+
- PostgreSQL (or running Docker container)
- Redis (or running Docker container)

### 2. Configure Environment Variables
Copy the `.env.example` in `backend/` to a new file named `.env`:
```bash
cd backend
cp .env.example .env
```
Provide your database URL, Redis URL, S3 credentials, and Anthropic Claude API key.

### 3. Run Database Migrations & Seeds
Install backend dependencies, trigger Prisma schema generation, execute migration scripts, and seed development rows:
```bash
# In the backend directory
npm install
npm run prisma:generate
npm run prisma:migrate
# Optional: Seed the database with mock records
npx prisma db seed
```

---

## Running Applications Locally

### Starting the Backend
From the `backend` directory, launch the live-reloading Express server:
```bash
npm run dev
```
The backend boots on: **[http://localhost:3000](http://localhost:3000)**.
Health checks can be monitored at: `http://localhost:3000/health`.

### Starting the Frontend
From the `frontend` directory, install packages and start the Vite dev server:
```bash
cd ../frontend
npm install
npm run dev
```
The frontend is available locally at: **[http://localhost:5173](http://localhost:5173)**.

---

## API Documentation

### Authentication Routes
- `POST /api/auth/register` - payload: `{ username, email, password }`
- `POST /api/auth/login` - payload: `{ email, password }` returns accessToken & refreshToken
- `POST /api/auth/refresh` - payload: `{ refreshToken }` retrieves new accessToken
- `POST /api/auth/logout` - clears refresh tokens in Redis

### User Profile Routes
- `GET /api/users/me` - retrieves current profile details
- `PUT /api/users/me` - updates username, email, avatarUrl
- `PUT /api/users/me/mood` - payload: `{ moodEmoji, moodText }` (broadcasts live mood updates to socket rooms)
- `POST /api/users/me/anonymous` - toggles Anonymous Mode (generates a random code name e.g., "MutedFox39")

### Rooms & Members
- `POST /api/rooms` - creates a group or DM room
- `GET /api/rooms` - lists current user's rooms
- `GET /api/rooms/:id` - retrieves details + member list (including live moods)
- `POST /api/rooms/:id/members` - adds a member
- `DELETE /api/rooms/:id/members/:userId` - removes member (admin action)

### Messages & Pinned Tasks
- `GET /api/rooms/:id/messages` - cursor-based pagination (50 per page, masks anonymous names for non-admins)
- `POST /api/messages/:id/pin` - pins a message as a task in a room
- `POST /api/messages/:id/translate` - translates text and caches results in `translated_cache` jsonb column
- `POST /api/messages/schedule` - payload: `{ roomId, content, scheduledAt }` enqueues BullMQ delayed job
- `DELETE /api/messages/schedule/:id` - cancels scheduled job

### Live Polls
- `POST /api/rooms/:id/polls` - creates a poll and post a `poll_ref` message
- `POST /api/polls/:id/vote` - registers/toggles vote atomically
- `GET /api/polls/:id` - retrieves live result counts

### Live Location Sharing
- `POST /api/location/share` - starts share session: `{ roomId|dmPartnerId, durationMinutes }`
- `PUT /api/location/update` - updates coordinates: `{ latitude, longitude }` (emits live sockets coordinates)
- `DELETE /api/location/stop` - terminates session

---

## Real-Time Socket.IO Events

### Client-to-Server
- `join_room` - `{ roomId }`
- `leave_room` - `{ roomId }`
- `send_message` - `{ roomId, content, type, isAnonymous?, expiresIn? }` (calculates and schedules disappearing message)
- `typing_start` / `typing_stop` - `{ roomId }`
- `poll_vote` - `{ pollId, optionId }`
- `location_update` - `{ latitude, longitude }`
- `mood_update` - `{ moodEmoji, moodText }`

### Server-to-Client
- `new_message` - `{ id, content, type, sender, ... }`
- `message_expired` - `{ messageId }` (disappearing message dissolution)
- `typing_indicator` - `{ userId, username, roomId, isTyping }`
- `poll_updated` - `{ pollId, options }` (live vote counts updates)
- `location_updated` - `{ userId, latitude, longitude }`
- `mood_updated` - `{ userId, moodEmoji, moodText }`
- `ai_summary_ready` - `{ roomId, summary }`
- `smart_replies_ready` - `{ messageId, suggestions }`
- `task_completed` - `{ taskId, completedBy }`
