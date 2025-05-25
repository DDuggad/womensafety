/**
 * Safety Monitor - Automatically checks location safety
 * Updates every 5 minutes and notifies on changes
 */

let lastSafetyRating = null;
let lastSafetyCheck = 0;
let safetyCheckRetryCount = 0;
let safetyCheckInterval = null;
let safetyRetryTimeout = null;
let isInitialCheck = true;

// Initialize safety monitoring
function initSafetyMonitor(refreshInterval, retryInterval) {
    console.log("Initializing safety monitor...");

    // Convert to milliseconds if needed
    refreshInterval = refreshInterval || 300000; // 5 minutes default
    retryInterval = retryInterval || 30000;     // 30 seconds default

    // Get current location and evaluate safety immediately
    getCurrentPositionAndEvaluate();

    // Set up recurring safety check
    safetyCheckInterval = setInterval(() => {
        getCurrentPositionAndEvaluate();
    }, refreshInterval);

    console.log(`Safety monitor initialized. Refresh: ${refreshInterval}ms, Retry: ${retryInterval}ms`);

    // Remove any popup safety indicator if it exists
    document.addEventListener('DOMContentLoaded', () => {
        const safetyIndicator = document.getElementById('safety-indicator');
        if (safetyIndicator && safetyIndicator.parentNode) {
            safetyIndicator.parentNode.removeChild(safetyIndicator);
        }
    });
}

// Get current position and evaluate safety
function getCurrentPositionAndEvaluate() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            position => {
                console.log("Got current position, evaluating safety...");
                evaluateAreaSafety(position.coords.latitude, position.coords.longitude);
            },
            error => {
                console.error("Error getting location:", error);
                displaySafetyError("Could not access your location");
            }
        );
    } else {
        console.error("Geolocation not supported");
        displaySafetyError("Your browser doesn't support location services");
    }
}

// Evaluate area safety
function evaluateAreaSafety(latitude, longitude) {
    console.log(`Evaluating safety at: ${latitude}, ${longitude}`);

    // Show loading indicator if this is first check
    if (!lastSafetyRating) {
        updateSafetyDisplay("loading", "Evaluating area safety...");
    }

    fetch('/evaluate-location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude, longitude })
    })
        .then(response => response.json())
        .then(data => {
            // Clear any retry timers
            if (safetyRetryTimeout) {
                clearTimeout(safetyRetryTimeout);
                safetyRetryTimeout = null;
            }

            safetyCheckRetryCount = 0;
            lastSafetyCheck = Date.now();

            // Check if safety rating has changed
            const hasChanged = !lastSafetyRating ||
                lastSafetyRating.rating !== data.rating ||
                lastSafetyRating.judgement !== data.judgement;

            // Update the display if it's the first check or if the rating changed
            if (hasChanged) {
                updateSafetyDisplay(data.rating, data.judgement);

                // Notify the user if this isn't the first check and rating changed
                if (lastSafetyRating && !isInitialCheck) {
                    notifySafetyChange(lastSafetyRating, data);
                }

                lastSafetyRating = data;
                isInitialCheck = false;
            }
        })
        .catch(error => {
            console.error("Error evaluating safety:", error);

            // Retry logic - attempt every 30 seconds until successful
            safetyCheckRetryCount++;

            // Display error after first retry
            if (safetyCheckRetryCount > 1) {
                displaySafetyError("Could not evaluate area safety");
            }

            // Set up retry
            const retryInterval = window.safetyRetryInterval || 30000; // 30 seconds default
            console.log(`Will retry safety check in ${retryInterval}ms`);

            if (safetyRetryTimeout) {
                clearTimeout(safetyRetryTimeout);
            }

            safetyRetryTimeout = setTimeout(() => {
                getCurrentPositionAndEvaluate();
            }, retryInterval);
        });
}

// Update safety display
function updateSafetyDisplay(rating, judgement) {
    // Update ONLY the main safety rating area in the page
    const areaRating = document.getElementById('area-rating');
    if (areaRating) {
        if (rating === 'loading') {
            areaRating.innerHTML = `
        <div class="d-flex align-items-center justify-content-center">
          <div class="spinner-border text-primary me-2" role="status" style="width: 1.5rem; height: 1.5rem;">
            <span class="visually-hidden">Loading...</span>
          </div>
          <span>Analyzing area safety...</span>
        </div>
      `;
            return;
        }

        if (rating === 'error') {
            areaRating.textContent = "Unable to evaluate area safety";
            return;
        }

        // Update the main area rating
        areaRating.textContent = `Area Safety Rating: ${rating}/5 - ${judgement}`;

        // Style the main area rating based on safety level
        areaRating.style.backgroundColor = '';
        const panicBtn = document.querySelector('.panic-btn');

        if (rating >= 4) {
            areaRating.style.borderLeftColor = '#28a745';
            areaRating.style.background = 'linear-gradient(135deg, rgba(40, 167, 69, 0.05) 0%, rgba(40, 167, 69, 0.02) 100%)';
        } else if (rating === 3) {
            areaRating.style.borderLeftColor = '#ffc107';
            areaRating.style.background = 'linear-gradient(135deg, rgba(255, 193, 7, 0.05) 0%, rgba(255, 193, 7, 0.02) 100%)';
        } else if (rating === 2) {
            areaRating.style.borderLeftColor = '#fd7e14';
            areaRating.style.background = 'linear-gradient(135deg, rgba(253, 126, 20, 0.08) 0%, rgba(253, 126, 20, 0.05) 100%)';
            if (!isInitialCheck) {
                showSafetyAlert("Warning: The area is rated 2/5 - Unsafe Area. Please be cautious.");
            }
        } else if (rating <= 1) {
            areaRating.style.borderLeftColor = '#dc3545';
            areaRating.style.background = 'linear-gradient(135deg, rgba(220, 53, 69, 0.1) 0%, rgba(220, 53, 69, 0.05) 100%)';
            if (panicBtn) panicBtn.style.backgroundColor = '#dc3545';
            if (panicBtn) panicBtn.classList.add('pulsing');
            if (!isInitialCheck) {
                showSafetyAlert("Critical Warning: The area is rated 1/5 - Unsafe Area. This location is extremely dangerous!");
            }
        }
    }
}

// Helper function to show safety alerts after a short delay
function showSafetyAlert(message) {
    // Only show alerts if user hasn't interacted with the page yet
    if (document.hasFocus()) {
        setTimeout(() => alert(message), 500);
    }
}

// Display safety error
function displaySafetyError(message) {
    updateSafetyDisplay('error', message);
}

// Notify user of safety change
function notifySafetyChange(oldRating, newRating) {
    // Only notify if safety decreased
    if (newRating.rating < oldRating.rating) {
        // Only show a notification, not a dialog box
        const notification = document.createElement('div');
        notification.className = 'safety-notification';
        notification.innerHTML = `
      <div class="notification-title">Safety Alert</div>
      <div class="notification-content">
        Area safety changed from "${oldRating.judgement}" to "${newRating.judgement}"
      </div>
    `;

        // Add notification to page
        document.body.appendChild(notification);

        // Remove after 10 seconds
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 1000);
        }, 10000);

        // Also try browser notification if supported
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Safety Alert', {
                body: `Area safety changed from "${oldRating.judgement}" to "${newRating.judgement}"`,
                icon: '/img/logo.png'
            });
        }
    }
}

// Request notification permission
function requestNotificationPermission() {
    if ('Notification' in window) {
        if (Notification.permission !== 'denied') {
            Notification.requestPermission();
        }
    }
}

// On page load
document.addEventListener('DOMContentLoaded', () => {
    // Request notification permission
    requestNotificationPermission();

    // Start safety monitoring with configured intervals
    initSafetyMonitor(
        window.safetyRefreshInterval,
        window.safetyRetryInterval
    );

    // Override page's evaluateLocation function to prevent duplicate calls
    if (window.evaluateLocation) {
        const originalEvaluateLocation = window.evaluateLocation;
        window.evaluateLocation = function () {
            console.log("Original evaluateLocation call intercepted - handled by safety-monitor.js");
            // Don't call the original function to prevent duplicate API calls
        };
    }

    // Remove any popup safety indicator elements
    const safetyIndicator = document.getElementById('safety-indicator');
    if (safetyIndicator && safetyIndicator.parentNode) {
        safetyIndicator.parentNode.removeChild(safetyIndicator);
    }
});
