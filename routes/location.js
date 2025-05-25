const express = require('express');
const router = express.Router();
const Location = require('../models/location');
const { requireLogin } = require('./auth');

// Location routes
router.post('/location', requireLogin, async (req, res) => {
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

router.get('/locations-data', requireLogin, async (req, res) => {
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

router.post('/panic', requireLogin, async (req, res) => {
    const { latitude, longitude } = req.body;
    const user = req.session.user;
    if (!latitude || !longitude)
        return res.status(400).json({ message: 'Missing coords' });
    try {
        // Save panic alert in the DB
        await Location.create({ latitude, longitude, userId: user._id });

        // Send emergency email if an emergencyEmail is provided
        if (user.emergencyEmail) {
            const googleMapsLink = `https://www.google.com/maps?q=${latitude},${longitude}`;
            const message = `
🚨 Panic Alert!

Name: ${user.name}
Email: ${user.email}

📍 Location: ${googleMapsLink}
🕒 Time: ${new Date().toLocaleString()}

This is an emergency alert triggered from the Women's Safety App.
      `.trim();
            await sendEmail(
                user.emergencyEmail,
                '🚨 Emergency Alert - Panic Button Pressed',
                message
            );
            console.log('Email sent to emergency contact:', user.emergencyEmail);
        } else {
            console.log('No emergency email found for this user.');
        }
        res.json({ message: 'Panic alert recorded and email sent (if applicable).' });
    } catch (e) {
        console.error('Panic alert error:', e);
        res.status(500).json({ message: 'Panic save failed' });
    }
});

module.exports = router;