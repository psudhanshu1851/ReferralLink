# ReferralLink

ReferralLink is a modern SaaS web application focused on referral link tracking and analytics. It allows users to generate multiple unique referral links and QR codes directing to a single destination URL, while recording analytics (clicks, unique visitors, browser, device, IP) before redirection.

## Project Structure

```text
ReferralLink/
├── client/                 # React Frontend (Vite + Tailwind CSS v4)
│   ├── src/
│   │   ├── components/     # Layout, Sidebar, Header components
│   │   ├── pages/          # Login, Dashboard, CreateLink, Analytics, Settings pages
│   │   ├── App.jsx         # Routes and Auth guard configuration
│   │   ├── main.jsx        # App entry point
│   │   └── index.css       # Tailwind configuration and styles
│   ├── index.html          # HTML entry point (SEO metadata and fonts)
│   ├── package.json        # Frontend dependencies
│   └── vite.config.js      # Vite + proxy settings
│
└── server/                 # Express Backend (Node.js + PostgreSQL)
    ├── db.js               # PostgreSQL connection client
    ├── db-setup.js         # Database creation and admin seeding script
    ├── server.js           # Server routes (Redirection, Auth, Links, Analytics)
    ├── package.json        # Backend dependencies
    └── .env                # Server configuration and variables
```

---

## Getting Started

### Prerequisites
* **Node.js** (v18+ recommended)
* **PostgreSQL** database service running locally or in the cloud.

---

### Step 1: Database Configuration

1. Connect to your PostgreSQL instance using `psql` or a GUI client (e.g. pgAdmin, DBeaver) and create the database:
   ```sql
   CREATE DATABASE referrallink;
   ```
2. Set up your connection URI in `server/.env` (copy of `server/.env.example`).
   ```ini
   DATABASE_URL=postgresql://<username>:<password>@localhost:5432/referrallink
   ```

---

### Step 2: Backend Setup

1. Open a terminal and navigate to the `server/` directory:
   ```bash
   cd server
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the database setup script to create tables and seed the default administrator user:
   ```bash
   npm run db:setup
   ```
   *Note: Default admin login is seeded with:*
   * **Email**: `admin@referrallink.com`
   * **Password**: `adminpassword123` (hashed using bcrypt)
4. Start the Express backend:
   ```bash
   npm start
   ```
   The backend server runs on `http://localhost:5000`.

---

### Step 3: Frontend Setup

1. Open a new terminal and navigate to the `client/` directory:
   ```bash
   cd client
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite React development server:
   ```bash
   npm run dev
   ```
   The frontend runs on `http://localhost:3000` (Vite dev server proxied to port `5000` for backend calls).

---

## Core Redirection Logic
Short links are structured as `http://localhost:5000/r/:referral_code`. 
When visited:
1. The server extracts the `referral_code` from parameters.
2. Checks the database for the matching link.
3. Parses client headers (IP, User Agent) using `useragent` library to identify device type (Desktop, Mobile, Tablet) and browser name (Chrome, Safari, etc.).
4. Logs click event metadata to PostgreSQL.
5. Redirects the client instantly with HTTP `302 Found` to the destination URL.

---

## Production Deployment Checklist
* **Environment Configuration**: Set `NODE_ENV=production` in the server's `.env`.
* **Security Secrets**: Use a long, random string for `JWT_SECRET`.
* **Domain Binding**: Update `SHORT_LINK_BASE_URL` in `.env` to point to your live deployment domain (e.g. `https://ref.link/r`).
* **Database TLS**: Database client automatically negotiates SSL when `NODE_ENV=production` is set, matching host requirements for platforms like Supabase, AWS RDS, Render, or Heroku.
