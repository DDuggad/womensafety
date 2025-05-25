const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 600 }); // 10 minutes default TTL

function cacheMiddleware(ttl) {
    return (req, res, next) => {
        // Skip caching for authenticated requests or non-GET methods
        if (req.method !== 'GET') {
            return next();
        }

        // Create a cache key from the request URL
        const key = req.originalUrl;
        const cachedResponse = cache.get(key);

        if (cachedResponse) {
            console.log(`Cache hit for ${key}`);
            return res.send(cachedResponse);
        }

        // Store the original send method
        const originalSend = res.send;

        // Override the send method to cache the response
        res.send = function (body) {
            // Don't cache error responses
            if (res.statusCode < 400) {
                cache.set(key, body, ttl || 600);
            }
            originalSend.call(this, body);
        };

        next();
    };
}

module.exports = { cacheMiddleware, cache };
