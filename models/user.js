const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  emergencyContact: { type: String, default: '' }  // ← Add here
});

module.exports = mongoose.model('User', userSchema);
