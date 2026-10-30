# SocialConnect — Instagram-inspired full-stack social app

An upgraded version of your original React + Express + MongoDB project. It keeps your existing stack and builds a more polished social-feed experience inspired by common social-network patterns (not an official Instagram clone).

## What's upgraded

- **Modern responsive UI:** gradient branding, polished authentication, responsive three-column feed, mobile navigation, story-style discovery strip, and empty/loading/error feedback.
- **Authentication:** registration/login with hashed passwords and JWT authentication.
- **Posts:** text, image, and video posts; media-only posts work; character count; timestamps; newest-first feed.
- **Engagement:** like/unlike, comments, comment counts, and saved posts.
- **Feed modes:** For You (all posts), Following (posts by accounts you follow plus your own posts), and Saved (your private saved-post collection).
- **People search and following:** search by name/username and follow/unfollow accounts.
- **Direct messages:** persistent one-to-one text conversations, conversation list, unread indicators, and message polling for near-real-time updates.
- **Voice/video calls:** browser microphone/camera calling with WebRTC, incoming call invitations, accept/decline, microphone mute, camera toggle, hang up, and recent call history. ICE candidates are buffered until the remote description is ready. Both participants should be online; restrictive networks may require a TURN server for reliable connections.
- **Profile editing:** update display name and bio, upload a profile picture, and use the saved avatar across the interface.
- **Post ownership:** users can delete their own posts; other users cannot delete them. Deleted posts are removed from saved-post lists.
- **API configuration:** frontend API/media base URLs can be configured using environment variables.
- **Upload validation:** JPG, PNG, GIF, WEBP, MP4, WEBM, MOV, OGG; 50 MB maximum per file.

## Requirements

- Node.js 18 or newer (20 LTS recommended)
- MongoDB Community Server running locally, or a MongoDB Atlas connection string
- npm

## Run on Windows (PowerShell)

### 1. Start MongoDB

Make sure your local MongoDB service is running, or create a MongoDB Atlas database and copy its connection string.

### 2. Configure and start the backend

Open PowerShell in the project folder:

```powershell
cd backend
Copy-Item .env.example .env
```

Open `backend/.env` and replace `JWT_SECRET` with a long random secret. Set `MONGODB_URI` to your local MongoDB URL or Atlas URI. Then run:

```powershell
npm install
npm run dev
```

The API example is configured for `http://localhost:5002`. Check `http://localhost:5002/api/health`. If port 5002 is occupied, choose a free port in `backend/.env` and update both URLs in `frontend/.env` to match.

### 3. Start the frontend in a second terminal

From the project root:

```powershell
cd frontend
Copy-Item .env.example .env
npm install
npm run dev
```

Open the local URL printed by Vite, usually `http://localhost:5173`.

Keep both terminals running. Register an account to start using the app. Register a second account in another browser/incognito window to test following, feed filtering, likes, comments, and saved posts.

## API overview

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/auth/register` | Create an account |
| POST | `/api/auth/login` | Log in |
| GET | `/api/posts` | Get all posts (requires JWT) |
| GET | `/api/posts?feed=following` | Feed from followed accounts and yourself |
| GET | `/api/posts?feed=saved` | Current user's saved posts |
| POST | `/api/posts` | Create a text/media post |
| POST | `/api/posts/:id/like` | Like/unlike a post |
| POST | `/api/posts/:id/comments` | Add a comment |
| POST | `/api/posts/:id/save` | Save/unsave a post |
| DELETE | `/api/posts/:id` | Delete your own post |
| GET | `/api/users/search?q=...` | Search users |
| GET | `/api/users/me` | Get your authenticated profile |
| PATCH | `/api/users/me` | Update profile name, bio, and avatar (`multipart/form-data`) |
| GET | `/api/messages/conversations` | List recent conversations |
| GET | `/api/messages/:userId` | Read a conversation |
| POST | `/api/messages/:userId` | Send a direct message |
| GET | `/api/calls/active` | List active calls and incoming invitations |
| GET | `/api/calls/history` | Recent completed calls |
| POST | `/api/calls/:userId` | Start a voice or video call (`{ "type": "audio" }` or `{ "type": "video" }`) |
| GET | `/api/calls/session/:id` | Get call state/signals |
| POST | `/api/calls/session/:id/signal` | Exchange WebRTC offer/answer/ICE or end/reject a call |
| POST | `/api/users/:id/follow` | Follow/unfollow a user |
| GET | `/api/users/:username` | Get a public profile and posts |

## Project structure

```text
SocialConnect/
├── backend/
│   ├── uploads/
│   └── src/
│       ├── controllers/
│       ├── middleware/
│       ├── models/
│       ├── routes/
│       └── server.js
└── frontend/
    └── src/
        ├── services/api.js
        ├── App.jsx
        ├── main.jsx
        └── styles.css
```

## Important notes / next steps

- Local file uploads are for development and demo use. For production, use object storage such as Cloudinary or Amazon S3, plus image/video processing and moderation.
- This is an educational project, not production-ready social infrastructure. Before public deployment, add rate limiting, stronger input validation, secure cookie-based refresh-token handling, account recovery, email verification, privacy controls, logging, and automated tests. Configure CORS to allow only your deployed frontend domain.
- The story strip is a visual discovery placeholder, not a persistent 24-hour Stories feature. The story strip remains a visual discovery placeholder. Calling uses browser WebRTC and a database-backed polling signal channel. For reliable calls across restrictive mobile/corporate networks, configure a TURN server; production use should also add WebSocket signaling, stronger call lifecycle cleanup, rate limits, and abuse controls. Message delivery updates by polling rather than a dedicated WebSocket connection.
- If you previously created an account, it should continue working with the existing database. New `savedPosts` fields are initialized by Mongoose defaults.


## Fundraising, donations, and donor email

The project includes a Fundraising page where signed-in users can submit community fundraisers, target amounts, descriptions, causes, and deadlines. New fundraisers require administrator verification before accepting donations. Donors can use Razorpay Checkout, and after the backend verifies the Razorpay signature, the donation is saved, the fundraising total is updated, and SocialConnect attempts to send the donor a personalized thank-you email. Completed donations are listed under **Your donations**.

### Backend setup

1. Open `backend` and run `npm install`.
2. Copy `.env.example` to `.env`. Fill in `MONGODB_URI` and `JWT_SECRET`.
3. Create Razorpay test credentials in your Razorpay account and set `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` in `backend/.env`. Never put the secret key in frontend code or commit `.env`.
4. Configure SMTP for donor greeting emails. For Gmail, enable 2-step verification and create a Google App Password; use it as `SMTP_PASS`, not your normal Gmail password. Set `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=587`, `SMTP_SECURE=false`, `SMTP_USER`, and `EMAIL_FROM`. If SMTP is not configured, donations can still be recorded but the greeting email will not be sent.
5. Set a long random `FUNDRAISER_ADMIN_KEY` in `backend/.env`. Start the backend with `npm run dev`.

### Verify a fundraiser

Only verified fundraisers accept donations. After reviewing the cause outside the app, an administrator can verify it using the backend API. Send an authenticated-free POST request to `http://localhost:5002/api/fundraisers/FUNDRAISER_ID/verify` with header `x-admin-key: YOUR_FUNDRAISER_ADMIN_KEY`. Replace the ID and key with real values. Keep the admin key private. For a local-only demo, `FUNDRAISER_AUTO_VERIFY=true` automatically verifies new fundraisers; do not use that setting for a public deployment.

### Frontend setup

1. Open `frontend` and run `npm install`.
2. Copy `.env.example` to `.env` and set `VITE_API_URL` and `VITE_MEDIA_URL` to your backend address.
3. Run `npm run dev`.

Use Razorpay test mode and test credentials first. The backend verifies payment signatures before updating totals; frontend checkout success alone is not trusted. Before a real public launch, add formal cause verification, refunds/dispute handling, privacy disclosures, and a compliant process for managing and disbursing funds.
