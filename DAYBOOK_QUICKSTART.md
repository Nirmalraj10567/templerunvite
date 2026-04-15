# 🚀 Daybook Quick Start Guide

## 1️⃣ Start Backend Server
```bash
cd D:\templerunvite\server
npm run dev
```
✅ Backend running on: `http://localhost:4000`

## 2️⃣ Start Frontend Server
```bash
cd D:\templerunvite
npm run dev
```
✅ Frontend running on: `http://localhost:5173` (or your port)

## 3️⃣ Login
- **URL:** `http://localhost:5173/login`
- **Username:** `test_admin`
- **Password:** `test123`

## 4️⃣ Access Daybook
After login, look for **"Daybook"** (டேபுக்) in the left sidebar

### Options:
- **Daybook Entry** - Create new income/expense/journal entry
- **Daybook List** - View all entries with search & filters

## 5️⃣ Create Your First Entry

1. Click **"Daybook Entry"** in sidebar
2. Fill in the form:
   - **Date:** Today's date (auto-filled)
   - **Type:** Income / Expense / Journal
   - **Description:** What is this for?
   - **Amount:** e.g., 5000
   - **Payment Mode:** Cash / Card / UPI etc.
   - **Party Name:** (Optional) Who gave/received?
   - **Mobile:** (Optional) 10-digit number
   - **Notes:** (Optional) Additional details
3. Click **"Save Entry"**
4. Success! You'll see it in the list

## 6️⃣ Explore Features

### List Page:
- 🔍 **Search** entries by description, name, receipt number
- 📅 **Filter** by date range
- 🏷️ **Filter** by type (income/expense/journal)
- 📊 **View stats** (total income, expense, balance)
- 📥 **Export to CSV**
- 👁️ **View logs** for any entry
- ✏️ **Edit** entries
- 🗑️ **Delete** entries

### Entry Types:
- 💚 **Income** - Money coming in (donations, fees)
- ❤️ **Expense** - Money going out (bills, payments)
- 💙 **Journal** - Accounting adjustments (no balance impact)

### Payment Modes:
- 💵 Cash
- 💳 Card
- 📱 UPI
- 📄 Cheque
- 🏦 Bank Transfer

## 🎯 Quick URLs
```
http://localhost:5173/dashboard/daybook/list   - View all entries
http://localhost:5173/dashboard/daybook/entry  - Create new entry
```

## ⚠️ Common Issues

**Can't see Daybook menu?**
→ Your user doesn't have permission. Use `test_admin` account.

**API errors?**
→ Make sure backend is running on port 4000

**Form won't submit?**
→ Check all required fields are filled (Date, Type, Description, Amount)

## 📖 Full Documentation
- **Backend API:** `D:\templerunvite\server\DAYBOOK_TESTING.md`
- **Frontend Integration:** `D:\templerunvite\src\pages\daybook\DAYBOOK_FRONTEND_INTEGRATION.md`
- **Test Credentials:** `D:\templerunvite\server\TEST_CREDENTIALS.md`

---

**That's it! You're ready to use the Daybook feature! 🎉**
