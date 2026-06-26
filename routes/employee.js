const express = require('express');
const router = express.Router();
const { getDB } = require('../database');
const { requireOvtBearer, requireAdmin } = require('../middleware/ovtAuth');

// Get all employees (includes inactive for admin management)
router.get('/', (req, res) => {
  try {
    const db = getDB();
    
    if (!db) {
      return res.status(500).json({ 
        success: false, 
        message: 'Database connection not available' 
      });
    }
    
    db.all(
      'SELECT employee_id, name, department, is_active FROM employee_data ORDER BY department, employee_id',
      [],
      (err, employees) => {
      if (err) {
        console.error('Error fetching employees:', err);
        return res.status(500).json({ 
          success: false, 
          message: 'Database error: ' + (err.message || 'Unknown error')
        });
      }
      
      if (!Array.isArray(employees)) {
        employees = [];
      }
      
      res.json({
        success: true,
        data: employees.map((emp) => ({
          ...emp,
          is_active: emp.is_active !== false
        }))
      });
    });
  } catch (error) {
    console.error('Unexpected error in employee route:', error);
    res.status(500).json({
      success: false,
      message: 'Unexpected error: ' + (error.message || 'Unknown error')
    });
  }
});

// Add new employee (admin only)
router.post('/', requireOvtBearer, requireAdmin, (req, res) => {
  const { employee_id, name, department } = req.body;

  if (!employee_id || !name || !department) {
    return res.status(400).json({ 
      success: false, 
      message: 'Employee ID, name, and department are required' 
    });
  }

  const db = getDB();
  
  db.run(
    'INSERT INTO employee_data (employee_id, name, department) VALUES (?, ?, ?)',
    [employee_id.trim(), name.trim(), department.trim()],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint') || err.message.includes('duplicate key')) {
          return res.status(409).json({ 
            success: false, 
            message: 'Employee ID already exists' 
          });
        }
        return res.status(500).json({ 
          success: false, 
          message: 'Database error' 
        });
      }
      
      res.json({
        success: true,
        message: 'Employee added successfully',
        employee: {
          employee_id: employee_id.trim(),
          name: name.trim(),
          department: department.trim(),
          is_active: true
        }
      });
    }
  );
});

// Update employee (admin only)
router.patch('/:employee_id', requireOvtBearer, requireAdmin, (req, res) => {
  const employeeId = (req.params.employee_id || '').trim();
  const { name, department, is_active } = req.body;

  if (!employeeId) {
    return res.status(400).json({
      success: false,
      message: 'Employee ID is required'
    });
  }

  const updates = [];
  const params = [];

  if (name !== undefined) {
    const trimmedName = String(name).trim();
    if (!trimmedName) {
      return res.status(400).json({
        success: false,
        message: 'Name cannot be empty'
      });
    }
    updates.push('name = ?');
    params.push(trimmedName);
  }

  if (department !== undefined) {
    const trimmedDept = String(department).trim();
    if (!trimmedDept) {
      return res.status(400).json({
        success: false,
        message: 'Department cannot be empty'
      });
    }
    updates.push('department = ?');
    params.push(trimmedDept);
  }

  if (is_active !== undefined) {
    updates.push('is_active = ?');
    params.push(Boolean(is_active));
  }

  if (updates.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'At least one field (name, department, is_active) is required'
    });
  }

  params.push(employeeId);
  const db = getDB();

  db.run(
    `UPDATE employee_data SET ${updates.join(', ')} WHERE employee_id = ?`,
    params,
    function(err) {
      if (err) {
        return res.status(500).json({
          success: false,
          message: 'Database error'
        });
      }

      if (this.changes === 0) {
        return res.status(404).json({
          success: false,
          message: 'Employee not found'
        });
      }

      db.get(
        'SELECT employee_id, name, department, is_active FROM employee_data WHERE employee_id = ?',
        [employeeId],
        (fetchErr, employee) => {
          if (fetchErr || !employee) {
            return res.status(500).json({
              success: false,
              message: 'Failed to fetch updated employee'
            });
          }

          res.json({
            success: true,
            message: 'Employee updated successfully',
            employee: {
              ...employee,
              is_active: employee.is_active !== false
            }
          });
        }
      );
    }
  );
});

module.exports = router;
