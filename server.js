const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json()); // Allows us to read JSON from the app

// Connect to Supabase using the .env variable
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // Required for Supabase cloud connection
});

// A simple test route to make sure the server is alive
app.get('/', (req, res) => {
    res.send("Muramba Transport API is running!");
});

// --- AUTHENTICATION ENDPOINTS ---

// 1. Register a User (Encrypts Password)
app.post('/api/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        // Encrypt the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = await pool.query(
            "INSERT INTO Users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email",
            [username, email, hashedPassword]
        );
        res.json({ message: "User registered successfully", user: newUser.rows[0] });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Server error or email already exists" });
    }
});

// 2. Login User
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Find user by email
        const user = await pool.query("SELECT * FROM Users WHERE email = $1", [email]);
        if (user.rows.length === 0) return res.status(401).json({ error: "User not found" });

        // Check password
        const validPassword = await bcrypt.compare(password, user.rows[0].password_hash);
        if (!validPassword) return res.status(401).json({ error: "Invalid password" });

        // In a full app, you would generate a JWT token here for SSO
        res.json({ message: "Login successful", user: { id: user.rows[0].id, username: user.rows[0].username } });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Server error" });
    }
});

// --- DATA ENDPOINTS ---

// 3. Get all drivers (For the app dashboard)
app.get('/api/drivers', async (req, res) => {
    try {
        const allDrivers = await pool.query("SELECT * FROM Drivers");
        res.json(allDrivers.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Server error" });
    }
});

// 4. Get all vehicles
app.get('/api/vehicles', async (req, res) => {
    try {
        const allVehicles = await pool.query("SELECT * FROM Vehicles");
        res.json(allVehicles.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Server error" });
    }
});

// 5. Create a Trip
app.post('/api/trips', async (req, res) => {
    try {
        const { vehicle_id, driver_id, origin, destination, departure_date } = req.body;
        const newTrip = await pool.query(
            "INSERT INTO Trips (vehicle_id, driver_id, origin, destination, departure_date) VALUES ($1, $2, $3, $4, $5) RETURNING *",
            [vehicle_id, driver_id, origin, destination, departure_date]
        );
        res.json({ message: "Trip created", trip: newTrip.rows[0] });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Server error" });
    }
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Connected to database...`);
});