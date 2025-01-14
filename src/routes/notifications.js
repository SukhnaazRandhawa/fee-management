const express = require('express');
const router = express.Router();
const db = require('../models/db');
const nodemailer = require('nodemailer');

// Email Setup
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
    },
});

// Send Email Reminders for Pending Fees
router.post('/send-reminders', (req, res) => {
    const sql = `
        SELECT Students.email, Students.name AS student_name, Classes.class_name, SUM(Fees.total_amount - IFNULL(Payments.amount_paid, 0)) AS pending_amount
        FROM Students
        JOIN Classes ON Students.class_id = Classes.class_id
        JOIN Fees ON Students.student_id = Fees.student_id
        LEFT JOIN Payments ON Fees.fee_id = Payments.fee_id
        GROUP BY Students.student_id, Classes.class_name
        HAVING pending_amount > 0
    `;

    db.query(sql, (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        const emailPromises = results.map((student) => {
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: student.email,
                subject: 'Pending Fee Reminder',
                text: `Dear ${student.student_name},\n\nThis is a reminder that you have pending fees of ${student.pending_amount} for class ${student.class_name}. Please make the payment at your earliest convenience.\n\nThank you.\nHarcharan Singh Memorial Public School`,
            };

            return transporter.sendMail(mailOptions);
        });

        Promise.all(emailPromises)
            .then(() => {
                res.status(200).json({ message: 'Email reminders sent successfully!' });
            })
            .catch((err) => {
                res.status(500).json({ error: 'Failed to send some reminders', details: err.message });
            });
    });
});

module.exports = router;
