"""
Library Management System - Flask Backend
Connects to Supabase REST API
"""
from flask import Flask, render_template, request, jsonify, session, redirect, url_for
import urllib.request
import urllib.error
import urllib.parse
import json
import os
import time
import datetime
import secrets as _secrets
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
app.secret_key = _secrets.token_hex(32)
app.config["SESSION_PERMANENT"] = False

# ── Supabase Config ──────────────────────────────────────────────
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

# ── Supabase Helpers ─────────────────────────────────────────────
def sb_headers(prefer=None):
    h = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
    }
    if prefer:
        h["Prefer"] = prefer
    return h

def sb_get(table, query_params=""):
    url = f"{SUPABASE_URL}/rest/v1/{table}?{query_params}"
    req = urllib.request.Request(url, headers=sb_headers())
    with urllib.request.urlopen(req, timeout=10) as r:
        return json.loads(r.read().decode())

def sb_post(table, data):
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    body = json.dumps(data).encode()
    req = urllib.request.Request(url, data=body,
                                  headers=sb_headers("return=representation"),
                                  method="POST")
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            return json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        raise RuntimeError(e.read().decode())

def sb_patch(table, match_col, match_val, data):
    val_enc = urllib.parse.quote(str(match_val))
    url = f"{SUPABASE_URL}/rest/v1/{table}?{match_col}=eq.{val_enc}"
    body = json.dumps(data).encode()
    req = urllib.request.Request(url, data=body,
                                  headers=sb_headers("return=representation"),
                                  method="PATCH")
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            return json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        raise RuntimeError(e.read().decode())

def sb_delete(table, match_col, match_val):
    val_enc = urllib.parse.quote(str(match_val))
    url = f"{SUPABASE_URL}/rest/v1/{table}?{match_col}=eq.{val_enc}"
    req = urllib.request.Request(url, headers=sb_headers(), method="DELETE")
    try:
        with urllib.request.urlopen(req, timeout=10):
            return True
    except urllib.error.HTTPError as e:
        raise RuntimeError(e.read().decode())

# ── Page Routes ──────────────────────────────────────────────────
@app.route("/")
def index():
    if "user_id" in session:
        return redirect(url_for("dashboard"))
    if "customer_id" in session:
        return redirect(url_for("customer_portal"))
    return render_template("login.html")

@app.route("/dashboard")
def dashboard():
    if "user_id" not in session:
        return redirect(url_for("index"))
    return render_template("dashboard.html", user=session["user_id"])

@app.route("/customer_portal")
def customer_portal():
    if "customer_id" not in session:
        return redirect(url_for("index"))
    return render_template("customer.html", user=session["customer_id"])

@app.route("/book_entry")
def book_entry():
    if "book_user" not in session:
        return redirect(url_for("index"))
    return render_template("book_entry.html", user=session["book_user"])

@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("index"))

# ── Auth: lockout file persists across restarts ──────────────────
LOCKOUT_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "lockout_data.json")

def load_lockouts():
    if os.path.exists(LOCKOUT_FILE):
        try:
            with open(LOCKOUT_FILE) as f:
                return json.load(f)
        except Exception:
            pass
    return {}

def save_lockouts(data):
    with open(LOCKOUT_FILE, "w") as f:
        json.dump(data, f)

# ── Manager Login ────────────────────────────────────────────────
@app.route("/api/login", methods=["POST"])
def api_login():
    data = request.json
    uid  = data.get("user_id", "").strip()
    pwd  = data.get("password", "").strip()
    if not uid or not pwd:
        return jsonify({"error": "Both fields are required."}), 400

    lockouts = load_lockouts()
    now = time.time()
    li = lockouts.get(uid, {"attempts": 0, "locked_until": 0})

    if li.get("locked_until", 0) > now:
        rem = int(li["locked_until"] - now)
        return jsonify({
            "error": f"Account locked. Try again in {rem}s.",
            "locked": True, "remaining": rem
        }), 403

    try:
        rows = sb_get("users", f"user_id=eq.{urllib.parse.quote(uid)}&select=user_id,password")
    except Exception as e:
        return jsonify({"error": f"Connection error: {e}"}), 500

    if not rows:
        return jsonify({"error": "User ID not found."}), 401

    if rows[0]["password"] != pwd:
        li["attempts"] = li.get("attempts", 0) + 1
        if li["attempts"] >= 3:
            li["locked_until"] = now + 60
            li["attempts"] = 0
            lockouts[uid] = li
            save_lockouts(lockouts)
            return jsonify({
                "error": "Too many failed attempts. Account locked for 60s.",
                "locked": True, "remaining": 60
            }), 403
        lockouts[uid] = li
        save_lockouts(lockouts)
        return jsonify({
            "error": f"Wrong password. {3 - li['attempts']} attempt(s) left."
        }), 401

    lockouts[uid] = {"attempts": 0, "locked_until": 0}
    save_lockouts(lockouts)
    session["user_id"] = uid
    return jsonify({"success": True, "user_id": uid})

# ── Customer Login ───────────────────────────────────────────────
@app.route("/api/customer_login", methods=["POST"])
def api_customer_login():
    """
    Validates customer using ID_NO and PRN_NO from librarymanagementsystem table.
    If found, creates a customer session. If not, returns a friendly error.
    """
    data   = request.json
    id_no  = data.get("id_no", "").strip().upper()
    prn_no = data.get("prn_no", "").strip().upper()

    if not id_no or not prn_no:
        return jsonify({"error": "Both ID No. and PRN No. are required."}), 400

    try:
        rows = sb_get(
            "librarymanagementsystem",
            f"ID_NO=eq.{urllib.parse.quote(id_no)}&PRN_NO=eq.{urllib.parse.quote(prn_no)}"
            f"&select=ID_NO,PRN_NO,First_Name,Last_Name"
        )
    except Exception as e:
        return jsonify({"error": f"Connection error: {e}"}), 500

    if not rows:
        return jsonify({
            "error": "❌ Not registered in the library system. Please contact your library manager to get registered first."
        }), 401

    session["customer_id"]  = id_no
    session["customer_prn"] = prn_no
    return jsonify({"success": True, "id_no": id_no})

# ── Manager Signup ───────────────────────────────────────────────
@app.route("/api/signup", methods=["POST"])
def api_signup():
    data = request.json
    uid  = data.get("user_id", "").strip()
    pwd  = data.get("password", "").strip()
    cpwd = data.get("confirm_password", "").strip()
    if not uid or not pwd or not cpwd:
        return jsonify({"error": "All fields are required."}), 400
    if pwd != cpwd:
        return jsonify({"error": "Passwords do not match."}), 400
    if len(pwd) < 4:
        return jsonify({"error": "Password must be at least 4 characters."}), 400
    try:
        rows = sb_get("users", f"user_id=eq.{urllib.parse.quote(uid)}&select=user_id")
        if rows:
            return jsonify({"error": "User ID already exists."}), 409
        sb_post("users", {"user_id": uid, "password": pwd})
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ── Book Entry Login ─────────────────────────────────────────────
@app.route("/api/book_login", methods=["POST"])
def api_book_login():
    data = request.json
    uid  = data.get("user_id", "").strip()
    pwd  = data.get("password", "").strip()
    try:
        rows = sb_get("users", f"user_id=eq.{urllib.parse.quote(uid)}&select=user_id,password")
        if rows and rows[0]["password"] == pwd:
            session["book_user"] = uid
            return jsonify({"success": True})
        return jsonify({"error": "Invalid credentials."}), 401
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ── Lockout Status ───────────────────────────────────────────────
@app.route("/api/lockout_status", methods=["POST"])
def api_lockout_status():
    uid = request.json.get("user_id", "").strip()
    if not uid:
        return jsonify({"locked": False, "remaining": 0})
    lockouts = load_lockouts()
    li  = lockouts.get(uid, {"attempts": 0, "locked_until": 0})
    now = time.time()
    rem = max(0, int(li.get("locked_until", 0) - now))
    return jsonify({"locked": rem > 0, "remaining": rem})

# ── Customer: My Records ─────────────────────────────────────────
@app.route("/api/my_records", methods=["GET"])
def api_my_records():
    """Returns only the records belonging to the logged-in customer."""
    if "customer_id" not in session:
        return jsonify({"error": "Unauthorized"}), 401

    id_no  = session["customer_id"]
    prn_no = session.get("customer_prn", "")

    try:
        if prn_no:
            rows = sb_get(
                "librarymanagementsystem",
                f"ID_NO=eq.{urllib.parse.quote(id_no)}"
                f"&PRN_NO=eq.{urllib.parse.quote(prn_no)}"
                f"&select=*&order=Date_Borrowed.desc"
            )
        else:
            rows = sb_get(
                "librarymanagementsystem",
                f"ID_NO=eq.{urllib.parse.quote(id_no)}&select=*&order=Date_Borrowed.desc"
            )
        return jsonify(rows)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ── Daily Update ─────────────────────────────────────────────────
@app.route("/api/daily_update", methods=["POST"])
def api_daily_update():
    if "user_id" not in session:
        return jsonify({"error": "Unauthorized"}), 401
    try:
        rows = sb_get("librarymanagementsystem", "select=*")
        today = datetime.date.today()
        updated = 0
        for r in rows:
            prn         = r.get("PRN_NO", "")
            return_date = r.get("Date_Due", "")
            overdue_str = r.get("Date_Overdue", "")
            late_fine_s = r.get("LateReturnFine", "0")
            if not prn or not return_date:
                continue
            try:
                ret_d = datetime.date.fromisoformat(return_date)
                days_left = (ret_d - today).days
                patch = {"Days_Left": str(days_left)}
                if overdue_str:
                    try:
                        ov_d = datetime.date.fromisoformat(overdue_str)
                        if today > ov_d:
                            days_overdue = (today - ov_d).days
                            fine_num = ''.join(c for c in str(late_fine_s) if c.isdigit() or c == '.')
                            fine_per_day = float(fine_num) if fine_num else 0.0
                            total_fine = round(days_overdue * fine_per_day, 2)
                            patch["Total_Fine"] = str(total_fine)
                    except Exception:
                        pass
                sb_patch("librarymanagementsystem", "PRN_NO", prn, patch)
                updated += 1
            except Exception:
                continue
        return jsonify({"success": True, "updated": updated})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ── Customers API (Manager only) ─────────────────────────────────
@app.route("/api/customers", methods=["GET"])
def api_customers():
    if "user_id" not in session:
        return jsonify({"error": "Unauthorized"}), 401
    try:
        rows = sb_get("librarymanagementsystem", "select=*&order=First_Name.asc")
        return jsonify(rows)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/customers", methods=["POST"])
def api_add_customer():
    if "user_id" not in session:
        return jsonify({"error": "Unauthorized"}), 401
    data = request.json

    required = ["Member_Type", "PRN_NO", "ID_NO", "First_Name", "Last_Name",
                "Address1", "Mobile", "Book_ID", "Book_Name", "Author",
                "Date_Borrowed", "Date_Due"]
    for f in required:
        if not str(data.get(f, "")).strip():
            return jsonify({"error": f"{f.replace('_', ' ')} is required."}), 400

    prn = data["PRN_NO"].strip()
    if not prn.isalnum() or len(prn) > 6:
        return jsonify({"error": "PRN_NO must be ≤6 alphanumeric characters."}), 400
    id_no = data["ID_NO"].strip()
    if not id_no.isalnum() or len(id_no) > 6:
        return jsonify({"error": "ID_NO must be ≤6 alphanumeric characters."}), 400
    mob = data["Mobile"].strip()
    if not mob.isdigit() or len(mob) != 10:
        return jsonify({"error": "Mobile must be exactly 10 digits."}), 400

    qty = int(data.get("Qty", 1) or 1)
    if qty < 1:
        return jsonify({"error": "Qty must be at least 1."}), 400

    book_rows = []
    try:
        book_rows = sb_get("Books_table",
                           f"Book_ID=eq.{urllib.parse.quote(data['Book_ID'])}"
                           f"&select=Availability,Book_Price")
        if book_rows:
            avail = int(book_rows[0].get("Availability", 0) or 0)
            if avail <= 0:
                return jsonify({"error": "No available copies of this book (Availability = 0)."}), 400
            if qty > avail:
                return jsonify({"error": f"Only {avail} copy/copies available. Requested {qty}."}), 400
    except Exception as ex:
        return jsonify({"error": f"Availability check failed: {ex}"}), 500

    today = datetime.date.today()
    return_date_str = data.get("Date_Due", "")
    days_left = ""
    if return_date_str:
        try:
            ret_d = datetime.date.fromisoformat(return_date_str)
            days_left = str((ret_d - today).days)
        except Exception:
            pass

    data["Qty"]       = qty
    data["Days_Left"] = days_left
    data["Total_Fine"] = "0"

    try:
        sb_post("librarymanagementsystem", data)
        if book_rows:
            avail = int(book_rows[0].get("Availability", qty) or qty)
            sb_patch("Books_table", "Book_ID", data["Book_ID"], {"Availability": avail - qty})
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/customers/<prn>", methods=["PUT"])
def api_update_customer(prn):
    if "user_id" not in session:
        return jsonify({"error": "Unauthorized"}), 401
    data = request.json

    required = ["Member_Type", "ID_NO", "First_Name", "Last_Name",
                "Address1", "Mobile", "Book_ID", "Book_Name", "Author",
                "Date_Borrowed", "Date_Due"]
    for f in required:
        if not str(data.get(f, "")).strip():
            return jsonify({"error": f"{f.replace('_', ' ')} is required."}), 400

    id_no = data["ID_NO"].strip()
    if not id_no.isalnum() or len(id_no) > 6:
        return jsonify({"error": "ID_NO must be ≤6 alphanumeric characters."}), 400
    mob = data["Mobile"].strip()
    if not mob.isdigit() or len(mob) != 10:
        return jsonify({"error": "Mobile must be exactly 10 digits."}), 400

    today = datetime.date.today()
    return_date_str = data.get("Date_Due", "")
    if return_date_str:
        try:
            ret_d = datetime.date.fromisoformat(return_date_str)
            data["Days_Left"] = str((ret_d - today).days)
        except Exception:
            pass

    data.pop("PRN_NO", None)
    try:
        sb_patch("librarymanagementsystem", "PRN_NO", prn, data)
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/customers/<prn>", methods=["DELETE"])
def api_delete_customer(prn):
    if "user_id" not in session:
        return jsonify({"error": "Unauthorized"}), 401
    book_id = request.args.get("book_id", "")
    qty     = int(request.args.get("qty", 1) or 1)
    try:
        sb_delete("librarymanagementsystem", "PRN_NO", prn)
        if book_id:
            try:
                book_rows = sb_get("Books_table",
                                   f"Book_ID=eq.{urllib.parse.quote(book_id)}&select=Availability")
                if book_rows:
                    avail = int(book_rows[0].get("Availability", 0) or 0)
                    sb_patch("Books_table", "Book_ID", book_id, {"Availability": avail + qty})
            except Exception:
                pass
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ── Books API ─────────────────────────────────────────────────────
@app.route("/api/books", methods=["GET"])
def api_books():
    # Public endpoint — both manager dashboard and customer portal read from here
    try:
        rows = sb_get("Books_table", "select=*&order=Book_Name.asc")
        return jsonify(rows)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/books", methods=["POST"])
def api_add_book():
    if "book_user" not in session:
        return jsonify({"error": "Unauthorized"}), 401
    data  = request.json
    bid   = data.get("Book_ID", "").strip()
    bname = data.get("Book_Name", "").strip()
    bauth = data.get("Author", "").strip()
    avail = str(data.get("Availability", "")).strip()
    price = str(data.get("Book_Price", "")).strip()
    if not bid or not bname or not bauth or avail == "" or price == "":
        return jsonify({"error": "All fields are required."}), 400
    if not bid.isalnum() or len(bid) > 6:
        return jsonify({"error": "Book ID must be ≤6 alphanumeric characters."}), 400
    try:
        avail_int   = int(avail)
        price_float = float(price)
    except ValueError:
        return jsonify({"error": "Availability and Book Price must be numbers."}), 400
    try:
        sb_post("Books_table", {
            "Book_ID": bid, "Book_Name": bname,
            "Author": bauth, "Availability": avail_int,
            "Book_Price": price_float
        })
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/books/<bid>", methods=["PUT"])
def api_update_book(bid):
    if "book_user" not in session:
        return jsonify({"error": "Unauthorized"}), 401
    data  = request.json
    bname = data.get("Book_Name", "").strip()
    bauth = data.get("Author", "").strip()
    avail = str(data.get("Availability", "")).strip()
    price = str(data.get("Book_Price", "")).strip()
    if not bname or not bauth or avail == "" or price == "":
        return jsonify({"error": "All fields are required."}), 400
    try:
        sb_patch("Books_table", "Book_ID", bid, {
            "Book_Name": bname, "Author": bauth,
            "Availability": int(avail), "Book_Price": float(price)
        })
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/books/<bid>", methods=["DELETE"])
def api_delete_book(bid):
    if "book_user" not in session:
        return jsonify({"error": "Unauthorized"}), 401
    try:
        sb_delete("Books_table", "Book_ID", bid)
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 7860))
    app.run(host="0.0.0.0", port=port, debug=False)
