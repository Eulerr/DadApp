// Service Worker for DadApp PWA
const CACHE_NAME = 'dadapp-v1';
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json'
];

// Install event
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      }
    )
  );
});

// Background sync for notifications
self.addEventListener('sync', event => {
  if (event.tag === 'reminder-notifications') {
    event.waitUntil(sendReminderNotifications());
  }
});

// Notification click handler
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow('/')
  );
});

// Function to send reminder notifications
async function sendReminderNotifications() {
  try {
    // Get stored reminders from IndexedDB or localStorage
    const reminders = await getStoredReminders();
    const activeReminders = reminders.filter(r => r.active && r.notificationsEnabled);
    
    for (const reminder of activeReminders) {
      await showNotification(reminder);
    }
  } catch (error) {
    console.error('Error sending reminder notifications:', error);
  }
}

// Show notification
async function showNotification(reminder) {
  const options = {
    body: reminder.text,
    tag: `reminder-${reminder.id}`,
    requireInteraction: true,
    actions: [
      {
        action: 'mark-done',
        title: 'Mark Done'
      },
      {
        action: 'snooze',
        title: 'Snooze 10min'
      }
    ]
  };
  
  return self.registration.showNotification('🧠 DadApp Reminder', options);
}

// Get stored reminders (placeholder - would integrate with main app)
async function getStoredReminders() {
  // This would typically read from IndexedDB or localStorage
  // For now, return empty array
  return [];
}

// Handle notification actions
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  if (event.action === 'mark-done') {
    // Handle mark as done
    event.waitUntil(
      clients.openWindow('/').then(client => {
        client.postMessage({
          type: 'MARK_REMINDER_DONE',
          reminderId: event.notification.tag.replace('reminder-', '')
        });
      })
    );
  } else if (event.action === 'snooze') {
    // Handle snooze
    event.waitUntil(
      clients.openWindow('/').then(client => {
        client.postMessage({
          type: 'SNOOZE_REMINDER',
          reminderId: event.notification.tag.replace('reminder-', ''),
          snoozeMinutes: 10
        });
      })
    );
  } else {
    // Default action - open app
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});
