# CRT Attendance Tracker

A full-stack web application for tracking student attendance during the **Y-24 CRT Training** (2024-28 batch) at KL University (KLEF). Built independently by a Y-23 student for easy, real-time attendance monitoring.

> **Disclaimer:** This is not an official KL University platform. It is a student-built tool for voluntary use during the CRT Training programme.

---

## Overview

### Y-24 clusters

Training started **16 Aug 2026**. The batch is split into two clusters, each with CRT on two fixed weekdays:

| Cluster | Days |
|---|---|
| C1 | Monday, Tuesday |
| C2 | Wednesday, Thursday |

Each upload is tagged with a cluster (auto-suggested from the date's weekday, confirmed by the admin). A student's attendance % only counts the sessions held for their own cluster; students of that cluster missing from a sheet are marked absent. The schedule lives in `CLUSTER_DAYS` / `TRAINING_START` in `lib/attendanceCalc.js`.

The CRT Attendance Tracker provides students with a personalised dashboard to monitor their attendance across all CRT training slots, visualise weekly trends, and plan sessions ahead. The admin panel allows the CRT team to upload attendance CSVs, manage student profiles, and post notices visible to all students on the login page.

**Live:** [crt.kluniversity.me](https://crt.kluniversity.me)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| UI | React 18 + Tailwind CSS 3 |
| Database | MongoDB Atlas via Mongoose 8 |
| Auth | JWT (`jose`) stored in HttpOnly cookies |
| Password hashing | bcryptjs |
| Email | Resend SDK (verified domain `kluniversity.me`) |
| CSV parsing | csv-parse |
| Excel export | SheetJS (xlsx) |
| Deployment | Vercel |

---

## Features

### Student Dashboard
- Overall attendance percentage with colour-coded status (safe / at-risk / danger)
- Week-by-week attendance breakdown with progress bars
- Full session log with slot, date, and present/absent status
- **Session Planner** — calculates how many sessions can be skipped while staying above the required threshold
- Updates/notices banner — shows admin-posted announcements at the top of the dashboard

### Admin Panel
- **Attendance Upload** — drop the official Excel report (.xlsx/.xls) or a CSV; header row, slot columns, date and clusters are detected automatically, then confirmed before import; upload history per date & cluster with edit-date and delete
- **Student Manager** — view all students, search by roll number, edit profiles
- **Attendance Marking** — manually mark individual student attendance
- **Irregular Patterns** — flag students with unusual attendance behaviour
- **Profile Creation** — onboard new students individually
- **Removal** — remove students from the system
- **Notices** — post announcements (Info / Warning / Important, optional pin) visible on the login page and student dashboard

### Authentication & Security
- Role-based access: `student`, `admin`
- JWT tokens in HttpOnly cookies — inaccessible to JavaScript (XSS-resistant)
- All passwords hashed with bcrypt (never stored in plain text)
- First-login forced password change
- Token-based password reset via email — links expire in **2 minutes**, single-use
- Password reset emails sent to `rollnumber@kluniversity.in` via Resend with SPF + DKIM

### General
- Dark / light mode toggle
- Fully responsive — mobile and desktop
- Login page notice board — numbered list of admin notices with category badges and dates
- Privacy Policy (`/privacy`) and Terms of Service (`/terms`) — publicly accessible

---

## Pages & Routes

| Route | Access | Description |
|---|---|---|
| `/login` | Public | Sign in page with notices panel |
| `/change-password` | Authenticated | First-login password change |
| `/reset-password` | Public | Token-based password reset |
| `/student` | Student | Attendance dashboard + session planner |
| `/admin/upload` | Admin | Excel / CSV upload + upload history |
| `/admin/students` | Admin | Student list and search |
| `/admin/mark` | Admin | Manual attendance marking |
| `/admin/irregular` | Admin | Irregular pattern detection |
| `/admin/create-profile` | Admin | Create a new student profile |
| `/admin/removal` | Admin | Remove a student |
| `/admin/updates` | Admin | Post / delete login page notices |
| `/privacy` | Public | Privacy Policy |
| `/terms` | Public | Terms of Service |

---

## API Routes

| Method | Route | Description |
|---|---|---|
| POST | `/api/auth/login` | Authenticate user, set JWT cookie |
| POST | `/api/auth/logout` | Clear session cookie |
| POST | `/api/auth/change-password` | Update password on first login |
| POST | `/api/auth/forgot-password` | Send password reset email |
| POST | `/api/auth/reset-password` | Validate token and set new password |
| GET | `/api/student/me` | Fetch authenticated student data |
| GET | `/api/students/[rollNumber]` | Fetch a specific student's data |
| POST | `/api/attendance/mark` | Mark attendance for a student |
| POST | `/api/admin/upload-csv` | Preview (`mode=preview`) or import an Excel / CSV attendance file |
| GET/DELETE | `/api/admin/upload-history` | Manage upload history |
| GET | `/api/admin/students` | Paginated student list with stats (`page`, `limit`, `q`, column filters, `all=1`) |
| POST | `/api/admin/create-profile` | Create a new student account |
| POST | `/api/admin/removal` | Remove a student |
| GET | `/api/admin/irregular` | Get irregular attendance patterns |
| POST | `/api/admin/reset-password` | Admin-side password reset |
| GET/POST/DELETE | `/api/admin/updates` | Manage login page notices |
| GET | `/api/updates` | Public — fetch notices for login page |

---

## Local Setup

### Prerequisites
- Node.js 18+
- MongoDB Atlas account (or local MongoDB)
- Resend account with a verified sending domain

### 1. Clone the repository
```bash
git clone https://github.com/Akhilpanvi/CRT-attendance-projection.git
cd CRT-attendance-projection
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file in the project root:

```env
MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/crt_attendance
JWT_SECRET=your-secret-key-here
RESEND_API_KEY=re_your_resend_api_key
```

> **Never commit `.env` to version control.** It is listed in `.gitignore`.

### 4. Run the development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 5. Default admin credentials

On first run, the system auto-creates an admin account:
- **Username:** `CRT`
- **Password:** `CRT999`

Change this immediately after first login.

---

## Deployment (Vercel)

1. Push to GitHub.
2. Import the repository in [Vercel](https://vercel.com).
3. Add the following environment variables in Vercel project settings:
   - `MONGO_URI`
   - `JWT_SECRET`
   - `RESEND_API_KEY`
4. Deploy. Vercel auto-deploys on every push to `master`.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `MONGO_URI` | Yes | MongoDB Atlas connection string |
| `JWT_SECRET` | Yes | Secret used to sign JWT tokens |
| `RESEND_API_KEY` | Yes | API key from resend.com for email delivery |

---

## Security

- Passwords hashed with **bcrypt** (salt rounds: 10) — plain-text passwords are never stored or logged
- JWT tokens stored in **HttpOnly, Secure cookies** — not accessible via JavaScript
- Password reset tokens generated with `crypto.randomBytes(32)` — expire in **2 minutes**
- All database connections use **TLS** (enforced by MongoDB Atlas)
- No third-party analytics, tracking, or advertising SDKs
- Role-based middleware protects all authenticated routes

---

## Contact

For questions, bug reports, or data requests:
**support@kluniversity.me**

---

## License

This project is not open-source and is intended solely for use within the Y-24 KL University CRT Training programme.
© 2026 CRT Attendance Tracker — Not an official KL University platform.
