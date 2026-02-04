const express = require('express');
const router = express.Router();
const { getDB } = require('../database');
const XLSX = require('xlsx');
const { getIndonesiaDateString } = require('../utils/timezone');

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
        // Use date range
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        // Validate date range (max 30 days)
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        
        if (diffDays > 30) {
          return res.status(400).json({
            success: false,
            message: 'Range tanggal maksimal 30 hari'
          });
        }

        // Generate dates in range
        const currentDate = new Date(start);
        while (currentDate <= end) {
          dates.push(currentDate.toISOString().split('T')[0]);
          currentDate.setDate(currentDate.getDate() + 1);
        }
      } else if (days) {
        // Use days parameter (backward compatibility)
        const today = new Date(getIndonesiaDateString());
        for (let i = days - 1; i >= 0; i--) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          dates.push(date.toISOString().split('T')[0]);
        }
      } else {
        // Default to last 7 days
        const today = new Date(getIndonesiaDateString());
        for (let i = 6; i >= 0; i--) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          dates.push(date.toISOString().split('T')[0]);
        }
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
          // Convert scan_date to YYYY-MM-DD format
          // PostgreSQL DATE type might be returned as Date object or string
          let scanDate;
          if (scan.scan_date instanceof Date) {
            scanDate = scan.scan_date.toISOString().split('T')[0];
          } else if (typeof scan.scan_date === 'string') {
            // Handle both 'YYYY-MM-DD' and 'YYYY-MM-DDTHH:mm:ss.sssZ' formats
            scanDate = scan.scan_date.split('T')[0].split(' ')[0];
          } else if (scan.scan_date) {
            // Handle other formats
            scanDate = String(scan.scan_date).split('T')[0].split(' ')[0];
          } else {
            return; // Skip if no date
          }
          
          // Ensure format is YYYY-MM-DD
          if (!scanDate || !/^\d{4}-\d{2}-\d{2}$/.test(scanDate)) {
            console.warn('Invalid scan_date format:', scan.scan_date, '->', scanDate);
            return; // Skip if invalid date
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
          // Store scan time for each scan type
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
      // Use date range
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      // Validate date range (max 30 days)
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      
      if (diffDays > 30) {
        return res.status(400).json({
          success: false,
          message: 'Range tanggal maksimal 30 hari'
        });
      }

      // Generate dates in range
      const currentDate = new Date(start);
      while (currentDate <= end) {
        dates.push(currentDate.toISOString().split('T')[0]);
        currentDate.setDate(currentDate.getDate() + 1);
      }
    } else if (days) {
      // Use days parameter
      const today = new Date(getIndonesiaDateString());
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        dates.push(date.toISOString().split('T')[0]);
      }
    } else {
      // Default to last 7 days
      const today = new Date(getIndonesiaDateString());
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        dates.push(date.toISOString().split('T')[0]);
      }
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
          // Convert scan_date to YYYY-MM-DD format
          // PostgreSQL DATE type might be returned as Date object or string
          let scanDate;
          if (scan.scan_date instanceof Date) {
            scanDate = scan.scan_date.toISOString().split('T')[0];
          } else if (typeof scan.scan_date === 'string') {
            // Handle both 'YYYY-MM-DD' and 'YYYY-MM-DDTHH:mm:ss.sssZ' formats
            scanDate = scan.scan_date.split('T')[0].split(' ')[0];
          } else if (scan.scan_date) {
            // Handle other formats
            scanDate = String(scan.scan_date).split('T')[0].split(' ')[0];
          } else {
            return; // Skip if no date
          }
          
          // Ensure format is YYYY-MM-DD
          if (!scanDate || !/^\d{4}-\d{2}-\d{2}$/.test(scanDate)) {
            console.warn('Invalid scan_date format:', scan.scan_date, '->', scanDate);
            return; // Skip if invalid date
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
          // Store scan time for each scan type
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

        // Data rows
        employees.forEach(emp => {
          const row = [emp.employee_id, emp.name];
          dates.forEach(date => {
            const dateFormatted = formatDate(date);
            // Ensure date is in YYYY-MM-DD format for matching
            const dateKey = date.split('T')[0] || date.split(' ')[0] || date;
            
            if (scanMap[emp.employee_id] && scanMap[emp.employee_id][dateKey]) {
              const dayScans = scanMap[emp.employee_id][dateKey];
              row.push(dayScans.normal !== null ? 1 : '');
              row.push(dayScans.overtime !== null ? 1 : '');
            } else {
              row.push('');
              row.push('');
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

// Format date from YYYY-MM-DD to DD/MM/YY
function formatDate(dateString) {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
}

module.exports = router;

