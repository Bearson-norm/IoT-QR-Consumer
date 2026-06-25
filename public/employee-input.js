let authToken = null;
let currentUsername = null;
let allEmployees = [];

document.addEventListener('DOMContentLoaded', function() {
    const savedToken = localStorage.getItem('employee_token');
    const savedUsername = localStorage.getItem('employee_username');

    if (savedToken && savedUsername) {
        verifyToken(savedToken, savedUsername);
    } else {
        showLoginSection();
    }
});

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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                authToken = data.token;
                currentUsername = data.username;
                localStorage.setItem('employee_token', authToken);
                localStorage.setItem('employee_username', currentUsername);
                showEmployeeSection();
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                authToken = token;
                currentUsername = username;
                showEmployeeSection();
                loadEmployeeList();
            } else {
                localStorage.removeItem('employee_token');
                localStorage.removeItem('employee_username');
                showLoginSection();
            }
        })
        .catch(error => {
            console.error('Error:', error);
            localStorage.removeItem('employee_token');
            localStorage.removeItem('employee_username');
            showLoginSection();
        });
}

function handleLogout() {
    authToken = null;
    currentUsername = null;
    localStorage.removeItem('employee_token');
    localStorage.removeItem('employee_username');
    showLoginSection();
    resetForm();
}

function showLoginSection() {
    document.getElementById('loginSection').style.display = 'block';
    document.getElementById('employeeSection').style.display = 'none';
    document.getElementById('username')?.focus();
}

function showEmployeeSection() {
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('employeeSection').style.display = 'block';
    document.getElementById('loggedInUser').textContent = `Login sebagai: ${currentUsername}`;
    document.getElementById('employeeId')?.focus();
}

function resetForm() {
    document.getElementById('employeeForm')?.reset();
    const formError = document.getElementById('formError');
    if (formError) {
        formError.style.display = 'none';
        formError.textContent = '';
    }
}

function handleSubmitEmployee(event) {
    event.preventDefault();

    if (!authToken) {
        showLoginSection();
        return;
    }

    const employee_id = document.getElementById('employeeId').value.trim();
    const name = document.getElementById('employeeName').value.trim();
    const department = document.getElementById('employeeDepartment').value.trim();
    const formError = document.getElementById('formError');
    const submitBtn = document.getElementById('submitBtn');

    if (!employee_id || !name || !department) {
        formError.textContent = 'Employee ID, nama, dan departemen wajib diisi';
        formError.style.display = 'block';
        return;
    }

    formError.style.display = 'none';
    submitBtn.disabled = true;
    submitBtn.textContent = 'Menyimpan...';

    fetch('/api/employee', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ employee_id, name, department })
    })
        .then(response => response.json().then(data => ({ status: response.status, data })))
        .then(({ status, data }) => {
            if (status === 401) {
                handleLogout();
                return;
            }

            if (data.success) {
                showSuccessModal(data.employee);
                resetForm();
                loadEmployeeList();
            } else {
                formError.textContent = data.message || 'Gagal menambahkan karyawan';
                formError.style.display = 'block';
            }
        })
        .catch(error => {
            console.error('Error:', error);
            formError.textContent = 'Terjadi kesalahan saat menyimpan data';
            formError.style.display = 'block';
        })
        .finally(() => {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Simpan Karyawan';
        });
}

function showSuccessModal(employee) {
    const modal = document.getElementById('successModal');
    const successMessage = document.getElementById('successMessage');
    const successEmployeeInfo = document.getElementById('successEmployeeInfo');

    successMessage.textContent = 'Data karyawan telah disimpan.';
    successEmployeeInfo.innerHTML = `
        <p><strong>Employee ID:</strong> ${escapeHtml(employee.employee_id)}</p>
        <p><strong>Nama:</strong> ${escapeHtml(employee.name)}</p>
        <p><strong>Departemen:</strong> ${escapeHtml(employee.department)}</p>
    `;

    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('show'), 10);
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    }
}

function loadEmployeeList() {
    const loading = document.getElementById('employeeListLoading');
    const errorDiv = document.getElementById('employeeListError');
    const table = document.getElementById('employeeListTable');

    loading.style.display = 'block';
    errorDiv.style.display = 'none';
    table.style.display = 'none';

    fetch('/api/employee')
        .then(response => response.json())
        .then(data => {
            if (data.success && Array.isArray(data.data)) {
                allEmployees = data.data;
                filterEmployeeList();
            } else {
                throw new Error(data.message || 'Gagal memuat daftar karyawan');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            errorDiv.textContent = error.message || 'Gagal memuat daftar karyawan';
            errorDiv.style.display = 'block';
        })
        .finally(() => {
            loading.style.display = 'none';
        });
}

function filterEmployeeList() {
    const searchTerm = (document.getElementById('employeeSearchInput')?.value || '').trim().toLowerCase();
    const tbody = document.getElementById('employeeListBody');
    const table = document.getElementById('employeeListTable');

    const filtered = allEmployees.filter(emp => {
        if (!searchTerm) return true;
        const id = (emp.employee_id || '').toLowerCase();
        const name = (emp.name || '').toLowerCase();
        const dept = (emp.department || '').toLowerCase();
        return id.includes(searchTerm) || name.includes(searchTerm) || dept.includes(searchTerm);
    });

    tbody.innerHTML = '';

    filtered.forEach(emp => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${escapeHtml(emp.employee_id)}</td>
            <td>${escapeHtml(emp.name)}</td>
            <td>${escapeHtml(emp.department || '-')}</td>
        `;
        tbody.appendChild(row);
    });

    table.style.display = filtered.length > 0 ? 'table' : 'none';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text == null ? '' : String(text);
    return div.innerHTML;
}
