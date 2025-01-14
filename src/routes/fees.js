const express = require('express');
const router = express.Router();
const db = require('../models/db');

// Get all fees
router.get('/', (req, res) => {
    const sql = 'SELECT * FROM Fees';
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: err.message });
        }
        res.status(200).json(results);
    });
});



// Add a fee record
router.post('/', (req, res) => {
    const { class_description, fee_type, total_amount } = req.body;
    const sql = 'INSERT INTO Fees (class_description, fee_type, total_amount) VALUES (?, ?, ?)';
    const values = [class_description, fee_type, total_amount];

    db.query(sql, values, (err, results) => {
        if (err) {
            if (err.code === "ER_DUP_ENTRY") {
                return res.status(400).json({ message: "Fee details already exist" });
            }
            return res.status(500).json({ error: err.message });
        }
        res.status(201).json({ message: "Fee added successfully", feeId: results.insertId });
    });
});



// Fetch fee details
router.get('/details', (req, res) => {
    const { class_description, fee_type } = req.query;

    const sql = `
        SELECT *
        FROM Fees
        WHERE LOWER(class_description) = LOWER(?)
        AND LOWER(fee_type) = LOWER(?)
    `;
    db.query(sql, [class_description, fee_type], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: err.message });
        }
        if (results.length === 0) {
            return res.status(404).json({ message: 'Fee not found' });
        }
        res.status(200).json(results[0]);
    });
});

// Update a fee record
router.put('/', (req, res) => {
    const { class_description, fee_type, total_amount } = req.body;

    const sql = `
        UPDATE Fees
        SET total_amount = ?
        WHERE LOWER(class_description) = LOWER(?)
        AND LOWER(fee_type) = LOWER(?)
    `;
    db.query(sql, [total_amount, class_description, fee_type], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: err.message });
        }
        if (results.affectedRows === 0) {
            return res.status(404).json({ message: 'Fee record not found' });
        }
        res.status(200).json({ message: 'Fee updated successfully' });
    });
});

// Delete a fee record
router.delete('/', (req, res) => {
    const { class_description, fee_type } = req.body;

    const sql = `
        DELETE FROM Fees
        WHERE LOWER(class_description) = LOWER(?)
        AND LOWER(fee_type) = LOWER(?)
    `;
    db.query(sql, [class_description, fee_type], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: err.message });
        }
        if (results.affectedRows === 0) {
            return res.status(404).json({ message: 'Fee record not found' });
        }
        res.status(200).json({ message: 'Fee record deleted successfully' });
    });
});

router.get('/types', (req, res) => {
    const sql = 'SELECT DISTINCT fee_type FROM Fees';
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: err.message });
        }
        const feeTypes = results.map((row) => row.fee_type);
        res.status(200).json(feeTypes);
    });
});


router.get('/resolve', (req, res) => {
    const { class_description, fee_type } = req.query;

    const sql = `
        SELECT fee_id
        FROM Fees
        WHERE LOWER(class_description) = LOWER(?) AND LOWER(fee_type) = LOWER(?)
    `;

    db.query(sql, [class_description, fee_type], (err, results) => {
        if (err) {
            console.error('Error resolving fee_id:', err);
            return res.status(500).json({ error: err.message });
        }
        if (results.length === 0) {
            return res.status(404).json({ message: 'Fee record not found' });
        }
        res.status(200).json(results[0]);
    });
});


module.exports = router;
