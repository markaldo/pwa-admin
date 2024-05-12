// Check if the browser supports service workers and push notifications
if ('serviceWorker' in navigator && 'PushManager' in window) {
  // Register the service worker
  navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
          // Registration was successful
          console.log('Service Worker registered');

          // Request permission for push notifications
          return registration.pushManager.getSubscription()
              .then(async (subscription) => {
                  if (subscription) {
                      return subscription;
                  }

                  const response = await registration.pushManager.subscribe({
                      userVisibleOnly: true,
                      applicationServerKey: 'BMIt5SA2i-YEaVLdL5ZHFp9_y9POABdd6Ul2O7MvNlzJLbooFvuwa2Y3i2zdBKa14Y7hTjzRwSNzVqVNQUnGwno'
                  });

                  return response;
              });
      })
      .then((subscription) => {
          console.log('User is subscribed !');
          //console.log('User is subscribed:', subscription);
          // Send subscription to server for saving
          //To Implement notifications method
      })
      .catch((error) => {
          console.error('Service Worker registration failed:', error);
      });
}

