// Authentication variables
let authToken = null;
let currentUsername = null;

// Modal auto-close timer
let modalAutoCloseTimer = null;

// Text-to-Speech helpers
let cachedVoices = [];

function loadVoices() {
    if (!('speechSynthesis' in window)) return [];
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
        cachedVoices = voices;
    }
    return cachedVoices;
}

if ('speechSynthesis' in window) {
    // Ensure voices are loaded
    loadVoices();
    window.speechSynthesis.onvoiceschanged = () => {
        loadVoices();
    };
}

function selectVoice(lang = 'id-ID', genderHint = 'neutral') {
    const voices = loadVoices();
    if (!voices || voices.length === 0) return null;

    // Prefer Indonesian voices
    let candidates = voices.filter(v => v.lang && v.lang.toLowerCase().startsWith(lang.toLowerCase()));

    // If no Indonesian voice, fall back to all
    if (candidates.length === 0) {
        candidates = voices;
    }

    if (genderHint === 'male') {
        // Try to find a voice that looks like male by name
        const maleKeywords = ['male', 'laki', 'id-id', 'google bahasa indonesia', 'indo'];
        const maleVoice = candidates.find(v => {
            const name = (v.name || '').toLowerCase();
            return maleKeywords.some(k => name.includes(k));
        });
        if (maleVoice) return maleVoice;
    }

    // Neutral / default: pick first candidate
    return candidates[0] || null;
}

// Text-to-Speech function
function playSound(text, lang = 'id-ID', genderHint = 'neutral') {
    if ('speechSynthesis' in window) {
        // Cancel any ongoing speech
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        utterance.rate = 1.0; // Normal speed
        utterance.pitch = genderHint === 'male' ? 0.85 : 1.0;
        utterance.volume = 1.0; // Full volume

        const voice = selectVoice(lang, genderHint);
        if (voice) {
            utterance.voice = voice;
        }
        
        window.speechSynthesis.speak(utterance);
    } else {
        console.warn('Speech synthesis not supported in this browser');
    }
}

// Check if user is already logged in on page load
document.addEventListener('DOMContentLoaded', function() {
    const savedToken = localStorage.getItem('scanner_token');
    const savedUsername = localStorage.getItem('scanner_username');
    
    if (savedToken && savedUsername) {
        // Verify token
        verifyToken(savedToken, savedUsername);
    } else {
        showLoginSection();
    }
});

// Handle Enter key in login form
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');

if (usernameInput) {
    usernameInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            passwordInput.focus();
        }
    });
}

if (passwordInput) {
    passwordInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleLogin();
        }
    });
}

// Handle Enter key in employee ID input field
const employeeIdInput = document.getElementById('employeeId');
if (employeeIdInput) {
    employeeIdInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            processScan();
        }
    });
}

// Login functions
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
            localStorage.setItem('scanner_token', authToken);
            localStorage.setItem('scanner_username', currentUsername);
            
            showScannerSection();
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
            showScannerSection();
        } else {
            localStorage.removeItem('scanner_token');
            localStorage.removeItem('scanner_username');
            showLoginSection();
        }
    })
    .catch(error => {
        console.error('Error:', error);
        localStorage.removeItem('scanner_token');
        localStorage.removeItem('scanner_username');
        showLoginSection();
    });
}

function handleLogout() {
    authToken = null;
    currentUsername = null;
    localStorage.removeItem('scanner_token');
    localStorage.removeItem('scanner_username');
    showLoginSection();
    
    // Clear employee ID input
    if (employeeIdInput) {
        employeeIdInput.value = '';
    }
}

function showLoginSection() {
    const loginSection = document.getElementById('loginSection');
    const scannerSection = document.getElementById('scannerSection');
    const ovtCard = document.getElementById('ovtTodayCard');
    
    if (loginSection) loginSection.style.display = 'block';
    if (scannerSection) scannerSection.style.display = 'none';
    if (ovtCard) ovtCard.style.display = 'none';
    
    // Focus on username input
    if (usernameInput) {
        setTimeout(() => usernameInput.focus(), 100);
    }
}

function showScannerSection() {
    const loginSection = document.getElementById('loginSection');
    const scannerSection = document.getElementById('scannerSection');
    const ovtCard = document.getElementById('ovtTodayCard');
    const dashboardStats = document.getElementById('dashboardStats');
    const dateDisplay = document.getElementById('dateDisplay');
    
    if (loginSection) loginSection.style.display = 'none';
    if (scannerSection) scannerSection.style.display = 'block';
    if (ovtCard) ovtCard.style.display = 'block';
    if (dashboardStats) dashboardStats.style.display = 'grid';
    if (dateDisplay) dateDisplay.style.display = 'block';
    
    // Update logged in user display
    const loggedInUser = document.getElementById('loggedInUser');
    if (loggedInUser) {
        loggedInUser.textContent = `Login sebagai: ${currentUsername}`;
    }
    
    // Update date display
    updateDateDisplay();
    
    // Load OVT list
    loadOvtTodayList();
    
    // Load dashboard statistics
    loadDashboardStats();
    
    // Focus on employee ID input - use longer timeout to ensure DOM is ready
    if (employeeIdInput) {
        setTimeout(() => {
            employeeIdInput.focus();
            // Also select any existing text for easy replacement
            employeeIdInput.select();
        }, 200);
    }
}

// Update date display with current day and date
function updateDateDisplay() {
    const now = new Date();
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
                    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    
    const dayName = days[now.getDay()];
    const day = now.getDate();
    const month = months[now.getMonth()];
    const year = now.getFullYear();
    
    const currentDayEl = document.getElementById('currentDay');
    const currentDateEl = document.getElementById('currentDate');
    
    if (currentDayEl) {
        currentDayEl.textContent = dayName;
    }
    if (currentDateEl) {
        currentDateEl.textContent = `${day} ${month} ${year}`;
    }
}

// Decide which sound to play based on scan result
function speakScanResult(data) {
    const name = data && data.employee && data.employee.name ? data.employee.name : 'karyawan';

    if (data.success && data.scan_type === 'normal') {
        // 1. Berhasil scan normal
        playSound(`Selamat makan ${name}, selamat menikmati, silakan mengantri`, 'id-ID', 'neutral');
    } else if (data.success && (data.scan_type === 'overtime' || data.code === 'OVT_SUCCESS' || data.has_overtime)) {
        // 2. Berhasil scan / input overtime
        playSound(`Selamat makan ${name}, semangat lemburnya, silakan mengantri`, 'id-ID', 'neutral');
    } else if (!data.success && data.code === 'OVT_NOT_REGISTERED') {
        // 3. Gagal scan overtime karena belum terdaftar
        playSound(`Maaf ${name}, anda belum terdaftar di penjadwalan lembur. Hubungi atasan anda terlebih dahulu`, 'id-ID', 'male');
    } else if (!data.success && data.code === 'OVT_ALREADY_SCANNED') {
        // 4. Sudah scan makan overtime sebelumnya
        playSound(`Anda sudah scan makan overtime wahai ${name}, silakan kembali besok`, 'id-ID', 'male');
    } else {
        // Default rejection
        playSound('Scan ditolak, hubungi atasan untuk input jadwal makan overtime', 'id-ID', 'male');
    }
}

function processScan() {
    // Check if user is logged in
    if (!authToken) {
        handleLogout();
        return;
    }
    
    const employeeId = document.getElementById('employeeId').value.trim();
    
    if (!employeeId) {
        alert('Mohon masukkan Employee ID');
        return;
    }

    // Disable button during processing
    const scanBtn = document.getElementById('scanBtn');
    scanBtn.disabled = true;
    scanBtn.textContent = 'Memproses...';

    // Call API
    fetch('/api/scan', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ employee_id: employeeId })
    })
    .then(async response => {
        let data;
        try {
            data = await response.json();
        } catch (e) {
            // If JSON parsing fails
            data = {
                success: false,
                message: 'Terjadi kesalahan saat memproses scan'
            };
        }
        
        // Main sound logic
        speakScanResult(data);

        if (data.success) {
            showSuccessModal(data);
        } else {
            showRejectionModal(data);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        playSound('Scan ditolak, hubungi atasan untuk input jadwal makan overtime', 'id-ID', 'male');
        alert('Terjadi kesalahan saat memproses scan');
    })
    .finally(() => {
        // Re-enable button
        scanBtn.disabled = false;
        scanBtn.textContent = 'Scan';
        // Clear input
        document.getElementById('employeeId').value = '';
        document.getElementById('employeeId').focus();
    });
}

function showSuccessModal(data) {
    const modal = document.getElementById('successModal');
    const messageDiv = document.getElementById('successMessage');
    const employeeInfoDiv = document.getElementById('successEmployeeInfo');

    // Clear any existing timer
    if (modalAutoCloseTimer) {
        clearTimeout(modalAutoCloseTimer);
        modalAutoCloseTimer = null;
    }

    messageDiv.innerHTML = `<p style="font-size: 1.05em; color: #4caf50; font-weight: 600; margin-bottom: 8px;">${data.message}</p>`;
    
    if (data.employee) {
        const scanType = data.scan_type ? data.scan_type.toUpperCase() : 'NORMAL';
        const scanCount = data.scan_count || (data.scan_type === 'overtime' ? 2 : 1);
        
        employeeInfoDiv.innerHTML = `
            <div class="employee-info">
                <strong>Employee ID:</strong> ${data.employee.employee_id}
                <strong>Nama:</strong> ${data.employee.name}
                <strong>Tipe Scan:</strong> ${scanType}
                <strong>Jumlah Scan Hari Ini:</strong> ${scanCount}/2
            </div>
        `;
    }

    // Show modal with animation
    modal.style.display = 'flex';
    // Trigger animation by adding class after a small delay
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
    
    // Auto-close modal after 5 seconds
    modalAutoCloseTimer = setTimeout(() => {
        closeModal('successModal');
        modalAutoCloseTimer = null;
    }, 5000);
}

function showRejectionModal(data) {
    const modal = document.getElementById('rejectionModal');
    const messageDiv = document.getElementById('rejectionMessage');
    const employeeInfoDiv = document.getElementById('rejectionEmployeeInfo');

    // Clear any existing timer
    if (modalAutoCloseTimer) {
        clearTimeout(modalAutoCloseTimer);
        modalAutoCloseTimer = null;
    }

    messageDiv.innerHTML = `<p style="font-size: 1.2em; color: #f44336; font-weight: 600;">${data.message}</p>`;
    
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
    
    // Auto-close modal after 5 seconds
    modalAutoCloseTimer = setTimeout(() => {
        closeModal('rejectionModal');
        modalAutoCloseTimer = null;
    }, 5000);
}

function closeModal(modalId) {
    // Clear auto-close timer if modal is closed manually
    if (modalAutoCloseTimer) {
        clearTimeout(modalAutoCloseTimer);
        modalAutoCloseTimer = null;
    }
    
    const modal = document.getElementById(modalId);
    if (modal) {
        // Remove show class for animation
        modal.classList.remove('show');
        // Hide modal after animation
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    }
    
    // Focus back on employee ID input after closing modal
    if (employeeIdInput) {
        setTimeout(() => employeeIdInput.focus(), 350);
    }
}

// Close modal when clicking outside
window.onclick = function(event) {
    const successModal = document.getElementById('successModal');
    const rejectionModal = document.getElementById('rejectionModal');
    
    if (event.target === successModal) {
        closeModal('successModal');
    }
    if (event.target === rejectionModal) {
        closeModal('rejectionModal');
    }
}

// Store original OVT list data for filtering
let originalOvtListData = [];

// Load OVT Today List
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

// Render OVT List
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
        
        html += `
            <div class="ovt-item">
                <div class="ovt-item-header">
                    <div>
                        <div class="ovt-employee-name">${item.name}</div>
                        <div class="ovt-employee-id">${item.employee_id}</div>
                    </div>
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

// Filter OVT List based on search
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

// Setup OVT search input listener
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
                this.blur();
            }
        });
    }
}

// Refresh OVT List
function refreshOvtList() {
    loadOvtTodayList();
    // Clear search input
    const searchInput = document.getElementById('ovtSearchInput');
    if (searchInput) {
        searchInput.value = '';
    }
}

// Load Dashboard Statistics
function loadDashboardStats() {
    fetch('/api/scan/stats')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const normalCountEl = document.getElementById('normalScanCount');
                const overtimeCountEl = document.getElementById('overtimeScanCount');
                
                if (normalCountEl) {
                    normalCountEl.textContent = data.data.normal || 0;
                }
                if (overtimeCountEl) {
                    overtimeCountEl.textContent = data.data.overtime || 0;
                }
            }
        })
        .catch(error => {
            console.error('Error loading dashboard stats:', error);
        });
}

// Refresh OVT list after successful scan
const originalShowSuccessModal = showSuccessModal;
showSuccessModal = function(data) {
    originalShowSuccessModal(data);
    // Refresh OVT list if it's an overtime scan
    if (data.scan_type === 'overtime' || data.code === 'OVT_SUCCESS') {
        setTimeout(() => {
            loadOvtTodayList();
        }, 500);
    }
    // Refresh dashboard statistics after successful scan
    setTimeout(() => {
        loadDashboardStats();
    }, 500);
};
