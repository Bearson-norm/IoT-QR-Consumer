const express = require('express');
const router = express.Router();
const { getDB } = require('../database');
const { getIndonesiaDateString } = require('../utils/timezone');

// OVT permission approval endpoint (for admin/supervisor)
// This endpoint grants permission for employee to do overtime scan
router.post('/input', (req, res) => {
  const { employee_id } = req.body;
  const grantedBy = req.headers['x-username'] || 'admin';

  if (!employee_id) {
    return res.status(400).json({
      success: false,
      message: 'Employee ID harus diisi'
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
          message: 'Employee tidak ditemukan'
        });
      }

      // Check if permission already exists for today
      db.get(
        'SELECT * FROM ovt_permissions WHERE employee_id = ? AND permission_date = ?',
        [employee_id, today],
        (err, existingPermission) => {
          if (err) {
            return res.status(500).json({
              success: false,
              message: 'Database error'
            });
          }

          if (existingPermission) {
            // Permission already granted
            return res.status(403).json({
              success: false,
              message: `Izin OVT untuk ${employee.name} sudah diberikan hari ini`,
              code: 'OVT_PERMISSION_EXISTS',
              employee: {
                employee_id: employee.employee_id,
                name: employee.name
              }
            });
          }

          // Grant permission by inserting into ovt_permissions table
          db.run(
            'INSERT INTO ovt_permissions (employee_id, permission_date, granted_by) VALUES (?, ?, ?)',
            [employee_id, today, grantedBy],
            function(err) {
              if (err) {
                return res.status(500).json({
                  success: false,
                  message: 'Failed to grant OVT permission'
                });
              }

              res.json({
                success: true,
                message: `Izin OVT untuk ${employee.name} telah diberikan. Silakan lakukan scan di halaman utama`,
                code: 'OVT_PERMISSION_GRANTED',
                employee: {
                  employee_id: employee.employee_id,
                  name: employee.name
                }
              });
            }
          );
        }
      );
    }
  );
});

// OVT confirmation endpoint (for employee to confirm overtime scan from main page)
// This endpoint records the actual overtime scan after employee confirms
router.post('/confirm', (req, res) => {
  const { employee_id } = req.body;

  if (!employee_id) {
    return res.status(400).json({
      success: false,
      message: 'Employee ID harus diisi'
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
          message: 'Employee tidak ditemukan'
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

          if (!hasNormal) {
            // No normal scan exists - must scan first
            return res.status(403).json({
              success: false,
              message: 'Employee harus melakukan scan normal terlebih dahulu sebelum dapat input OVT',
              code: 'OVT_NEEDS_NORMAL_SCAN',
              employee: {
                employee_id: employee.employee_id,
                name: employee.name
              }
            });
          }

          if (hasOvertime) {
            // Overtime already exists
            return res.status(403).json({
              success: false,
              message: `Anda sudah scan makan overtime wahai ${employee.name}, silakan kembali besok`,
              code: 'OVT_ALREADY_SCANNED',
              employee: {
                employee_id: employee.employee_id,
                name: employee.name
              }
            });
          }

          // Check if has OVT permission
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
                // No OVT permission
                return res.status(403).json({
                  success: false,
                  message: `Maaf ${employee.name}, anda belum terdaftar di penjadwalan lembur. Hubungi atasan anda terlebih dahulu`,
                  code: 'OVT_NOT_REGISTERED',
                  employee: {
                    employee_id: employee.employee_id,
                    name: employee.name
                  }
                });
              }

              // Has permission and normal scan - add overtime scan
              db.run(
                'INSERT INTO scan_records (employee_id, scan_date, scan_type) VALUES (?, ?, ?)',
                [employee_id, today, 'overtime'],
                function(err) {
                  if (err) {
                    return res.status(500).json({
                      success: false,
                      message: 'Failed to record overtime scan'
                    });
                  }

                  res.json({
                    success: true,
                    message: `Selamat makan ${employee.name}, semangat lemburnya, silakan mengantri`,
                    code: 'OVT_SUCCESS',
                    employee: {
                      employee_id: employee.employee_id,
                      name: employee.name
                    },
                    scan_type: 'overtime',
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

// Get list of employees with OVT permission for today
router.get('/today', (req, res) => {
  const db = getDB();
  const today = getIndonesiaDateString(); // Use Indonesia timezone

  // Get all employees with OVT permission for today
  db.all(
    `SELECT 
      op.employee_id,
      ed.name,
      op.granted_by,
      op.granted_at,
      op.permission_date
    FROM ovt_permissions op
    INNER JOIN employee_data ed ON op.employee_id = ed.employee_id
    WHERE op.permission_date = ?
    ORDER BY op.granted_at DESC`,
    [today],
    (err, permissions) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: 'Database error'
        });
      }

      res.json({
        success: true,
        data: permissions || [],
        count: permissions ? permissions.length : 0
      });
    }
  );
});

// Delete all OVT permissions for today (admin only)
// This route must come before /:employee_id to avoid route conflicts
router.delete('/today/all', (req, res) => {
  const username = req.headers['x-username'] || '';

  // Check if user is admin
  if (username !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Hanya admin yang dapat menghapus semua izin OVT'
    });
  }

  const db = getDB();
  const today = getIndonesiaDateString();

  // Get count before deletion
  db.get(
    'SELECT COUNT(*) as count FROM ovt_permissions WHERE permission_date = ?',
    [today],
    (err, result) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: 'Database error'
        });
      }

      const count = result ? result.count : 0;

      if (count === 0) {
        return res.json({
          success: true,
          message: 'Tidak ada izin OVT untuk dihapus',
          deleted_count: 0
        });
      }

      // Delete all permissions for today
      db.run(
        'DELETE FROM ovt_permissions WHERE permission_date = ?',
        [today],
        function(err) {
          if (err) {
            return res.status(500).json({
              success: false,
              message: 'Gagal menghapus izin OVT'
            });
          }

          res.json({
            success: true,
            message: `Semua izin OVT hari ini (${count} karyawan) telah dihapus`,
            deleted_count: count
          });
        }
      );
    }
  );
});

// Delete OVT permission for a specific employee (admin only)
router.delete('/:employee_id', (req, res) => {
  const { employee_id } = req.params;
  const username = req.headers['x-username'] || '';

  // Check if user is admin
  if (username !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Hanya admin yang dapat menghapus izin OVT'
    });
  }

  if (!employee_id) {
    return res.status(400).json({
      success: false,
      message: 'Employee ID harus diisi'
    });
  }

  const db = getDB();
  const today = getIndonesiaDateString();

  // Check if permission exists
  db.get(
    'SELECT op.*, ed.name FROM ovt_permissions op INNER JOIN employee_data ed ON op.employee_id = ed.employee_id WHERE op.employee_id = ? AND op.permission_date = ?',
    [employee_id, today],
    (err, permission) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: 'Database error'
        });
      }

      if (!permission) {
        return res.status(404).json({
          success: false,
          message: 'Izin OVT tidak ditemukan untuk employee ini'
        });
      }

      // Delete the permission
      db.run(
        'DELETE FROM ovt_permissions WHERE employee_id = ? AND permission_date = ?',
        [employee_id, today],
        function(err) {
          if (err) {
            return res.status(500).json({
              success: false,
              message: 'Gagal menghapus izin OVT'
            });
          }

          res.json({
            success: true,
            message: `Izin OVT untuk ${permission.name} telah dihapus`,
            employee: {
              employee_id: permission.employee_id,
              name: permission.name
            }
          });
        }
      );
    }
  );
});

module.exports = router;

