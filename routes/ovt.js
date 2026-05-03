const express = require('express');
const router = express.Router();
const { getDB, pool } = require('../database');
const { getIndonesiaBusinessDateString } = require('../utils/timezone');

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
  const today = getIndonesiaBusinessDateString(); // Use Indonesia timezone

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
  const today = getIndonesiaBusinessDateString(); // Use Indonesia timezone

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
  const today = getIndonesiaBusinessDateString(); // Use Indonesia timezone

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

function dedupeTemplateEmployeeIds(ids) {
  const seen = new Set();
  const out = [];
  for (const id of ids || []) {
    const t = String(id).trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

function normalizeTemplateRow(row) {
  let ids = row.employee_ids;
  if (typeof ids === 'string') {
    try {
      ids = JSON.parse(ids);
    } catch (e) {
      ids = [];
    }
  }
  if (!Array.isArray(ids)) ids = [];
  return {
    id: String(row.id),
    name: row.name,
    employeeIds: dedupeTemplateEmployeeIds(ids.map(String))
  };
}

// OVT employee templates (stored in PostgreSQL, scoped by x-username)
// Registered before /:employee_id so paths like /templates/1 are not captured as employee_id
router.get('/templates', async (req, res) => {
  const username = (req.headers['x-username'] || '').trim();
  if (!username) {
    return res.status(400).json({ success: false, message: 'Header x-username wajib' });
  }
  try {
    const result = await pool.query(
      `SELECT id, name, employee_ids, updated_at FROM ovt_employee_templates
       WHERE username = $1 ORDER BY LOWER(name)`,
      [username]
    );
    const data = result.rows.map(normalizeTemplateRow);
    res.json({ success: true, data });
  } catch (err) {
    console.error('GET /ovt/templates', err);
    res.status(500).json({ success: false, message: 'Database error' });
  }
});

router.post('/templates', async (req, res) => {
  const username = (req.headers['x-username'] || '').trim();
  const { name, employeeIds } = req.body || {};
  if (!username) {
    return res.status(400).json({ success: false, message: 'Header x-username wajib' });
  }
  const trimmedName = name != null ? String(name).trim() : '';
  if (!trimmedName) {
    return res.status(400).json({ success: false, message: 'Nama template wajib' });
  }
  const ids = dedupeTemplateEmployeeIds(employeeIds);
  try {
    const result = await pool.query(
      `INSERT INTO ovt_employee_templates (username, name, employee_ids)
       VALUES ($1, $2, $3::jsonb)
       RETURNING id, name, employee_ids, updated_at`,
      [username, trimmedName, JSON.stringify(ids)]
    );
    res.json({ success: true, data: normalizeTemplateRow(result.rows[0]) });
  } catch (err) {
    console.error('POST /ovt/templates', err);
    res.status(500).json({ success: false, message: 'Gagal menyimpan template' });
  }
});

router.put('/templates/:templateId', async (req, res) => {
  const username = (req.headers['x-username'] || '').trim();
  const templateId = parseInt(req.params.templateId, 10);
  if (!username) {
    return res.status(400).json({ success: false, message: 'Header x-username wajib' });
  }
  if (!Number.isFinite(templateId)) {
    return res.status(400).json({ success: false, message: 'ID template tidak valid' });
  }
  const { name, employeeIds } = req.body || {};
  const trimmedName = name != null ? String(name).trim() : '';
  if (!trimmedName) {
    return res.status(400).json({ success: false, message: 'Nama template wajib' });
  }
  const ids = dedupeTemplateEmployeeIds(employeeIds);
  try {
    const result = await pool.query(
      `UPDATE ovt_employee_templates
       SET name = $1, employee_ids = $2::jsonb, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 AND username = $4
       RETURNING id, name, employee_ids, updated_at`,
      [trimmedName, JSON.stringify(ids), templateId, username]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Template tidak ditemukan' });
    }
    res.json({ success: true, data: normalizeTemplateRow(result.rows[0]) });
  } catch (err) {
    console.error('PUT /ovt/templates', err);
    res.status(500).json({ success: false, message: 'Gagal memperbarui template' });
  }
});

router.delete('/templates/:templateId', async (req, res) => {
  const username = (req.headers['x-username'] || '').trim();
  const templateId = parseInt(req.params.templateId, 10);
  if (!username) {
    return res.status(400).json({ success: false, message: 'Header x-username wajib' });
  }
  if (!Number.isFinite(templateId)) {
    return res.status(400).json({ success: false, message: 'ID template tidak valid' });
  }
  try {
    const result = await pool.query(
      'DELETE FROM ovt_employee_templates WHERE id = $1 AND username = $2 RETURNING id',
      [templateId, username]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Template tidak ditemukan' });
    }
    res.json({ success: true, message: 'Template dihapus' });
  } catch (err) {
    console.error('DELETE /ovt/templates', err);
    res.status(500).json({ success: false, message: 'Gagal menghapus template' });
  }
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
  const today = getIndonesiaBusinessDateString();

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
  const today = getIndonesiaBusinessDateString();

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

