// DadApp - Reminder Management System
class DadApp {
    constructor() {
        this.reminders = this.loadReminders();
        this.notificationInterval = null;
        this.currentFilter = 'all';
        this.notificationSettings = this.loadNotificationSettings();
        
        this.init();
    }

    init() {
        this.registerServiceWorker();
        this.setupEventListeners();
        this.updateStats();
        this.renderReminders();
        this.setupNotificationSystem();
        this.showInstallPrompt();
        this.setupViewportHeight();
    }

    // Service Worker Registration
    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('./sw.js');
                console.log('Service Worker registered successfully');
                
                // Listen for messages from service worker
                navigator.serviceWorker.addEventListener('message', (event) => {
                    this.handleServiceWorkerMessage(event.data);
                });
            } catch (error) {
                console.error('Service Worker registration failed:', error);
            }
        }
    }

    // Event Listeners Setup
    setupEventListeners() {
        // Quick add form
        const quickAddForm = document.getElementById('quickAddForm');
        quickAddForm.addEventListener('submit', (e) => this.handleQuickAdd(e));

        // Add reminder modal
        const addReminderBtn = document.getElementById('addReminderBtn');
        const addReminderModal = document.getElementById('addReminderModal');
        const addModalClose = document.getElementById('addModalClose');
        const addReminderForm = document.getElementById('addReminderForm');

        addReminderBtn.addEventListener('click', () => this.showModal('addReminderModal'));
        addModalClose.addEventListener('click', () => this.hideModal('addReminderModal'));
        addReminderForm.addEventListener('submit', (e) => this.handleAddReminder(e));

        // Notification settings modal
        const notificationToggle = document.getElementById('notificationToggle');
        const notificationModal = document.getElementById('notificationModal');
        const modalClose = document.getElementById('modalClose');
        const enableNotifications = document.getElementById('enableNotifications');

        notificationToggle.addEventListener('click', () => this.showModal('notificationModal'));
        modalClose.addEventListener('click', () => this.hideModal('notificationModal'));
        enableNotifications.addEventListener('click', () => this.requestNotificationPermission());

        // Filter tabs
        const filterTabs = document.querySelectorAll('.filter-tab');
        filterTabs.forEach(tab => {
            tab.addEventListener('click', (e) => this.handleFilterChange(e));
        });

        // Install prompt
        const installBtn = document.getElementById('installBtn');
        const installDismiss = document.getElementById('installDismiss');

        installBtn.addEventListener('click', () => this.installApp());
        installDismiss.addEventListener('click', () => this.hideInstallPrompt());

        // Modal backdrop clicks
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideModal(modal.id);
                }
            });
        });

        // Settings change listeners
        const reminderInterval = document.getElementById('reminderInterval');
        const quietStart = document.getElementById('quietStart');
        const quietEnd = document.getElementById('quietEnd');

        reminderInterval.addEventListener('change', () => this.updateNotificationSettings());
        quietStart.addEventListener('change', () => this.updateNotificationSettings());
        quietEnd.addEventListener('change', () => this.updateNotificationSettings());
    }

    // Quick Add Handler
    handleQuickAdd(e) {
        e.preventDefault();
        const input = document.getElementById('reminderInput');
        const text = input.value.trim();
        
        if (text) {
            const reminder = {
                id: Date.now().toString(),
                text: text,
                category: 'general',
                priority: 'medium',
                active: true,
                notificationsEnabled: true,
                createdAt: new Date().toISOString(),
                completed: false
            };
            
            this.addReminder(reminder);
            input.value = '';
            this.showNotification('Reminder added!', 'success');
        }
    }

    // Add Reminder Handler
    handleAddReminder(e) {
        e.preventDefault();
        
        const text = document.getElementById('reminderText').value.trim();
        const category = document.getElementById('reminderCategory').value;
        const priority = document.getElementById('reminderPriority').value;
        const notificationsEnabled = document.getElementById('enableNotificationsForReminder').checked;
        
        if (text) {
            const reminder = {
                id: Date.now().toString(),
                text: text,
                category: category,
                priority: priority,
                active: true,
                notificationsEnabled: notificationsEnabled,
                createdAt: new Date().toISOString(),
                completed: false
            };
            
            this.addReminder(reminder);
            this.hideModal('addReminderModal');
            document.getElementById('addReminderForm').reset();
            this.showNotification('Reminder added!', 'success');
        }
    }

    // Add Reminder
    addReminder(reminder) {
        this.reminders.unshift(reminder);
        this.saveReminders();
        this.updateStats();
        this.renderReminders();
        this.scheduleNotification(reminder);
    }

    // Toggle Reminder Completion
    toggleReminder(id) {
        const reminder = this.reminders.find(r => r.id === id);
        if (reminder) {
            reminder.completed = !reminder.completed;
            reminder.active = !reminder.completed;
            this.saveReminders();
            this.updateStats();
            this.renderReminders();
            
            if (reminder.completed) {
                this.cancelNotification(id);
                this.showNotification('Reminder completed!', 'success');
            }
        }
    }

    // Delete Reminder
    deleteReminder(id) {
        if (confirm('Are you sure you want to delete this reminder?')) {
            this.reminders = this.reminders.filter(r => r.id !== id);
            this.saveReminders();
            this.updateStats();
            this.renderReminders();
            this.cancelNotification(id);
            this.showNotification('Reminder deleted!', 'info');
        }
    }

    // Filter Change Handler
    handleFilterChange(e) {
        const filter = e.target.dataset.filter;
        this.currentFilter = filter;
        
        // Update active tab
        document.querySelectorAll('.filter-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        e.target.classList.add('active');
        
        this.renderReminders();
    }

    // Render Reminders
    renderReminders() {
        const container = document.getElementById('remindersList');
        let filteredReminders = this.reminders;
        
        // Apply filter
        switch (this.currentFilter) {
            case 'active':
                filteredReminders = this.reminders.filter(r => !r.completed);
                break;
            case 'completed':
                filteredReminders = this.reminders.filter(r => r.completed);
                break;
        }
        
        if (filteredReminders.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📝</div>
                    <h4>No reminders found</h4>
                    <p>Add your first reminder to get started!</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = filteredReminders.map(reminder => this.createReminderHTML(reminder)).join('');
        
        // Add event listeners to reminder actions
        container.querySelectorAll('.reminder-toggle').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.closest('.reminder-item').dataset.id;
                this.toggleReminder(id);
            });
        });
        
        container.querySelectorAll('.reminder-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.closest('.reminder-item').dataset.id;
                this.deleteReminder(id);
            });
        });
    }

    // Create Reminder HTML
    createReminderHTML(reminder) {
        const completedClass = reminder.completed ? 'completed' : '';
        const priorityClass = `${reminder.priority}-priority`;
        const toggleIcon = reminder.completed ? '✅' : '⭕';
        const date = new Date(reminder.createdAt).toLocaleDateString();
        
        return `
            <div class="reminder-item ${completedClass} ${priorityClass}" data-id="${reminder.id}">
                <div class="reminder-header">
                    <div class="reminder-text">${reminder.text}</div>
                    <div class="reminder-actions">
                        <button class="reminder-toggle ${reminder.completed ? 'completed' : ''}" title="Toggle completion">
                            ${toggleIcon}
                        </button>
                        <button class="reminder-delete" title="Delete reminder">🗑️</button>
                    </div>
                </div>
                <div class="reminder-meta">
                    <span class="reminder-category">${reminder.category}</span>
                    <span class="reminder-date">${date}</span>
                </div>
            </div>
        `;
    }

    // Update Stats
    updateStats() {
        const totalReminders = this.reminders.length;
        const activeReminders = this.reminders.filter(r => !r.completed).length;
        
        document.getElementById('totalReminders').textContent = totalReminders;
        document.getElementById('activeReminders').textContent = activeReminders;
    }

    // Modal Management
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }

    // Notification System
    async requestNotificationPermission() {
        if ('Notification' in window) {
            const permission = await Notification.requestPermission();
            
            if (permission === 'granted') {
                this.notificationSettings.enabled = true;
                this.saveNotificationSettings();
                this.setupNotificationSystem();
                this.showNotification('Notifications enabled!', 'success');
                document.getElementById('enableNotifications').textContent = 'Enabled';
                document.getElementById('enableNotifications').classList.add('disabled');
            } else {
                this.showNotification('Notifications blocked. Please enable in browser settings.', 'error');
            }
        } else {
            this.showNotification('Notifications not supported in this browser.', 'error');
        }
    }

    setupNotificationSystem() {
        // Clear existing interval
        if (this.notificationInterval) {
            clearInterval(this.notificationInterval);
        }
        
        if (this.notificationSettings.enabled && 'Notification' in window) {
            const intervalMinutes = parseInt(this.notificationSettings.interval);
            const intervalMs = intervalMinutes * 60 * 1000;
            
            this.notificationInterval = setInterval(() => {
                this.sendReminderNotifications();
            }, intervalMs);
        }
    }

    sendReminderNotifications() {
        if (!this.notificationSettings.enabled) return;
        
        const now = new Date();
        const currentHour = now.getHours();
        const quietStart = parseInt(this.notificationSettings.quietStart.split(':')[0]);
        const quietEnd = parseInt(this.notificationSettings.quietEnd.split(':')[0]);
        
        // Check if we're in quiet hours
        if (this.isInQuietHours(currentHour, quietStart, quietEnd)) {
            return;
        }
        
        const activeReminders = this.reminders.filter(r => r.active && r.notificationsEnabled && !r.completed);
        
        if (activeReminders.length > 0) {
            // Send notification for each active reminder
            activeReminders.forEach(reminder => {
                this.showBrowserNotification(reminder);
            });
        }
    }

    isInQuietHours(currentHour, quietStart, quietEnd) {
        if (quietStart <= quietEnd) {
            return currentHour >= quietStart && currentHour < quietEnd;
        } else {
            return currentHour >= quietStart || currentHour < quietEnd;
        }
    }

    showBrowserNotification(reminder) {
        if ('Notification' in window && Notification.permission === 'granted') {
            const notification = new Notification('🧠 DadApp Reminder', {
                body: reminder.text,
                tag: `reminder-${reminder.id}`,
                requireInteraction: true
            });
            
            notification.onclick = () => {
                window.focus();
                notification.close();
            };
        }
    }

    scheduleNotification(reminder) {
        if (reminder.notificationsEnabled && this.notificationSettings.enabled) {
            // Schedule immediate notification for new reminders
            setTimeout(() => {
                this.showBrowserNotification(reminder);
            }, 1000);
        }
    }

    cancelNotification(id) {
        // Cancel any scheduled notifications for this reminder
        // This would integrate with the service worker in a real implementation
    }

    // PWA Installation
    showInstallPrompt() {
        let deferredPrompt;
        
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            
            const installPrompt = document.getElementById('installPrompt');
            installPrompt.classList.add('show');
            
            // Remove any existing event listeners to prevent duplicates
            const installBtn = document.getElementById('installBtn');
            const newInstallBtn = installBtn.cloneNode(true);
            installBtn.parentNode.replaceChild(newInstallBtn, installBtn);
            
            newInstallBtn.addEventListener('click', async () => {
                if (deferredPrompt) {
                    deferredPrompt.prompt();
                    const { outcome } = await deferredPrompt.userChoice;
                    console.log(`User response to the install prompt: ${outcome}`);
                    deferredPrompt = null;
                    this.hideInstallPrompt();
                }
            });
        });
        
        // Handle app installed event
        window.addEventListener('appinstalled', (evt) => {
            console.log('App was installed');
            this.hideInstallPrompt();
        });
    }

    hideInstallPrompt() {
        const installPrompt = document.getElementById('installPrompt');
        installPrompt.classList.remove('show');
    }

    installApp() {
        // This will be handled by the beforeinstallprompt event
    }

    // Service Worker Message Handler
    handleServiceWorkerMessage(data) {
        switch (data.type) {
            case 'MARK_REMINDER_DONE':
                this.toggleReminder(data.reminderId);
                break;
            case 'SNOOZE_REMINDER':
                // Implement snooze functionality
                this.showNotification(`Reminder snoozed for ${data.snoozeMinutes} minutes`, 'info');
                break;
        }
    }

    // Settings Management
    updateNotificationSettings() {
        this.notificationSettings.interval = document.getElementById('reminderInterval').value;
        this.notificationSettings.quietStart = document.getElementById('quietStart').value;
        this.notificationSettings.quietEnd = document.getElementById('quietEnd').value;
        
        this.saveNotificationSettings();
        this.setupNotificationSystem();
    }

    // Local Storage
    saveReminders() {
        localStorage.setItem('dadapp-reminders', JSON.stringify(this.reminders));
    }

    loadReminders() {
        const stored = localStorage.getItem('dadapp-reminders');
        return stored ? JSON.parse(stored) : [];
    }

    saveNotificationSettings() {
        localStorage.setItem('dadapp-notification-settings', JSON.stringify(this.notificationSettings));
    }

    loadNotificationSettings() {
        const stored = localStorage.getItem('dadapp-notification-settings');
        return stored ? JSON.parse(stored) : {
            enabled: false,
            interval: '15',
            quietStart: '22:00',
            quietEnd: '07:00'
        };
    }

    // UI Notifications
    showNotification(message, type = 'info') {
        // Remove existing notifications
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) {
            existingNotification.remove();
        }
        
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 100px;
            left: 50%;
            transform: translateX(-50%);
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
            color: white;
            padding: 1rem 2rem;
            border-radius: 12px;
            font-weight: 500;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            animation: slideInDown 0.3s ease;
        `;
        
        // Add animation keyframes
        if (!document.querySelector('#notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                @keyframes slideInDown {
                    from {
                        transform: translateX(-50%) translateY(-100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(-50%) translateY(0);
                        opacity: 1;
                    }
                }
                @keyframes slideOutUp {
                    from {
                        transform: translateX(-50%) translateY(0);
                        opacity: 1;
                    }
                    to {
                        transform: translateX(-50%) translateY(-100%);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(notification);
        
        // Auto remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOutUp 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }, 3000);
    }

    // Viewport Height Setup
    setupViewportHeight() {
        const setViewportHeight = () => {
            const vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--vh', `${vh}px`);
        };

        setViewportHeight();
        window.addEventListener('resize', setViewportHeight);
        window.addEventListener('orientationchange', () => {
            setTimeout(setViewportHeight, 100);
        });
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new DadApp();
});

// Handle app visibility changes for notifications
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // App is hidden, notifications can be sent
    } else {
        // App is visible, user is actively using it
    }
});