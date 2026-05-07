let authToken = null;
let currentUsername = null;
let allRows = [];

document.addEventListener('DOMContentLoaded', function () {
  const savedToken = localStorage.getItem('ovt_token');
  const savedUsername = localStorage.getItem('ovt_username');
  if (savedToken && savedUsername) {
    msVerifyToken(savedToken, savedUsername);
  } else {
    msShowLogin();
  }

  document.getElementById('msPassword')?.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') msHandleLogin();
  });
  document.getElementById('msUsername')?.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') document.getElementById('msPassword')?.focus();
  });
});

function msAuthHeaders() {
  return {
    Authorization: `Bearer ${authToken}`
  };
}

function msShowLogin() {
  document.getElementById('msLoginSection').style.display = 'block';
  document.getElementById('msMainSection').style.display = 'none';
  document.getElementById('msUsername')?.focus();
}

function msShowMain() {
  document.getElementById('msLoginSection').style.display = 'none';
  document.getElementById('msMainSection').style.display = 'block';
  const u = document.getElementById('msLoggedInUser');
  if (u) u.textContent = currentUsername ? `Login: ${currentUsername} · ` : '';
  loadMissedScan();
}

function msHandleLogin() {
  const username = document.getElementById('msUsername').value.trim();
  const password = document.getElementById('msPassword').value.trim();
  const loginError = document.getElementById('msLoginError');
  const loginBtn = document.getElementById('msLoginBtn');

  if (!username || !password) {
    loginError.textContent = 'Username dan password harus diisi';
    loginError.style.display = 'block';
    return;
  }

  loginError.style.display = 'none';
  loginBtn.disabled = true;
  loginBtn.textContent = 'Memproses...';

  fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  })
    .then((r) => r.json())
    .then((data) => {
      if (data.success) {
        authToken = data.token;
        currentUsername = data.username;
        localStorage.setItem('ovt_token', authToken);
        localStorage.setItem('ovt_username', currentUsername);
        document.getElementById('msPassword').value = '';
        msShowMain();
      } else {
        loginError.textContent = data.message || 'Login gagal';
        loginError.style.display = 'block';
      }
    })
    .catch(() => {
      loginError.textContent = 'Terjadi kesalahan saat login';
      loginError.style.display = 'block';
    })
    .finally(() => {
      loginBtn.disabled = false;
      loginBtn.textContent = 'Login';
    });
}

function msVerifyToken(token, username) {
  fetch('/api/auth/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token })
  })
    .then((r) => r.json())
    .then((data) => {
      if (data.success) {
        authToken = token;
        currentUsername = username;
        msShowMain();
      } else {
        localStorage.removeItem('ovt_token');
        localStorage.removeItem('ovt_username');
        msShowLogin();
      }
    })
    .catch(() => {
      localStorage.removeItem('ovt_token');
      localStorage.removeItem('ovt_username');
      msShowLogin();
    });
}

function msHandleLogout() {
  authToken = null;
  currentUsername = null;
  localStorage.removeItem('ovt_token');
  localStorage.removeItem('ovt_username');
  msShowLogin();
}

function msOnUnauthorized() {
  authToken = null;
  currentUsername = null;
  localStorage.removeItem('ovt_token');
  localStorage.removeItem('ovt_username');
  msShowLogin();
  const loginError = document.getElementById('msLoginError');
  if (loginError) {
    loginError.textContent = 'Sesi berakhir. Silakan login kembali.';
    loginError.style.display = 'block';
  }
}

function formatGrantedAt(value) {
  if (value == null || value === '') return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    dateStyle: 'short',
    timeStyle: 'medium'
  });
}

function showError(msg) {
  const el = document.getElementById('error');
  el.textContent = msg;
  el.style.display = 'block';
}

function hideError() {
  const el = document.getElementById('error');
  el.style.display = 'none';
  el.textContent = '';
}

function loadMissedScan() {
  if (!authToken) {
    msOnUnauthorized();
    return;
  }

  const dateInput = document.getElementById('missedDate');
  const picked = dateInput.value.trim();
  const loading = document.getElementById('loading');
  const table = document.getElementById('missedTable');
  const empty = document.getElementById('emptyState');
  const meta = document.getElementById('effectiveDateLabel');

  hideError();
  loading.style.display = 'block';
  table.style.display = 'none';
  empty.style.display = 'none';
  meta.textContent = '';

  const qs = picked ? `?date=${encodeURIComponent(picked)}` : '';
  fetch(`/api/ovt/missed-scan${qs}`, { headers: msAuthHeaders() })
    .then((r) => {
      if (r.status === 401) {
        msOnUnauthorized();
        return null;
      }
      return r.json();
    })
    .then((data) => {
      if (!data) return;
      if (!data.success) {
        showError(data.message || 'Gagal memuat data');
        return;
      }
      if (dateInput && !picked) {
        dateInput.value = data.date;
      }
      meta.textContent = `Tanggal data: ${data.date} · ${data.count} orang belum scan overtime`;
      allRows = Array.isArray(data.data) ? data.data : [];
      document.getElementById('searchInput').value = '';
      document.getElementById('clearSearchBtn').style.display = 'none';
      renderTable(allRows);
    })
    .catch(() => {
      showError('Terjadi kesalahan saat memuat data');
    })
    .finally(() => {
      loading.style.display = 'none';
    });
}

function renderTable(rows) {
  const table = document.getElementById('missedTable');
  const body = document.getElementById('tableBody');
  const empty = document.getElementById('emptyState');

  body.innerHTML = '';

  if (!rows.length) {
    table.style.display = 'none';
    empty.style.display = 'block';
    return;
  }

  empty.style.display = 'none';
  table.style.display = 'table';

  rows.forEach((row, i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${i + 1}</td>
      <td>${escapeHtml(row.employee_id)}</td>
      <td>${escapeHtml(row.name)}</td>
      <td>${escapeHtml(row.granted_by)}</td>
      <td>${escapeHtml(formatGrantedAt(row.granted_at))}</td>
    `;
    body.appendChild(tr);
  });
}

function escapeHtml(s) {
  if (s == null) return '';
  const t = document.createTextNode(String(s));
  const p = document.createElement('p');
  p.appendChild(t);
  return p.innerHTML;
}

function filterRows() {
  const q = document.getElementById('searchInput').value.trim().toLowerCase();
  const clearBtn = document.getElementById('clearSearchBtn');
  clearBtn.style.display = q ? 'inline-block' : 'none';

  if (!q) {
    renderTable(allRows);
    return;
  }

  const filtered = allRows.filter((r) => {
    const id = String(r.employee_id || '').toLowerCase();
    const name = String(r.name || '').toLowerCase();
    return id.includes(q) || name.includes(q);
  });
  renderTable(filtered);
}

function clearSearch() {
  document.getElementById('searchInput').value = '';
  document.getElementById('clearSearchBtn').style.display = 'none';
  renderTable(allRows);
}
