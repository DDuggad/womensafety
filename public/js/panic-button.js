// Add this to your panic button JavaScript file or to your inline script that handles the panic button

// When panic button is pressed
document.getElementById('panic-button').addEventListener('click', function (e) {
    e.preventDefault();

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
            const latitude = position.coords.latitude;
            const longitude = position.coords.longitude;

            // First, send the panic alert
            fetch('/panic', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ latitude, longitude })
            })
                .then(response => response.json())
                .then(data => {
                    console.log('Panic alert sent:', data);
                    // Show confirmation to user
                    alert('Emergency alert sent to your emergency contacts!');
                })
                .catch(error => {
                    console.error('Error sending panic alert:', error);
                    alert('Error sending emergency alert. Please try again or call emergency services directly.');
                });
        });
    } else {
        alert('Geolocation is not supported by this browser.');
    }
});
