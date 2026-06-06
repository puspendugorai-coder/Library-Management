// ══════════════════════════════════════════════════════════════════
//  STATE
// ══════════════════════════════════════════════════════════════════
let allCustomers = [];
let allBooks = [];
let selectedPRN = null;
let selectedBookID = null;   // ✅ FIX Bug 2: track exact book of selected record
let returnPRN = null;
let returnBookID = null;
let returnQty = 1;
let currentBookPrice = 0;

// ══════════════════════════════════════════════════════════════════
//  INPUT ENFORCERS
// ══════════════════════════════════════════════════════════════════
function enforceAlnum(el) {
    el.value = el.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6);
}
function enforceDigits(el) {
    el.value = el.value.replace(/\D/g, '').slice(0, 10);
}

// ══════════════════════════════════════════════════════════════════
//  STATUS BAR
// ══════════════════════════════════════════════════════════════════
function showStatus(msg, type = 'ok') {
    const bar = document.getElementById('statusBar');
    bar.textContent = msg;
    bar.className = `status-bar ${type}`;
    bar.classList.remove('hidden');
    setTimeout(() => bar.classList.add('hidden'), 5000);
}

// ══════════════════════════════════════════════════════════════════
//  AUTO CALCULATIONS
// ══════════════════════════════════════════════════════════════════
function calcDays() {
    const d1 = document.getElementById('fDateBorrow').value;
    const d2 = document.getElementById('fReturnDate').value;
    if (d1 && d2) {
        const borrow = new Date(d1);
        const ret = new Date(d2);
        const diff = Math.max(0, Math.round((ret - borrow) / 86400000));
        document.getElementById('fDays').value = diff;

        const ov = new Date(d2);
        ov.setDate(ov.getDate() + 1);
        document.getElementById('fDateOverdue').value = ov.toISOString().split('T')[0];

        const today = new Date(); today.setHours(0, 0, 0, 0);
        const daysLeft = Math.round((ret - today) / 86400000);
        const dlEl = document.getElementById('fDaysLeft');
        dlEl.value = daysLeft;
        dlEl.classList.toggle('overdue', daysLeft < 0);
    }
}

function calcFinalPrice() {
    const qty = parseFloat(document.getElementById('fQty').value) || 0;
    if (currentBookPrice > 0 && qty > 0) {
        const fp = (currentBookPrice * qty).toFixed(2);
        document.getElementById('fFinalPrice').value = `Rs.${fp}`;
    } else {
        document.getElementById('fFinalPrice').value = '';
    }
}

// ══════════════════════════════════════════════════════════════════
//  FORM DATA
// ══════════════════════════════════════════════════════════════════
function getFormData() {
    return {
        Member_Type: document.getElementById('fMemberType').value.trim(),
        PRN_NO: document.getElementById('fPRN').value.trim(),
        ID_NO: document.getElementById('fIDNO').value.trim(),
        First_Name: document.getElementById('fFirst').value.trim(),
        Last_Name: document.getElementById('fLast').value.trim(),
        Address1: document.getElementById('fAddr1').value.trim(),
        Address2: document.getElementById('fAddr2').value.trim(),
        Mobile: document.getElementById('fMobile').value.trim(),
        Book_ID: document.getElementById('fBookID').value.trim(),
        Book_Name: document.getElementById('fBookName').value.trim(),
        Author: document.getElementById('fAuthor').value.trim(),
        Date_Borrowed: document.getElementById('fDateBorrow').value,
        Date_Due: document.getElementById('fReturnDate').value,
        Days: document.getElementById('fDays').value,
        Days_Left: document.getElementById('fDaysLeft').value,
        Qty: parseInt(document.getElementById('fQty').value) || 1,
        LateReturnFine: document.getElementById('fLateFine').value.trim(),
        Date_Overdue: document.getElementById('fDateOverdue').value,
        Total_Fine: document.getElementById('fTotalFine').value.trim(),
        Final_Price: document.getElementById('fFinalPrice').value.trim(),
    };
}

function fillForm(r) {
    document.getElementById('fMemberType').value = r.Member_Type || '';
    document.getElementById('fPRN').value = r.PRN_NO || '';
    document.getElementById('fIDNO').value = r.ID_NO || '';
    document.getElementById('fFirst').value = r.First_Name || '';
    document.getElementById('fLast').value = r.Last_Name || '';
    document.getElementById('fAddr1').value = r.Address1 || '';
    document.getElementById('fAddr2').value = r.Address2 || '';
    document.getElementById('fMobile').value = r.Mobile || '';
    document.getElementById('fBookID').value = r.Book_ID || '';
    document.getElementById('fBookName').value = r.Book_Name || '';
    document.getElementById('fAuthor').value = r.Author || '';
    document.getElementById('fDateBorrow').value = r.Date_Borrowed || '';
    document.getElementById('fReturnDate').value = r.Date_Due || '';
    document.getElementById('fDays').value = r.Days || '';
    document.getElementById('fDaysLeft').value = r.Days_Left || '';
    document.getElementById('fQty').value = r.Qty || 1;
    document.getElementById('fLateFine').value = r.LateReturnFine || '';
    document.getElementById('fDateOverdue').value = r.Date_Overdue || '';
    document.getElementById('fTotalFine').value = r.Total_Fine || '';
    document.getElementById('fFinalPrice').value = r.Final_Price || '';

    selectedPRN = r.PRN_NO || null;
    selectedBookID = r.Book_ID || null;  // ✅ FIX Bug 2

    const bk = allBooks.find(b => b.Book_ID === r.Book_ID);
    currentBookPrice = bk ? parseFloat(bk.Book_Price || 0) : 0;

    const dlEl = document.getElementById('fDaysLeft');
    const dlVal = parseInt(r.Days_Left);
    dlEl.classList.toggle('overdue', !isNaN(dlVal) && dlVal < 0);
}

function clearAll() {
    ['fMemberType', 'fPRN', 'fIDNO', 'fFirst', 'fLast', 'fAddr1', 'fAddr2',
        'fMobile', 'fBookID', 'fBookName', 'fAuthor', 'fDateBorrow', 'fReturnDate',
        'fDays', 'fDaysLeft', 'fLateFine', 'fDateOverdue', 'fTotalFine', 'fFinalPrice'].forEach(id => {
            const el = document.getElementById(id);
            if (el.tagName === 'SELECT') el.selectedIndex = 0;
            else el.value = '';
        });
    document.getElementById('fQty').value = 1;
    document.getElementById('fDaysLeft').classList.remove('overdue');
    selectedPRN = null;
    selectedBookID = null;   // ✅ FIX Bug 2
    currentBookPrice = 0;
    document.querySelectorAll('.book-item').forEach(i => i.classList.remove('selected'));
    document.querySelectorAll('#custTbody tr').forEach(r => r.classList.remove('row-selected'));
}

function clearBookFields() {
    ['fBookID', 'fBookName', 'fAuthor', 'fDateBorrow', 'fReturnDate',
        'fDays', 'fDaysLeft', 'fLateFine', 'fDateOverdue', 'fTotalFine', 'fFinalPrice'].forEach(id => {
            document.getElementById(id).value = '';
        });
    document.getElementById('fQty').value = 1;
    document.getElementById('fDaysLeft').classList.remove('overdue');
    currentBookPrice = 0;
    selectedBookID = null;   // ✅ FIX Bug 2
    document.querySelectorAll('.book-item').forEach(i => i.classList.remove('selected'));
}

// ══════════════════════════════════════════════════════════════════
//  BOOKS SIDEBAR
//
//  ✅ FIX Bug 1 — WRONG BOOK SHOWN ON CLICK
//  Root cause: renderBooks used onclick="selectBook(${i})" where i
//  was the index inside the filtered array, but selectBook() read
//  from allBooks[i]. After filtering, allBooks[0] ≠ filteredBooks[0]
//  so clicking any card showed the wrong book.
//
//  Fix: each card stores data-bookid (the unique Book_ID string).
//  The event listener looks up allBooks.find(b => b.Book_ID === id),
//  so it always retrieves the correct object regardless of filtering.
// ══════════════════════════════════════════════════════════════════
async function loadBooks() {
    try {
        const res = await fetch('/api/books');
        allBooks = await res.json();
        renderBooks(allBooks);
    } catch {
        document.getElementById('booksList').innerHTML =
            '<div class="list-loading">Error loading books.</div>';
    }
}

function renderBooks(books) {
    const list = document.getElementById('booksList');
    if (!books.length) {
        list.innerHTML = '<div class="list-loading">No books found.</div>'; return;
    }

    // ✅ data-bookid — no index, no inline JSON
    list.innerHTML = books.map((b) => {
        const avail = parseInt(b.Availability) || 0;
        const cls = avail > 3 ? 'ok' : avail > 0 ? 'low' : 'none';
        const label = avail === 0 ? '✗ Unavailable' : `✓ Available: ${avail}`;
        const price = b.Book_Price !== undefined ? `Rs.${parseFloat(b.Book_Price || 0).toFixed(2)}` : '—';
        return `
    <div class="book-item" data-bookid="${esc(b.Book_ID)}">
      <div class="book-item-name">${esc(b.Book_Name)}</div>
      <div class="book-item-author">${esc(b.Author)}</div>
      <div class="book-item-price">💰 ${price}</div>
      <div class="book-item-avail ${cls}">${label}</div>
    </div>`;
    }).join('');

    // ✅ Lookup from master allBooks by Book_ID — always correct
    list.querySelectorAll('.book-item').forEach(card => {
        card.addEventListener('click', () => {
            const bookId = card.dataset.bookid;
            const book = allBooks.find(b => b.Book_ID === bookId);
            if (book) selectBook(book, card);
        });
    });
}

function filterBooks() {
    const q = document.getElementById('bookSearch').value.toLowerCase();
    const filtered = allBooks.filter(b =>
        (b.Book_Name || '').toLowerCase().includes(q) ||
        (b.Author || '').toLowerCase().includes(q) ||
        (b.Book_ID || '').toLowerCase().includes(q)
    );
    renderBooks(filtered);
}

function selectBook(b, cardEl) {
    document.getElementById('fBookID').value = b.Book_ID || '';
    document.getElementById('fBookName').value = b.Book_Name || '';
    document.getElementById('fAuthor').value = b.Author || '';

    currentBookPrice = parseFloat(b.Book_Price || 0);
    selectedBookID = b.Book_ID || null;  // ✅ FIX Bug 2: keep in sync
    calcFinalPrice();

    if (!document.getElementById('fDateBorrow').value) {
        document.getElementById('fDateBorrow').value = new Date().toISOString().split('T')[0];
        calcDays();
    }

    document.querySelectorAll('.book-item').forEach(el => el.classList.remove('selected'));
    if (cardEl) cardEl.classList.add('selected');
}

// ══════════════════════════════════════════════════════════════════
//  CUSTOMERS TABLE
//
//  ✅ FIX Bug 3 — CLICKING 2ND RECORD SHOWS 1ST RECORD'S DATA
//  Root cause: onRowClick(tr, prn) called allCustomers.find(c =>
//  c.PRN_NO === prn). For customers with 2 books, both rows share
//  the same PRN_NO, so .find() always returned the first match.
//
//  Fix: each <tr> now carries data-row-index (its position in the
//  rendered rows array). The click handler reads rows[i] directly —
//  always the exact record, never the first duplicate.
//
//  ✅ FIX Bug 2 (table side): each row carries data-bookid so
//  return/delete can target PRN_NO + Book_ID together.
// ══════════════════════════════════════════════════════════════════
async function loadCustomers() {
    try {
        const res = await fetch('/api/customers');
        allCustomers = await res.json();
        renderCustomers(allCustomers);
    } catch {
        document.getElementById('custTbody').innerHTML =
            '<tr><td colspan="20" class="table-empty">Error loading customers.</td></tr>';
    }
}

function renderCustomers(rows) {
    const tbody = document.getElementById('custTbody');
    if (!rows.length) {
        tbody.innerHTML = '<tr><td colspan="20" class="table-empty">No records found.</td></tr>';
        return;
    }

    tbody.innerHTML = rows.map((r, i) => {
        const dl = parseInt(r.Days_Left);
        const dlCls = (!isNaN(dl) && dl < 0) ? 'style="color:#ef4444;font-weight:700"' : '';
        // ✅ data-row-index for exact row lookup; no PRN string matching
        return `
    <tr class="cust-row" data-row-index="${i}">
      <td>${esc(r.Member_Type)}</td>
      <td>${esc(r.PRN_NO)}</td>
      <td>${esc(r.ID_NO)}</td>
      <td>${esc(r.First_Name)}</td>
      <td>${esc(r.Last_Name)}</td>
      <td>${esc(r.Address1)}</td>
      <td>${esc(r.Address2)}</td>
      <td>${esc(r.Mobile)}</td>
      <td>${esc(r.Book_ID)}</td>
      <td>${esc(r.Book_Name)}</td>
      <td>${esc(r.Author)}</td>
      <td>${esc(r.Date_Borrowed)}</td>
      <td>${esc(r.Date_Due)}</td>
      <td>${esc(r.Days)}</td>
      <td ${dlCls}>${esc(r.Days_Left)}</td>
      <td>${esc(r.Qty)}</td>
      <td>${esc(r.LateReturnFine)}</td>
      <td>${esc(r.Date_Overdue)}</td>
      <td>${esc(r.Total_Fine)}</td>
      <td>${esc(r.Final_Price)}</td>
    </tr>`;
    }).join('');

    // ✅ rows[i] — always the exact record clicked
    tbody.querySelectorAll('.cust-row').forEach(row => {
        row.addEventListener('click', () => {
            document.querySelectorAll('#custTbody tr').forEach(r => r.classList.remove('row-selected'));
            row.classList.add('row-selected');
            const idx = parseInt(row.dataset.rowIndex);
            const rec = rows[idx];
            if (rec) fillForm(rec);
        });
    });
}

function filterCustomers() {
    const q = document.getElementById('custSearch').value.toLowerCase();
    const filtered = allCustomers.filter(r =>
        Object.values(r).some(v => String(v || '').toLowerCase().includes(q))
    );
    renderCustomers(filtered);
}

// ══════════════════════════════════════════════════════════════════
//  ADD CUSTOMER
// ══════════════════════════════════════════════════════════════════
async function addCustomer() {
    const data = getFormData();
    try {
        const res = await fetch('/api/customers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const json = await res.json();
        if (json.success) {
            showStatus('✅ Customer added successfully!', 'ok');
            clearAll();
            await Promise.all([loadCustomers(), loadBooks()]);
        } else {
            showStatus('❌ ' + (json.error || 'Error adding customer.'), 'err');
        }
    } catch {
        showStatus('❌ Network error.', 'err');
    }
}

// ══════════════════════════════════════════════════════════════════
//  UPDATE CUSTOMER
// ══════════════════════════════════════════════════════════════════
async function updateCustomer() {
    if (!selectedPRN) {
        showStatus('⚠ Select a customer row first.', 'warn'); return;
    }
    const data = getFormData();
    try {
        // ✅ FIX Bug 2: send book_id so server patches only the right row
        const url = `/api/customers/${encodeURIComponent(selectedPRN)}`
            + `?book_id=${encodeURIComponent(selectedBookID || '')}`;
        const res = await fetch(url, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const json = await res.json();
        if (json.success) {
            showStatus('✅ Customer updated!', 'ok');
            await loadCustomers();
        } else {
            showStatus('❌ ' + (json.error || 'Update failed.'), 'err');
        }
    } catch {
        showStatus('❌ Network error.', 'err');
    }
}

// ══════════════════════════════════════════════════════════════════
//  RETURN BOOK
// ══════════════════════════════════════════════════════════════════
function confirmReturn() {
    if (!selectedPRN) {
        showStatus('⚠ Select a customer first.', 'warn'); return;
    }
    returnPRN = selectedPRN;
    returnBookID = document.getElementById('fBookID').value.trim();
    returnQty = parseInt(document.getElementById('fQty').value) || 1;
    const bname = document.getElementById('fBookName').value || returnBookID;
    document.getElementById('returnMsg').textContent =
        `Is the book "${bname}" (Qty: ${returnQty}) returned by PRN: ${returnPRN}?`;
    openModal('returnModal');
}

async function doReturn() {
    closeModal('returnModal');
    try {
        // ✅ FIX Bug 2: delete by PRN_NO + Book_ID (server handles the AND filter)
        const url = `/api/customers/${encodeURIComponent(returnPRN)}`
            + `?book_id=${encodeURIComponent(returnBookID)}&qty=${returnQty}`;
        const res = await fetch(url, { method: 'DELETE' });
        const json = await res.json();
        if (json.success) {
            showStatus('✅ Book returned. Record removed.', 'ok');
            clearAll();
            await Promise.all([loadCustomers(), loadBooks()]);
        } else {
            showStatus('❌ ' + (json.error || 'Error.'), 'err');
        }
    } catch {
        showStatus('❌ Network error.', 'err');
    }
}

// ══════════════════════════════════════════════════════════════════
//  MODALS
// ══════════════════════════════════════════════════════════════════
function openModal(id) { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

// ══════════════════════════════════════════════════════════════════
//  BOOK ENTRY LOGIN
// ══════════════════════════════════════════════════════════════════
function openBookEntryLogin() {
    document.getElementById('beUid').value = '';
    document.getElementById('bePwd').value = '';
    document.getElementById('beAlert').classList.add('hidden');
    openModal('bookLoginModal');
    setTimeout(() => document.getElementById('beUid').focus(), 100);
}

async function doBookLogin() {
    const uid = document.getElementById('beUid').value.trim();
    const pwd = document.getElementById('bePwd').value.trim();
    const alertEl = document.getElementById('beAlert');
    alertEl.classList.add('hidden');

    if (!uid || !pwd) {
        alertEl.textContent = 'Both fields are required.';
        alertEl.classList.remove('hidden');
        return;
    }

    try {
        const res = await fetch('/api/book_login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: uid, password: pwd })
        });
        const data = await res.json();
        if (data.success) {
            closeModal('bookLoginModal');
            window.open('/book_entry', '_blank');
        } else {
            alertEl.textContent = data.error || 'Invalid credentials.';
            alertEl.classList.remove('hidden');
        }
    } catch (e) {
        alertEl.textContent = 'Network error. Please try again.';
        alertEl.classList.remove('hidden');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    ['beUid', 'bePwd'].forEach(id => {
        document.getElementById(id).addEventListener('keydown', e => {
            if (e.key === 'Enter') doBookLogin();
        });
    });
});

// ══════════════════════════════════════════════════════════════════
//  DAILY AUTO-UPDATE
// ══════════════════════════════════════════════════════════════════
async function runDailyUpdate() {
    try {
        const res = await fetch('/api/daily_update', { method: 'POST' });
        const json = await res.json();
        if (json.success) {
            console.log(`Daily update: ${json.updated} record(s) refreshed.`);
            await loadCustomers();
        }
    } catch (e) {
        console.warn('Daily update failed:', e);
    }
}

// ══════════════════════════════════════════════════════════════════
//  ESCAPE HELPER
// ══════════════════════════════════════════════════════════════════
function esc(v) {
    return String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ══════════════════════════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════════════════════════
loadBooks();
loadCustomers();
runDailyUpdate();
setInterval(runDailyUpdate, 24 * 60 * 60 * 1000);
