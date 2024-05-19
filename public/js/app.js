// Check if the browser supports service workers and push notifications
if ('serviceWorker' in navigator && 'PushManager' in window) {
    // Register the service worker
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        // Registration was successful
        console.log('Service Worker registered');
  
        // Request permission for push notifications and local notifications
        requestNotificationPermission(registration);
      })
      .catch((error) => {
        console.error('Service Worker registration failed:', error);
      });
  }
  
  // Request notification permission
  function requestNotificationPermission(registration) {
    Notification.requestPermission().then((permission) => {
      if (permission === 'granted') {
        console.log('Notification permission granted.');
  
        // Subscribe to push notifications (if needed)
        subscribeToNotifications(registration);
      } else {
        console.log('Notification permission denied.');
      }
    });
  }
  
  // Subscribe to push notifications (if needed)
  function subscribeToNotifications(registration) {
    return registration.pushManager.getSubscription()
      .then(async (subscription) => {
        if (subscription) {
          return subscription;
        }
  
        const response = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: 'my_public_api_key'
        });
  
        return response;
      })
      .then((subscription) => {
        console.log('User is subscribed !');
        // Send subscription to server for saving
        // To Implement notifications method
      });
  }
  