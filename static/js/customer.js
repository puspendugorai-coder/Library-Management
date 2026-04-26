/* ── Customer Portal JS ── */

let allMyRecords = [];
let allModalBooks = [];

document.addEventListener('DOMContentLoaded', () => {
    loadMyRecords();
});

/* ── Load customer's own borrowing records ── */
async function loadMyRecords() {
    const container = document.getElementById('recordsContainer');
    container.innerHTML = '<div class="loading-state">⏳ Loading your records…</div>';

    try {
        const res = await fetch('/api/my_records');
        const data = await res.json();

        if (data.error) {
            container.innerHTML = `<div class="loading-state">❌ ${esc(data.error)}</div>`;
            return;
        }

        allMyRecords = data;
        renderRecords(data);
        updateStats(data);
    } catch (err) {
        container.innerHTML = '<div class="loading-state">❌ Network error. Please refresh.</div>';
    }
}

/* ── Update welcome banner stats ── */
function updateStats(records) {
    document.getElementById('borrowedCount').textContent = records.length;

    let totalFine = 0;
    records.forEach(r => { totalFine += parseFloat(r.Total_Fine || '0') || 0; });
    document.getElementById('totalFineAmt').textContent =
        totalFine > 0 ? `Rs.${totalFine.toFixed(2)}` : 'None';

    if (records.length > 0) {
        const r = records[0];
        const fullName = `${r.First_Name || ''} ${r.Last_Name || ''}`.trim();
        if (fullName) document.getElementById('custFullName').textContent = fullName;
        document.getElementById('custMember').textContent =
            r.Member_Type ? `${r.Member_Type} Member` : 'Library Member';
    } else {
        document.getElementById('custMember').textContent = 'No active borrowings';
    }
}

/* ── Render borrowing record cards ── */
function renderRecords(records) {
    const container = document.getElementById('recordsContainer');

    if (!records || records.length === 0) {
        container.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">📭</span>
        <p>You have no active borrowing records.</p>
        <p style="margin-top:0.5rem;font-size:0.82rem;color:var(--muted)">
          Ask a manager to register a book for you.
        </p>
      </div>`;
        return;
    }

    const grid = document.createElement('div');
    grid.className = 'records-grid';

    records.forEach(r => {
        const daysLeft = parseInt(r.Days_Left) || 0;
        const totalFine = parseFloat(r.Total_Fine || '0') || 0;
        const qty = r.Qty || 1;

        // Status badge
        let statusClass, statusLabel, daysClass;
        if (daysLeft < 0) {
            statusClass = 'badge-overdue'; statusLabel = '⚠️ Overdue'; daysClass = 'days-over';
        } else if (daysLeft <= 3) {
            statusClass = 'badge-warn'; statusLabel = '⏰ Due Soon'; daysClass = 'days-warn';
        } else {
            statusClass = 'badge-ok'; statusLabel = '✅ Active'; daysClass = 'days-ok';
        }

        const daysDisplay = daysLeft < 0
            ? `${Math.abs(daysLeft)} days overdue`
            : `${daysLeft} days remaining`;

        const card = document.createElement('div');
        card.className = `record-card${daysLeft < 0 ? ' overdue' : ''}`;
        card.innerHTML = `
      <div class="record-card-top">
        <div>
          <div class="record-book-name">📖 ${esc(r.Book_Name || '—')}</div>
          <div class="record-author">by ${esc(r.Author || '—')}</div>
        </div>
        <span class="record-status-badge ${statusClass}">${statusLabel}</span>
      </div>
      <div class="record-card-body">
        <div>
          <div class="rfield-label">Book ID</div>
          <div class="rfield-value">${esc(r.Book_ID || '—')}</div>
        </div>
        <div>
          <div class="rfield-label">Qty Borrowed</div>
          <div class="rfield-value">${qty}</div>
        </div>
        <div>
          <div class="rfield-label">Date Borrowed</div>
          <div class="rfield-value">${fmt(r.Date_Borrowed)}</div>
        </div>
        <div>
          <div class="rfield-label">Return Date</div>
          <div class="rfield-value">${fmt(r.Date_Due)}</div>
        </div>
        <div>
          <div class="rfield-label">Days Left</div>
          <div class="rfield-value ${daysClass}">${daysDisplay}</div>
        </div>
        <div>
          <div class="rfield-label">Overdue Date</div>
          <div class="rfield-value">${r.Date_Overdue ? fmt(r.Date_Overdue) : '—'}</div>
        </div>
        <div>
          <div class="rfield-label">Late Fine / Day</div>
          <div class="rfield-value">${r.LateReturnFine ? 'Rs.' + r.LateReturnFine : '—'}</div>
        </div>
        <div>
          <div class="rfield-label">Total Fine</div>
          <div class="rfield-value fine">${totalFine > 0 ? 'Rs.' + totalFine.toFixed(2) : 'None'}</div>
        </div>
      </div>
      <div class="record-card-footer">
        <span class="rfoot-label">Final Price (Book Price × Qty)</span>
        <span class="rfoot-price">${r.Final_Price ? 'Rs.' + r.Final_Price : '—'}</span>
      </div>
    `;
        grid.appendChild(card);
    });

    container.innerHTML = '';
    container.appendChild(grid);
}

/* ── Browse Library Books Modal ── */
/* ── Browse Library Books Modal ── */
async function openBooksModal() {
    const modal = document.getElementById('booksModal');
    if (modal) {
        // Use classList instead of .style
        modal.classList.remove('hidden');
        document.getElementById('modalBookSearch').value = '';
        await loadModalBooks();
    }
}

function closeBooksModal() {
    const modal = document.getElementById('booksModal');
    if (modal) {
        // Use classList instead of .style
        modal.classList.add('hidden');
    }
}

async function loadModalBooks() {
    const tbody = document.getElementById('modalBooksTbody');
    tbody.innerHTML = '<tr><td colspan="5" class="table-empty">⏳ Loading…</td></tr>';
    try {
        const res = await fetch('/api/books');
        const data = await res.json();
        allModalBooks = Array.isArray(data) ? data : [];
        renderModalBooks(allModalBooks);
    } catch (err) {
        tbody.innerHTML = '<tr><td colspan="5" class="table-empty">❌ Failed to load books.</td></tr>';
    }
}

function renderModalBooks(books) {
    const tbody = document.getElementById('modalBooksTbody');
    if (!books || books.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="table-empty">No books found.</td></tr>';
        return;
    }
    tbody.innerHTML = books.map(b => {
        const avail = parseInt(b.Availability) || 0;
        const badge = avail > 0
            ? `<span class="avail-badge avail-yes">✓ ${avail} available</span>`
            : `<span class="avail-badge avail-no">✗ Out of stock</span>`;
        return `<tr>
      <td>${esc(b.Book_ID || '—')}</td>
      <td><strong>${esc(b.Book_Name || '—')}</strong></td>
      <td>${esc(b.Author || '—')}</td>
      <td>Rs.${parseFloat(b.Book_Price || 0).toFixed(2)}</td>
      <td>${badge}</td>
    </tr>`;
    }).join('');
}

function filterModalBooks() {
    const q = document.getElementById('modalBookSearch').value.toLowerCase();
    const filtered = allModalBooks.filter(b =>
        (b.Book_Name || '').toLowerCase().includes(q) ||
        (b.Author || '').toLowerCase().includes(q) ||
        (b.Book_ID || '').toLowerCase().includes(q)
    );
    renderModalBooks(filtered);
}

/* ── Helpers ── */
function esc(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function fmt(dateStr) {
    if (!dateStr || dateStr === '—') return '—';
    try {
        return new Date(dateStr).toLocaleDateString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric'
        });
    } catch { return dateStr; }
}

/* ── Close modal on overlay click ── */
document.getElementById('booksModal').addEventListener('click', function (e) {
    if (e.target === this) closeBooksModal();
});