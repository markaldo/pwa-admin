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

document.getElementById('take-picture-button').addEventListener('click', function() {
  openCamera();
});

function openCamera() {
  const video = document.getElementById('camera-stream');
  const canvas = document.getElementById('captured-image');
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      const constraints = { video: true, audio: false };

      navigator.mediaDevices.getUserMedia(constraints)
          .then(function(stream) {
              video.srcObject = stream;
              video.style.display = 'block';
          })
          .catch(function(error) {
              console.error('Access to camera was denied:', error);
          });
  } else {
      console.error('getUserMedia is not supported in this browser.');
  }
}

function takePhoto() {
  const video = document.getElementById('camera-stream');
  const canvas = document.getElementById('captured-image');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
  canvas.style.display = 'block';
  capturedImage = canvas.toDataURL('image/png'); // Get base64-encoded image data
}

// Add event listener for "Take Picture" button
document.getElementById('take-picture-button').addEventListener('click', takePhoto);


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

  form.reset();
}

// Listen for network status changes
window.addEventListener('online', () => {
    syncDataWithFirebase(); 
});

async function saveRecipeOnline(title, ingredients, price, uploadedImage) {
  try {
    const imageURL = await uploadImageToFirebase(uploadedImage);

    // Save recipe data to Firestore
    await saveRecipe(title, ingredients, price, imageURL);
  } catch (error) {
    console.error('Error saving recipe online:', error);
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
    console.log('Recipe added successfully');
    document.querySelector('.msg-update').textContent = "Product added successfully!";
    
  } catch (error) {
    console.error('Error adding recipe:', error);
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
      console.log('Data saved to IndexedDB');
    };

    addRequest.onerror = () => {
      console.error('Error saving data to IndexedDB');
    };
  };

  request.onupgradeneeded = (event) => {
    const idb = event.target.result;
    idb.createObjectStore(storeName, { autoIncrement: true });
  };

  request.onerror = (event) => {
    console.error('Error opening IndexedDB database');
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
          console.log('Image deleted successfully');
        })
        .catch(error => {
          console.error('Error deleting image:', error);
        });
    }
    // Delete the recipe document from Firestore
    db.collection('cakes').doc(id).delete()
      .then(() => {
        console.log('Recipe deleted successfully');
      })
      .catch(error => {
        console.error('Error deleting recipe:', error);
      });
  }
});

// Function to synchronize data with Firebase when online
async function syncDataWithFirebase() {
  try {
    // Retrieve data from IndexedDB
    const recipeData = await getAllDataFromIndexedDB();
      let key = 0;
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
    console.log('Data synced with Firebase successfully');
  } catch (error) {
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



