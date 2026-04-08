// ── Tab switcher ─────────────────────────────────────────────────
function switchTab(tab) {
    const isLogin = tab === 'login';
    document.getElementById('loginForm').classList.toggle('active', isLogin);
    document.getElementById('signupForm').classList.toggle('active', !isLogin);
    document.getElementById('tabLogin').classList.toggle('active', isLogin);
    document.getElementById('tabSignup').classList.toggle('active', !isLogin);
    document.getElementById('tabIndicator').classList.toggle('right', !isLogin);
    hideAlert('loginAlert'); hideAlert('signupAlert');
}

// ── Toggle password visibility ────────────────────────────────────
function togglePwd(id, btn) {
    const inp = document.getElementById(id);
    if (inp.type === 'password') { inp.type = 'text'; btn.textContent = '🙈'; }
    else { inp.type = 'password'; btn.textContent = '👁'; }
}

// ── Alert helpers ─────────────────────────────────────────────────
function showAlert(id, msg, type = 'error') {
    const el = document.getElementById(id);
    el.textContent = msg;
    el.className = 'alert' + (type === 'success' ? ' success' : '');
}
function hideAlert(id) {
    const el = document.getElementById(id);
    el.textContent = ''; el.className = 'alert hidden';
}

// ── Lock countdown ────────────────────────────────────────────────
let lockInterval = null;
function startLockTimer(seconds) {
    const timer = document.getElementById('lockTimer');
    const count = document.getElementById('lockCount');
    const btn = document.getElementById('loginBtn');
    timer.classList.remove('hidden');
    btn.disabled = true;
    let rem = seconds;
    count.textContent = rem;
    clearInterval(lockInterval);
    lockInterval = setInterval(() => {
        rem--;
        count.textContent = rem;
        if (rem <= 0) {
            clearInterval(lockInterval);
            timer.classList.add('hidden');
            btn.disabled = false;
        }
    }, 1000);
}

// ── Login ─────────────────────────────────────────────────────────
async function doLogin(e) {
    e.preventDefault();
    hideAlert('loginAlert');
    const btn = document.getElementById('loginBtn');
    btn.querySelector('.btn-text').classList.add('hidden');
    btn.querySelector('.btn-loader').classList.remove('hidden');
    btn.disabled = true;

    try {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: document.getElementById('loginUid').value.trim(),
                password: document.getElementById('loginPwd').value
            })
        });
        const data = await res.json();
        if (data.success) {
            window.location.href = '/dashboard';
        } else {
            showAlert('loginAlert', data.error || 'Login failed.');
            if (data.locked) startLockTimer(data.remaining || 60);
            btn.disabled = false;
        }
    } catch {
        showAlert('loginAlert', 'Network error. Please try again.');
        btn.disabled = false;
    } finally {
        btn.querySelector('.btn-text').classList.remove('hidden');
        btn.querySelector('.btn-loader').classList.add('hidden');
    }
}

// ── Signup ────────────────────────────────────────────────────────
async function doSignup(e) {
    e.preventDefault();
    hideAlert('signupAlert');
    const btn = document.getElementById('signupBtn');
    btn.disabled = true;

    try {
        const res = await fetch('/api/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: document.getElementById('suUid').value.trim(),
                password: document.getElementById('suPwd').value,
                confirm_password: document.getElementById('suCpwd').value
            })
        });
        const data = await res.json();
        if (data.success) {
            showAlert('signupAlert', '✅ Account created! You can now sign in.', 'success');
            setTimeout(() => switchTab('login'), 1800);
        } else {
            showAlert('signupAlert', data.error || 'Signup failed.');
        }
    } catch {
        showAlert('signupAlert', 'Network error. Please try again.');
    } finally {
        btn.disabled = false;
    }
}

// Enter key support
document.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
        const lf = document.getElementById('loginForm');
        const sf = document.getElementById('signupForm');
        if (lf.classList.contains('active')) lf.requestSubmit();
        else sf.requestSubmit();
    }
});