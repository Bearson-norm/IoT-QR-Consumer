// Check if user is already logged in
document.addEventListener('DOMContentLoaded', function() {
    const savedToken = localStorage.getItem('scanner_token');
    const savedUsername = localStorage.getItem('scanner_username');
    
    if (savedToken && savedUsername) {
        // Verify token
        verifyToken(savedToken, savedUsername);
    } else {
        // Focus on username input
        document.getElementById('username').focus();
    }
});

// Handle Enter key in login form
document.getElementById('username').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        document.getElementById('password').focus();
    }
});

document.getElementById('password').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        handleLogin();
    }
});

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
            // Save to localStorage
            localStorage.setItem('scanner_token', data.token);
            localStorage.setItem('scanner_username', data.username);
            
            // Redirect to main scanner page
            window.location.href = '/';
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
            // Token valid, redirect to main page
            window.location.href = '/';
        } else {
            // Token invalid, clear storage
            localStorage.removeItem('scanner_token');
            localStorage.removeItem('scanner_username');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        localStorage.removeItem('scanner_token');
        localStorage.removeItem('scanner_username');
    });
}
