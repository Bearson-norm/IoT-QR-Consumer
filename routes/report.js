const express = require('express');
const router = express.Router();
const { getDB } = require('../database');
const XLSX = require('xlsx');
const { getIndonesiaDateString } = require('../utils/timezone');

/** Calendar YYYY-MM-DD from DB value (pg DATE → JS Date via local calendar; avoid toISOString day shift). */
function pgDateToYyyyMmDd(scanDate) {
  if (scanDate == null) return null;
  if (typeof scanDate === 'string') {
    const m = scanDate.match(/^(\d{4}-\d{2}-\d{2})/);
    return m ? m[1] : scanDate.split('T')[0].split(' ')[0];
  }
  if (scanDate instanceof Date) {
    if (isNaN(scanDate.getTime())) return null;
    const y = scanDate.getFullYear();
    const mo = String(scanDate.getMonth() + 1).padStart(2, '0');
    const d = String(scanDate.getDate()).padStart(2, '0');
    return `${y}-${mo}-${d}`;
  }
  const s = String(scanDate);
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : s.split('T')[0].split(' ')[0];
}

/** Inclusive list of calendar days as YYYY-MM-DD (UTC calendar, matches pg DATE). */
function enumerateIsoDatesInclusive(startYmd, endYmd) {
  const dates = [];
  const start = new Date(`${startYmd}T00:00:00.000Z`);
  const end = new Date(`${endYmd}T00:00:00.000Z`);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
    return dates;
  }
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}

/** Last N calendar days ending at endYmd (inclusive), oldest first. */
function enumerateLastNDaysIso(endYmd, n) {
  const end = new Date(`${endYmd}T00:00:00.000Z`);
  if (isNaN(end.getTime()) || n < 1) return [];
  const dates = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setUTCDate(d.getUTCDate() - i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}

// Get reporting data
router.get('/', (req, res) => {
  try {
    const db = getDB();
    
    if (!db) {
      return res.status(500).json({ 
        success: false, 
        message: 'Database connection not available' 
      });
    }

    // Get all employees
    db.all('SELECT employee_id, name FROM employee_data ORDER BY employee_id', [], (err, employees) => {
      if (err) {
        console.error('Error fetching employees:', err);
        return res.status(500).json({ 
          success: false, 
          message: 'Database error: ' + (err.message || 'Unknown error')
        });
      }
      
      // Ensure employees is an array
      if (!Array.isArray(employees)) {
        employees = [];
      }

      // Get date range from query params
      let dates = [];
      const startDate = req.query.start_date;
      const endDate = req.query.end_date;
      const days = parseInt(req.query.days);

      if (startDate && endDate) {
        // Use date range (calendar days, no local TZ shift)
        const start = new Date(`${startDate}T00:00:00.000Z`);
        const end = new Date(`${endDate}T00:00:00.000Z`);
        
        // Validate date range (max 30 days)
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        
        if (diffDays > 30) {
          return res.status(400).json({
            success: false,
            message: 'Range tanggal maksimal 30 hari'
          });
        }

        dates = enumerateIsoDatesInclusive(startDate, endDate);
      } else if (days) {
        // Use days parameter (backward compatibility)
        dates = enumerateLastNDaysIso(getIndonesiaDateString(), days);
      } else {
        // Default to last 7 days
        dates = enumerateLastNDaysIso(getIndonesiaDateString(), 7);
      }

      // If no dates, return empty result
      if (dates.length === 0) {
        return res.json({
          success: true,
          data: employees.map(emp => ({
            employee_id: emp.employee_id,
            name: emp.name,
            dates: {}
          })),
          dates: []
        });
      }

      // Get all scan records for the date range
      // For PostgreSQL, use ANY(array) instead of IN with multiple placeholders
      db.all(
        `SELECT employee_id, scan_date, scan_type, scan_time 
         FROM scan_records 
         WHERE scan_date = ANY($1::date[])
         ORDER BY employee_id, scan_date, scan_time`,
        [dates],
      (err, scans) => {
        if (err) {
          console.error('Error fetching scan records:', err);
          return res.status(500).json({ 
            success: false, 
            message: 'Database error: ' + (err.message || 'Unknown error')
          });
        }

        // Organize scans by employee and date with scan times
        const scanMap = {};
        scans.forEach(scan => {
          const scanDate = pgDateToYyyyMmDd(scan.scan_date);
          if (!scanDate || !/^\d{4}-\d{2}-\d{2}$/.test(scanDate)) {
            if (scan.scan_date != null) {
              console.warn('Invalid scan_date format:', scan.scan_date, '->', scanDate);
            }
            return;
          }

          if (!scanMap[scan.employee_id]) {
            scanMap[scan.employee_id] = {};
          }
          if (!scanMap[scan.employee_id][scanDate]) {
            scanMap[scan.employee_id][scanDate] = {
              normal: null,
              overtime: null
            };
          }
          if (scan.scan_type === 'normal') {
            scanMap[scan.employee_id][scanDate].normal = scan.scan_time;
          } else if (scan.scan_type === 'overtime') {
            scanMap[scan.employee_id][scanDate].overtime = scan.scan_time;
          }
        });
        
        // Debug logging
        console.log('Total scans found:', scans.length);
        if (Object.keys(scanMap).length > 0) {
          const firstEmp = Object.keys(scanMap)[0];
          console.log('Sample scan map for', firstEmp + ':', JSON.stringify(scanMap[firstEmp], null, 2));
        }
        console.log('Dates array (first 3):', dates.slice(0, 3));

        // Build report data
        const reportData = employees.map(emp => {
          const row = {
            employee_id: emp.employee_id,
            name: emp.name,
            dates: {}
          };

          dates.forEach(date => {
            const dateFormatted = formatDate(date);
            // Ensure date is in YYYY-MM-DD format for matching
            const dateKey = date.split('T')[0] || date.split(' ')[0] || date;
            
            if (scanMap[emp.employee_id] && scanMap[emp.employee_id][dateKey]) {
              const dayScans = scanMap[emp.employee_id][dateKey];
              row.dates[dateFormatted] = {
                normal: dayScans.normal !== null,
                overtime: dayScans.overtime !== null,
                normalTime: dayScans.normal,
                overtimeTime: dayScans.overtime
              };
            } else {
              row.dates[dateFormatted] = {
                normal: false,
                overtime: false,
                normalTime: null,
                overtimeTime: null
              };
            }
          });

          return row;
        });

        res.json({
          success: true,
          data: reportData,
          dates: dates.map(d => formatDate(d))
        });
      }
    );
    });
  } catch (error) {
    console.error('Unexpected error in report route:', error);
    res.status(500).json({
      success: false,
      message: 'Unexpected error: ' + (error.message || 'Unknown error')
    });
  }
});

// Download report as Excel
router.get('/download', (req, res) => {
  try {
    const db = getDB();
    
    if (!db) {
      return res.status(500).json({
        success: false,
        message: 'Database connection not available'
      });
    }

    // Get all employees
    db.all('SELECT employee_id, name FROM employee_data ORDER BY employee_id', [], (err, employees) => {
      if (err) {
        console.error('Error fetching employees:', err);
        return res.status(500).json({
          success: false,
          message: 'Database error: ' + (err.message || 'Unknown error')
        });
      }
      
      // Ensure employees is an array
      if (!Array.isArray(employees)) {
        employees = [];
      }

    // Get date range from query params
    let dates = [];
    const startDate = req.query.start_date;
    const endDate = req.query.end_date;
    const days = parseInt(req.query.days);

    if (startDate && endDate) {
      // Use date range (calendar days)
      const start = new Date(`${startDate}T00:00:00.000Z`);
      const end = new Date(`${endDate}T00:00:00.000Z`);
      
      // Validate date range (max 30 days)
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      
      if (diffDays > 30) {
        return res.status(400).json({
          success: false,
          message: 'Range tanggal maksimal 30 hari'
        });
      }

      dates = enumerateIsoDatesInclusive(startDate, endDate);
    } else if (days) {
      dates = enumerateLastNDaysIso(getIndonesiaDateString(), days);
    } else {
      dates = enumerateLastNDaysIso(getIndonesiaDateString(), 7);
    }

    // Get all scan records
    // For PostgreSQL, use ANY(array) instead of IN with multiple placeholders
    db.all(
      `SELECT employee_id, scan_date, scan_type, scan_time 
       FROM scan_records 
       WHERE scan_date = ANY($1::date[])
       ORDER BY employee_id, scan_date, scan_time`,
      [dates],
      (err, scans) => {
        if (err) {
          console.error('Error fetching scan records:', err);
          return res.status(500).json({
            success: false,
            message: 'Database error: ' + (err.message || 'Unknown error')
          });
        }

        // Organize scans by employee and date with scan times
        const scanMap = {};
        scans.forEach(scan => {
          const scanDate = pgDateToYyyyMmDd(scan.scan_date);
          if (!scanDate || !/^\d{4}-\d{2}-\d{2}$/.test(scanDate)) {
            if (scan.scan_date != null) {
              console.warn('Invalid scan_date format:', scan.scan_date, '->', scanDate);
            }
            return;
          }

          if (!scanMap[scan.employee_id]) {
            scanMap[scan.employee_id] = {};
          }
          if (!scanMap[scan.employee_id][scanDate]) {
            scanMap[scan.employee_id][scanDate] = {
              normal: null,
              overtime: null
            };
          }
          if (scan.scan_type === 'normal') {
            scanMap[scan.employee_id][scanDate].normal = scan.scan_time;
          } else if (scan.scan_type === 'overtime') {
            scanMap[scan.employee_id][scanDate].overtime = scan.scan_time;
          }
        });

        // Build Excel data
        const excelData = [];
        
        // Header row
        const header = ['Employee ID', 'Nama'];
        dates.forEach(date => {
          const dateFormatted = formatDate(date);
          header.push(`${dateFormatted} - Normal`);
          header.push(`${dateFormatted} - Overtime`);
        });
        excelData.push(header);

        // Data rows - show scan times instead of just 1/empty
        employees.forEach(emp => {
          const row = [emp.employee_id, emp.name];
          dates.forEach(date => {
            const dateFormatted = formatDate(date);
            // Ensure date is in YYYY-MM-DD format for matching
            const dateKey = date.split('T')[0] || date.split(' ')[0] || date;
            
            if (scanMap[emp.employee_id] && scanMap[emp.employee_id][dateKey]) {
              const dayScans = scanMap[emp.employee_id][dateKey];
              row.push(dayScans.normal !== null ? formatScanTimeForExcel(dayScans.normal) : '-');
              row.push(dayScans.overtime !== null ? formatScanTimeForExcel(dayScans.overtime) : '-');
            } else {
              row.push('-');
              row.push('-');
            }
          });
          excelData.push(row);
        });

        // Create workbook
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(excelData);

        // Set column widths
        const colWidths = [{ wch: 15 }, { wch: 25 }];
        dates.forEach(() => {
          colWidths.push({ wch: 15 }, { wch: 15 });
        });
        ws['!cols'] = colWidths;

        // Add worksheet to workbook
        XLSX.utils.book_append_sheet(wb, ws, 'Laporan Scan');

        // Generate buffer
        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

        // Set response headers
        const filename = startDate && endDate 
          ? `Laporan_Scan_${startDate}_${endDate}.xlsx`
          : `Laporan_Scan_${new Date().toISOString().split('T')[0]}.xlsx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        // Send file
        res.send(buffer);
      }
    );
    });
  } catch (error) {
    console.error('Unexpected error in report download route:', error);
    res.status(500).json({
      success: false,
      message: 'Unexpected error: ' + (error.message || 'Unknown error')
    });
  }
});

// Format date from YYYY-MM-DD to DD/MM/YY (calendar only; no timezone shift)
function formatDate(dateString) {
  const part = String(dateString || '').split('T')[0].split(' ')[0];
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(part);
  if (!match) return part;
  const [, y, m, d] = match;
  return `${d}/${m}/${y.slice(-2)}`;
}

// Format scan time for Excel (show HH:MM)
function formatScanTimeForExcel(scanTime) {
  if (!scanTime) return '-';
  
  try {
    const date = new Date(scanTime);
    if (isNaN(date.getTime())) {
      // Try to extract time from string directly
      const timePart = String(scanTime).match(/(\d{2}):(\d{2})/);
      if (timePart) return `${timePart[1]}:${timePart[2]}`;
      return String(scanTime);
    }
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  } catch (e) {
    return String(scanTime);
  }
}

module.exports = router;

