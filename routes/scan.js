const express = require('express');
const router = express.Router();
const { getDB } = require('../database');
const { getIndonesiaDateString } = require('../utils/timezone');

// Scan endpoint - matches employee and records scan
router.post('/', (req, res) => {
  const { employee_id } = req.body;

  if (!employee_id) {
    return res.status(400).json({ 
      success: false, 
      message: 'Employee ID is required' 
    });
  }

  const db = getDB();
  const today = getIndonesiaDateString(); // Use Indonesia timezone

  // First, check if employee exists
  db.get(
    'SELECT employee_id, name FROM employee_data WHERE employee_id = ?',
    [employee_id],
    (err, employee) => {
      if (err) {
        return res.status(500).json({ 
          success: false, 
          message: 'Database error' 
        });
      }

      if (!employee) {
        return res.status(404).json({ 
          success: false, 
          message: 'Employee not found',
          type: 'rejection'
        });
      }

      // Check existing scans for today
      db.all(
        'SELECT scan_type FROM scan_records WHERE employee_id = ? AND scan_date = ? ORDER BY scan_time',
        [employee_id, today],
        (err, scans) => {
          if (err) {
            return res.status(500).json({ 
              success: false, 
              message: 'Database error' 
            });
          }

          const hasNormal = scans.some(scan => scan.scan_type === 'normal');
          const hasOvertime = scans.some(scan => scan.scan_type === 'overtime');

          // If no normal scan yet, do normal scan
          if (!hasNormal) {
            const scanType = 'normal';
            const message = 'Scan berhasil! Status: Normal';
            const type = 'success';

            // Insert scan record
            db.run(
              'INSERT INTO scan_records (employee_id, scan_date, scan_type) VALUES (?, ?, ?)',
              [employee_id, today, scanType],
              function(err) {
                if (err) {
                  return res.status(500).json({ 
                    success: false, 
                    message: 'Failed to record scan' 
                  });
                }

                res.json({
                  success: true,
                  message: message,
                  type: type,
                  code: 'NORMAL_SUCCESS',
                  employee: {
                    employee_id: employee.employee_id,
                    name: employee.name
                  },
                  scan_type: scanType,
                  scan_count: scans.length + 1
                });
              }
            );
            return;
          }

          // Already has normal scan, check for overtime
          if (hasOvertime) {
            // Already scanned overtime - reject
            return res.status(403).json({
              success: false,
              message: `Anda sudah scan makan overtime wahai ${employee.name}, silakan kembali besok`,
              type: 'rejection',
              code: 'OVT_ALREADY_SCANNED',
              employee: {
                employee_id: employee.employee_id,
                name: employee.name
              }
            });
          }

          // Has normal scan but no overtime - check if has OVT permission
          db.get(
            'SELECT * FROM ovt_permissions WHERE employee_id = ? AND permission_date = ?',
            [employee_id, today],
            (err, permission) => {
              if (err) {
                return res.status(500).json({ 
                  success: false, 
                  message: 'Database error' 
                });
              }

              if (!permission) {
                // No OVT permission - reject
                return res.status(403).json({
                  success: false,
                  message: `Maaf ${employee.name}, anda belum terdaftar di penjadwalan lembur. Hubungi atasan anda terlebih dahulu`,
                  type: 'rejection',
                  code: 'OVT_NOT_REGISTERED',
                  employee: {
                    employee_id: employee.employee_id,
                    name: employee.name
                  }
                });
              }

              // Has permission - allow overtime scan
              const scanType = 'overtime';
              const message = `Selamat makan ${employee.name}, semangat lemburnya, silakan mengantri`;
              const type = 'success';

              // Insert scan record
              db.run(
                'INSERT INTO scan_records (employee_id, scan_date, scan_type) VALUES (?, ?, ?)',
                [employee_id, today, scanType],
                function(err) {
                  if (err) {
                    return res.status(500).json({ 
                      success: false, 
                      message: 'Failed to record scan' 
                    });
                  }

                  res.json({
                    success: true,
                    message: message,
                    type: type,
                    code: 'OVT_SUCCESS',
                    employee: {
                      employee_id: employee.employee_id,
                      name: employee.name
                    },
                    scan_type: scanType,
                    scan_count: scans.length + 1
                  });
                }
              );
            }
          );
        }
      );
    }
  );
});

module.exports = router;

