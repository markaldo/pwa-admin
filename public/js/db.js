// enable offline data
db.enablePersistence()
  .catch(function(err) {
    if (err.code == 'failed-precondition') {
      // probably multiple tabs open at once
      console.log('persistance failed');
    } else if (err.code == 'unimplemented') {
      // lack of browser support for the feature
      console.log('persistance not available');
    }
  });

// real-time listener
db.collection('cakes').onSnapshot(snapshot => {
  snapshot.docChanges().forEach(change => {
    if(change.type === 'added'){
      renderRecipe(change.doc.data(), change.doc.id);
    }
    if(change.type === 'removed'){
      removeRecipe(change.doc.id);
    }
  });
});

// Global variable to store the captured image data
let capturedImage;
let stream; // To store the camera stream

// Event listeners
document.getElementById('take-picture-button').addEventListener('click', openCamera);
document.getElementById('capture-button').addEventListener('click', takePhoto);
document.getElementById('retake-button').addEventListener('click', retakePhoto);
document.getElementById('close-button').addEventListener('click', closeCamera);
document.getElementById('save-gallery-button').addEventListener('click', saveToGallery);

// Open camera function
async function openCamera() {

  const video = document.getElementById('camera-stream');
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    // Show an error notification
    showNotification('error', 'getUserMedia is not supported in this browser.');
    console.error('getUserMedia is not supported in this browser.');
    return;
  }

  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    video.srcObject = stream;
    video.style.display = 'block';
    document.getElementById('capture-button').style.display = 'inline-block'; // Show capture button
    document.getElementById('close-button').style.display = 'inline-block'; // Show close button
  } catch (error) {
    // Show an error notification
    showNotification('error', 'Access to camera was denied.');
    console.error('Access to camera was denied:', error);
  }
}

// Take photo function
async function takePhoto(event) {
  event.preventDefault();
  const video = document.getElementById('camera-stream');
  const canvas = document.getElementById('captured-image');
  const context = canvas.getContext('2d');
  
  await waitForVideoReady(video);

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  canvas.style.display = 'block';

  const rawImage = canvas.toDataURL('image/png');
  capturedImage = dataURLToBlob(rawImage);
  //console.log('Captured image data:', capturedImage);
  // Show a success notification
  showNotification('success', 'Image successfully captured.');

  closeCamera(); // Close the camera after capturing the photo
  document.getElementById('retake-button').style.display = 'inline-block'; // Show retake button
  document.getElementById('save-gallery-button').style.display = 'inline-block'; // Show save to gallery button
}

// Retake photo function
function retakePhoto() {
  document.getElementById('captured-image').style.display = 'none'; // Hide the captured image
  document.getElementById('retake-button').style.display = 'none'; // Hide the retake button
  document.getElementById('save-gallery-button').style.display = 'none'; // Hide the save to gallery button

  openCamera(); // Reopen the camera
}

// Function to save the captured image to the device's gallery
async function saveToGallery() {
  if (!capturedImage) {
    // Show an error notification
    showNotification('error', 'No image captured yet.');
    //console.error('No image captured yet.');
    return;
  }

  try {
    const handle = await window.showSaveFilePicker({
      types: [{
        description: 'Image file',
        accept: {
          'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp']
        }
      }]
    });

    const fileStream = await handle.createWritable();
    await fileStream.write(capturedImage);
    await fileStream.close();
    
    // Show a success notification
    showNotification('success', 'Image saved to gallery successfully.');
    // console.log('Image saved to gallery successfully.');
  } catch (err) {

    // Show an error notification
    showNotification('error', 'Problem saving image.');
    // console.error('Error saving image to gallery:', err);
  }
}

// Close camera function
function closeCamera() {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    stream = null;
  }
  document.getElementById('camera-stream').style.display = 'none';
  document.getElementById('capture-button').style.display = 'none';
  document.getElementById('close-button').style.display = 'none';
}

// Helper functions
async function waitForVideoReady(video) {
  return new Promise((resolve) => {
    const checkVideo = () => {
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        resolve();
      } else {
        requestAnimationFrame(checkVideo);
      }
    };
    checkVideo();
  });
}

// Update the submitForm function
function clearImageOnForm() {

  if (capturedImage) {
  // Clear the captured image and canvas
  capturedImage = null;
  const canvas = document.getElementById('captured-image');
  canvas.width = 0;
  canvas.height = 0;
  canvas.style.display = 'none';

  // Hide retake and save to gallery buttons
  document.getElementById('retake-button').style.display = 'none';
  document.getElementById('save-gallery-button').style.display = 'none';
  
  // Close the camera
  closeCamera();
  }
}

function dataURLToBlob(dataURL) {
  const byteString = atob(dataURL.split(',')[1]);
  const mimeString = dataURL.split(',')[0].split(':')[1].split(';')[0];
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type: mimeString });
}

async function uploadImageToFirebase(imageFile) {
  if (!imageFile) {
    return null; // No image to upload
  }

  const storageRef = firebase.storage().ref();
  const fileRef = storageRef.child(`images/${imageFile.name}`);
  await fileRef.put(imageFile);
  return await fileRef.getDownloadURL();
}

async function addRecipe() {
  event.preventDefault(); // Prevent the form from submitting in the traditional way

  // Get form values
  const form = document.getElementById('addRecipe');
  const title = document.getElementById('title').value;
  const ingredients = document.getElementById('ingredients').value;
  const price = document.getElementById('price').value;
  const uploadedImage = document.getElementById('image').files[0];
  const imageFile = uploadedImage || capturedImage;

  // Check if the browser is online
  if (navigator.onLine) {
    // If online, directly save the recipe to Firestore
    await saveRecipeOnline(title, ingredients, price, imageFile);
  } else {
    // If offline, save the recipe to IndexedDB
    saveRecipeOffline(title, ingredients, price, imageFile);
  }
  clearImageOnForm();
  form.reset();
}

// Listen for network status changes
window.addEventListener('online', () => {
    // Show an info notification
    showNotification('info', 'Starting background sync.');
    syncDataWithFirebase(); 
});

async function saveRecipeOnline(title, ingredients, price, uploadedImage) {
  try {
    const imageURL = await uploadImageToFirebase(uploadedImage);

    // Save recipe data to Firestore
    await saveRecipe(title, ingredients, price, imageURL);
  } catch (error) {
    // Show an error notification
    showNotification('error', 'On saving recipe, ', error);
    // console.error('Error saving recipe online:', error);
    document.querySelector('.msg-update').textContent = "Error adding product: " + error.message;
  }
}

function saveRecipeOffline(title, ingredients, price, uploadedImage) {
  // Save form data to IndexedDB for later synchronization
  const recipeData = {
    title: title,
    ingredients: ingredients,
    price: price
  };

  if (uploadedImage) {
    recipeData.imageFile = uploadedImage;
  }

  saveToIndexedDB(recipeData);
}

async function saveRecipe(title, ingredients, price, imageURL) {
  // Save recipe data to Firestore
  const recipeData = {
    name: title,
    ingredients: ingredients,
    price: price
  };

  if (imageURL) {
    recipeData.url = imageURL;
  }

  try {
    await db.collection('cakes').add(recipeData);
      // Show a success notification
    showNotification('success', 'Successfully added recipe.');
    //console.log('Recipe added successfully');
    document.querySelector('.msg-update').textContent = "Product added successfully!";
    
  } catch (error) {
    // Show an error notification
    showNotification('error', 'On adding recipe, ', error);
    // console.error('Error adding recipe:', error);
    document.querySelector('.msg-update').textContent = "Error adding product: " + error.message;
  }
}

// Function to save recipe data to IndexedDB
function saveToIndexedDB(data) {
  const request = window.indexedDB.open('recipes-db', 1);
  const storeName = "recipes";

  request.onsuccess = (event) => {
    const idb = event.target.result;
    const transaction = idb.transaction([storeName], 'readwrite');
    const objectStore = transaction.objectStore(storeName);

    const addRequest = objectStore.add(data);

    addRequest.onsuccess = () => {
      // Show an info notification
      showNotification('info', 'Device is offline. Data saved locally for later syncronization.');
      console.log('Data saved to IndexedDB');
    };

    addRequest.onerror = () => {
      // Show an error notification
      showNotification('error', 'Offline. Error saving data locally.');
      console.error('Error saving data to IndexedDB');
    };
  };

  request.onupgradeneeded = (event) => {
    const idb = event.target.result;
    idb.createObjectStore(storeName, { autoIncrement: true });
  };

  request.onerror = (event) => {
    // Show an error notification
    showNotification('error', 'Offline. Error opening IndexedDB database.');
    // console.error('Error opening IndexedDB database');
  };
}

// remove a recipe
const recipeContainer = document.querySelector('.recipes');
recipeContainer.addEventListener('click', evt => {
  if(evt.target.tagName === 'I'){
    const id = evt.target.getAttribute('data-id');
    const imageUrl = evt.target.getAttribute('data-url'); // Get the image URL
    // Check if there is an image URL attached to the recipe
    if (imageUrl) {
      // Create a storage reference to the image
      const imageRef = firebase.storage().refFromURL(imageUrl);
      // Delete the image from Firebase Storage
      imageRef.delete()
        .then(() => {
          // Show a success notification
          showNotification('warning', 'Image deleted successfully.');
          //console.log('Image deleted successfully');
        })
        .catch(error => {
          // Show an error notification
          showNotification('error', 'Error deleting image.');
          console.error('Error deleting image:', error);
        });
    }
    // Delete the recipe document from Firestore
    db.collection('cakes').doc(id).delete()
      .then(() => {
        // Show a warning notification
        showNotification('warning', 'Recipe deleted successfullly.');
        // console.log('Recipe deleted successfully');
      })
      .catch(error => {
        // Show an error notification
        showNotification('error', 'Error deleting recipe.');
        console.error('Error deleting recipe:', error);
      });
  }
});

// Function to synchronize data with Firebase when online
async function syncDataWithFirebase() {
  try {
    // Retrieve data from IndexedDB
    const recipeData = await getAllDataFromIndexedDB();
      let key = 1;
      // Iterate through each saved recipe data
      for (const data of recipeData) {
        // Check if the recipe has an image file
        if (data.imageFile) {
          // Upload the image file to Firebase to get the image URL
          const imageURL = await uploadImageToFirebase(data.imageFile);
          
          // Save the recipe data to Firebase
          await saveRecipe(data.title, data.ingredients, data.price, imageURL);
        }else{
          // If there is no image, just save
          await saveRecipe(data.title, data.ingredients, data.price, null);
        }
        
        // Remove the synced recipe data from IndexedDB
        await removeFromIndexedDB(key);
        key++;
      }

    // Show an info notification
    showNotification('info', 'Sync with server complete.');
    console.log('Data synced with Firebase successfully');
    deleteIndexedDBDatabase();
  } catch (error) {
    // Show an error notification
    showNotification('error', 'Sync with server failed.');
    console.error('Error syncing data with Firebase:', error);
  }
}

// Function to retrieve all data from IndexedDB
async function getAllDataFromIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open('recipes-db', 1);
    const storeName = 'recipes';

    request.onsuccess = (event) => {
      const idb = event.target.result;
      const transaction = idb.transaction([storeName], 'readonly');
      const objectStore = transaction.objectStore(storeName);

      const getRequest = objectStore.getAll();

      getRequest.onsuccess = (event) => {
        const data = event.target.result;
        console.log('Retrieved data from IndexedDB:', data);
        resolve(data);
      };

      getRequest.onerror = () => {
        console.error('Error retrieving data from IndexedDB');
        reject(new Error('Error retrieving data from IndexedDB'));
      };
    };

    request.onerror = (event) => {
      console.error('Error opening IndexedDB database');
      reject(new Error('Error opening IndexedDB database'));
    };
  });
}


// Function to remove recipe data from IndexedDB
function removeFromIndexedDB(recipeId) {
  const request = window.indexedDB.open('recipes-db', 1);
  const storeName = "recipes";

  request.onsuccess = (event) => {
    const idb = event.target.result;
    const transaction = idb.transaction([storeName], 'readwrite');
    const objectStore = transaction.objectStore(storeName);

    const deleteRequest = objectStore.delete(recipeId);

    deleteRequest.onsuccess = () => {
      console.log('Recipe removed from IndexedDB');
    };

    deleteRequest.onerror = () => {
      console.error('Error removing recipe from IndexedDB');
    };
  };

  request.onerror = (event) => {
    console.error('Error opening IndexedDB database');
  };
}

function deleteIndexedDBDatabase() {
  const request = window.indexedDB.deleteDatabase('recipes-db');

  request.onsuccess = () => {
    console.log('IndexedDB database "recipes-db" deleted successfully');
  };

  request.onerror = (event) => {
    console.error('Error deleting IndexedDB database:', event.target.error);
  };

  request.onblocked = () => {
    console.warn('IndexedDB database "recipes-db" is blocked and cannot be deleted');
  };
}

let existingNotifications = {};

function showNotification(type, message) {
  // Check if a notification with the same message already exists
  if (existingNotifications[message]) {
    // Update the existing notification
    const notificationElement = existingNotifications[message];
    notificationElement.classList.remove(...notificationElement.classList);
    notificationElement.classList.add('toast', type);
    notificationElement.querySelector('.content').innerHTML = `
      <strong>${getTitle(type)}</strong></br>
      ${message}
    `;
  } else {
    // Create a new notification element
    const notificationElement = document.createElement('div');
    notificationElement.classList.add('toast', type);
    notificationElement.innerHTML = `
      <i class="material-icons" style="color: ${getIconColor(type)};">${getIconName(type)}</i>
      <div class="content">
        <strong>${getTitle(type)}</strong></br>
        ${message}
      </div>
      <span class="close">×</span>
    `;

    // Add the close event listener
    const closeButton = notificationElement.querySelector('.close');
    closeButton.addEventListener('click', () => {
      notificationElement.remove();
      delete existingNotifications[message];
      repositionNotifications();
    });

    // Append the notification to the body
    document.body.appendChild(notificationElement);

    // Store the notification element in the existingNotifications object
    existingNotifications[message] = notificationElement;

    // Position the notification
    repositionNotifications();

    // Remove the notification after 5 seconds
    setTimeout(() => {
      notificationElement.remove();
      delete existingNotifications[message];
      repositionNotifications();
    }, 5000);
  }
}

// Helper functions to get the icon name, icon color, and title based on the notification type
function getIconName(type) {
  switch (type) {
    case 'success':
      return 'check_circle';
    case 'info':
      return 'info';
    case 'warning':
      return 'warning';
    case 'error':
      return 'error';
    default:
      return '';
  }
}

function getIconColor(type) {
  switch (type) {
    case 'success':
      return '#05FF00';
    case 'info':
      return '#0085FF';
    case 'warning':
      return 'yellow';
    case 'error':
      return '#FF4040';
    default:
      return '';
  }
}

function getTitle(type) {
  switch (type) {
    case 'success':
      return 'Success!';
    case 'info':
      return 'Information!';
    case 'warning':
      return 'Warning!';
    case 'error':
      return 'Error!';
    default:
      return '';
  }
}

// Function to reposition notifications
function repositionNotifications() {
  const notifications = document.querySelectorAll('.toast');
  notifications.forEach((notification, index) => {
    notification.style.transform = `translateX(-50%) translateY(${index * 100}%)`;
  });
}






