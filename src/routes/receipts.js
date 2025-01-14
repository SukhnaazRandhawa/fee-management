/*
const express = require('express');
const router = express.Router();
const db = require('../models/db');
const pdf = require('pdfkit'); // PDF generation library
const fs = require('fs'); // File system for saving PDFs

// Get all receipts
router.get('/', (req, res) => {
    const sql = `
        SELECT Receipts.receipt_id, Receipts.receipt_date, Payments.amount_paid,
               Payments.payment_id, Fees.fee_type, Students.name AS student_name, Classes.class_name
        FROM Receipts
        JOIN Payments ON Receipts.payment_id = Payments.payment_id
        JOIN Fees ON Payments.fee_id = Fees.fee_id
        JOIN Students ON Fees.student_id = Students.student_id
        JOIN Classes ON Students.class_id = Classes.class_id`;

    db.query(sql, (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.status(200).json(results);
    });
});

// Generate and download a receipt
router.post('/:paymentId', (req, res) => {
    const { paymentId } = req.params;

    // Check if a receipt already exists for this payment_id
    const checkReceiptSql = 'SELECT * FROM Receipts WHERE payment_id = ?';
    db.query(checkReceiptSql, [paymentId], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        const filePath = `receipts/receipt_${paymentId}.pdf`;

        if (results.length > 0) {
            // Check if the file exists
            if (!fs.existsSync(filePath)) {
                console.log(`Receipt record exists but file is missing. Re-generating: ${filePath}`);

                // Re-generate the PDF file
                generatePDF(paymentId, filePath, res, true);
            } else {
                // If the file exists, send the existing receipt response
                return res.status(200).json({
                    message: 'Receipt already exists',
                    receiptId: results[0].receipt_id,
                    receiptPath: filePath,
                });
            }
        } else {
            // If no receipt exists in the database, generate it
            console.log(`Generating new receipt for paymentId ${paymentId}`);
            generatePDF(paymentId, filePath, res, false);
        }
    });
});

// Helper function to generate a PDF and (optionally) insert a database record
function generatePDF(paymentId, filePath, res, recordExists) {
    const generateReceiptSql = `
        SELECT Payments.payment_id, Payments.payment_date, Payments.payment_mode, Payments.amount_paid,
               Fees.fee_type, Students.name AS student_name, Classes.class_name
        FROM Payments
        JOIN Fees ON Payments.fee_id = Fees.fee_id
        JOIN Students ON Fees.student_id = Students.student_id
        JOIN Classes ON Students.class_id = Classes.class_id
        WHERE Payments.payment_id = ?`;

    db.query(generateReceiptSql, [paymentId], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (results.length === 0) {
            return res.status(404).json({ message: 'Payment not found' });
        }

        const payment = results[0];

        // Generate the PDF receipt
        const pdfDoc = new pdf();
        pdfDoc.pipe(fs.createWriteStream(filePath));
        pdfDoc.fontSize(20).text('Harcharan Singh Memorial Public School', { align: 'center' });
        pdfDoc.moveDown();
        pdfDoc.fontSize(18).text('Payment Receipt', { align: 'center' });
        pdfDoc.text('--------------------------');
        pdfDoc.fontSize(14).text(`Student Name: ${payment.student_name}`);
        pdfDoc.text(`Class: ${payment.class_name}`);
        pdfDoc.text(`Fee Type: ${payment.fee_type}`);
        pdfDoc.text(`Payment Mode: ${payment.payment_mode}`);
        pdfDoc.text(`Amount Paid: ₹${payment.amount_paid}`);
        pdfDoc.text(`Payment Date: ${new Date(payment.payment_date).toLocaleDateString('en-IN')}`);
        pdfDoc.text('--------------------------');
        pdfDoc.end();

        if (!recordExists) {
            // Insert the new receipt into the database if it doesn't already exist
            const insertReceiptSql = 'INSERT INTO Receipts (payment_id, receipt_date) VALUES (?, NOW())';
            db.query(insertReceiptSql, [paymentId], (err, receiptResults) => {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                res.status(201).json({
                    message: 'Receipt generated successfully',
                    receiptId: receiptResults.insertId,
                    receiptPath: filePath,
                });
            });
        } else {
            // Return success response for re-generated file
            res.status(200).json({
                message: 'Receipt file re-generated successfully',
                receiptPath: filePath,
            });
        }
    });
}

module.exports = router;
*/
