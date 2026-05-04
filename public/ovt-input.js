let authToken = null;
let currentUsername = null;
let originalOvtListData = [];

const OVT_TEMPLATES_KEY_PREFIX = 'ovt_employee_templates_v1_';
let templateEditBuffer = { id: null, name: '', employeeIds: [] };
let ovtTemplatesCache = [];
const employeeNameById = new Map();

// Text-to-Speech helpers (simplified - we reuse browser default voice but adjust pitch)
function playSound(text, lang = 'id-ID', genderHint = 'neutral') {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        utterance.rate = 1.0;
        utterance.pitch = genderHint === 'male' ? 0.3 : 1.0;
        utterance.volume = 1.0;
        window.speechSynthesis.speak(utterance);
    } else {
        console.warn('Speech synthesis not supported in this browser');
    }
}

// Decide which sound to play based on OVT permission result
function speakOvtResult(data) {
    const name = data && data.employee && data.employee.name ? data.employee.name : 'karyawan';

    if (data.success && data.code === 'OVT_PERMISSION_GRANTED') {
        // Izin OVT berhasil diberikan
        playSound(`Izin OVT untuk ${name} telah diberikan. Silakan lakukan scan di halaman utama`, 'id-ID', 'neutral');
    } else if (!data.success && data.code === 'OVT_PERMISSION_EXISTS') {
        // Izin sudah pernah diberikan
        playSound(`Izin OVT untuk ${name} sudah diberikan hari ini`, 'id-ID', 'male');
    }
}

// Check if user is already logged in
document.addEventListener('DOMContentLoaded', function() {
    const savedToken = localStorage.getItem('ovt_token');
    const savedUsername = localStorage.getItem('ovt_username');
    
    if (savedToken && savedUsername) {
        // Verify token
        verifyToken(savedToken, savedUsername);
    } else {
        showLoginSection();
    }
});

// Handle Enter key in login form
document.getElementById('username')?.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        document.getElementById('password').focus();
    }
});

document.getElementById('password')?.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        handleLogin();
    }
});

// Handle Employee ID inputs (multiple rows)
let rowIndexCounter = 0;

// Initialize first row event listeners
document.addEventListener('DOMContentLoaded', function() {
    initializeRowInputs();
});

function initializeRowInputs() {
    const inputs = document.querySelectorAll('.employee-id-input');
    inputs.forEach(input => {
        setupInputListeners(input);
    });
    updateConfirmButtonState();
}

function setupInputListeners(input) {
    // Remove existing listeners by cloning
    const newInput = input.cloneNode(true);
    input.parentNode.replaceChild(newInput, input);
    
    newInput.addEventListener('input', function() {
        const employeeId = this.value.trim();
        const row = this.closest('.employee-input-row');
        const nameDisplay = row.querySelector('.employee-name-display-row');
        
        if (employeeId) {
            fetchEmployeeNameForRow(employeeId, row);
        } else {
            if (nameDisplay) nameDisplay.style.display = 'none';
        }
        updateConfirmButtonState();
    });

    newInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            // Try to add new row or confirm
            const hasValue = this.value.trim();
            if (hasValue) {
                // If Enter pressed and has value, add new row
                addEmployeeRow();
                // Focus on new row
                setTimeout(() => {
                    const rows = document.querySelectorAll('.employee-input-row');
                    const lastRow = rows[rows.length - 1];
                    const lastInput = lastRow.querySelector('.employee-id-input');
                    if (lastInput) lastInput.focus();
                }, 100);
            }
        }
    });
}

function addEmployeeRow(skipFocus) {
    rowIndexCounter++;
    const container = document.querySelector('.employee-inputs-container');
    const rowIndex = rowIndexCounter;
    
    const newRow = document.createElement('div');
    newRow.className = 'employee-input-row';
    newRow.setAttribute('data-row-index', rowIndex);
    
    newRow.innerHTML = `
        <div class="input-group">
            <label>Employee ID:</label>
            <div class="input-with-buttons">
                <input 
                    type="text" 
                    class="employee-id-input" 
                    placeholder="Masukkan Employee ID"
                    autocomplete="off"
                    list="employeeList"
                    data-row="${rowIndex}"
                >
                <button type="button" class="btn-add-row" onclick="addEmployeeRow()" title="Tambah row">+</button>
                <button type="button" class="btn-remove-row" onclick="removeEmployeeRow(this)" title="Hapus row">−</button>
            </div>
            <div class="employee-name-display-row" style="display: none;">
                <strong>Nama:</strong> <span class="employee-name-text"></span>
            </div>
        </div>
    `;
    
    container.appendChild(newRow);
    
    // Setup listeners for new input
    const newInput = newRow.querySelector('.employee-id-input');
    setupInputListeners(newInput);
    
    if (!skipFocus) {
        setTimeout(() => newInput.focus(), 100);
    }
}

function removeEmployeeRow(button) {
    const row = button.closest('.employee-input-row');
    if (row) {
        row.remove();
        updateConfirmButtonState();
    }
}

function updateConfirmButtonState() {
    const confirmBtn = document.getElementById('confirmBtn');
    const inputs = document.querySelectorAll('.employee-id-input');
    let hasAnyValue = false;
    
    inputs.forEach(input => {
        if (input.value.trim()) {
            hasAnyValue = true;
        }
    });
    
    if (confirmBtn) {
        confirmBtn.disabled = !hasAnyValue;
    }
}

function handleLogin() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    const loginError = document.getElementById('loginError');
    const loginBtn = document.getElementById('loginBtn');

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
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            authToken = data.token;
            currentUsername = data.username;
            
            // Save to localStorage
            localStorage.setItem('ovt_token', authToken);
            localStorage.setItem('ovt_username', currentUsername);
            
            showOvtSection();
            loadEmployeeList();
        } else {
            loginError.textContent = data.message || 'Login gagal';
            loginError.style.display = 'block';
        }
    })
    .catch(error => {
        console.error('Error:', error);
        loginError.textContent = 'Terjadi kesalahan saat login';
        loginError.style.display = 'block';
    })
    .finally(() => {
        loginBtn.disabled = false;
        loginBtn.textContent = 'Login';
    });
}

function verifyToken(token, username) {
    fetch('/api/auth/verify', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            authToken = token;
            currentUsername = username;
            showOvtSection();
            loadEmployeeList();
        } else {
            localStorage.removeItem('ovt_token');
            localStorage.removeItem('ovt_username');
            showLoginSection();
        }
    })
    .catch(error => {
        console.error('Error:', error);
        localStorage.removeItem('ovt_token');
        localStorage.removeItem('ovt_username');
        showLoginSection();
    });
}

function handleLogout() {
    authToken = null;
    currentUsername = null;
    localStorage.removeItem('ovt_token');
    localStorage.removeItem('ovt_username');
    showLoginSection();
    
    // Clear all inputs
    clearAllInputs();
}

function showLoginSection() {
    document.getElementById('loginSection').style.display = 'block';
    document.getElementById('ovtSection').style.display = 'none';
    document.getElementById('username').focus();
}

function showOvtSection() {
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('ovtSection').style.display = 'block';
    document.getElementById('loggedInUser').textContent = `Login sebagai: ${currentUsername}`;
    
    // Show OVT list section if admin
    const isAdmin = currentUsername === 'admin';
    const ovtListSection = document.getElementById('ovtListSection');
    const deleteAllBtn = document.getElementById('deleteAllBtn');
    
    if (ovtListSection) {
        ovtListSection.style.display = isAdmin ? 'block' : 'none';
    }
    
    if (deleteAllBtn) {
        deleteAllBtn.style.display = isAdmin ? 'inline-block' : 'none';
    }
    
    // Load OVT list if admin
    if (isAdmin) {
        loadOvtTodayList();
        setupOvtSearchInput();
    }

    refreshTemplatesFromApi()
        .then(() => migrateLocalTemplatesIfNeeded())
        .catch(err => console.error('Templates:', err));
    
    // Focus on first input
    const firstInput = document.querySelector('.employee-id-input');
    if (firstInput) firstInput.focus();
}

function loadEmployeeList() {
    return fetch('/api/employee')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                employeeNameById.clear();
                data.data.forEach(emp => {
                    employeeNameById.set(emp.employee_id, emp.name);
                });
                const datalist = document.getElementById('employeeList');
                datalist.innerHTML = '';
                data.data.forEach(emp => {
                    const option = document.createElement('option');
                    option.value = emp.employee_id;
                    option.textContent = `${emp.employee_id} - ${emp.name}`;
                    datalist.appendChild(option);
                });
            }
        })
        .catch(error => {
            console.error('Error loading employees:', error);
        });
}

function getEmployeeNameLabel(employeeId) {
    const key = String(employeeId).trim();
    if (!key) return '';
    return employeeNameById.get(key) || '';
}

function fetchEmployeeNameForRow(employeeId, row) {
    fetch(`/api/employee`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const employee = data.data.find(emp => emp.employee_id === employeeId);
                const nameDisplay = row.querySelector('.employee-name-display-row');
                const nameSpan = row.querySelector('.employee-name-text');
                
                if (employee && nameDisplay && nameSpan) {
                    nameSpan.textContent = employee.name;
                    nameDisplay.style.display = 'block';
                } else if (nameDisplay) {
                    nameDisplay.style.display = 'none';
                }
            }
        })
        .catch(error => {
            console.error('Error fetching employee:', error);
        });
}

function handleConfirm() {
    // Get all employee IDs from all rows
    const inputs = document.querySelectorAll('.employee-id-input');
    const employeeIds = [];
    
    inputs.forEach(input => {
        const id = input.value.trim();
        if (id) {
            employeeIds.push(id);
        }
    });

    if (employeeIds.length === 0) {
        const ovtError = document.getElementById('ovtError');
        ovtError.textContent = 'Minimal satu Employee ID harus diisi';
        ovtError.style.display = 'block';
        return;
    }

    if (!authToken) {
        handleLogout();
        return;
    }

    const confirmBtn = document.getElementById('confirmBtn');
    const ovtError = document.getElementById('ovtError');
    const ovtSuccess = document.getElementById('ovtSuccess');

    ovtError.style.display = 'none';
    ovtSuccess.style.display = 'none';
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Memproses...';

    // Process all employee IDs sequentially
    processMultipleEmployees(employeeIds, 0, [], []);
}

function processMultipleEmployees(employeeIds, index, successResults, errorResults) {
    if (index >= employeeIds.length) {
        // All done, show results
        const confirmBtn = document.getElementById('confirmBtn');
        const ovtError = document.getElementById('ovtError');
        
        if (errorResults.length === 0) {
            // All success
            const ovtSuccess = document.getElementById('ovtSuccess');
            ovtSuccess.textContent = `Berhasil memberikan izin OVT untuk ${successResults.length} employee`;
            ovtSuccess.style.display = 'block';
            
            // Clear all inputs
            clearAllInputs();
        } else if (successResults.length === 0) {
            // All failed
            ovtError.textContent = errorResults[0].message || 'Input OVT gagal';
            ovtError.style.display = 'block';
        } else {
            // Mixed results
            ovtError.textContent = `Berhasil: ${successResults.length}, Gagal: ${errorResults.length}. ${errorResults[0].message || ''}`;
            ovtError.style.display = 'block';
            
            // Clear successful inputs only
            clearSuccessfulInputs(successResults);
        }
        
        confirmBtn.disabled = false;
        confirmBtn.textContent = 'Konfirmasi';
        updateConfirmButtonState();
        return;
    }

    const employeeId = employeeIds[index];
    
    fetch('/api/ovt/input', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-username': currentUsername || 'admin'
        },
        body: JSON.stringify({ employee_id: employeeId })
    })
    .then(response => response.json())
    .then(data => {
        // Play appropriate sound for first result
        if (index === 0) {
            speakOvtResult(data);
        }

        if (data.success) {
            successResults.push({ employeeId, data });
            if (index === 0 && successResults.length === 1) {
                // Show success modal for first success
                showSuccessModal(data);
            }
            // Refresh OVT list if admin
            if (currentUsername === 'admin') {
                loadOvtTodayList();
            }
        } else {
            errorResults.push({ employeeId, message: data.message || 'Input OVT gagal' });
        }
        
        // Process next employee
        processMultipleEmployees(employeeIds, index + 1, successResults, errorResults);
    })
    .catch(error => {
        console.error('Error:', error);
        errorResults.push({ employeeId, message: 'Terjadi kesalahan saat memproses input' });
        
        // Process next employee
        processMultipleEmployees(employeeIds, index + 1, successResults, errorResults);
    });
}

function clearAllInputs() {
    const inputs = document.querySelectorAll('.employee-id-input');
    inputs.forEach(input => {
        input.value = '';
        const row = input.closest('.employee-input-row');
        const nameDisplay = row.querySelector('.employee-name-display-row');
        if (nameDisplay) nameDisplay.style.display = 'none';
    });
    
    // Keep only first row, remove others
    const rows = document.querySelectorAll('.employee-input-row');
    for (let i = rows.length - 1; i > 0; i--) {
        rows[i].remove();
    }
    
    // Focus on first input
    const firstInput = document.querySelector('.employee-id-input');
    if (firstInput) firstInput.focus();
}

function clearSuccessfulInputs(successResults) {
    const successIds = successResults.map(r => r.employeeId);
    const inputs = document.querySelectorAll('.employee-id-input');
    
    inputs.forEach(input => {
        if (successIds.includes(input.value.trim())) {
            input.value = '';
            const row = input.closest('.employee-input-row');
            const nameDisplay = row.querySelector('.employee-name-display-row');
            if (nameDisplay) nameDisplay.style.display = 'none';
        }
    });
    
    // Remove empty rows except first
    const rows = document.querySelectorAll('.employee-input-row');
    for (let i = rows.length - 1; i > 0; i--) {
        const input = rows[i].querySelector('.employee-id-input');
        if (!input || !input.value.trim()) {
            rows[i].remove();
        }
    }
}

function showSuccessModal(data) {
    const modal = document.getElementById('successModal');
    const messageDiv = document.getElementById('successMessage');
    const employeeInfoDiv = document.getElementById('successEmployeeInfo');

    messageDiv.innerHTML = `<p style="font-size: 1.2em; color: #4caf50; font-weight: 600;">${data.message}</p>
        <p style="font-size: 0.95em; color: var(--gray-700); margin-top: 12px; padding: 12px; background: var(--gray-100); border-radius: 8px;">
            ⚠️ <strong>Penting:</strong> Izin OVT telah diberikan. Employee harus melakukan scan di halaman utama untuk menyelesaikan proses.
        </p>`;
    
    if (data.employee) {
        employeeInfoDiv.innerHTML = `
            <div class="employee-info">
                <strong>Employee ID:</strong> ${data.employee.employee_id}
                <strong>Nama:</strong> ${data.employee.name}
            </div>
        `;
    }

    // Show modal with animation
    modal.style.display = 'flex';
    // Trigger animation by adding class after a small delay
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        // Remove show class for animation
        modal.classList.remove('show');
        // Hide modal after animation
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    }
}

// Close modal when clicking outside
window.onclick = function(event) {
    const successModal = document.getElementById('successModal');
    if (event.target === successModal) {
        closeModal('successModal');
    }
    const templateManageModal = document.getElementById('templateManageModal');
    if (event.target === templateManageModal) {
        closeTemplateManageModal();
    }
    const templateEditModal = document.getElementById('templateEditModal');
    if (event.target === templateEditModal) {
        closeTemplateEditModal();
    }
}

// OVT List Functions
function loadOvtTodayList() {
    const contentDiv = document.getElementById('ovtListContent');
    if (!contentDiv) return;

    contentDiv.innerHTML = '<p class="ovt-loading">Memuat data...</p>';

    fetch('/api/ovt/today')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                originalOvtListData = data.data || [];
                renderOvtList(originalOvtListData);
            } else {
                contentDiv.innerHTML = '<p class="ovt-empty">Gagal memuat data</p>';
            }
        })
        .catch(error => {
            console.error('Error loading OVT list:', error);
            contentDiv.innerHTML = '<p class="ovt-empty">Terjadi kesalahan saat memuat data</p>';
        });
}

function renderOvtList(ovtList) {
    const contentDiv = document.getElementById('ovtListContent');
    if (!contentDiv) return;

    if (ovtList.length === 0) {
        contentDiv.innerHTML = '<p class="ovt-empty">Tidak ada employee dengan status overtime hari ini</p>';
        return;
    }

    let html = '';
    ovtList.forEach(item => {
        const grantedTime = new Date(item.granted_at);
        const timeString = grantedTime.toLocaleTimeString('id-ID', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        const isAdmin = currentUsername === 'admin';
        const deleteBtn = isAdmin ? `<button onclick="handleDeleteOvt('${item.employee_id}')" class="btn-delete-item" title="Hapus">🗑️</button>` : '';
        
        html += `
            <div class="ovt-item">
                <div class="ovt-item-header">
                    <div>
                        <div class="ovt-employee-name">${item.name}</div>
                        <div class="ovt-employee-id">${item.employee_id}</div>
                    </div>
                    ${deleteBtn ? `<div class="ovt-item-actions">${deleteBtn}</div>` : ''}
                </div>
                <div class="ovt-item-details">
                    <div class="ovt-detail-row">
                        <span class="ovt-detail-label">Diberikan oleh:</span>
                        <span class="ovt-detail-value">${item.granted_by}</span>
                    </div>
                    <div class="ovt-detail-row">
                        <span class="ovt-detail-label">Waktu:</span>
                        <span class="ovt-detail-value">${timeString}</span>
                    </div>
                </div>
            </div>
        `;
    });

    contentDiv.innerHTML = html;
}

function filterOvtList(searchTerm) {
    if (!searchTerm || searchTerm.trim() === '') {
        renderOvtList(originalOvtListData);
        return;
    }

    const term = searchTerm.toLowerCase().trim();
    const filtered = originalOvtListData.filter(item => {
        const name = (item.name || '').toLowerCase();
        const employeeId = (item.employee_id || '').toLowerCase();
        const grantedBy = (item.granted_by || '').toLowerCase();
        
        return name.includes(term) || 
               employeeId.includes(term) || 
               grantedBy.includes(term);
    });

    renderOvtList(filtered);
}

function setupOvtSearchInput() {
    const searchInput = document.getElementById('ovtSearchInput');
    if (searchInput) {
        // Remove existing listeners by cloning
        const newInput = searchInput.cloneNode(true);
        searchInput.parentNode.replaceChild(newInput, searchInput);
        
        // Add event listener
        newInput.addEventListener('input', function(e) {
            filterOvtList(e.target.value);
        });
        
        // Clear search on Escape key
        newInput.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                this.value = '';
                filterOvtList('');
            }
        });
    }
}

function refreshOvtList() {
    loadOvtTodayList();
}

function handleDeleteOvt(employeeId) {
    if (!employeeId) return;
    
    if (!confirm('Apakah Anda yakin ingin menghapus izin OVT untuk employee ini?')) {
        return;
    }

    if (!authToken || currentUsername !== 'admin') {
        alert('Hanya admin yang dapat menghapus izin OVT');
        return;
    }

    fetch(`/api/ovt/${employeeId}`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
            'x-username': currentUsername
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Refresh the list
            loadOvtTodayList();
            // Show success message
            const ovtSuccess = document.getElementById('ovtSuccess');
            if (ovtSuccess) {
                ovtSuccess.textContent = data.message || 'Izin OVT berhasil dihapus';
                ovtSuccess.style.display = 'block';
                setTimeout(() => {
                    ovtSuccess.style.display = 'none';
                }, 3000);
            }
        } else {
            alert(data.message || 'Gagal menghapus izin OVT');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Terjadi kesalahan saat menghapus izin OVT');
    });
}

function handleDeleteAllOvt() {
    if (!confirm('Apakah Anda yakin ingin menghapus SEMUA izin OVT hari ini? Tindakan ini tidak dapat dibatalkan.')) {
        return;
    }

    if (!authToken || currentUsername !== 'admin') {
        alert('Hanya admin yang dapat menghapus semua izin OVT');
        return;
    }

    const deleteAllBtn = document.getElementById('deleteAllBtn');
    if (deleteAllBtn) {
        deleteAllBtn.disabled = true;
        deleteAllBtn.textContent = 'Menghapus...';
    }

    fetch('/api/ovt/today/all', {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
            'x-username': currentUsername
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Refresh the list
            loadOvtTodayList();
            // Show success message
            const ovtSuccess = document.getElementById('ovtSuccess');
            if (ovtSuccess) {
                ovtSuccess.textContent = data.message || 'Semua izin OVT berhasil dihapus';
                ovtSuccess.style.display = 'block';
                setTimeout(() => {
                    ovtSuccess.style.display = 'none';
                }, 3000);
            }
        } else {
            alert(data.message || 'Gagal menghapus izin OVT');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Terjadi kesalahan saat menghapus izin OVT');
    })
    .finally(() => {
        if (deleteAllBtn) {
            deleteAllBtn.disabled = false;
            deleteAllBtn.textContent = '🗑️ Hapus Semua';
        }
    });
}

// --- OVT employee templates (PostgreSQL on server, per x-username) ---

function escapeHtml(s) {
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
}

function dedupeEmployeeIds(ids) {
    const seen = new Set();
    const out = [];
    for (const id of ids) {
        const t = String(id).trim();
        if (!t || seen.has(t)) continue;
        seen.add(t);
        out.push(t);
    }
    return out;
}

function loadTemplates() {
    return ovtTemplatesCache;
}

async function refreshTemplatesFromApi() {
    if (!currentUsername) {
        ovtTemplatesCache = [];
        refreshTemplateSelect();
        return;
    }
    try {
        const res = await fetch('/api/ovt/templates', {
            headers: { 'x-username': currentUsername || '' }
        });
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
            ovtTemplatesCache = json.data.map(t => ({
                id: String(t.id),
                name: (t.name && String(t.name).trim()) || 'Tanpa nama',
                employeeIds: dedupeEmployeeIds(t.employeeIds || [])
            }));
        } else {
            ovtTemplatesCache = [];
        }
    } catch (e) {
        console.error('refreshTemplatesFromApi', e);
        ovtTemplatesCache = [];
    }
    refreshTemplateSelect();
    const manageModal = document.getElementById('templateManageModal');
    if (manageModal && manageModal.classList.contains('show')) {
        renderTemplateManageList();
    }
}

async function migrateLocalTemplatesIfNeeded() {
    if (!currentUsername) return;
    const key = OVT_TEMPLATES_KEY_PREFIX + currentUsername;
    const raw = localStorage.getItem(key);
    if (!raw) return;
    let localList = [];
    try {
        localList = JSON.parse(raw);
    } catch (e) {
        localStorage.removeItem(key);
        return;
    }
    if (!Array.isArray(localList) || localList.length === 0) {
        localStorage.removeItem(key);
        return;
    }
    if (ovtTemplatesCache.length > 0) {
        localStorage.removeItem(key);
        return;
    }
    for (const t of localList) {
        const name = (t.name && String(t.name).trim()) || 'Tanpa nama';
        const employeeIds = dedupeEmployeeIds(t.employeeIds || []);
        try {
            const res = await fetch('/api/ovt/templates', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-username': currentUsername
                },
                body: JSON.stringify({ name, employeeIds })
            });
            const json = await res.json();
            if (!json.success) {
                console.warn('Migrasi template:', json.message);
            }
        } catch (e) {
            console.error('Migrasi template gagal', e);
        }
    }
    localStorage.removeItem(key);
    await refreshTemplatesFromApi();
}

function refreshTemplateSelect() {
    const sel = document.getElementById('ovtTemplateSelect');
    if (!sel) return;
    const prev = sel.value;
    const templates = loadTemplates();
    sel.innerHTML = '<option value="">— Pilih template —</option>';
    templates.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t.id;
        opt.textContent = `${t.name} (${t.employeeIds.length} ID)`;
        sel.appendChild(opt);
    });
    if (templates.some(t => String(t.id) === String(prev))) {
        sel.value = prev;
    }
}

function fillRowsWithIds(employeeIds) {
    const ids = dedupeEmployeeIds(employeeIds);
    clearAllInputs();
    if (ids.length === 0) {
        updateConfirmButtonState();
        return;
    }
    const firstInput = document.querySelector('.employee-id-input');
    const firstRow = firstInput.closest('.employee-input-row');
    firstInput.value = ids[0];
    fetchEmployeeNameForRow(ids[0], firstRow);
    for (let i = 1; i < ids.length; i++) {
        addEmployeeRow(true);
        const rows = document.querySelectorAll('.employee-input-row');
        const lastRow = rows[rows.length - 1];
        const inp = lastRow.querySelector('.employee-id-input');
        inp.value = ids[i];
        fetchEmployeeNameForRow(ids[i], lastRow);
    }
    updateConfirmButtonState();
}

function mergeIdsIntoForm(employeeIds) {
    const toMerge = dedupeEmployeeIds(employeeIds);
    const existing = new Set(
        [...document.querySelectorAll('.employee-id-input')]
            .map(i => i.value.trim())
            .filter(Boolean)
    );
    for (const id of toMerge) {
        if (existing.has(id)) continue;
        existing.add(id);
        const inputs = [...document.querySelectorAll('.employee-id-input')];
        const emptyInp = inputs.find(inp => !inp.value.trim());
        if (emptyInp) {
            emptyInp.value = id;
            fetchEmployeeNameForRow(id, emptyInp.closest('.employee-input-row'));
        } else {
            addEmployeeRow(true);
            const rows = document.querySelectorAll('.employee-input-row');
            const lastRow = rows[rows.length - 1];
            const inp = lastRow.querySelector('.employee-id-input');
            inp.value = id;
            fetchEmployeeNameForRow(id, lastRow);
        }
    }
    updateConfirmButtonState();
}

function applySelectedTemplate() {
    const sel = document.getElementById('ovtTemplateSelect');
    const mergeCb = document.getElementById('ovtTemplateMerge');
    const templateId = sel && sel.value;
    if (!templateId) {
        alert('Pilih template terlebih dahulu.');
        return;
    }
    const templates = loadTemplates();
    const t = templates.find(x => String(x.id) === String(templateId));
    if (!t) {
        alert('Template tidak ditemukan.');
        refreshTemplatesFromApi().catch(() => {});
        return;
    }
    const merge = mergeCb && mergeCb.checked;
    if (merge) {
        mergeIdsIntoForm(t.employeeIds);
    } else {
        fillRowsWithIds(t.employeeIds);
    }
}

function saveCurrentFormAsTemplatePrompt() {
    const ids = [...document.querySelectorAll('.employee-id-input')]
        .map(i => i.value.trim())
        .filter(Boolean);
    const unique = dedupeEmployeeIds(ids);
    if (unique.length === 0) {
        alert('Isi minimal satu Employee ID di form terlebih dahulu.');
        return;
    }
    const name = prompt('Nama template:', '');
    if (name === null) return;
    const trimmed = name.trim();
    if (!trimmed) {
        alert('Nama template tidak boleh kosong.');
        return;
    }
    fetch('/api/ovt/templates', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-username': currentUsername || ''
        },
        body: JSON.stringify({ name: trimmed, employeeIds: unique })
    })
        .then(r => r.json())
        .then(data => {
            if (data.success && data.data) {
                const sel = document.getElementById('ovtTemplateSelect');
                if (sel) sel.value = String(data.data.id);
                alert('Template disimpan.');
                return refreshTemplatesFromApi();
            }
            alert(data.message || 'Gagal menyimpan template');
        })
        .catch(() => alert('Terjadi kesalahan saat menyimpan template'));
}

function createEmptyTemplatePrompt() {
    const name = prompt('Nama template baru:', '');
    if (name === null) return;
    const trimmed = name.trim();
    if (!trimmed) {
        alert('Nama template tidak boleh kosong.');
        return;
    }
    fetch('/api/ovt/templates', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-username': currentUsername || ''
        },
        body: JSON.stringify({ name: trimmed, employeeIds: [] })
    })
        .then(r => r.json())
        .then(data => {
            if (data.success && data.data) {
                alert('Template kosong dibuat. Buka Kelola template lalu Edit untuk menambah ID.');
                return refreshTemplatesFromApi();
            }
            alert(data.message || 'Gagal membuat template');
        })
        .catch(() => alert('Terjadi kesalahan saat membuat template'));
}

function renderTemplateManageList() {
    const listEl = document.getElementById('templateManageList');
    const emptyEl = document.getElementById('templateManageEmpty');
    const templates = loadTemplates();
    if (!listEl) return;
    if (templates.length === 0) {
        listEl.innerHTML = '';
        if (emptyEl) emptyEl.style.display = 'block';
        return;
    }
    if (emptyEl) emptyEl.style.display = 'none';
    listEl.innerHTML = '';
    templates.forEach(t => {
        const item = document.createElement('div');
        item.className = 'template-manage-item';
        item.innerHTML = `
            <div class="template-manage-item-info">
                <div class="template-manage-name">${escapeHtml(t.name)}</div>
                <div class="template-manage-count">${t.employeeIds.length} Employee ID</div>
            </div>
            <div class="template-manage-item-actions"></div>
        `;
        const actions = item.querySelector('.template-manage-item-actions');
        const editBtn = document.createElement('button');
        editBtn.type = 'button';
        editBtn.className = 'btn-template-secondary';
        editBtn.textContent = 'Edit';
        editBtn.addEventListener('click', () => openEditTemplate(t.id));
        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'btn-remove-row';
        delBtn.textContent = 'Hapus';
        delBtn.addEventListener('click', () => deleteTemplateById(t.id));
        actions.appendChild(editBtn);
        actions.appendChild(delBtn);
        listEl.appendChild(item);
    });
}

function openManageTemplatesModal() {
    renderTemplateManageList();
    const modal = document.getElementById('templateManageModal');
    if (!modal) return;
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('show'), 10);
}

function closeTemplateManageModal() {
    const modal = document.getElementById('templateManageModal');
    if (!modal) return;
    modal.classList.remove('show');
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);
}

function deleteTemplateById(id) {
    if (!id || !confirm('Hapus template ini?')) return;
    fetch(`/api/ovt/templates/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { 'x-username': currentUsername || '' }
    })
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                const sel = document.getElementById('ovtTemplateSelect');
                if (sel && String(sel.value) === String(id)) sel.value = '';
                return refreshTemplatesFromApi();
            }
            alert(data.message || 'Gagal menghapus template');
        })
        .catch(() => alert('Terjadi kesalahan saat menghapus template'));
}

function renderTemplateEditIdsList() {
    const listEl = document.getElementById('templateEditIdsList');
    if (!listEl) return;
    const ids = templateEditBuffer.employeeIds;
    if (ids.length === 0) {
        listEl.innerHTML = '<p class="ovt-template-empty-inline">Belum ada ID. Tambahkan di bawah.</p>';
        return;
    }
    listEl.innerHTML = '';
    ids.forEach((empId) => {
        const row = document.createElement('div');
        row.className = 'template-edit-id-row';
        const displayName = getEmployeeNameLabel(empId);
        const nameBlock = displayName
            ? `<span class="template-edit-id-name">${escapeHtml(displayName)}</span>`
            : '<span class="template-edit-id-unknown">(tidak ada di data karyawan)</span>';
        row.innerHTML = `
            <div class="template-edit-id-info">
                <span class="template-edit-id-text">${escapeHtml(empId)}</span>
                ${nameBlock}
            </div>
            <button type="button" class="btn-remove-row" title="Hapus dari template">−</button>
        `;
        row.querySelector('button').addEventListener('click', () => {
            templateEditBuffer.employeeIds = templateEditBuffer.employeeIds.filter(e => e !== empId);
            renderTemplateEditIdsList();
        });
        listEl.appendChild(row);
    });
}

function openEditTemplate(id) {
    const templates = loadTemplates();
    const t = templates.find(x => String(x.id) === String(id));
    if (!t) {
        alert('Template tidak ditemukan.');
        return;
    }
    templateEditBuffer = {
        id: t.id,
        name: t.name,
        employeeIds: [...t.employeeIds]
    };
    const idField = document.getElementById('templateEditId');
    const nameField = document.getElementById('templateEditName');
    const newIdInp = document.getElementById('templateEditNewId');
    if (idField) idField.value = t.id;
    if (nameField) nameField.value = t.name;
    if (newIdInp) newIdInp.value = '';
    const manage = document.getElementById('templateManageModal');
    if (manage) {
        manage.classList.remove('show');
        manage.style.display = 'none';
    }
    const modal = document.getElementById('templateEditModal');
    if (!modal) return;
    loadEmployeeList()
        .then(() => {
            renderTemplateEditIdsList();
            modal.style.display = 'flex';
            setTimeout(() => modal.classList.add('show'), 10);
        })
        .catch(() => {
            renderTemplateEditIdsList();
            modal.style.display = 'flex';
            setTimeout(() => modal.classList.add('show'), 10);
        });
}

function closeTemplateEditModal() {
    const modal = document.getElementById('templateEditModal');
    if (!modal) return;
    modal.classList.remove('show');
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);
}

function addIdToEditingTemplate() {
    const inp = document.getElementById('templateEditNewId');
    if (!inp) return;
    const raw = inp.value.trim();
    if (!raw) {
        alert('Masukkan Employee ID.');
        return;
    }
    if (templateEditBuffer.employeeIds.includes(raw)) {
        alert('ID sudah ada di template.');
        return;
    }
    templateEditBuffer.employeeIds.push(raw);
    inp.value = '';
    renderTemplateEditIdsList();
}

function saveTemplateEdit() {
    const idField = document.getElementById('templateEditId');
    const nameField = document.getElementById('templateEditName');
    const id = idField && idField.value;
    const name = nameField && nameField.value.trim();
    if (!name) {
        alert('Nama template harus diisi.');
        return;
    }
    if (!id) {
        alert('ID template tidak valid.');
        return;
    }
    fetch(`/api/ovt/templates/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'x-username': currentUsername || ''
        },
        body: JSON.stringify({
            name,
            employeeIds: dedupeEmployeeIds(templateEditBuffer.employeeIds)
        })
    })
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                closeTemplateEditModal();
                alert('Template diperbarui.');
                return refreshTemplatesFromApi();
            }
            alert(data.message || 'Gagal memperbarui template');
        })
        .catch(() => alert('Terjadi kesalahan saat memperbarui template'));
}

document.addEventListener('DOMContentLoaded', function() {
    const editNewId = document.getElementById('templateEditNewId');
    if (editNewId) {
        editNewId.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                addIdToEditingTemplate();
            }
        });
    }
});


