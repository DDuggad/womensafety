const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const User = require('../models/user');

// Auth middleware
function requireLogin(req, res, next) {
    if (!req.session.user) {
        return req.session.destroy(() => res.redirect('/login'));
    }
    next();
}

// Login/signup/logout routes
router.get('/signup', (req, res) => res.render('signup'));
router.post('/signup', async (req, res) => {
    const { name, email, password, emergencyContact, emergencyEmail } = req.body;
    try {
        if (!name || !email || !password || !emergencyContact) {
            return res.send('Required fields are missing');
        }
        if (await User.findOne({ email })) return res.send('User already exists');
        const hash = await bcrypt.hash(password, 10);
        const user = await User.create({
            name,
            email,
            password: hash,
            emergencyContact,
            emergencyEmail // This will be undefined if not provided, which is fine
        });
        req.session.user = user;
        // Redirect to main map page
        res.redirect('/map');
    } catch (e) {
        console.error(e);
        res.send('Signup failed');
    }
});

router.get('/login', (req, res) => res.render('login'));
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user || !await bcrypt.compare(password, user.password))
            return res.send('Invalid credentials');
        req.session.user = user;
        // Redirect to main map page
        res.redirect('/map');
    } catch (e) {
        console.error(e);
        res.send('Login failed');
    }
});

router.get('/logout', (req, res) => {
    req.session.destroy(() => res.redirect('/login'));
});

// Profile routes
router.get('/profile', requireLogin, async (req, res) => {
    try {
        const user = await User.findById(req.session.user._id);
        const justUpdated = req.query.updated === 'true';
        res.render('profile', { user, justUpdated });
    } catch (e) {
        console.error(e);
        res.redirect('/map');
    }
});

router.post('/profile/update', requireLogin, async (req, res) => {
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

module.exports = { router, requireLogin };