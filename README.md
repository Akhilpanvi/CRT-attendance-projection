# AttendX — KL University Attendance Tracker

A full-stack attendance tracking system with MongoDB backend for KL University students. Tracks Slot A & Slot B sessions with 85% weekly attendance enforcement.

## Tech Stack
- **Frontend**: Pure HTML + CSS + Vanilla JS
- **Backend**: Node.js + Express
- **Database**: MongoDB (via Mongoose)

## Setup

### 1. Prerequisites
- Node.js v18+
- MongoDB running locally (`mongod`) OR a MongoDB Atlas URI

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment
Edit `.env`:
```
PORT=3000
MONGO_URI=mongodb://localhost:27017/attendance_db
```
For MongoDB Atlas, replace MONGO_URI with your connection string:
```
MONGO_URI=mongodb+srv://<user>:<pass>@cluster0.xxxxx.mongodb.net/attendance_db
```

### 4. Run the server
```bash
node server.js
```
Open `http://localhost:3000` in your browser.

## Features

### 📋 Mark Attendance Tab
- Enter your Roll Number → Look up your profile
- Select Slot A or Slot B
- Mark as Present or Absent
- Re-submitting the same slot+date updates the record

### 📊 My Status Tab
- Full attendance gauge (overall %)
- Color-coded alert: Green ✓ / Yellow ⚠️ / Red 🚨
- Weekly breakdown with 85% threshold bars
- Full attendance log (last 40 records)

### ✏️ Register Tab
- Register new students with Roll Number, Name, Section, Batch

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/students/register | Register a new student |
| GET  | /api/students/:rollNumber | Get student info + stats |
| POST | /api/attendance/mark | Mark attendance |
| GET  | /api/attendance/:rollNumber | Full attendance history |
| GET  | /api/attendance/:rollNumber/today | Today's records |

## 85% Rule Logic
- Each week's attendance = (present sessions) / (total sessions that week) × 100
- Students below 85% weekly see a ⚠️ warning
- Students below 75% overall see a 🚨 critical alert
- Weekly bars in the status view are color-coded: Green (safe), Amber (borderline), Red (at risk)
