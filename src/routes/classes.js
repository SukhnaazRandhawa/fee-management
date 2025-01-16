const express = require('express');
const router = express.Router();
const db = require('../models/db');

// Get all classes
router.get('/:id', (req, res) => {
    const { id } = req.params;
    const sql = 'SELECT class_description FROM Classes WHERE class_id = ?';

    db.query(sql, [id], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: err.message });
        }
        if (results.length === 0) {
            return res.status(404).json({ message: 'Class not found' });
        }
        res.status(200).json(results[0]);
    });
});

module.exports = router;
