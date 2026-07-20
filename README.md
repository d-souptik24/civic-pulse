<div align="center">

<img src="https://img.shields.io/badge/Google_Cloud-Run-4285F4?style=for-the-badge&logo=googlecloud&logoColor=white" />
<img src="https://img.shields.io/badge/Firebase-Firestore-FFCA28?style=for-the-badge&logo=firebase&logoColor=black" />
<img src="https://img.shields.io/badge/Gemini-3.1_Flash_Lite-8E75B2?style=for-the-badge&logo=google&logoColor=white" />
<img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black" />

<br /><br />

# 🌐 CivicPulse

### AI-Powered Civic Issue Reporting & Resolution Platform

_Built for the Vibe2Ship Hackathon — Problem Statement 2: Community Hero_

</div>

---

## 🏙️ The Problem

Every city has them — potholes that never get fixed, streetlights that stay broken for months, water leaks that go unnoticed. Citizens have no easy way to report these issues, no visibility into whether their reports were heard, and no way to hold authorities accountable.

Traditional complaint portals are slow, opaque, and disconnected from the community. Reports get lost. Nothing gets fixed.

---

## 💡 The Solution — CivicPulse

CivicPulse is a community-first platform where citizens can photograph a civic problem and submit it in seconds. From that moment, five AI pipelines take over — verifying the issue is real, preventing duplicates, tracking it on a live map, escalating it if ignored, and confirming it's actually fixed.

Every issue has a full public lifecycle. The community sees it, upvotes it, and watches it get resolved in real time.

---

## 🤖 The 5 AI Pipelines

| #     | Pipeline                                       | What it Does                                                                                                                                                                       |
| ----- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1** | **Vision Categorizer & Authenticity Verifier** | Analyses the uploaded photo using Gemini's multimodal vision to auto-detect the issue type and severity, and verifies the photo is a real civic problem — not a duplicate or fake. |
| **2** | **Geo-Deduplication Agent**                    | Before creating a new report, scans a 200-metre radius to check if the same issue already exists nearby. If found, the citizen is prompted to upvote the existing report instead.  |
| **3** | **Predictive Hotspot Mapper**                  | Clusters open issues by location and generates plain-English AI insights — _"Northern sector has 5 open potholes — high risk of vehicle damage"_ — surfaced on the live dashboard. |
| **4** | **Autonomous Escalation Agent**                | Admins can trigger the agent from the dashboard, which then scans all unresolved issues older than 24 hours and generates formal escalation summaries, updating their status to escalated. |
| **5** | **AI Resolution Verifier**                     | When a fix is submitted, Gemini compares the before and after photos. If the issue is confirmed resolved, the ticket auto-closes and the reporter earns community points.          |

---

## 🎯 How It Works — The Citizen Flow

1. **Snap a photo** of a civic issue near you (pothole, broken light, waste dump, water leak)
2. **AI analyses it** — category, severity, and authenticity are detected automatically
3. **Drop a pin** on the map to geo-tag the exact location
4. **Submit** — the issue appears live on the community map instantly
5. **Community upvotes** raise the priority of important issues
6. **Citizens resolve** by uploading a fix photo — AI verifies the fix is real before closing

---

## 📱 Pages

| Page             | Purpose                                                     |
| ---------------- | ----------------------------------------------------------- |
| **Landing Page** | Platform entry point, interactive walkthrough, live stats overview, and project info |
| **Dashboard**    | Live issue map, stats, AI hotspot insights, recent activity |
| **Report**       | Three-step wizard — photo, location, review & submit        |
| **Issues**       | Full list, filterable by category, status, and area         |
| **Issue Detail** | Complete timeline, upvotes, before/after photos             |
| **Leaderboard**  | Top contributing citizens, points, and badges               |
| **Admin Panel**  | Platform-wide analytics, escalation agent trigger, and escalated issue queue |

## 👥 Roles & Permissions

The application implements a secure role-based access control (RBAC) model split into three distinct user tiers:

*   **Non-Authenticated Users (Public):** Can browse the interactive dashboard, view reported civic issues, inspect status updates and historical timelines, and view the global scoreboard/leaderboard.
*   **Authenticated Citizens:** Can create new reports, upload photographs of civic problems, search for geo-deduplication, vote on existing reports (upvoting), and upload resolution photos to verify resolved issues via AI.
*   **Administrators:** Have administrative privileges verified securely on the backend. Admins can manually update issue statuses (e.g., transitioning to "In Progress") and trigger the batch Autonomous Escalation Agent to compile reports for local authorities.

---

## 🏆 Gamification & Leaderboard

To encourage community engagement, CivicPulse rewards active participation with point and badge incentives:
*   **Issue Reporting:** Citizens earn **50 points** for reporting a civic issue, with a **25-point bonus** (total 75 points) if the Gemini vision categorizer confirms the photo is an authentic civic problem.
*   **Community Support:** Upvoting a critical local issue increments the original reporter's score by **10 points** to promote community validation. Removing an upvote automatically subtracts the points to ensure fair play.
*   **AI Resolutions:** Uploading a successful verification photo that passes the Gemini resolution comparison closes the ticket and awards the reporter **100 points**.
*   **Badges:** Unique, category-based achievements (such as *Pothole Patrol*, *Water Warden*, *Light Keeper*, *Upvote Champion*, and *Community Savior*) are automatically unlocked when citizens reach specific milestone thresholds.

---

## 🛡️ Security & DevSecOps Architecture

The platform assumes a hostile client environment and enforces zero-trust security parameters:
*   **Firestore Rules Lockdown:** Direct client-side write access to the main database is fully blocked. All issue creations and updates must go through the Express backend Admin SDK. User updates are guarded by strict schema checks that forbid modifying gamification fields (points, badges, counts) directly from the client.
*   **Cryptographic Identity Verification:** Frontend requests do not specify user IDs. Instead, they attach Firebase ID Tokens (JWT) which the Express server cryptographically validates via Google's public keys. The client identity is resolved strictly from the decoded token payload (`req.user.uid`).
*   **Storage Access Control:** Cloud Storage rules block file overrides and deletions by checking `allow update, delete: if false`. Creations are restricted to authenticated users uploading images under 10MB.
*   **API Security & Rate Limiting:** All mutating routes are guarded by rate limiters to prevent DDoS and API token/billing quota exhaustion.

---

## ☁️ Deployment Architecture

*   **Serverless Containerization:** The application is built using a multi-stage Docker build. Stage 1 compiles the React Vite client assets, which are then copied over to Stage 2 where a Node/Express server serves the static frontend alongside the API backend.
*   **Google Cloud Run:** The unified Docker container is deployed to Google Cloud Run, allowing the platform to scale dynamically based on demand and scale to zero instances when idle to ensure zero baseline cost.

---

## 🛠️ Built With

- **Gemini 3.1 Flash Lite** — Multimodal AI for all 5 pipelines (Vision Categorizer, Deduplication, Hotspot Insights, Escalations, and Verification)
- **Google Cloud Run** — Serverless backend and frontend hosting
- **Firebase** — Firestore database, Cloud Storage, and Authentication (Google Sign-In)
- **Google Maps JavaScript API** — Interactive dashboard map with status-colored custom pins
- **React 19 + Node.js + Express 5** — Full-stack web application running in a unified Docker container

---

## 📄 License

MIT © Souptik Dutta
