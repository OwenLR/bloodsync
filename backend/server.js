const express = require('express');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

app.use(express.json());

// Routes
const roleRoutes = require('./app/routes/roleRoutes');
const branchRoutes = require('./app/routes/branchRoutes');
const hospitalRoutes = require('./app/routes/hospitalRoutes'); 

app.use('/api/roles', roleRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/hospitals', hospitalRoutes);

app.get('/', (req, res) => {
    res.json({ message: 'BloodSync API is running' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});