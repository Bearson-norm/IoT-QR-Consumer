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

function isAdminUser() {
    return currentUsername === 'admin';
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
                if (isAdminUser()) {
                    showEmployeeSection();
                    loadEmployeeList();
                } else {
                    showAccessDeniedSection();
                }
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
                if (isAdminUser()) {
                    showEmployeeSection();
                    loadEmployeeList();
                } else {
                    showAccessDeniedSection();
                }
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
    document.getElementById('accessDeniedSection').style.display = 'none';
    document.getElementById('username')?.focus();
}

function showAccessDeniedSection() {
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('employeeSection').style.display = 'none';
    document.getElementById('accessDeniedSection').style.display = 'block';
}

function showEmployeeSection() {
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('accessDeniedSection').style.display = 'none';
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

            if (status === 403) {
                formError.textContent = data.message || 'Hanya user admin yang dapat menambah karyawan';
                formError.style.display = 'block';
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

function openEditModal(employee) {
    document.getElementById('editEmployeeId').value = employee.employee_id;
    document.getElementById('editEmployeeName').value = employee.name;
    document.getElementById('editEmployeeDepartment').value = employee.department || '';
    document.getElementById('editEmployeeActive').checked = employee.is_active !== false;

    const editFormError = document.getElementById('editFormError');
    editFormError.style.display = 'none';
    editFormError.textContent = '';

    const modal = document.getElementById('editModal');
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('show'), 10);
    document.getElementById('editEmployeeName').focus();
}

function handleSubmitEdit(event) {
    event.preventDefault();

    if (!authToken) {
        showLoginSection();
        return;
    }

    const employee_id = document.getElementById('editEmployeeId').value.trim();
    const name = document.getElementById('editEmployeeName').value.trim();
    const department = document.getElementById('editEmployeeDepartment').value.trim();
    const is_active = document.getElementById('editEmployeeActive').checked;
    const editFormError = document.getElementById('editFormError');
    const editSubmitBtn = document.getElementById('editSubmitBtn');

    if (!name || !department) {
        editFormError.textContent = 'Nama dan departemen wajib diisi';
        editFormError.style.display = 'block';
        return;
    }

    editFormError.style.display = 'none';
    editSubmitBtn.disabled = true;
    editSubmitBtn.textContent = 'Menyimpan...';

    fetch(`/api/employee/${encodeURIComponent(employee_id)}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ name, department, is_active })
    })
        .then(response => response.json().then(data => ({ status: response.status, data })))
        .then(({ status, data }) => {
            if (status === 401) {
                handleLogout();
                return;
            }

            if (status === 403) {
                editFormError.textContent = data.message || 'Hanya user admin yang dapat mengubah karyawan';
                editFormError.style.display = 'block';
                return;
            }

            if (data.success) {
                closeModal('editModal');
                loadEmployeeList();
            } else {
                editFormError.textContent = data.message || 'Gagal memperbarui karyawan';
                editFormError.style.display = 'block';
            }
        })
        .catch(error => {
            console.error('Error:', error);
            editFormError.textContent = 'Terjadi kesalahan saat menyimpan data';
            editFormError.style.display = 'block';
        })
        .finally(() => {
            editSubmitBtn.disabled = false;
            editSubmitBtn.textContent = 'Simpan Perubahan';
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
    const emptyDiv = document.getElementById('employeeListEmpty');

    loading.style.display = 'block';
    errorDiv.style.display = 'none';
    table.style.display = 'none';
    emptyDiv.style.display = 'none';

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

function getFilteredEmployees() {
    const searchTerm = (document.getElementById('employeeSearchInput')?.value || '').trim().toLowerCase();
    const statusFilter = document.getElementById('employeeStatusFilter')?.value || 'all';

    return allEmployees.filter(emp => {
        const isActive = emp.is_active !== false;

        if (statusFilter === 'active' && !isActive) return false;
        if (statusFilter === 'inactive' && isActive) return false;

        if (!searchTerm) return true;

        const id = (emp.employee_id || '').toLowerCase();
        const name = (emp.name || '').toLowerCase();
        const dept = (emp.department || '').toLowerCase();
        return id.includes(searchTerm) || name.includes(searchTerm) || dept.includes(searchTerm);
    });
}

function groupEmployeesByDepartment(employees) {
    const groups = new Map();

    employees.forEach((emp) => {
        const dept = (emp.department || '').trim() || 'Belum diisi';
        if (!groups.has(dept)) {
            groups.set(dept, []);
        }
        groups.get(dept).push(emp);
    });

    return Array.from(groups.entries())
        .sort(([a], [b]) => a.localeCompare(b, 'id'))
        .map(([department, members]) => ({
            department,
            employees: members.sort((a, b) =>
                (a.employee_id || '').localeCompare(b.employee_id || '', 'id')
            )
        }));
}

function renderStatusBadge(isActive) {
    const cls = isActive ? 'active' : 'inactive';
    const label = isActive ? 'Aktif' : 'Nonaktif';
    return `<span class="status-badge ${cls}">${label}</span>`;
}

function filterEmployeeList() {
    const filtered = getFilteredEmployees();
    const groups = groupEmployeesByDepartment(filtered);
    const tbody = document.getElementById('employeeListBody');
    const table = document.getElementById('employeeListTable');
    const emptyDiv = document.getElementById('employeeListEmpty');

    tbody.innerHTML = '';

    groups.forEach(({ department, employees }) => {
        const headerRow = document.createElement('tr');
        headerRow.className = 'dept-group-header';
        headerRow.innerHTML = `<td colspan="4">${escapeHtml(department)} (${employees.length} karyawan)</td>`;
        tbody.appendChild(headerRow);

        employees.forEach((emp) => {
            const isActive = emp.is_active !== false;
            const row = document.createElement('tr');
            if (!isActive) {
                row.className = 'employee-row-inactive';
            }

            row.innerHTML = `
                <td>${escapeHtml(emp.employee_id)}</td>
                <td>${escapeHtml(emp.name)}</td>
                <td>${renderStatusBadge(isActive)}</td>
                <td><button type="button" class="btn-edit" data-employee-id="${escapeHtml(emp.employee_id)}">Edit</button></td>
            `;

            const editBtn = row.querySelector('.btn-edit');
            editBtn.addEventListener('click', () => openEditModal(emp));

            tbody.appendChild(row);
        });
    });

    const hasResults = filtered.length > 0;
    table.style.display = hasResults ? 'table' : 'none';
    emptyDiv.style.display = hasResults ? 'none' : 'block';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text == null ? '' : String(text);
    return div.innerHTML;
}
