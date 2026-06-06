/* ═══════════════════════════════════════════════════════════════
   BOOK ENTRY PORTAL — Complete JS
   • Manual CRUD (Add / Update / Delete)
   • Stats strip (Total Books, Available, Authors, Out-of-Stock)
   • Open Library API import (20M+ real books, paginated)
   • Auto-closes import modal after successful import
   ═══════════════════════════════════════════════════════════════ */

/* ─────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────── */
function enforceAlnum(el) {
    el.value = el.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

function esc(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function showStatus(msg, ok = true) {
    const bar = document.getElementById('statusBar');
    bar.textContent = msg;
    bar.className = 'status-bar' + (ok ? '' : ' error');
}

function clearStatus() {
    const bar = document.getElementById('statusBar');
    bar.className = 'status-bar hidden';
    bar.textContent = '';
}

function clearForm() {
    ['bkID', 'bkName', 'bkAuthor', 'bkPrice', 'bkAvail']
        .forEach(id => { document.getElementById(id).value = ''; });
    clearStatus();
}

/* ─────────────────────────────────────────────────────────────
   STATS STRIP  — updates whenever books are loaded
───────────────────────────────────────────────────────────── */
function updateStats(books) {
    const total = books.length;
    const avail = books.reduce((s, b) => s + (parseInt(b.Availability) || 0), 0);
    const authors = new Set(books.map(b => (b.Author || '').trim().toLowerCase())).size;
    const out = books.filter(b => (parseInt(b.Availability) || 0) === 0).length;

    document.getElementById('statTotal').textContent = total.toLocaleString();
    document.getElementById('statAvail').textContent = avail.toLocaleString();
    document.getElementById('statAuthors').textContent = authors.toLocaleString();
    document.getElementById('statOut').textContent = out.toLocaleString();
}

/* ─────────────────────────────────────────────────────────────
   MANUAL CRUD
───────────────────────────────────────────────────────────── */
let allBooks = [];

async function loadBooks() {
    const tbody = document.getElementById('booksTbody');
    tbody.innerHTML = '<tr><td colspan="5" class="table-empty">Loading…</td></tr>';
    try {
        const res = await fetch('/api/books');
        const data = await res.json();
        allBooks = Array.isArray(data) ? data : [];
        renderBooks(allBooks);
        updateStats(allBooks);
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="5" class="table-empty">❌ Failed to load.</td></tr>';
    }
}

function renderBooks(books) {
    const tbody = document.getElementById('booksTbody');
    if (!books.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="table-empty">No books found.</td></tr>';
        return;
    }
    tbody.innerHTML = books.map(b => `
    <tr onclick="fillForm(${JSON.stringify(b).replace(/"/g, '&quot;')})" class="clickable-row">
      <td><span class="book-id-chip">${esc(b.Book_ID)}</span></td>
      <td class="book-name-cell">${esc(b.Book_Name)}</td>
      <td>${esc(b.Author)}</td>
      <td>Rs.${parseFloat(b.Book_Price || 0).toFixed(2)}</td>
      <td>
        <span class="avail-chip ${parseInt(b.Availability) > 0 ? 'avail-yes' : 'avail-no'}">
          ${b.Availability ?? '—'}
        </span>
      </td>
    </tr>`).join('');
}

function filterBooks() {
    const q = document.getElementById('bookSearch').value.toLowerCase();
    renderBooks(allBooks.filter(b =>
        (b.Book_Name || '').toLowerCase().includes(q) ||
        (b.Author || '').toLowerCase().includes(q) ||
        (b.Book_ID || '').toLowerCase().includes(q)
    ));
}

function fillForm(b) {
    document.getElementById('bkID').value = b.Book_ID || '';
    document.getElementById('bkName').value = b.Book_Name || '';
    document.getElementById('bkAuthor').value = b.Author || '';
    document.getElementById('bkPrice').value = b.Book_Price || '';
    document.getElementById('bkAvail').value = b.Availability ?? '';
    clearStatus();
}

function getFormData() {
    return {
        Book_ID: document.getElementById('bkID').value.trim().toUpperCase(),
        Book_Name: document.getElementById('bkName').value.trim(),
        Author: document.getElementById('bkAuthor').value.trim(),
        Book_Price: parseFloat(document.getElementById('bkPrice').value) || 0,
        Availability: parseInt(document.getElementById('bkAvail').value) || 0,
    };
}

async function addBook() {
    const d = getFormData();
    if (!d.Book_ID || !d.Book_Name || !d.Author) {
        showStatus('❌ Book ID, Name and Author are required.', false); return;
    }
    clearStatus();
    try {
        const res = await fetch('/api/books', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(d)
        });
        const data = await res.json();
        if (data.success) { showStatus('✅ Book added successfully!'); clearForm(); loadBooks(); }
        else showStatus('❌ ' + (data.error || 'Failed to add book.'), false);
    } catch (e) { showStatus('❌ Network error.', false); }
}

async function updateBook() {
    const d = getFormData();
    const bid = d.Book_ID;
    if (!bid) { showStatus('❌ Select a book from the list to update.', false); return; }
    clearStatus();
    try {
        const res = await fetch(`/api/books/${bid}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(d)
        });
        const data = await res.json();
        if (data.success) { showStatus('✅ Book updated successfully!'); loadBooks(); }
        else showStatus('❌ ' + (data.error || 'Failed to update.'), false);
    } catch (e) { showStatus('❌ Network error.', false); }
}

let pendingDeleteId = null;

function deleteBook() {
    const bid = document.getElementById('bkID').value.trim().toUpperCase();
    if (!bid) { showStatus('❌ Select a book from the list first.', false); return; }
    pendingDeleteId = bid;
    document.getElementById('deleteMsg').textContent =
        `Delete "${bid}" — ${document.getElementById('bkName').value}? This cannot be undone.`;
    document.getElementById('deleteModal').classList.remove('hidden');
}

async function confirmDelete() {
    closeDeleteModal();
    if (!pendingDeleteId) return;
    try {
        const res = await fetch(`/api/books/${pendingDeleteId}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) { showStatus('✅ Book deleted.'); clearForm(); loadBooks(); }
        else showStatus('❌ ' + (data.error || 'Failed to delete.'), false);
    } catch (e) { showStatus('❌ Network error.', false); }
    pendingDeleteId = null;
}

function closeDeleteModal() {
    document.getElementById('deleteModal').classList.add('hidden');
}

/* ─────────────────────────────────────────────────────────────
   OPEN LIBRARY API IMPORT
   Docs: https://openlibrary.org/developers/api
   Free, no key, 20M+ books
───────────────────────────────────────────────────────────── */

/* Genre quick-search presets */
const GENRES = [
    { label: '📖 Fiction', q: 'fiction' },
    { label: '🔬 Science', q: 'science' },
    { label: '🕵️ Mystery', q: 'mystery' },
    { label: '💡 Self-Help', q: 'self-help' },
    { label: '🐉 Fantasy', q: 'fantasy' },
    { label: '🌍 History', q: 'history' },
    { label: '💻 Technology', q: 'technology' },
    { label: '🧠 Psychology', q: 'psychology' },
    { label: '🧬 Biology', q: 'biology' },
    { label: '📐 Mathematics', q: 'mathematics' },
    { label: '🎭 Drama', q: 'drama' },
    { label: '🇮🇳 India', q: 'india' },
    { label: '💼 Business', q: 'business' },
    { label: '🎨 Art', q: 'art' },
    { label: '🌱 Philosophy', q: 'philosophy' },
    { label: '🚀 Adventure', q: 'adventure' },
];

/* State */
let olResults = [];
let olPage = 1;
let olQuery = '';
let olTotalFound = 0;
let olTotalPages = 1;
let olLoading = false;
let importIdSeq = 1;   /* rolling counter for generating unique Book IDs */

/* Price heuristic based on publish year */
function estimatePrice(year) {
    if (!year || year < 1900) return 199;
    if (year < 1950) return 229;
    if (year < 1980) return 279;
    if (year < 2000) return 349;
    if (year < 2010) return 399;
    if (year < 2020) return 449;
    return 499;
}

/* Generate a short unique Book ID: 2-letter prefix + 4-digit seq */
function makeBookId(title) {
    const prefix = (title || 'BK')
        .replace(/[^a-zA-Z]/g, '')
        .toUpperCase()
        .slice(0, 2)
        .padEnd(2, 'X');
    return prefix + String(importIdSeq++).padStart(4, '0');
}

/* ── Build genre pills on page load ── */
function buildGenrePills() {
    const container = document.getElementById('genrePills');
    GENRES.forEach(g => {
        const btn = document.createElement('button');
        btn.className = 'genre-pill';
        btn.textContent = g.label;
        btn.onclick = () => {
            document.querySelectorAll('.genre-pill').forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById('olSearchInput').value = '';
            olQuery = g.q;
            olPage = 1;
            fetchBooks();
        };
        container.appendChild(btn);
    });
}

/* ── Open / Close modal ── */
function openImportModal() {
    document.getElementById('importModal').classList.remove('hidden');
    resetImportUI();
}

function closeImportModal() {
    document.getElementById('importModal').classList.add('hidden');
}

function resetImportUI() {
    olResults = [];
    olPage = 1;
    olQuery = '';
    olTotalFound = 0;
    olTotalPages = 1;
    olLoading = false;

    document.getElementById('olSearchInput').value = '';
    document.getElementById('olResultInfo').textContent = '';
    document.getElementById('olPagination').innerHTML = '';
    document.getElementById('olTbody').innerHTML =
        '<tr><td colspan="6" class="table-empty">Search for books above or pick a genre to begin.</td></tr>';
    document.getElementById('importProgress').classList.add('hidden');
    document.getElementById('progressSummary').classList.add('hidden');
    document.getElementById('progressSummary').textContent = '';
    document.getElementById('progressFill').style.width = '0%';
    document.getElementById('importConfirmBtn').disabled = false;
    document.getElementById('chkAll').checked = false;
    document.querySelectorAll('.genre-pill').forEach(p => p.classList.remove('active'));
}

/* ── Manual search trigger ── */
function doSearch() {
    const q = document.getElementById('olSearchInput').value.trim();
    if (!q) return;
    document.querySelectorAll('.genre-pill').forEach(p => p.classList.remove('active'));
    olQuery = q;
    olPage = 1;
    fetchBooks();
}

/* ── Fetch books from Open Library ── */
async function fetchBooks() {
    if (olLoading || !olQuery) return;
    olLoading = true;

    const tbody = document.getElementById('olTbody');
    const infoEl = document.getElementById('olResultInfo');
    const pagEl = document.getElementById('olPagination');

    tbody.innerHTML = '<tr><td colspan="6" class="table-empty ol-loading">⏳ Fetching from Open Library API…</td></tr>';
    infoEl.textContent = '';
    pagEl.innerHTML = '';
    document.getElementById('chkAll').checked = false;
    document.getElementById('olTableWrap').scrollTop = 0;

    const LIMIT = 20;
    const offset = (olPage - 1) * LIMIT;
    const FIELDS = 'key,title,author_name,first_publish_year,cover_i';

    /* Build URL: subject search vs keyword search */
    const isSubject = GENRES.some(g => g.q === olQuery);
    const url = isSubject
        ? `https://openlibrary.org/search.json?subject=${encodeURIComponent(olQuery)}&limit=${LIMIT}&offset=${offset}&fields=${FIELDS}`
        : `https://openlibrary.org/search.json?q=${encodeURIComponent(olQuery)}&limit=${LIMIT}&offset=${offset}&fields=${FIELDS}`;

    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        olTotalFound = data.numFound || 0;
        olTotalPages = Math.min(Math.ceil(olTotalFound / LIMIT), 50); /* cap 50 pages */

        olResults = (data.docs || []).map(doc => ({
            id: makeBookId(doc.title),
            name: doc.title || 'Unknown Title',
            author: Array.isArray(doc.author_name) ? doc.author_name[0] : 'Unknown Author',
            year: doc.first_publish_year || null,
            price: estimatePrice(doc.first_publish_year),
            availability: Math.floor(Math.random() * 50) + 1,
            cover_i: doc.cover_i || null,
        }));

        infoEl.textContent = olTotalFound > 0
            ? `${olTotalFound.toLocaleString()} books found — page ${olPage} of ${olTotalPages}`
            : '0 results. Try a different search term or genre.';

        renderOlTable(olResults);
        renderPagination();

    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="6" class="table-empty">
      ❌ Could not reach Open Library API: ${esc(err.message)}<br>
      <small>Check your internet connection and try again.</small>
    </td></tr>`;
        infoEl.textContent = '';
    } finally {
        olLoading = false;
    }
}

/* ── Render preview table ── */
function renderOlTable(books) {
    const tbody = document.getElementById('olTbody');
    if (!books.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="table-empty">No results on this page.</td></tr>';
        return;
    }
    tbody.innerHTML = books.map((b, i) => {
        const coverHtml = b.cover_i
            ? `<img src="https://covers.openlibrary.org/b/id/${b.cover_i}-S.jpg"
              class="book-cover-thumb" alt="cover" loading="lazy"
              onerror="this.outerHTML='<div class=\\'cover-ph\\'>📖</div>'">`
            : `<div class="cover-ph">📖</div>`;
        return `<tr>
      <td><input type="checkbox" class="row-chk" data-idx="${i}"/></td>
      <td>${coverHtml}</td>
      <td>
        <div class="ol-book-name">${esc(b.name)}</div>
        ${b.year ? `<div class="ol-book-year">${b.year}</div>` : ''}
      </td>
      <td>${esc(b.author)}</td>
      <td class="price-cell">Rs.${b.price}</td>
      <td><span class="avail-pill">${b.availability}</span></td>
    </tr>`;
    }).join('');
}

/* ── Pagination ── */
function renderPagination() {
    const pagEl = document.getElementById('olPagination');
    if (olTotalPages <= 1) { pagEl.innerHTML = ''; return; }

    const cur = olPage;
    const total = olTotalPages;
    const win = 2; /* pages around current */
    let html = '';

    const btn = (p, label, active = false, disabled = false) =>
        `<button class="pag-btn${active ? ' active' : ''}${disabled ? ' disabled' : ''}"
             onclick="${disabled ? '' : `goPage(${p})`}">${label}</button>`;

    html += btn(cur - 1, '← Prev', false, cur === 1);

    if (cur - win > 1) {
        html += btn(1, '1');
        if (cur - win > 2) html += `<span class="pag-dots">…</span>`;
    }
    for (let p = Math.max(1, cur - win); p <= Math.min(total, cur + win); p++) {
        html += btn(p, p, p === cur);
    }
    if (cur + win < total) {
        if (cur + win < total - 1) html += `<span class="pag-dots">…</span>`;
        html += btn(total, total);
    }

    html += btn(cur + 1, 'Next →', false, cur === total);
    pagEl.innerHTML = html;
}

function goPage(p) {
    if (p < 1 || p > olTotalPages || p === olPage) return;
    olPage = p;
    fetchBooks();
}

/* ── Select / Deselect all ── */
function toggleAll(master) {
    document.querySelectorAll('.row-chk').forEach(cb => cb.checked = master.checked);
}

/* ── Run Import (with auto-close on success) ── */
async function runImport() {
    const checked = [...document.querySelectorAll('.row-chk:checked')];
    if (!checked.length) {
        alert('Please select at least one book to import.'); return;
    }

    const selected = checked.map(cb => olResults[parseInt(cb.dataset.idx)]);
    const total = selected.length;

    /* Lock UI, show progress */
    document.getElementById('importConfirmBtn').disabled = true;
    const progressEl = document.getElementById('importProgress');
    const fillEl = document.getElementById('progressFill');
    const textEl = document.getElementById('progressText');
    const countEl = document.getElementById('progressCount');
    const summaryEl = document.getElementById('progressSummary');

    progressEl.classList.remove('hidden');
    summaryEl.classList.add('hidden');
    fillEl.style.width = '0%';
    fillEl.style.background = 'linear-gradient(90deg, #7c5cfc, #4f8ef7)';
    textEl.textContent = 'Starting import…';
    countEl.textContent = `0 / ${total}`;

    let success = 0, skipped = 0, failed = 0;

    for (let i = 0; i < total; i++) {
        const b = selected[i];
        const shortName = b.name.length > 38 ? b.name.slice(0, 38) + '…' : b.name;
        textEl.textContent = `Saving "${shortName}"…`;
        countEl.textContent = `${i + 1} / ${total}`;
        fillEl.style.width = `${Math.round(((i + 1) / total) * 100)}%`;

        try {
            const res = await fetch('/api/books', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    Book_ID: b.id,
                    Book_Name: b.name,
                    Author: b.author,
                    Book_Price: b.price,
                    Availability: b.availability,
                })
            });
            const data = await res.json();

            if (data.success) {
                success++;
            } else {
                /* Treat duplicate key / already-exists as a skip, not failure */
                const errMsg = (data.error || '').toLowerCase();
                if (errMsg.includes('duplicate') || errMsg.includes('unique') ||
                    errMsg.includes('already') || res.status === 409) {
                    skipped++;
                } else {
                    failed++;
                }
            }
        } catch (_) {
            failed++;
        }

        /* Small delay to avoid hammering the server */
        await new Promise(r => setTimeout(r, 80));
    }

    /* ── Show completion summary ── */
    fillEl.style.width = '100%';
    fillEl.style.background = success > 0
        ? 'linear-gradient(90deg, #22c55e, #2dd4bf)'
        : 'linear-gradient(90deg, #ef4444, #f97316)';

    textEl.textContent = success > 0 ? '✅ Import complete!' : '⚠️ Import finished with issues.';
    countEl.textContent = `${total} / ${total}`;

    summaryEl.className = 'progress-summary' + (success > 0 ? ' ok' : ' warn');
    summaryEl.innerHTML =
        `<strong>${success}</strong> imported &nbsp;|&nbsp; ` +
        `<strong>${skipped}</strong> skipped (already exist) &nbsp;|&nbsp; ` +
        `<strong>${failed}</strong> failed`;
    summaryEl.classList.remove('hidden');

    /* Reload sidebar book list + stats */
    await loadBooks();

    /* ── AUTO-CLOSE after 2.5 seconds ── */
    setTimeout(() => {
        closeImportModal();
        /* Show a quick toast on the main page */
        showStatus(
            `✅ Import done — ${success} added, ${skipped} skipped, ${failed} failed.`,
            success > 0 || skipped > 0
        );
    }, 2500);
}

/* ─────────────────────────────────────────────────────────────
   INIT
───────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
    loadBooks();
    buildGenrePills();

    /* Close import modal on overlay click */
    document.getElementById('importModal').addEventListener('click', function (e) {
        if (e.target === this) closeImportModal();
    });

    /* Close delete modal on overlay click */
    document.getElementById('deleteModal').addEventListener('click', function (e) {
        if (e.target === this) closeDeleteModal();
    });

    /* Enter key in search */
    document.getElementById('olSearchInput')
        .addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });
});
