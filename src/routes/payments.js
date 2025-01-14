const express = require('express');
const router = express.Router();
const db = require('../models/db');
const pdf = require('pdfkit');

// Get all payments
router.get('/', (req, res) => {
    const sql = `
        SELECT Payments.*,
               Students.name AS student_name,
               Students.class_description,
               Students.contact_info,
               Fees.fee_type
        FROM Payments
        JOIN Students ON Payments.student_id = Students.student_id
        JOIN Fees ON Payments.fee_id = Fees.fee_id
    `;
    db.query(sql, (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.status(200).json(results);
    });
});

// Get today's payments
router.get('/today', (req, res) => {
    const sql = `
        SELECT Payments.payment_date,
               Payments.payment_mode,
               Payments.amount_paid,
               Payments.receipt_number,
               Students.name AS student_name,
               Students.class_description,
               Fees.fee_type
        FROM Payments
        JOIN Students ON Payments.student_id = Students.student_id
        JOIN Fees ON Payments.fee_id = Fees.fee_id
        WHERE DATE(Payments.payment_date) = CURDATE()
    `;
    db.query(sql, (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.status(200).json(results);
    });
});

// Get all payments for a specific student (with fee category)
router.get('/student-payments/:studentId', (req, res) => {
    const { studentId } = req.params;
    const sql = `
        SELECT Payments.payment_date,
               Payments.payment_mode,
               Payments.amount_paid,
               Fees.fee_type,
               Fees.total_amount,
               CASE
                   WHEN Fees.fee_type = 'Annual Fee' THEN 'Annual Fee'
                   WHEN Fees.fee_type = 'Monthly Fee' THEN 'Monthly Fee'
                   ELSE 'Other'
               END AS fee_category
        FROM Payments
        JOIN Fees ON Payments.fee_id = Fees.fee_id
        WHERE Payments.student_id = ?
    `;
    db.query(sql, [studentId], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (results.length === 0) {
            return res.status(404).json({ message: 'No payments found for the student' });
        }
        res.status(200).json(results);
    });
});

// Add a payment
router.post('/', async (req, res) => {
    const { fee_id, student_id, payment_date, payment_mode, amount_paid } = req.body;

    if (!fee_id || !student_id || !payment_date || !payment_mode || !amount_paid) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    try {
        const receiptNumber = await generateReceiptNumber(db);
        const sql = `
            INSERT INTO Payments (fee_id, student_id, payment_date, payment_mode, amount_paid, receipt_number)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        const [result] = await db.promise().query(sql, [
            fee_id,
            student_id,
            payment_date,
            payment_mode,
            amount_paid,
            receiptNumber,
        ]);
        res.status(201).json({ message: 'Payment added successfully', receiptNumber });
    } catch (err) {
        res.status(500).json({ error: 'Failed to add payment.' });
    }
});

// Generate a unique receipt number
const generateReceiptNumber = async (db) => {
    const sql = 'SELECT MAX(receipt_number) AS lastReceipt FROM Payments';
    const [results] = await db.promise().query(sql);
    const lastReceipt = results[0]?.lastReceipt || 'REC000000';
    const nextNumber = parseInt(lastReceipt.replace('REC', ''), 10) + 1;
    return `REC${String(nextNumber).padStart(6, '0')}`;
};

// Route to fetch and generate a receipt PDF
router.get('/receipt/:receiptNumber', (req, res) => {
    const { receiptNumber } = req.params;

    const sql = `
        SELECT Payments.receipt_number, Payments.payment_date, Payments.payment_mode, Payments.amount_paid,
               Fees.fee_type, Fees.total_amount,
               Students.name AS student_name, Students.class_description
        FROM Payments
        JOIN Fees ON Payments.fee_id = Fees.fee_id
        JOIN Students ON Payments.student_id = Students.student_id
        WHERE Payments.receipt_number = ?
    `;

    db.query(sql, [receiptNumber], (err, results) => {
        if (err) {
            console.error('Error fetching receipt details:', err);
            return res.status(500).json({ error: 'Error fetching receipt details.' });
        }

        if (results.length === 0) {
            return res.status(404).json({ message: 'Receipt not found.' });
        }

        const payment = results[0];

        // Generate PDF receipt
        const doc = new pdf({ size: 'A4', layout: 'landscape' }); // Landscape layout for side-by-side receipts
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
            'Content-Disposition',
            `inline; filename="receipt_${payment.receipt_number}.pdf"`
        );

        doc.pipe(res);

        // Function to render a single receipt
        const renderReceipt = (doc, xOffset) => {
            doc.save();
            doc.translate(xOffset, 50); // Set vertical alignment to match both receipts

            doc.fontSize(15).text('Harcharan Singh Memorial Public School', { align: 'left' });
            doc.moveDown();
            doc.fontSize(10).text('Fee Payment Receipt', { align: 'left' });
            doc.moveDown();
            doc.fontSize(12).text(`Receipt Number: ${payment.receipt_number}`);
            doc.text(`Student Name: ${payment.student_name}`);
            doc.text(`Class: ${payment.class_description}`);
            doc.text(`Fee Type: ${payment.fee_type}`);
            doc.text(`Payment Mode: ${payment.payment_mode}`);
            doc.text(`Amount Paid: ₹${payment.amount_paid}`);
            doc.text(`Total Fee: ₹${payment.total_amount}`);
            doc.text(`Payment Date: ${new Date(payment.payment_date).toLocaleDateString()}`);
            doc.moveDown();
            doc.text('Thank you for your payment.', { align: 'left' });

            doc.restore();
        };

        // Render two receipts side by side
        renderReceipt(doc, 50); // Left receipt
        renderReceipt(doc, 420); // Right receipt (adjust X offset for proper spacing)

        doc.end();
    });
});





// Annual Fee Balance Calculation
const calculateAnnualBalance = async (studentId) => {
    const sql = `
        SELECT
            (SELECT total_amount
             FROM Fees
             WHERE class_description = (
                 SELECT class_description FROM Students WHERE student_id = ?
             ) AND fee_type = 'Annual Fee') AS total_admission_fee,
            (SELECT COALESCE(SUM(amount_paid), 0)
             FROM Payments
             JOIN Fees ON Payments.fee_id = Fees.fee_id
             WHERE Payments.student_id = ? AND Fees.fee_type = 'Annual Fee') AS total_paid
    `;
    const [result] = await db.promise().query(sql, [studentId, studentId]);
    const total_admission_fee = parseFloat(result[0]?.total_admission_fee || 0);
    const total_paid = parseFloat(result[0]?.total_paid || 0);
    const balance = total_admission_fee - total_paid;
    return { total_admission_fee, total_paid, balance: balance.toFixed(2) };
};

// API Endpoint for Annual Fee Balance
router.get('/annual-balance/:studentId', async (req, res) => {
    const { studentId } = req.params;
    try {
        const balanceData = await calculateAnnualBalance(studentId);
        res.status(200).json(balanceData);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch annual balance.' });
    }
});

// Updated Monthly Breakdown
const getUpdatedMonthlyBreakdown = async (studentId) => {
    const sql = `
        SELECT Fees.total_amount AS monthly_due
        FROM Fees
        WHERE Fees.class_description = (
            SELECT class_description FROM Students WHERE student_id = ?
        ) AND Fees.fee_type = 'Monthly Fee'
        LIMIT 1
    `;
    const [feeResults] = await db.promise().query(sql, [studentId]);
    const monthlyDue = parseFloat(feeResults[0]?.monthly_due || 0);

    const paymentsQuery = `
        SELECT payment_date, amount_paid
        FROM Payments
        JOIN Fees ON Payments.fee_id = Fees.fee_id
        WHERE student_id = ? AND Fees.fee_type = 'Monthly Fee'
        ORDER BY payment_date
    `;
    const [paymentResults] = await db.promise().query(paymentsQuery, [studentId]);

    const months = Array.from({ length: 12 }, (_, i) => ({
        month: i + 1,
        due: monthlyDue,
        paid: 0,
        balance: monthlyDue,
    }));

    paymentResults.forEach((payment) => {
        let amountRemaining = payment.amount_paid;

        for (let i = 0; i < months.length; i++) {
            if (amountRemaining <= 0) break;

            const unpaid = months[i].balance;
            if (unpaid > 0) {
                const paymentToApply = Math.min(amountRemaining, unpaid);
                months[i].paid += paymentToApply;
                months[i].balance -= paymentToApply;
                amountRemaining -= paymentToApply;
            }
        }
    });

    return months;
};

// API Endpoint for Monthly Breakdown
router.get('/monthly-breakdown/:studentId', async (req, res) => {
    const { studentId } = req.params;
    try {
        const monthlyBreakdown = await getUpdatedMonthlyBreakdown(studentId);
        res.status(200).json(monthlyBreakdown);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch monthly breakdown' });
    }
});

module.exports = router;



