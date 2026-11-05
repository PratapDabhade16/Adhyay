# 🚀 ADHYAY — Zero-Cost 24/7 Production Deployment Guide

> **Target Audience:** Development team members deploying ADHYAY to production.  
> **Cost:** 100% Free (No credit card required).  
> **Uptime:** 24/7 Active (using free keep-alive ping to prevent sleep).

---

## 🏛️ Deployment Architecture

| Layer | Provider | Free Plan Details | Why Chosen |
|---|---|---|---|
| **Frontend** | **Vercel** | Free Forever Tier | Zero cold starts, global CDN, automated HTTPS SSL, clean routing via `vercel.json`. |
| **Backend API** | **Render** | Free Web Service (512MB RAM) | Native Docker build from GitHub, automated container healthcheck. |
| **Database** | **MongoDB Atlas** | M0 Free Forever (512MB Storage) | Managed MongoDB, zero maintenance, high availability. |
| **24/7 Keep-Alive** | **UptimeRobot** | Free (50 monitors, 5-min intervals) | Pings `/api/health` every 10 min to keep Render awake 24/7. |
| **Video Storage** | **Cloudinary** | Free (25 GB/month) | Automated cloud video optimization and streaming delivery. |
| **AI Subtitles & Chat**| **Groq Cloud** | Free Tier | Ultra-fast Whisper & LLaMA AI processing. |
| **Email Dispatch** | **Resend** | Free Tier (3,000 emails/month) | Official campus email dispatch and passwordless notifications. |

---

## 📋 Step 1: Database Setup (MongoDB Atlas) — ~4 mins

1. Go to [https://www.mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas) and sign in / create a free account.
2. Click **Create a Deployment** -> Select **M0 Free** (Shared).
   - Recommended Cloud Provider: **AWS**
   - Recommended Region: Nearest to your users (e.g., `ap-south-1` Mumbai or `eu-central-1` Frankfurt).
   - Name your cluster: `adhyay-cluster`.
3. **Database Access (Security -> Database Access):**
   - Click **Add New Database User**.
   - Authentication Method: **Password**.
   - Username: `adhyay_admin`
   - Password: Click *Autogenerate Secure Password* or create one (e.g. `AdhyayPass@2026`). Save this!
   - Role: **Atlas Admin** or **Read and write to any database**.
   - Click **Add User**.
4. **Network Access (Security -> Network Access):**
   - Click **Add IP Address**.
   - Click **Allow Access from Anywhere** (`0.0.0.0/0`).
   - Click **Confirm** *(Required so Render cloud servers can connect)*.
5. **Get Your Connection String:**
   - Go to **Database** -> Click **Connect** on your cluster.
   - Choose **Drivers** (Java / Node.js).
   - Copy the URI string:
     ```
     mongodb+srv://adhyay_admin:<db_password>@adhyay-cluster.xxxx.mongodb.net/adhyay?retryWrites=true&w=majority
     ```
   - Replace `<db_password>` with your actual database user password.

---

## 🛠️ Step 2: Backend Deployment (Render) — ~5 mins

### Option A: 1-Click Blueprint (Recommended)
1. Sign in to [https://dashboard.render.com/](https://dashboard.render.com/) with GitHub.
2. Click **New +** (top right) -> **Blueprint**.
3. Select the `Adhyay` GitHub repository.
4. Render will automatically detect [`render.yaml`](../render.yaml).
5. When prompted for `MONGODB_URI`, paste your MongoDB Atlas connection string from Step 1.
6. Click **Apply**. Render will automatically build the Docker container and start your service!

---

### Option B: Manual Web Service
1. In Render, click **New +** -> **Web Service**.
2. Connect your GitHub repository: `Adhyay`.
3. Fill in the fields:
   - **Name:** `adhyay-backend`
   - **Region:** Nearest to your database (e.g., `Oregon (US West)` or `Frankfurt (EU)`)
   - **Branch:** `feature/landing-and-auth-update` (or `main`)
   - **Root Directory:** `adhyay-backend`
   - **Environment:** `Docker`
   - **Dockerfile Path:** `./Dockerfile`
   - **Instance Type:** `Free`
4. Expand **Advanced** -> Click **Add Environment Variable** and enter:

| Key | Value | Description |
|---|---|---|
| `MONGODB_URI` | `mongodb+srv://<user>:<password>@<cluster>.mongodb.net/adhyay?retryWrites=true&w=majority` | Your Atlas URI |
| `CLOUDINARY_CLOUD_NAME` | `your_cloudinary_name` | Cloudinary Name |
| `CLOUDINARY_API_KEY` | `your_cloudinary_api_key` | Cloudinary Key |
| `CLOUDINARY_API_SECRET` | `your_cloudinary_api_secret` | Cloudinary Secret |
| `RESEND_API_KEY` | `your_resend_api_key` | Resend Key |
| `GROQ_API_KEY` | `your_groq_api_key` | Groq Key |
| `JWT_SECRET` | `your_secure_random_jwt_secret_minimum_256_bits_length_123456` | JWT Encryption |
| `CORS_ALLOWED_ORIGINS` | `*` | Allows all frontend origins |

5. Click **Create Web Service**.
6. Wait 3–4 minutes for Docker build to complete.
7. Once live, Render displays your public URL:
   `https://adhyay-backend-xxxx.onrender.com`
8. **Verify Backend:** Open `https://adhyay-backend-xxxx.onrender.com/api/health` in your browser.  
   It should return: `ADHYAY backend is running`.

---

## ⏰ Step 3: Prevent Sleep & Keep Backend 24/7 Active (UptimeRobot) — ~2 mins

> [!IMPORTANT]
> Render free web services spin down after 15 minutes of inactivity. Pinging `/api/health` prevents it from ever sleeping!

1. Go to [https://uptimerobot.com/](https://uptimerobot.com/) and create a free account.
2. Click **+ Add New Monitor**.
3. Configure the monitor:
   - **Monitor Type:** `HTTP(s)`
   - **Friendly Name:** `ADHYAY Backend 24/7 Keep-Alive`
   - **URL (or IP):** `https://adhyay-backend-xxxx.onrender.com/api/health`
   - **Monitoring Interval:** `10 minutes` (or `5 minutes`)
4. Click **Create Monitor**.
5. Done! UptimeRobot will ping your backend every 10 minutes around the clock, keeping it awake with 0 cold-start delays.

---

## 🌐 Step 4: Frontend Deployment (Vercel) — ~3 mins

1. Update the production backend URL in [`adhyay-frontend/config.js`](file:///c:/Users/Pratap/OneDrive/Attachments/Desktop/adhay/adhyay-frontend/config.js):
   ```javascript
   const DEFAULT_PROD_URL = "https://adhyay-backend-xxxx.onrender.com/api";
   ```
   *(Replace with your actual Render URL from Step 2)*.
2. Commit and push the change to GitHub:
   ```bash
   git add adhyay-frontend/config.js
   git commit -m "chore: set production backend URL in config.js"
   git push origin <your-branch>
   ```
3. Sign in to [https://vercel.com/](https://vercel.com/) with GitHub.
4. Click **Add New...** -> **Project**.
5. Import your `Adhyay` repository.
6. In the **Configure Project** screen:
   - **Framework Preset:** `Other`
   - **Root Directory:** Click **Edit** -> select `adhyay-frontend` ⚠️ *(Critical! Do not leave as root)*.
   - Build and Output Settings: Leave as default.
7. Click **Deploy**.
8. In 20–30 seconds, your site is live with a global HTTPS URL:  
   `https://adhyay-frontend-xxxx.vercel.app`

---

## ✅ Step 5: Final Production Verification Checklist

1. **Landing Page:** Visit `https://adhyay-frontend-xxxx.vercel.app` -> verify all sections, metrics, role cards, and navigation links load.
2. **Authentication:**
   - Click **Sign in** -> Log in with pre-seeded demo credentials:
     - Student: `demo.student@walchandsangli.ac.in` | `Password@123`
     - Faculty: `demo.faculty@walchandsangli.ac.in` | `Password@123`
     - Admin: `demo.admin@walchandsangli.ac.in` | `Password@123`
3. **Student Video & Progress:** Open any enrolled lecture, watch for 15 seconds, refresh the page, and ensure the playback resume toast triggers.
4. **Faculty Uploads:** Drag-and-drop a small test MP4 video to verify Cloudinary raw upload and metadata persistence.
5. **Admin Dashboards:** Check the Audit Log RFC 4180 CSV export and user status toggles.

---

## ❓ Common Troubleshooting & Teammate FAQs

### Q1: "Unable to connect to backend on port 8081" error in console?
- **Cause:** Frontend is still trying to connect to localhost instead of the Render URL.
- **Fix:** Ensure [`adhyay-frontend/config.js`](file:///c:/Users/Pratap/OneDrive/Attachments/Desktop/adhay/adhyay-frontend/config.js) has your live Render backend URL, or open the browser console on your Vercel site and run:
  ```javascript
  window.ADHYAY_CONFIG.setBackendUrl("https://your-backend.onrender.com/api");
  ```

### Q2: Mixed Content Warning (HTTPS blocked HTTP)?
- Vercel is strictly HTTPS. Your Render backend must also use `https://` (Render provides free SSL certificates automatically).

### Q3: MongoDB connection timeout?
- In MongoDB Atlas, verify that **Network Access** includes `0.0.0.0/0` (Allow Access from Anywhere).

### Q4: Render build fails with out-of-memory error?
- Our production [`Dockerfile`](file:///c:/Users/Pratap/OneDrive/Attachments/Desktop/adhay/adhyay-backend/Dockerfile) includes `-XX:MaxRAMPercentage=75.0` specifically configured to stay safely inside Render's 512MB free tier limit.

