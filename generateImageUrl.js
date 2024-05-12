const admin = require('firebase-admin');
const serviceAccount = require('c:/Users/MK/Downloads/file.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'gs://projectname-firestore-somenumber.appspot.com' // Replace with your storage bucket URL
});

const bucket = admin.storage().bucket();

// Get the file reference
const file = bucket.file('gs://projectname-firestore-somenumber.appspot.com/images/chocolate2.jpeg'); // Replace with the path to your image

// Get a signed URL for the file with an expiration time (in milliseconds)
const expires = Date.now() + 3600 * 1000; // URL expires in 1 hour
file.getSignedUrl({
  action: 'read',
  expires: expires
}).then(signedUrls => {
  const url = signedUrls[0];
  console.log('Publicly accessible URL:', url);
}).catch(error => {
  console.error('Error generating URL:', error);
});
