# 📚 Library Management System – Web App

## Folder Structure

```
library_webapp/
│
├── app.py                   ← Flask backend (all API routes + Supabase logic)
├── requirements.txt         ← Python dependencies (just Flask)
├── lockout_data.json        ← Auto-created on first login attempt (lock state)
│
├── templates/               ← Jinja2 HTML templates
│   ├── login.html           ← Login + Signup page
│   ├── dashboard.html       ← Main customer entry portal
│   └── book_entry.html      ← Book entry portal (opens in popup)
│
└── static/
    ├── css/
    │   ├── auth.css         ← Login/Signup styles
    │   ├── dashboard.css    ← Dashboard styles
    │   └── book_entry.css   ← Book entry portal styles
    └── js/
        ├── auth.js          ← Login/Signup logic
        ├── dashboard.js     ← Customer portal logic
        └── book_entry.js    ← Book entry portal logic
```

---

## Setup Instructions

### 1. Install Python dependencies
```bash
cd library_webapp
pip install -r requirements.txt
```

### 2. Configure Supabase credentials
Open `app.py` and replace lines 14–15:
```python
SUPABASE_URL = "https://YOUR_PROJECT.supabase.co"
SUPABASE_KEY = "YOUR_ANON_PUBLIC_KEY"
```

### 3. Add Availability column to Books_table in Supabase
Run this SQL in your Supabase SQL editor:
```sql
ALTER TABLE "Books_table" ADD COLUMN IF NOT EXISTS "Availability" integer DEFAULT 0;
```

### 4. Run the app
```bash
python app.py
```
Then open: **http://localhost:5000**

---

## Supabase Tables Required

### users
| Column   | Type    |
|----------|---------|
| user_id  | varchar |
| password | varchar |

### librarymanagementsystem
| Column        | Type    |
|---------------|---------|
| Member_Type   | varchar |
| PRN_NO        | varchar (PK) |
| ID_NO         | varchar |
| First_Name    | varchar |
| Last_Name     | varchar |
| Address1      | varchar |
| Address2      | varchar |
| Mobile        | varchar |
| Book_ID       | varchar |
| Book_Name     | varchar |
| Author        | varchar |
| Date_Borrowed | varchar |
| Date_Due      | varchar |
| Days          | varchar |
| LateReturnFine| varchar |
| Date_Overdue  | varchar |
| Final_Price   | varchar |

### Books_table
| Column       | Type    |
|--------------|---------|
| Book_ID      | varchar (PK) |
| Book_Name    | varchar |
| Author       | varchar |
| Availability | integer |

---

## All Features Implemented

✅ Login with lockout (3 wrong attempts → locked 60s, persists across restarts)  
✅ Signup with confirm password  
✅ PRN_NO: max 6 alphanumeric  
✅ ID_NO: max 6 alphanumeric  
✅ Mobile: exactly 10 digits  
✅ Registered Books sidebar with scrollbar + search  
✅ Click book → auto-fills Book ID, Name, Author in form  
✅ Date Borrowed + Return Date → auto-calculates Days and Date Overdue  
✅ Add Customer → saves to librarymanagementsystem, reduces book Availability by 1  
✅ Update Customer → updates full record in database  
✅ Returned button → confirmation modal → deletes record, restores Availability +1  
✅ Customer Records scrollable table with search bar  
✅ Book Entry Portal requires separate login  
✅ Book Entry: Add / Update / Delete books with Availability column  
✅ Book Entry: Click row → fills form fields  
✅ Availability = 0 → error shown, cannot add customer with that book  
✅ All fields mandatory for Add Customer and Update  
✅ Add New Book button clears only book fields, keeps member info  
✅ Clear button clears all fields  
✅ Logout redirects to login