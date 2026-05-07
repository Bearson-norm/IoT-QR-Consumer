let allRows = [];

document.addEventListener('DOMContentLoaded', function () {
  loadMissedScan();
});

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
  fetch(`/api/ovt/missed-scan${qs}`)
    .then((r) => r.json())
    .then((data) => {
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
