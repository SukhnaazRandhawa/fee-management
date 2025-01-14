const express = require('express');
const router = express.Router();
const db = require('../models/db');

// Total Fees Collected
router.get('/total-collections', (req, res) => {
    const sql = 'SELECT SUM(amount_paid) AS total_collections FROM Payments';

    db.query(sql, (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.status(200).json({ totalCollections: results[0].total_collections || 0 });
    });
});

// Pending Fees (Overall)
router.get('/pending-fees', (req, res) => {
    const sql = `
        SELECT
            Students.name AS student_name,
            Classes.class_description AS class_name,
            Fees.total_amount - IFNULL(SUM(Payments.amount_paid), 0) AS pending_amount
        FROM Fees
        JOIN Students ON Fees.student_id = Students.student_id
        JOIN Classes ON Students.class_description = Classes.class_description
        LEFT JOIN Payments ON Fees.fee_id = Payments.fee_id
        GROUP BY Fees.fee_id
        HAVING pending_amount > 0;
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error('Error fetching pending fees:', err);
            return res.status(500).json({ error: err.message });
        }
        res.status(200).json(results);
    });
});



// Class-Wise Fee Breakdown
router.get('/class-wise-breakdown', (req, res) => {
    const sql = `
        SELECT
            Classes.class_description AS class_name,
            IFNULL(SUM(Payments.amount_paid), 0) AS total_collected,
            IFNULL(SUM(Fees.total_amount) - SUM(Payments.amount_paid), 0) AS total_pending
        FROM Classes
        LEFT JOIN Students ON Classes.class_description = Students.class_description
        LEFT JOIN Fees ON Students.student_id = Fees.student_id
        LEFT JOIN Payments ON Fees.fee_id = Payments.fee_id
        GROUP BY Classes.class_description;
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error('Error fetching class-wise breakdown:', err);
            return res.status(500).json({ error: err.message });
        }
        res.status(200).json(results);
    });
});

module.exports = router;
