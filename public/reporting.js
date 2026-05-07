// Pagination variables
let currentPage = 1;
let itemsPerPage = 10;
let totalItems = 0;
let allReportData = [];
let filteredReportData = [];
let reportDates = []; // Store dates separately to avoid re-fetching

// Load report on page load — anchor "hari ini" = tanggal operasional server (sama scan: reset 06:00 WIB)
document.addEventListener('DOMContentLoaded', function() {
    initReportDateRangeThenLoad();
});

/** YYYY-MM-DD + delta days (kalender tanggal string, tanpa DST). */
function addDaysYmd(ymd, deltaDays) {
    const part = String(ymd || '').split('T')[0].split(' ')[0];
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(part);
    if (!m) return part;
    const y = parseInt(m[1], 10);
    const mo = parseInt(m[2], 10) - 1;
    const d = parseInt(m[3], 10);
    const dt = new Date(Date.UTC(y, mo, d));
    if (isNaN(dt.getTime())) return part;
    dt.setUTCDate(dt.getUTCDate() + deltaDays);
    return dt.toISOString().slice(0, 10);
}

function fetchBusinessDateEnd() {
    return fetch('/api/business-date')
        .then((r) => r.json())
        .then((d) => {
            if (d.success && d.business_date) return d.business_date;
            return toYyyyMmDdLocal(new Date());
        })
        .catch(() => toYyyyMmDdLocal(new Date()));
}

function initReportDateRangeThenLoad() {
    fetchBusinessDateEnd().then((end) => {
        document.getElementById('endDate').value = end;
        document.getElementById('startDate').value = addDaysYmd(end, -6);
        loadReport();
    });
}

function toYyyyMmDdLocal(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function loadReport() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    const loadingDiv = document.getElementById('loading');
    const errorDiv = document.getElementById('error');
    const table = document.getElementById('reportTable');
    const tableHeader = document.getElementById('tableHeader');
    const tableBody = document.getElementById('tableBody');

    if (!startDate || !endDate) {
        showError('Mohon pilih range tanggal');
        return;
    }

    // Validate date range
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    if (diffDays > 30) {
        showError('Range tanggal maksimal 30 hari');
        return;
    }

    if (start > end) {
        showError('Tanggal mulai harus lebih kecil dari tanggal akhir');
        return;
    }

    // Show loading
    loadingDiv.style.display = 'block';
    errorDiv.style.display = 'none';
    table.style.display = 'none';

    // Fetch data with date range
    const url = `/api/report?start_date=${startDate}&end_date=${endDate}`;
    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                allReportData = data.data;
                reportDates = data.dates; // Store dates
                filteredReportData = data.data;
                totalItems = data.data.length;
                currentPage = 1;
                // Apply search filter if exists
                applySearchFilter();
                renderTable({ data: filteredReportData, dates: reportDates });
            } else {
                showError(data.message || 'Gagal memuat data laporan');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showError('Terjadi kesalahan saat memuat data');
        })
        .finally(() => {
            loadingDiv.style.display = 'none';
        });
}

function setDateRange(days) {
    fetchBusinessDateEnd().then((end) => {
        document.getElementById('endDate').value = end;
        document.getElementById('startDate').value = addDaysYmd(end, -(days - 1));
        loadReport();
    });
}

function renderTable(data) {
    const table = document.getElementById('reportTable');
    const tableHeader = document.getElementById('tableHeader');
    const tableBody = document.getElementById('tableBody');
    const paginationContainer = document.getElementById('paginationContainer');

    // Clear existing content
    tableHeader.innerHTML = '<th>Employee ID</th><th>Nama</th>';
    tableBody.innerHTML = '';

    // Add date columns to header
    data.dates.forEach(date => {
        const th = document.createElement('th');
        th.className = 'date-header';
        th.textContent = date;
        tableHeader.appendChild(th);
    });

    // Calculate pagination based on filtered data
    totalItems = filteredReportData.length;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
    const paginatedData = filteredReportData.slice(startIndex, endIndex);

    // Add data rows
    paginatedData.forEach(employee => {
        const row = document.createElement('tr');
        
        // Employee ID
        const idCell = document.createElement('td');
        idCell.textContent = employee.employee_id;
        row.appendChild(idCell);

        // Name
        const nameCell = document.createElement('td');
        nameCell.textContent = employee.name;
        row.appendChild(nameCell);

        // Date cells - show scan times instead of checkboxes
        data.dates.forEach(date => {
            const dateCell = document.createElement('td');
            dateCell.className = 'date-cell';
            
            const scanTimeGroup = document.createElement('div');
            scanTimeGroup.className = 'scan-time-group';

            const normalTime = employee.dates[date]?.normalTime || null;
            const overtimeTime = employee.dates[date]?.overtimeTime || null;

            // Normal scan time
            const normalDiv = document.createElement('div');
            normalDiv.className = 'scan-time-item';
            const normalLabel = document.createElement('span');
            normalLabel.className = 'scan-type-label normal-label';
            normalLabel.textContent = 'N';
            const normalValue = document.createElement('span');
            normalValue.className = 'scan-time-value';
            if (normalTime) {
                normalDiv.classList.add('scanned');
                normalValue.textContent = formatTimeOnly(normalTime);
            } else {
                normalDiv.classList.add('not-scanned');
                normalValue.textContent = '-';
            }
            normalDiv.appendChild(normalLabel);
            normalDiv.appendChild(normalValue);
            scanTimeGroup.appendChild(normalDiv);

            // Overtime scan time
            const overtimeDiv = document.createElement('div');
            overtimeDiv.className = 'scan-time-item';
            const overtimeLabel = document.createElement('span');
            overtimeLabel.className = 'scan-type-label overtime-label';
            overtimeLabel.textContent = 'OT';
            const overtimeValue = document.createElement('span');
            overtimeValue.className = 'scan-time-value';
            if (overtimeTime) {
                overtimeDiv.classList.add('scanned');
                overtimeValue.textContent = formatTimeOnly(overtimeTime);
            } else {
                overtimeDiv.classList.add('not-scanned');
                overtimeValue.textContent = '-';
            }
            overtimeDiv.appendChild(overtimeLabel);
            overtimeDiv.appendChild(overtimeValue);
            scanTimeGroup.appendChild(overtimeDiv);

            dateCell.appendChild(scanTimeGroup);
            row.appendChild(dateCell);
        });

        tableBody.appendChild(row);
    });

    // Show table
    table.style.display = 'table';
    
    // Update pagination
    updatePagination();
}

function updatePagination() {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
    
    // Update pagination info
    const paginationInfo = document.getElementById('paginationInfo');
    paginationInfo.textContent = `Menampilkan ${startIndex + 1} - ${endIndex} dari ${totalItems} karyawan`;
    
    // Show/hide pagination container
    const paginationContainer = document.getElementById('paginationContainer');
    if (totalItems > itemsPerPage) {
        paginationContainer.style.display = 'flex';
    } else {
        paginationContainer.style.display = 'none';
    }
    
    // Update pagination buttons
    const firstPageBtn = document.getElementById('firstPageBtn');
    const prevPageBtn = document.getElementById('prevPageBtn');
    const nextPageBtn = document.getElementById('nextPageBtn');
    const lastPageBtn = document.getElementById('lastPageBtn');
    
    firstPageBtn.disabled = currentPage === 1;
    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = currentPage === totalPages;
    lastPageBtn.disabled = currentPage === totalPages;
    
    // Update page numbers
    const pageNumbers = document.getElementById('pageNumbers');
    pageNumbers.innerHTML = '';
    
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage < maxVisiblePages - 1) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.className = 'pagination-btn';
        if (i === currentPage) {
            pageBtn.classList.add('active');
        }
        pageBtn.textContent = i;
        pageBtn.onclick = () => goToPage(i);
        pageNumbers.appendChild(pageBtn);
    }
}

function goToPage(page) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    if (page < 1 || page > totalPages) return;
    
    currentPage = page;
    
    // Re-render table with current filtered data (no need to re-fetch)
    if (allReportData.length > 0 && reportDates.length > 0) {
        // Just re-render with existing data, don't re-fetch
        renderTable({ data: filteredReportData, dates: reportDates });
        
        // Scroll to top of table
        document.querySelector('.report-table-container').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function goToPreviousPage() {
    if (currentPage > 1) {
        goToPage(currentPage - 1);
    }
}

function goToNextPage() {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    if (currentPage < totalPages) {
        goToPage(currentPage + 1);
    }
}

function goToLastPage() {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    goToPage(totalPages);
}

function showError(message) {
    const errorDiv = document.getElementById('error');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
}

// Format scan time for display (full date+time)
function formatScanTime(scanTime) {
    if (!scanTime) return '';
    
    try {
        const date = new Date(scanTime);
        if (isNaN(date.getTime())) return `Waktu Scan: ${scanTime}`;
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        
        return `Waktu Scan: ${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
    } catch (e) {
        return `Waktu Scan: ${scanTime}`;
    }
}

// Format scan time to show only HH:MM (time only for table cells)
function formatTimeOnly(scanTime) {
    if (!scanTime) return '-';
    
    try {
        const date = new Date(scanTime);
        if (isNaN(date.getTime())) {
            // Try parsing as string directly (e.g. "2026-03-02T10:30:00")
            const timePart = String(scanTime).match(/(\d{2}):(\d{2})/);
            if (timePart) return `${timePart[1]}:${timePart[2]}`;
            return '-';
        }
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
    } catch (e) {
        return '-';
    }
}

// Show tooltip
function showTooltip(event) {
    const element = event.currentTarget;
    const tooltipText = element.getAttribute('data-tooltip');
    
    if (!tooltipText) return;
    
    // Remove existing tooltip if any
    const existingTooltip = document.querySelector('.scan-time-tooltip');
    if (existingTooltip) {
        existingTooltip.remove();
    }
    
    // Create tooltip element
    const tooltip = document.createElement('div');
    tooltip.className = 'scan-time-tooltip';
    tooltip.textContent = tooltipText;
    document.body.appendChild(tooltip);
    
    // Get element position (using getBoundingClientRect for fixed positioning)
    const rect = element.getBoundingClientRect();
    
    // Calculate position (center above element)
    let left = rect.left + (rect.width / 2);
    let top = rect.top - 8;
    
    // Position tooltip initially
    tooltip.style.left = left + 'px';
    tooltip.style.top = top + 'px';
    
    // Adjust if tooltip goes off screen
    setTimeout(() => {
        const tooltipRect = tooltip.getBoundingClientRect();
        
        // Adjust horizontally
        if (tooltipRect.left < 10) {
            left = rect.left + 10;
        } else if (tooltipRect.right > window.innerWidth - 10) {
            left = window.innerWidth - tooltipRect.width - 10;
        } else {
            left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
        }
        
        // Adjust vertically
        if (tooltipRect.top < 10) {
            top = rect.bottom + 8;
        } else {
            top = rect.top - tooltipRect.height - 8;
        }
        
        tooltip.style.left = left + 'px';
        tooltip.style.top = top + 'px';
        
        // Show tooltip
        tooltip.classList.add('show');
    }, 10);
}

// Hide tooltip
function hideTooltip() {
    const tooltip = document.querySelector('.scan-time-tooltip');
    if (tooltip) {
        tooltip.classList.remove('show');
        setTimeout(() => {
            tooltip.remove();
        }, 200);
    }
}

// Filter table based on search input
function filterTable() {
    applySearchFilter();
    
    // Re-render table with filtered data
    if (allReportData.length > 0) {
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        
        const url = `/api/report?start_date=${startDate}&end_date=${endDate}`;
        fetch(url)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    allReportData = data.data;
                    reportDates = data.dates; // Store dates
                    applySearchFilter();
                    currentPage = 1; // Reset to first page
                    renderTable({ data: filteredReportData, dates: reportDates });
                }
            })
            .catch(error => {
                console.error('Error:', error);
            });
    }
}

// Apply search filter to allReportData
function applySearchFilter() {
    const searchInput = document.getElementById('searchInput');
    const searchTerm = searchInput ? searchInput.value.trim().toLowerCase() : '';
    const clearBtn = document.getElementById('clearSearchBtn');
    
    if (searchTerm === '') {
        filteredReportData = [...allReportData];
        if (clearBtn) clearBtn.style.display = 'none';
    } else {
        filteredReportData = allReportData.filter(employee => {
            const employeeId = (employee.employee_id || '').toLowerCase();
            const name = (employee.name || '').toLowerCase();
            return employeeId.includes(searchTerm) || name.includes(searchTerm);
        });
        if (clearBtn) clearBtn.style.display = 'inline-block';
    }
    
    totalItems = filteredReportData.length;
    currentPage = 1; // Reset to first page when filtering
}

// Clear search input
function clearSearch() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.value = '';
        applySearchFilter();
        
        // Re-render table
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        
        const url = `/api/report?start_date=${startDate}&end_date=${endDate}`;
        fetch(url)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    allReportData = data.data;
                    reportDates = data.dates; // Store dates
                    applySearchFilter();
                    renderTable({ data: filteredReportData, dates: reportDates });
                }
            })
            .catch(error => {
                console.error('Error:', error);
            });
    }
}

function downloadReport() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;

    if (!startDate || !endDate) {
        alert('Mohon pilih range tanggal terlebih dahulu');
        return;
    }

    // Validate date range
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    if (diffDays > 30) {
        alert('Range tanggal maksimal 30 hari');
        return;
    }

    if (start > end) {
        alert('Tanggal mulai harus lebih kecil dari tanggal akhir');
        return;
    }

    // Show loading indicator
    const downloadBtn = document.querySelector('.btn-download');
    const originalText = downloadBtn.textContent;
    downloadBtn.disabled = true;
    downloadBtn.textContent = 'Mengunduh...';

    // Download report based on selected date range
    const url = `/api/report/download?start_date=${startDate}&end_date=${endDate}`;
    
    // Create a temporary link and trigger download
    const link = document.createElement('a');
    link.href = url;
    link.download = `Laporan_Scan_${startDate}_${endDate}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Reset button after a short delay
    setTimeout(() => {
        downloadBtn.disabled = false;
        downloadBtn.textContent = originalText;
    }, 1000);
}

