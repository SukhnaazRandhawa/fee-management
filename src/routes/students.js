const express = require('express');
const router = express.Router();
const db = require('../models/db'); // This will be our database connection file



// Get all students
router.get('/', (req, res) => {
    const { class_description } = req.query;

    // console.log('class_description received in query:', class_description); // Log the incoming class_description

    const sql = class_description
        ? 'SELECT * FROM Students WHERE LOWER(class_description) = LOWER(?)'
        : 'SELECT * FROM Students';

    // console.log('SQL Query:', sql); // Log the SQL query being executed

    db.query(sql, [class_description], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: err.message });
        }

        // console.log('Query Results:', results); // Log the query results

        res.status(200).json(results);
    });
});




// Temporary route to fetch all students (for debugging purposes)
router.get('/all', (req, res) => {
    db.query('SELECT * FROM Students', (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: err.message });
        }
        res.status(200).json(results);
    });
});

// Fetch details of a specific student
router.get('/student-details', (req, res) => {
    const { name, class_description } = req.query;

    const sql = `
        SELECT *
        FROM Students
        WHERE LOWER(name) = LOWER(?) AND LOWER(class_description) = LOWER(?)
    `;

    db.query(sql, [name, class_description], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: err.message });
        }

        if (results.length === 0) {
            return res.status(404).json({ message: 'Student not found' });
        }

        res.status(200).json(results[0]);
    });
});







// Add a new student
router.post('/', (req, res) => {
    const { name, class_description, father_name, mother_name, village, contact_info, email } = req.body;

    // Check if the student already exists
    const checkStudentSql = `
        SELECT *
        FROM Students
        WHERE
            LOWER(name) = LOWER(?) AND
            LOWER(class_description) = LOWER(?) AND
            LOWER(father_name) = LOWER(?) AND
            LOWER(mother_name) = LOWER(?) AND
            LOWER(village) = LOWER(?) AND
            contact_info = ? AND
            LOWER(email) = LOWER(?)
    `;
    const checkValues = [name, class_description, father_name, mother_name, village, contact_info, email];

    db.query(checkStudentSql, checkValues, (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error. Please try again.' });
        }

        if (results.length > 0) {
            // If the student exists, return a conflict response
            return res.status(409).json({ message: 'This student already exists' });
        }

        // If the student does not exist, attempt to insert the new student
        const insertStudentSql = `
            INSERT INTO Students (name, class_description, father_name, mother_name, village, contact_info, email)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        const insertValues = [name, class_description, father_name, mother_name, village, contact_info, email];

        db.query(insertStudentSql, insertValues, (err, results) => {
            if (err) {
                // Handle duplicate email error
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(409).json({ message: 'This student already exists' });
                }
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Database error. Please try again.' });
            }

            res.status(201).json({ message: 'Student added successfully', studentId: results.insertId });
        });
    });
});





// Get a single student by ID
router.get('/:id', (req, res) => {
    const { id } = req.params;
    const sql = `
        SELECT student_id, name, class_description, contact_info, email, father_name, mother_name, village
        FROM Students
        WHERE student_id = ?`;
    db.query(sql, [id], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (results.length === 0) {
            return res.status(404).json({ message: 'Student not found' });
        }
        res.status(200).json(results[0]);
    });
});


// Get a student by name and class description
router.get('/student-details', (req, res) => {
    const { name, class_description } = req.query;

    console.log('Received parameters:', { name, class_description });

    const sql = `
        SELECT *
        FROM Students
        WHERE TRIM(LOWER(name)) = TRIM(LOWER(?)) AND TRIM(LOWER(class_description)) = TRIM(LOWER(?))
    `;

    db.query(sql, [name, class_description], (err, results) => {
        console.log('Executed query:', sql, [name, class_description]);

        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: err.message });
        }

        if (results.length === 0) {
            console.log('No matching student found in database.');
            return res.status(404).json({ message: 'Student not found' });
        }

        console.log('Student found:', results[0]);
        res.status(200).json(results[0]);
    });
});




// Update a student
router.put('/:id', (req, res) => {
    const { id } = req.params;
    const { name, class_description, contact_info, email, father_name, mother_name, village } = req.body;
    const sql = `
        UPDATE Students
        SET name = ?, class_description = ?, contact_info = ?, email = ?, father_name = ?, mother_name = ?, village = ?
        WHERE student_id = ?`;

    db.query(sql, [name, class_description, contact_info, email, father_name, mother_name, village, id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(200).json({ message: 'Student updated successfully' });
    });
});

// Delete a student
router.delete('/:id', (req, res) => {
    const { id } = req.params;
    const sql = 'DELETE FROM Students WHERE student_id = ?';

    db.query(sql, [id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(200).json({ message: 'Student deleted successfully' });
    });
});

module.exports = router;

