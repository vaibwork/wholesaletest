# VSOL‑MiNi

VSOL‑MiNi is a web based business management system tailored for wholesale businesses such as garments, FMCG products, groceries, household goods and electronics.  The application has been developed by **VAIBWORK Private Limited** and is intended as a common platform for managing stock, purchases, sales, expenses and reports.

This repository contains both the frontend and backend logic written in **Next.js** (React).  The built‑in API routes communicate with a **MySQL** database to persist data.  A simple authentication mechanism protects the dashboard and other pages.  Invoices are generated on the fly and can be exported as PDF or shared via WhatsApp.

## Features

- **Dashboard** – Provides monthly summaries of sales, purchases, expenses and net profit with a bar chart for quick visualisation.
- **Inventory** – Store and manage stock items with category specific fields (cartons/items per carton for FMCG, rack number and type for garments, bags/weight for grocery, etc.).
- **Purchase** – Record stock purchases; quantities are automatically added to inventory.
- **Sales / Invoice** – Create tax invoices by selecting items from inventory.  Calculates taxes, reduces stock and generates a PDF invoice that can be shared.
- **Reports** – Consolidated view of transactions with filters for date range and an export‑to‑Excel option.
- **Expenses** – Track office expenses, salaries, utilities and rent.
- **Settings** – Update company details, bank information and default login credentials.

## Setup

1. **Database** – Import the SQL schema in [`sql/schema.sql`](sql/schema.sql) into your MySQL server.  This creates the necessary tables and a default user (`123456`/`123456`).

   ```sh
   mysql -u your_user -p vsol_mini < sql/schema.sql
   ```

2. **Environment variables** – Copy `.env.example` to `.env.local` and update it with your MySQL connection details and optional default credentials.

   ```ini
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=yourpassword
   DB_NAME=vsol_mini
   DEFAULT_USER=123456
   DEFAULT_PASSWORD=123456
   ```

3. **Install dependencies** – Run the following commands from the project root.  You will need Node.js installed locally (the provided code uses Next.js 14).  Vercel will perform these steps automatically when deploying.

   ```sh
   npm install
   npm run dev
   ```

4. **Run** – Visit `http://localhost:3000` in your browser.  The application will redirect to the login screen.  Use the default credentials or the ones configured in Settings.

## Deployment

- **Vercel** – The project is compatible with Vercel.  After pushing this repository to GitHub, import it into your Vercel dashboard and set the environment variables (DB connection details and default credentials).  Vercel will build and deploy the app.  The API routes will run as serverless functions that connect to your MySQL database hosted on a VPS (e.g. Hostinger).

- **Hostinger VPS** – Host your MySQL database on a VPS.  Ensure that the database is accessible remotely (adjust firewall and user privileges) so that the Vercel deployment can connect to it.

## Mobile

The interface uses Tailwind CSS for a responsive layout.  The sidebar collapses into a hamburger menu on smaller screens and tables scroll horizontally when necessary.

## PDF and WhatsApp Sharing

The invoice preview is converted to a PDF using **html2canvas** and **jsPDF**.  After saving an invoice, a WhatsApp share button appears.  This button opens WhatsApp Web or the mobile app with a pre‑filled message containing the invoice number, customer name and total amount.  Note that attaching the PDF file automatically is not possible due to platform restrictions; however you can download the PDF and attach it manually.

---

This application serves as a starter template.  You can extend it by adding multi‑user roles, advanced filtering, analytics or additional modules tailored to your business.