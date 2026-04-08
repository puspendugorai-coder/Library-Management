---
title: Library Management System
emoji: 📚
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 7860
pinned: false
---

# 📚 Library Management System – Web App

A full-stack, professional Library Management System built with **Flask** and **Supabase**. This application features a robust backend for managing book inventory, customer records, and secure administrative access.

### 🚀 Live Demo
[**Click here to open library app**](https://huggingface.co/spaces/AlphaCoder7206/Library-Management-System)

---

## ✨ Key Features

* **🔒 Secure Authentication:** Login system with built-in lockout logic (3 failed attempts = 60s cooldown).
* **📈 Real-time Inventory:** Automatic updates to book availability when books are borrowed or returned.
* **📊 Comprehensive Dashboard:** Manage member details, PRN tracking, and overdue calculations.
* **🛠️ Admin Portal:** Dedicated Book Entry Portal for adding, updating, or removing inventory.
* **🔍 Smart Search:** Instant filtering for both the book repository and customer records.
* **📱 Data Validation:** Strict enforcement of PRN, ID, and Mobile number formats.

---

## 📁 Project Architecture

```text
library_webapp/
├── app.py                # Flask Backend & API Logic
├── requirements.txt      # Python Dependencies
├── Dockerfile            # Container Configuration for Deployment
├── .env                  # Local Environment Secrets (Excluded from Git)
├── templates/            # Jinja2 HTML Templates
│   ├── login.html
│   ├── dashboard.html
│   └── book_entry.html
└── static/               # Assets (CSS/JS)
    ├── css/ (auth, dashboard, book_entry)
    └── js/  (auth, dashboard, book_entry)
