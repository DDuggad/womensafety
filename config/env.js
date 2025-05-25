const joi = require('joi');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Define validation schema
const envSchema = joi.object({
    NODE_ENV: joi.string().valid('development', 'production', 'test').default('development'),
    PORT: joi.number().default(8080),
    MONGODB_URI: joi.string().required().description('MongoDB connection string'),
    SESSION_SECRET: joi.string().required().description('Session secret key'),
    GOOGLE_MAPS_KEY: joi.string().required().description('Google Maps API key'),
    GOOGLE_GEMINI_API_KEY: joi.string().required().description('Google Gemini API key'),
    EMAIL_SERVICE: joi.string().description('Email service provider'),
    EMAIL_USER: joi.string().description('Email username'),
    EMAIL_PASS: joi.string().description('Email password')
}).unknown();

// Validate env variables
const { error, value: env } = envSchema.validate(process.env);

if (error) {
    throw new Error(`Environment validation error: ${error.message}`);
}

module.exports = env;
