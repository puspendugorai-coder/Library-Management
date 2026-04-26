/* ── Role Selection ── */
function selectRole(role) {
    document.getElementById('roleCard').classList.add('hidden');
    if (role === 'manager') {
        document.getElementById('managerCard').classList.remove('hidden');
    } else {
        document.getElementById('customerCard').classList.remove('hidden');
    }
}

function backToRole() {
    document.getElementById('managerCard').classList.add('hidden');
    document.getElementById('customerCard').classList.add('hidden');
    document.getElementById('roleCard').classList.remove('hidden');
    // Clear any alerts
    ['loginAlert', 'signupAlert', 'custAlert'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });
}

/* ── Manager Tab Switch ── */
function switchTab(tab) {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const tabLogin = document.getElementById('tabLogin');
    const tabSignup = document.getElementById('tabSignup');
    const indicator = document.getElementById('tabIndicator');

    if (tab === 'login') {
        loginForm.classList.add('active');
        signupForm.classList.remove('active');
        tabLogin.classList.add('active');
        tabSignup.classList.remove('active');
        indicator.style.left = '4px';
    } else {
        signupForm.classList.add('active');
        loginForm.classList.remove('active');
        tabSignup.classList.add('active');
        tabLogin.classList.remove('active');
        indicator.style.left = 'calc(50% + 2px)';
    }
}

/* ── Manager Login ── */
let lockInterval = null;

async function doLogin(e) {
    e.preventDefault();
    const uid = document.getElementById('loginUid').value.trim();
    const pwd = document.getElementById('loginPwd').value.trim();
    const btn = document.getElementById('loginBtn');
    const loader = btn.querySelector('.btn-loader');
    const text = btn.querySelector('.btn-text');

    hideAlert('loginAlert');
    setLoading(btn, loader, text, true);

    try {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: uid, password: pwd })
        });
        const data = await res.json();

        if (data.success) {
            window.location.href = '/dashboard';
        } else {
            showAlert('loginAlert', data.error || 'Login failed.');
            if (data.locked) startLockTimer(data.remaining);
        }
    } catch (err) {
        showAlert('loginAlert', 'Network error. Please try again.');
    } finally {
        setLoading(btn, loader, text, false);
    }
}

function startLockTimer(seconds) {
    const timerEl = document.getElementById('lockTimer');
    const countEl = document.getElementById('lockCount');
    const btn = document.getElementById('loginBtn');
    timerEl.classList.remove('hidden');
    btn.disabled = true;
    let rem = seconds;
    countEl.textContent = rem;
    if (lockInterval) clearInterval(lockInterval);
    lockInterval = setInterval(() => {
        rem--;
        countEl.textContent = rem;
        if (rem <= 0) {
            clearInterval(lockInterval);
            timerEl.classList.add('hidden');
            btn.disabled = false;
            hideAlert('loginAlert');
        }
    }, 1000);
}

/* ── Manager Signup ── */
async function doSignup(e) {
    e.preventDefault();
    const uid = document.getElementById('suUid').value.trim();
    const pwd = document.getElementById('suPwd').value.trim();
    const cpwd = document.getElementById('suCpwd').value.trim();
    const btn = document.getElementById('signupBtn');
    const loader = btn.querySelector('.btn-loader');
    const text = btn.querySelector('.btn-text');

    hideAlert('signupAlert');
    setLoading(btn, loader, text, true);

    try {
        const res = await fetch('/api/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: uid, password: pwd, confirm_password: cpwd })
        });
        const data = await res.json();

        if (data.success) {
            showAlert('signupAlert', '✅ Account created! You can now sign in.', true);
            setTimeout(() => switchTab('login'), 1800);
        } else {
            showAlert('signupAlert', data.error || 'Signup failed.');
        }
    } catch (err) {
        showAlert('signupAlert', 'Network error. Please try again.');
    } finally {
        setLoading(btn, loader, text, false);
    }
}

/* ── Customer Login ── */
async function doCustomerLogin(e) {
    e.preventDefault();
    const idNo = document.getElementById('custIdNo').value.trim().toUpperCase();
    const prn = document.getElementById('custPrn').value.trim().toUpperCase();
    const btn = document.getElementById('custLoginBtn');
    const loader = btn.querySelector('.btn-loader');
    const text = btn.querySelector('.btn-text');

    hideAlert('custAlert');
    setLoading(btn, loader, text, true);

    try {
        const res = await fetch('/api/customer_login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_no: idNo, prn_no: prn })
        });
        const data = await res.json();

        if (data.success) {
            window.location.href = '/customer_portal';
        } else {
            showAlert('custAlert', data.error || 'Access denied.');
        }
    } catch (err) {
        showAlert('custAlert', 'Network error. Please try again.');
    } finally {
        setLoading(btn, loader, text, false);
    }
}

/* ── Utilities ── */
function showAlert(id, msg, success = false) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = msg;
    el.className = 'alert' + (success ? ' success' : '');
}

function hideAlert(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
}

function setLoading(btn, loader, text, loading) {
    btn.disabled = loading;
    loader.classList.toggle('hidden', !loading);
    text.classList.toggle('hidden', loading);
}

function togglePwd(inputId, btn) {
    const input = document.getElementById(inputId);
    if (input.type === 'password') { input.type = 'text'; btn.textContent = '🙈'; }
    else { input.type = 'password'; btn.textContent = '👁'; }
}

/* ── Lockout status on blur ── */
document.addEventListener('DOMContentLoaded', () => {
    const loginUid = document.getElementById('loginUid');
    if (!loginUid) return;
    loginUid.addEventListener('blur', async () => {
        const uid = loginUid.value.trim();
        if (!uid) return;
        try {
            const res = await fetch('/api/lockout_status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: uid })
            });
            const data = await res.json();
            if (data.locked && data.remaining > 0) startLockTimer(data.remaining);
        } catch (_) { }
    });
});
