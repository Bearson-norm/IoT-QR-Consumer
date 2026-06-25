const express = require('express');
const router = express.Router();
const { getDB } = require('../database');
const XLSX = require('xlsx');
const {
  getIndonesiaBusinessDateString,
  addCalendarDaysYmd,
  overtimeFulfillsPermissionDate
} = require('../utils/timezone');

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

/** Parse report date range from query; returns { dates } or { error }. */
function parseReportDateRange(req) {
  let dates = [];
  const startDate = req.query.start_date;
  const endDate = req.query.end_date;
  const days = parseInt(req.query.days, 10);

  if (startDate && endDate) {
    const start = new Date(`${startDate}T00:00:00.000Z`);
    const end = new Date(`${endDate}T00:00:00.000Z`);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    if (diffDays > 30) {
      return { error: 'Range tanggal maksimal 30 hari' };
    }

    dates = enumerateIsoDatesInclusive(startDate, endDate);
  } else if (days) {
    dates = enumerateLastNDaysIso(getIndonesiaBusinessDateString(), days);
  } else {
    dates = enumerateLastNDaysIso(getIndonesiaBusinessDateString(), 7);
  }

  return { dates, startDate, endDate };
}

/** Include D-1 for each report date so early-morning OT scans can fulfill permission on D. */
function expandDatesForOvertimeQuery(dates) {
  const set = new Set(dates);
  dates.forEach((d) => set.add(addCalendarDaysYmd(d, -1)));
  return [...set];
}

function buildScanMap(scans) {
  const scanMap = {};
  (scans || []).forEach((scan) => {
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
  return scanMap;
}

function buildPermMap(permissions) {
  const permMap = {};
  (permissions || []).forEach((p) => {
    const dateKey = pgDateToYyyyMmDd(p.permission_date);
    if (!dateKey) return;
    if (!permMap[p.employee_id]) {
      permMap[p.employee_id] = {};
    }
    permMap[p.employee_id][dateKey] = true;
  });
  return permMap;
}

function buildOvertimeScansByEmployee(otScans) {
  const map = {};
  (otScans || []).forEach((s) => {
    const scanDate = pgDateToYyyyMmDd(s.scan_date);
    if (!scanDate) return;
    if (!map[s.employee_id]) {
      map[s.employee_id] = [];
    }
    map[s.employee_id].push({
      scan_date: scanDate,
      scan_time: s.scan_time
    });
  });
  return map;
}

function resolveOvertimeCell(permissionYmd, hasPermission, employeeOtScans) {
  if (!hasPermission) {
    return { display: '-', overtimeTime: null, status: 'no_permission' };
  }
  const match = (employeeOtScans || []).find((s) =>
    overtimeFulfillsPermissionDate(permissionYmd, s.scan_date, s.scan_time)
  );
  if (match) {
    return {
      display: formatScanTimeForExcel(match.scan_time),
      overtimeTime: match.scan_time,
      status: 'scanned'
    };
  }
  return { display: 'TSL', overtimeTime: null, status: 'missed_scan' };
}

function buildDayCell(scanMap, permMap, otScansByEmp, employeeId, dateKey) {
  const dayScans = (scanMap[employeeId] && scanMap[employeeId][dateKey]) || {
    normal: null,
    overtime: null
  };
  const hasPermission = !!(permMap[employeeId] && permMap[employeeId][dateKey]);
  const employeeOtScans = otScansByEmp[employeeId] || [];
  const otCell = resolveOvertimeCell(dateKey, hasPermission, employeeOtScans);

  return {
    normal: dayScans.normal !== null,
    overtime: otCell.status === 'scanned',
    normalTime: dayScans.normal,
    overtimeTime: otCell.overtimeTime,
    hasOvtPermission: hasPermission,
    overtimeDisplay: otCell.display,
    overtimeStatus: otCell.status
  };
}

function fetchReportContext(db, dates, callback) {
  const otDates = expandDatesForOvertimeQuery(dates);

  db.all(
    `SELECT employee_id, scan_date, scan_type, scan_time
     FROM scan_records
     WHERE scan_date = ANY($1::date[])
     ORDER BY employee_id, scan_date, scan_time`,
    [dates],
    (err, scans) => {
      if (err) {
        callback(err);
        return;
      }

      db.all(
        `SELECT employee_id, permission_date
         FROM ovt_permissions
         WHERE permission_date = ANY($1::date[])`,
        [dates],
        (err2, permissions) => {
          if (err2) {
            callback(err2);
            return;
          }

          db.all(
            `SELECT employee_id, scan_date, scan_time
             FROM scan_records
             WHERE scan_type = 'overtime'
               AND scan_date = ANY($1::date[])
             ORDER BY employee_id, scan_date, scan_time`,
            [otDates],
            (err3, otScans) => {
              if (err3) {
                callback(err3);
                return;
              }

              callback(null, {
                scanMap: buildScanMap(scans),
                permMap: buildPermMap(permissions),
                otScansByEmp: buildOvertimeScansByEmployee(otScans)
              });
            }
          );
        }
      );
    }
  );
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
    db.all('SELECT employee_id, name, department FROM employee_data ORDER BY employee_id', [], (err, employees) => {
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

      const range = parseReportDateRange(req);
      if (range.error) {
        return res.status(400).json({
          success: false,
          message: range.error
        });
      }
      const { dates } = range;

      if (dates.length === 0) {
        return res.json({
          success: true,
          data: employees.map((emp) => ({
            employee_id: emp.employee_id,
            name: emp.name,
            department: emp.department,
            dates: {}
          })),
          dates: []
        });
      }

      fetchReportContext(db, dates, (err, ctx) => {
        if (err) {
          console.error('Error fetching report data:', err);
          return res.status(500).json({
            success: false,
            message: 'Database error: ' + (err.message || 'Unknown error')
          });
        }

        const { scanMap, permMap, otScansByEmp } = ctx;

        const reportData = employees.map((emp) => {
          const row = {
            employee_id: emp.employee_id,
            name: emp.name,
            department: emp.department,
            dates: {}
          };

          dates.forEach((date) => {
            const dateFormatted = formatDate(date);
            const dateKey = date.split('T')[0] || date.split(' ')[0] || date;
            row.dates[dateFormatted] = buildDayCell(
              scanMap,
              permMap,
              otScansByEmp,
              emp.employee_id,
              dateKey
            );
          });

          return row;
        });

        res.json({
          success: true,
          data: reportData,
          dates: dates.map((d) => formatDate(d))
        });
      });
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
    db.all('SELECT employee_id, name, department FROM employee_data ORDER BY employee_id', [], (err, employees) => {
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

    const range = parseReportDateRange(req);
    if (range.error) {
      return res.status(400).json({
        success: false,
        message: range.error
      });
    }
    const { dates, startDate, endDate } = range;

    fetchReportContext(db, dates, (err, ctx) => {
      if (err) {
        console.error('Error fetching report data:', err);
        return res.status(500).json({
          success: false,
          message: 'Database error: ' + (err.message || 'Unknown error')
        });
      }

      const { scanMap, permMap, otScansByEmp } = ctx;

      const excelData = [];
      const header = ['Employee ID', 'Nama', 'Departemen'];
      dates.forEach((date) => {
        const dateFormatted = formatDate(date);
        header.push(`${dateFormatted} - Normal`);
        header.push(`${dateFormatted} - Overtime`);
      });
      excelData.push(header);

      employees.forEach((emp) => {
        const row = [emp.employee_id, emp.name, emp.department];
        dates.forEach((date) => {
          const dateKey = date.split('T')[0] || date.split(' ')[0] || date;
          const dayCell = buildDayCell(
            scanMap,
            permMap,
            otScansByEmp,
            emp.employee_id,
            dateKey
          );
          row.push(
            dayCell.normalTime !== null ? formatScanTimeForExcel(dayCell.normalTime) : '-'
          );
          row.push(dayCell.overtimeDisplay);
        });
        excelData.push(row);
      });

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(excelData);

      const colWidths = [{ wch: 15 }, { wch: 25 }, { wch: 20 }];
      dates.forEach(() => {
        colWidths.push({ wch: 15 }, { wch: 15 });
      });
      ws['!cols'] = colWidths;

      XLSX.utils.book_append_sheet(wb, ws, 'Laporan Scan');

      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      const filename = startDate && endDate
        ? `Laporan_Scan_${startDate}_${endDate}.xlsx`
        : `Laporan_Scan_${new Date().toISOString().split('T')[0]}.xlsx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      res.send(buffer);
    });
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
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(date);
  } catch (e) {
    return String(scanTime);
  }
}

module.exports = router;

