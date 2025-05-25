const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();
const app = express();

// —————————————
// Middleware
// —————————————
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, '..')));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'yourSecretKey',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 3 * 24 * 60 * 60 * 1000 } // 3 days
}));

// —————————————
// DB Connection
// —————————————
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/womensafety', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log('MongoDB connected!'))
  .catch(err => console.error('MongoDB connection error:', err));

// —————————————
// Routes
// —————————————
const authRoutes = require('./routes/auth').router;
const locationRoutes = require('./routes/location');
const safetyRoutes = require('./routes/safety');

// Apply routes
app.use(authRoutes);
app.use(locationRoutes);
app.use(safetyRoutes);

// Static pages
app.get('/map', require('./routes/auth').requireLogin, (req, res) => {
  res.render('map', {
    googleApiKey: process.env.GOOGLE_MAPS_KEY,
    user: req.session.user,
    safetyRefreshInterval: 300000,
    safetyRetryInterval: 30000
  });
});

app.get('/home', (req, res) => res.render('home'));
app.get('/features', (req, res) => res.render('features'));
app.get('/how-it-works', (req, res) => res.render('how-it-works'));

// —————————————
// Scheduled Tasks
// —————————————
const Location = require('./models/location');

// Automatically delete location records older than 18 hours
setInterval(async () => {
  try {
    const cutoff = new Date(Date.now() - 18 * 60 * 60 * 1000);
    const result = await Location.deleteMany({ timestamp: { $lt: cutoff } });
    console.log(`Cleaned up ${result.deletedCount} location record(s) older than 18 hours.`);
  } catch (error) {
    console.error('Error cleaning up old location data:', error);
  }
}, 60 * 60 * 1000); // Runs every hour

// —————————————
// Start the Server
// —————————————
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

