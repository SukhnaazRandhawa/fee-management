const express = require('express');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const mysql = require('mysql2');
const pdf = require('pdfkit'); // PDF generation library

// Initialize dotenv for environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

const cors = require('cors');
app.use(cors()); // Enable CORS

// Middleware
app.use(bodyParser.json());

// MySQL Database Connection
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// Connect to the database
db.connect((err) => {
  if (err) {
    console.error('Database connection failed: ', err);
    return;
  }
  console.log('Connected to the MySQL database.');
});

// Import Routes
const studentRoutes = require('./routes/students');
const feeRoutes = require('./routes/fees');
const paymentRoutes = require('./routes/payments');
const dashboardRoutes = require('./routes/dashboard');
const notificationRoutes = require('./routes/notifications');
const classRoutes = require('./routes/classes');

// Middleware for Routes
app.use('/students', studentRoutes);
app.use('/fees', feeRoutes);
app.use('/payments', paymentRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/notifications', notificationRoutes);
app.use('/classes', classRoutes);

// Add the '/classes' route
app.get('/classes', (req, res) => {
  const sql = 'SELECT * FROM Classes';
  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.status(200).json(results);
  });
});

// Update the '/students' route to include class descriptions
app.get('/students', (req, res) => {
  const { class_id } = req.query;

  const sql = class_id
      ? `SELECT Students.*, Classes.class_name
         FROM Students
         JOIN Classes ON Students.class_id = Classes.class_id
         WHERE Students.class_id = ?`
      : `SELECT Students.*, Classes.class_name
         FROM Students
         JOIN Classes ON Students.class_id = Classes.class_id`;

  db.query(sql, [class_id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(200).json(results);
  });
});

// Dynamic route to serve receipts as in-memory PDFs
app.get('/receipts/:paymentId', (req, res) => {
  const { paymentId } = req.params;

  const sql = `
      SELECT Payments.payment_id, Payments.payment_date, Payments.payment_mode, Payments.amount_paid,
             Fees.fee_type, Students.name AS student_name, Classes.class_name
      FROM Payments
      JOIN Fees ON Payments.fee_id = Fees.fee_id
      JOIN Students ON Fees.student_id = Students.student_id
      JOIN Classes ON Students.class_id = Classes.class_id
      WHERE Payments.payment_id = ?`;

  db.query(sql, [paymentId], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (results.length === 0) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    const payment = results[0];

    // Generate the PDF receipt in-memory
    const pdfDoc = new pdf();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="receipt_${paymentId}.pdf"`);

    pdfDoc.pipe(res); // Pipe the PDF directly to the response
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
  });
});

// Test Route
app.get('/', (req, res) => {
  res.send('Fee Management Backend is Running!');
});

// Start the Server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
