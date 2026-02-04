const express = require('express');
const router = express.Router();
const { getDB } = require('../database');

// Get all employees
router.get('/', (req, res) => {
  try {
    const db = getDB();
    
    if (!db) {
      return res.status(500).json({ 
        success: false, 
        message: 'Database connection not available' 
      });
    }
    
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
      
      res.json({
        success: true,
        data: employees
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

// Add new employee
router.post('/', (req, res) => {
  const { employee_id, name } = req.body;

  if (!employee_id || !name) {
    return res.status(400).json({ 
      success: false, 
      message: 'Employee ID and name are required' 
    });
  }

  const db = getDB();
  
  db.run(
    'INSERT INTO employee_data (employee_id, name) VALUES (?, ?)',
    [employee_id, name],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint')) {
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
          employee_id,
          name
        }
      });
    }
  );
});

module.exports = router;


