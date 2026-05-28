const express = require('express');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// Middleware
app.use(express.json());

// Routes
const roleRoutes = require('./app/routes/roleRoutes');
app.use('/api/roles', roleRoutes);

// Base route
app.get('/', (req, res) => {
    res.json({ message: 'BloodSync API is running' });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});