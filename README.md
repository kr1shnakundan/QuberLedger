# QuberLedger — Finance Dashboard

A personal finance dashboard built for people who want real control over their money — not just a spreadsheet dressed up as an app.
Track income and expenses, understand where your money actually goes, and get alerts before your spending habits become a problem.

## What it does

You log your financial transactions — rent, salary, groceries, subscriptions, whatever — and QuberLedger turns that raw data into something useful.
The dashboard shows you totals and recent activity at a glance. The Categorical Analysis page is where things get interesting: it maps everything you spend into three buckets — Needs, Wants, and Savings — and checks how close you are to the 50/30/20 rule. If your "Wants" spending starts creeping up month over month, you get an alert. If a specific category like dining or entertainment spikes compared to last month, you get an alert for that too.
Every chart, every number, every alert updates the moment you add a new record.

## Who can use it

There are three access levels baked in:

Viewer — can browse the dashboard and see all records, but cannot add or change anything
Analyst — everything a Viewer can do, plus access to charts, trends, and the full categorical breakdown
Admin — full control. Creates and edits records, manages other users, assigns roles

On top of that, one account holds the Super Admin title. That person is the only one who can edit other admins, assign the admin role to someone new, or transfer the Super Admin title to another admin. Think of it as the account owner.

## Signing up

Registration is gated behind email verification. When you create an account, a 6-digit OTP goes to your inbox. You enter it, it expires in 10 minutes, and disposable/burner email addresses are rejected outright. Once verified, your account is created as a Viewer — an admin can upgrade you from there.

## The tech behind it

SideStackBackendNode.js, Express, MongoDB, MongooseAuthJWT tokens, bcrypt password hashingEmailNodemailer (Ethereal for dev, any SMTP for production)File uploadsCloudinary via express-fileuploadFrontendReact, Redux Toolkit, React RouterChartsRechartsStylingTailwind CSS with a custom retro-terminal design system.

## Backend

cd backend
npm install
cp .env.example .env # fill in your values
npm run seed # creates demo users + sample data
npm run dev # starts on port 5000

## Frontend (new terminal)

cd frontend
npm install
npm run dev # starts on port 5173
Open http://localhost:5173 and log in with any of the demo accounts the seeder creates.

Environment variables
Everything sensitive lives in backend/.env. The .env.example file lists every variable you need with descriptions. The important ones:
MONGO_URI — your MongoDB connection string
JWT_SECRET — any long random string, keep it secret
EMAIL_PROVIDER — set to "ethereal" for dev (no real emails sent)
CLOUD_NAME — from your Cloudinary dashboard
API_KEY — from your Cloudinary dashboard
API_SECRET — from your Cloudinary dashboard

Demo accounts
After running npm run seed: Demo accounts are also created.

Project layout
finance-dashboard/
├── backend/
│ ├── config/ Cloudinary setup
│ ├── controllers/ Route logic — auth, records, dashboard, users, profile
│ ├── middleware/ JWT protection + role-based access checks
│ ├── models/ MongoDB schemas — User, FinancialRecord, OTP
│ ├── routes/ API endpoints
│ └── utils/ Email service, image uploader, burner domain list, seeder
└── frontend/
└── src/
├── api/ Axios instance with auth interceptors
├── components/ Layout, sidebar, protected route wrapper
├── hooks/ useTheme — dark/light mode toggle
├── pages/ Dashboard, Records, Users, Categorical Analysis, Profile, Login, Register
└── store/ Redux slices for auth, records, dashboard, users, categorical analysis

## A few things worth knowing

Records support filtering by type, category, date range, and amount range
Deleting a record soft-deletes it (marked hidden, not actually removed from the database)
Profile photos upload directly to Cloudinary. Replacing a photo deletes the old one automatically
The date picker on record creation blocks future dates — you can only log what has already happened
Dark and light mode both work, and your preference is remembered across sessions

Built as a backend engineering assessment project.
