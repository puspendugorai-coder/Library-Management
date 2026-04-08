// ══════════════════════════════════════════════════════════════════
//  STATE
// ══════════════════════════════════════════════════════════════════
let allBooks = [];
let selectedBID = null;
let deletePending = null;

// ══════════════════════════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════════════════════════
function enforceAlnum(el) {
    el.value = el.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6);
}

function showStatus(msg, type = 'ok') {
    const bar = document.getElementById('statusBar');
    bar.textContent = msg;
    bar.className = `status-bar ${type}`;
    bar.classList.remove('hidden');
    setTimeout(() => bar.classList.add('hidden'), 5000);
}

function esc(v) {
    return String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ══════════════════════════════════════════════════════════════════
//  FORM HELPERS
// ══════════════════════════════════════════════════════════════════
function getFormData() {
    return {
        Book_ID: document.getElementById('bkID').value.trim(),
        Book_Name: document.getElementById('bkName').value.trim(),
        Author: document.getElementById('bkAuthor').value.trim(),
        Book_Price: document.getElementById('bkPrice').value.trim(),
        Availability: document.getElementById('bkAvail').value.trim(),
    };
}

function fillForm(b) {
    document.getElementById('bkID').value = b.Book_ID || '';
    document.getElementById('bkName').value = b.Book_Name || '';
    document.getElementById('bkAuthor').value = b.Author || '';
    document.getElementById('bkPrice').value = b.Book_Price !== undefined
        ? parseFloat(b.Book_Price || 0)
        : '';
    document.getElementById('bkAvail').value = b.Availability !== undefined
        ? b.Availability
        : '';
    selectedBID = b.Book_ID || null;
}

function clearForm() {
    ['bkID', 'bkName', 'bkAuthor', 'bkPrice', 'bkAvail'].forEach(
        id => { document.getElementById(id).value = ''; }
    );
    selectedBID = null;
    document.querySelectorAll('#booksTbody tr').forEach(r => r.classList.remove('row-selected'));
    document.getElementById('statusBar').classList.add('hidden');
}

// ══════════════════════════════════════════════════════════════════
//  LOAD & RENDER BOOKS
// ══════════════════════════════════════════════════════════════════
async function loadBooks() {
    try {
        const res = await fetch('/api/books');
        allBooks = await res.json();
        renderBooks(allBooks);
    } catch {
        document.getElementById('booksTbody').innerHTML =
            '<tr><td colspan="5" class="table-empty">Error loading books.</td></tr>';
    }
}

function renderBooks(books) {
    const tbody = document.getElementById('booksTbody');
    if (!books.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="table-empty">No books found.</td></tr>';
        return;
    }
    tbody.innerHTML = books.map(b => {
        const avail = parseInt(b.Availability) || 0;
        const cls = avail > 3 ? 'avail-ok' : avail > 0 ? 'avail-low' : 'avail-none';
        const price = b.Book_Price !== undefined
            ? parseFloat(b.Book_Price || 0).toFixed(2)
            : '—';
        return `
    <tr onclick="onRowClick('${esc(b.Book_ID)}')" data-bid="${esc(b.Book_ID)}">
      <td>${esc(b.Book_ID)}</td>
      <td>${esc(b.Book_Name)}</td>
      <td>${esc(b.Author)}</td>
      <td class="price-cell">${price}</td>
      <td class="${cls}">${avail}</td>
    </tr>`;
    }).join('');
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

/** Click a row → fill the form (point 12) */
function onRowClick(bid) {
    const b = allBooks.find(x => x.Book_ID === bid);
    if (!b) return;
    fillForm(b);
    document.querySelectorAll('#booksTbody tr').forEach(r =>
        r.classList.toggle('row-selected', r.dataset.bid === bid));
}

// ══════════════════════════════════════════════════════════════════
//  CRUD
// ══════════════════════════════════════════════════════════════════
async function addBook() {
    const data = getFormData();
    if (!data.Book_ID || !data.Book_Name || !data.Author ||
        data.Book_Price === '' || data.Availability === '') {
        showStatus('⚠ All fields are required.', 'warn'); return;
    }
    try {
        const res = await fetch('/api/books', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const json = await res.json();
        if (json.success) {
            showStatus('✅ Book added successfully!', 'ok');
            clearForm(); loadBooks();
        } else {
            showStatus('❌ ' + (json.error || 'Error.'), 'err');
        }
    } catch { showStatus('❌ Network error.', 'err'); }
}

async function updateBook() {
    if (!selectedBID) {
        showStatus('⚠ Select a book row first.', 'warn'); return;
    }
    const data = getFormData();
    if (!data.Book_Name || !data.Author ||
        data.Book_Price === '' || data.Availability === '') {
        showStatus('⚠ Name, Author, Price and Availability required.', 'warn'); return;
    }
    try {
        const res = await fetch(`/api/books/${encodeURIComponent(selectedBID)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const json = await res.json();
        if (json.success) {
            showStatus('✅ Book updated!', 'ok'); loadBooks();
        } else {
            showStatus('❌ ' + (json.error || 'Error.'), 'err');
        }
    } catch { showStatus('❌ Network error.', 'err'); }
}

function deleteBook() {
    if (!selectedBID) {
        showStatus('⚠ Select a book row first.', 'warn'); return;
    }
    deletePending = selectedBID;
    const bname = document.getElementById('bkName').value || selectedBID;
    document.getElementById('deleteMsg').textContent =
        `Delete "${bname}" (ID: ${selectedBID}) from the database?`;
    document.getElementById('deleteModal').classList.remove('hidden');
}

async function confirmDelete() {
    closeModal();
    try {
        const res = await fetch(`/api/books/${encodeURIComponent(deletePending)}`, {
            method: 'DELETE'
        });
        const json = await res.json();
        if (json.success) {
            showStatus('✅ Book deleted!', 'ok');
            clearForm(); loadBooks();
        } else {
            showStatus('❌ ' + (json.error || 'Error.'), 'err');
        }
    } catch { showStatus('❌ Network error.', 'err'); }
}

function closeModal() {
    document.getElementById('deleteModal').classList.add('hidden');
}

// ══════════════════════════════════════════════════════════════════
//  ENTER KEY SUPPORT
// ══════════════════════════════════════════════════════════════════
['bkID', 'bkName', 'bkAuthor', 'bkPrice', 'bkAvail'].forEach(id => {
    document.getElementById(id).addEventListener('keydown', e => {
        if (e.key === 'Enter') addBook();
    });
});

// ══════════════════════════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════════════════════════
loadBooks();