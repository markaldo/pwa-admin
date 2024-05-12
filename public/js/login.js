auth.onAuthStateChanged(user => {
  if (user) {
    //console.log('user logged in: ', user);
  } else {
    //console.log('user logged out');
  }
})

// login.js
document.getElementById('loginForm').addEventListener('submit', function(event) {
  event.preventDefault();
  
  const mail = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  // Log the user in
  auth.signInWithEmailAndPassword(mail, password)
      .then((cred) => {
          // If authentication is successful, set isLoggedIn to true
          localStorage.setItem('isLoggedIn', 'true');
          
          // Get user's geolocation
          if ('geolocation' in navigator) {
              navigator.geolocation.getCurrentPosition(position => {
                  const { latitude, longitude } = position.coords;
                  //console.log(`Latitude: ${latitude}, Longitude: ${longitude}`);
                  
                  // Reverse geocode coordinates to get city and country
                  reverseGeocode(latitude, longitude, cred.user.uid, mail);
              }, error => {
                  console.error('Error getting geolocation:', error);
              });
          } else {
              console.error('Geolocation is not supported by this browser.');
          }

          // If authentication is successful, redirect to index.html
          //window.location.href = '/index.html';
      })
      .catch(err => {
          // If authentication fails, display error message
          document.querySelector('.log').textContent = "Wrong Credentials";
      });
});

// Reverse geocode coordinates to get address and save to Firestore
function reverseGeocode(latitude, longitude, userId, mail) {
  if (!latitude || !longitude) {
      console.error('Latitude or longitude values are empty.');
      return;
  }

  const apiKey = 'API_key';
  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`;

  fetch(url)
      .then(response => response.json())
      .then(data => {
          if (data.status === 'OK') {
              // Extract city, country, and district (if available) from results
              const addressComponents = data.results[0].address_components;
              let city, country, district;

              for (const component of addressComponents) {
                  if (component.types.includes('locality')) {
                      city = component.long_name;
                  }
                  if (component.types.includes('country')) {
                      country = component.long_name;
                  }
                  if (component.types.includes('administrative_area_level_2')) {
                      district = component.long_name;
                  }
              }

              console.log('User details:', {
                    userId,
                    mail,
                    country,
                    city,
                    district,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
              });

              // Save user details to Firestore
              db.collection('history').add({
                    userId,
                    mail,
                    country,
                    city,
                    district,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
              }).then(() => {
                    console.log('User details saved to Firestore.');
                    // If authentication is successful, redirect to index.html
                    window.location.href = '/index.html';
              }).catch(error => {
                  console.error('Error saving user details to Firestore:', error);
              });
          } else {
              console.error('Reverse geocoding failed:', data.status);
          }
      })
      .catch(error => {
          console.error('Error fetching reverse geocoding data:', error);
      });
}





