const express    = require('express');
const mongoose   = require('mongoose');
const bodyParser = require('body-parser');
const session    = require('express-session');
const path       = require('path');
const dotenv     = require('dotenv');
const bcrypt     = require('bcrypt');
const Location   = require('./models/location');
const User       = require('./models/user');
const sendEmail = require('./utils/sendEmail');

dotenv.config();
const app = express();

// —————————————
// Middleware
// —————————————
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');

app.use(session({
  secret: 'yourSecretKey',
  resave: false,
  saveUninitialized: false
}));

// —————————————
// DB Connection
// —————————————
mongoose.connect('mongodb://127.0.0.1:27017/womensafety', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected!'))
.catch(err => console.error(err));

// —————————————
// Auth Middleware
// —————————————
function requireLogin(req, res, next) {
  if (!req.session.user) {
    return req.session.destroy(() => res.redirect('/login'));
  }
  next();
}

// —————————————
// Routes
// —————————————

// Signup
app.get('/signup', (req, res) => res.render('signup'));
app.post('/signup', async (req, res) => {
  const { name, email, password, emergencyContact } = req.body;
  try {
    if (await User.findOne({ email })) return res.send('User already exists');
    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name, email, password: hash, emergencyContact
    });
    req.session.user = user;
    res.redirect('/dashboard');
  } catch (e) {
    console.error(e);
    res.send('Signup failed');
  }
});

// Login
app.get('/login', (req, res) => res.render('login'));
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user || !await bcrypt.compare(password, user.password))
      return res.send('Invalid credentials');
    req.session.user = user;
    res.redirect('/dashboard');
  } catch (e) {
    console.error(e);
    res.send('Login failed');
  }
});

// Logout
app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

// Dashboard
app.get('/dashboard', requireLogin, (req, res) => {
  res.render('dashboard', { user: req.session.user });
});

// Profile (GET)
app.get('/profile', requireLogin, async (req, res) => {
  try {
    const user = await User.findById(req.session.user._id);
    const justUpdated = req.query.updated === 'true';
    res.render('profile', { user, justUpdated });
  } catch (e) {
    console.error(e);
    res.redirect('/dashboard');
  }
});

// Profile (POST)
app.post('/profile/update', requireLogin, async (req, res) => {
  const { emergencyContact, emergencyEmail } = req.body;

  try {
    const updated = await User.findByIdAndUpdate(
      req.session.user._id,
      { emergencyContact, emergencyEmail },
      { new: true }
    );
    
    req.session.user = updated;
    res.status(200).json({ message: 'Profile updated' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Failed to update profile' });
  }
});


// Save location
app.post('/location', requireLogin, async (req, res) => {
  const { latitude, longitude } = req.body;
  const userId = req.session.user._id;
  if (!latitude || !longitude)
    return res.status(400).json({ message: 'Missing coords' });
  try {
    await Location.create({ latitude, longitude, userId });
    res.json({ message: 'Location saved!' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Save failed' });
  }
});

// Panic alert (save only)
app.post('/panic', requireLogin, async (req, res) => {
  const { latitude, longitude } = req.body;
  const user = req.session.user;

  if (!latitude || !longitude)
    return res.status(400).json({ message: 'Missing coords' });

  try {
    // Save panic alert in the DB
    await Location.create({ latitude, longitude, userId: user._id });

    // Send emergency email if emergencyEmail is saved
    if (user.emergencyEmail) {
      const googleMapsLink = `https://www.google.com/maps?q=${latitude},${longitude}`;
      const message = `
🚨 Panic Alert!

Name: ${user.name}
Email: ${user.email}

📍 Location: ${googleMapsLink}
🕒 Time: ${new Date().toLocaleString()}

This is an emergency alert triggered from the Women’s Safety App.
      `.trim();

      await sendEmail(
        user.emergencyEmail,
        '🚨 Emergency Alert - Panic Button Pressed',
        message
      );

      console.log('📧 Email sent to emergency contact:', user.emergencyEmail);
    } else {
      console.log('⚠️ No emergency email found for this user.');
    }

    res.json({ message: 'Panic alert recorded and email sent (if applicable).' });
  } catch (e) {
    console.error('❌ Panic alert error:', e);
    res.status(500).json({ message: 'Panic save failed' });
  }
});

// JSON for map
app.get('/locations-data', requireLogin, async (req, res) => {
  try {
    const locations = await Location
      .find({ userId: req.session.user._id })
      .sort({ timestamp: -1 })
      .limit(50);
    res.json(locations);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Fetch failed' });
  }
});

// Map page
app.get('/map', requireLogin, (req, res) => {
  res.render('map', {
    googleApiKey: process.env.GOOGLE_MAPS_KEY,
    user: req.session.user
  });
  
});

// Start server
app.listen(process.env.PORT || 8080, () => {
  console.log('Server listening on port 8080');
});



