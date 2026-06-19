const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// 1. Initialize SQLite Database
const db = new sqlite3.Database('./database.sqlite', (err) => {
    if (err) console.error('Database connection error:', err.message);
    else console.log('Connected to the SQLite workflow database.');
});

// 2. Create the Database Table if it doesn't exist
db.run(`CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    status TEXT DEFAULT 'Processing',
    date_added TEXT
)`);

// 3. Serve Frontend Files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 4. API Endpoint: Get all active records
app.get('/api/clients', (req, res) => {
    db.all("SELECT * FROM clients WHERE status = 'Processing' ORDER BY id DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// 5. API Endpoint: Get count of completed items
app.get('/api/clients/completed-count', (req, res) => {
    db.get("SELECT COUNT(*) as count FROM clients WHERE status = 'Completed'", [], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ count: row.count });
    });
});

// 6. API Endpoint: Smart Import (Add multiple clients)
app.post('/api/import', (req, res) => {
    const { names } = req.body;
    if (!names || !Array.isArray(names)) return res.status(400).json({ error: 'Invalid data format' });

    const stmt = db.prepare("INSERT INTO clients (name, date_added) VALUES (?, ?)");
    const dateStr = new Date().toLocaleDateString();

    names.forEach(name => {
        if (name.trim() !== '') {
            stmt.run(name.trim(), dateStr);
        }
    });
    stmt.finalize();
    res.json({ success: true });
});

// 7. API Endpoint: Move a client to Completed status
app.post('/api/clients/:id/complete', (req, res) => {
    const { id } = req.params;
    db.run("UPDATE clients SET status = 'Completed' WHERE id = ?", [id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// Start application
app.listen(PORT, () => {
    console.log(`🚀 Production server ready at: http://localhost:${PORT}`);
});