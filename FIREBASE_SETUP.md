# Firebase Integration Guide

This guide explains how to set up and use Firebase in this React web app that runs inside a Telegram bot webview.

## Table of Contents

1. [Installation](#installation)
2. [Firebase Project Setup](#firebase-project-setup)
3. [Environment Configuration](#environment-configuration)
4. [Firestore Database Structure](#firestore-database-structure)
5. [Usage Examples](#usage-examples)
6. [Admin Functionality](#admin-functionality)
7. [Telegram WebApp Integration](#telegram-webapp-integration)
8. [Testing](#testing)

## Installation

Firebase has been installed as a dependency:

```bash
npm install firebase
```

## Firebase Project Setup

### Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" and follow the setup wizard
3. Give your project a name (e.g., "crypto-trading-bot")
4. Enable Google Analytics (optional)

### Step 2: Register Your Web App

1. In Firebase Console, click the web icon (</>) to add a web app
2. Register your app with a nickname
3. Copy the Firebase configuration object

### Step 3: Enable Firebase Services

#### Firestore Database
1. Go to "Build" → "Firestore Database"
2. Click "Create database"
3. Choose "Start in test mode" (for development)
4. Select a location closest to your users

#### Firebase Authentication
1. Go to "Build" → "Authentication"
2. Click "Get started"
3. Enable "Anonymous" sign-in method

### Step 4: Configure Environment Variables

Update the `.env` file with your Firebase project credentials:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your-actual-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_FIREBASE_MEASUREMENT_ID=your-measurement-id
```

## Firestore Database Structure

### Users Collection

```
users (collection)
  └── {userId} (document)
        ├── userId: string
        ├── email?: string
        ├── fullName?: string
        ├── walletAddress?: string
        ├── depositAmount?: number
        ├── status: "pending" | "approved" | "rejected"
        ├── kycStatus?: "pending" | "approved" | "rejected"
        ├── createdAt: timestamp
        └── updatedAt?: timestamp
```

### Security Rules

For development, you can use these permissive rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow authenticated users to read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Allow admin users to read all users (implement admin check in your app)
    match /users/{userId} {
      allow read: if request.auth != null;
    }
  }
}
```

For production, implement proper security rules based on your requirements.

## Usage Examples

### Basic Usage in Components

#### Using the Firebase User Hook

```tsx
import { useFirebaseUser } from '@/hooks/useFirebaseUser';

const MyComponent = () => {
  const {
    userId,
    userData,
    isLoading,
    isError,
    isPending,
    isApproved,
    submitDeposit,
    refreshUserData
  } = useFirebaseUser();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (isError) {
    return <div>Error loading user data</div>;
  }

  const handleDeposit = async (amount: number) => {
    try {
      await submitDeposit(amount);
      console.log('Deposit submitted successfully');
    } catch (error) {
      console.error('Failed to submit deposit:', error);
    }
  };

  return (
    <div>
      <p>User ID: {userId}</p>
      <p>Status: {userData?.status}</p>
      <p>Deposit Amount: ${userData?.depositAmount || 0}</p>
      
      {isPending && <p>Your deposit is pending approval</p>}
      {isApproved && <p>Your deposit has been approved!</p>}
      
      <button onClick={() => handleDeposit(100)}>
        Submit $100 Deposit
      </button>
    </div>
  );
};
```

#### Direct Firebase Functions

```tsx
import {
  getOrCreateUserId,
  createUser,
  getUser,
  updateUser,
  listenToUser,
  initializeUserSession
} from '@/lib/firebase';

// Initialize user session (call on app startup)
const initApp = async () => {
  const { userId, userData, unsubscribe } = await initializeUserSession();
  console.log('User initialized:', userId);
  
  // Clean up on app close
  return () => {
    if (unsubscribe) unsubscribe();
  };
};

// Create a new user
await createUser('user123', {
  email: 'user@example.com',
  fullName: 'John Doe'
});

// Get user data
const user = await getUser('user123');
console.log('User data:', user);

// Update user
await updateUser('user123', {
  depositAmount: 500,
  status: 'pending'
});

// Listen to real-time updates
const unsubscribe = listenToUser('user123', (userData) => {
  console.log('User data updated:', userData);
});
```

### Real-time Status Updates

```tsx
import { useEffect, useState } from 'react';
import { listenToUserStatus, type UserStatus } from '@/lib/firebase';

const StatusDisplay = ({ userId }: { userId: string }) => {
  const [status, setStatus] = useState<UserStatus | null>(null);

  useEffect(() => {
    const unsubscribe = listenToUserStatus(userId, (newStatus) => {
      setStatus(newStatus);
      
      // Show notification when status changes
      if (newStatus === 'approved') {
        alert('Your deposit has been approved!');
      } else if (newStatus === 'rejected') {
        alert('Your deposit was rejected. Please contact support.');
      }
    });

    return () => unsubscribe();
  }, [userId]);

  return (
    <div>
      Status: {status || 'Loading...'}
    </div>
  );
};
```

## Admin Functionality

### Using the Admin Hook

```tsx
import { useFirebaseAdmin } from '@/hooks/useFirebaseAdmin';

const AdminDashboard = () => {
  const {
    pendingUsers,
    approvedUsers,
    rejectedUsers,
    stats,
    approveDeposit,
    rejectDeposit,
    refreshPendingUsers
  } = useFirebaseAdmin();

  const handleApprove = async (userId: string) => {
    try {
      await approveDeposit(userId);
      console.log('Deposit approved');
    } catch (error) {
      console.error('Failed to approve deposit:', error);
    }
  };

  const handleReject = async (userId: string) => {
    try {
      await rejectDeposit(userId);
      console.log('Deposit rejected');
    } catch (error) {
      console.error('Failed to reject deposit:', error);
    }
  };

  return (
    <div>
      <h1>Admin Dashboard</h1>
      
      <div className="stats">
        <p>Total Users: {stats.totalUsers}</p>
        <p>Pending: {stats.pendingCount}</p>
        <p>Approved: {stats.approvedCount}</p>
        <p>Rejected: {stats.rejectedCount}</p>
        <p>Total Deposits: ${stats.totalDeposits}</p>
      </div>

      <h2>Pending Deposits</h2>
      {pendingUsers.map(user => (
        <div key={user.userId}>
          <p>User: {user.userId}</p>
          <p>Amount: ${user.depositAmount}</p>
          <button onClick={() => handleApprove(user.userId)}>Approve</button>
          <button onClick={() => handleReject(user.userId)}>Reject</button>
        </div>
      ))}
    </div>
  );
};
```

### Direct Admin Functions

```tsx
import {
  getUsersByStatus,
  getAllUsers,
  approveUserDeposit,
  rejectUserDeposit
} from '@/lib/firebase';

// Get all pending users
const pendingUsers = await getUsersByStatus('pending');
console.log('Pending users:', pendingUsers);

// Approve a deposit
await approveUserDeposit('user123');

// Reject a deposit
await rejectUserDeposit('user456');

// Get all users
const allUsers = await getAllUsers();
console.log('All users:', allUsers);
```

## Telegram WebApp Integration

### Initialize Telegram WebApp

```tsx
import { useEffect } from 'react';
import {
  initTelegramWebApp,
  applyTelegramTheme,
  getTelegramUser
} from '@/lib/telegram-webapp';

const App = () => {
  useEffect(() => {
    // Initialize Telegram WebApp
    initTelegramWebApp();
    
    // Apply Telegram theme colors
    applyTelegramTheme();
    
    // Get Telegram user (if available)
    const telegramUser = getTelegramUser();
    if (telegramUser) {
      console.log('Telegram user:', telegramUser.first_name);
    }
  }, []);

  return (
    // Your app content
  );
};
```

### Using Telegram UI Features

```tsx
import {
  showMainButton,
  hideMainButton,
  showTelegramConfirm,
  triggerHapticFeedback
} from '@/lib/telegram-webapp';

const DepositForm = () => {
  const handleSubmit = async () => {
    // Show confirmation dialog
    showTelegramConfirm('Confirm deposit of $100?', async (confirmed) => {
      if (confirmed) {
        // Trigger haptic feedback
        triggerHapticFeedback('notification', 'success');
        
        // Submit deposit
        await submitDeposit(100);
        
        // Show main button for next action
        showMainButton('View Dashboard', () => {
          navigate('/dashboard');
        });
      }
    });
  };

  return (
    <button onClick={handleSubmit}>
      Submit Deposit
    </button>
  );
};
```

## Testing

### Manual Testing Checklist

1. **Firebase Initialization**
   - [ ] App starts without Firebase errors
   - [ ] Console shows "✅ Firebase initialized successfully"
   - [ ] User ID is generated and stored in localStorage

2. **Authentication**
   - [ ] Anonymous auth works
   - [ ] User ID persists across page reloads
   - [ ] Auth state changes are handled correctly

3. **Firestore Operations**
   - [ ] User document is created on first visit
   - [ ] User data can be read from Firestore
   - [ ] User data can be updated
   - [ ] Real-time updates work when data changes

4. **Deposit Flow**
   - [ ] User can submit a deposit
   - [ ] Deposit status shows as "pending"
   - [ ] Admin can approve/reject deposits
   - [ ] User sees status change in real-time

5. **Telegram Integration**
   - [ ] App runs inside Telegram WebApp
   - [ ] Theme colors are applied correctly
   - [ ] Telegram UI features work (Main Button, alerts, etc.)
   - [ ] Haptic feedback works on mobile

### Testing Commands

```bash
# Run the development server
npm run dev

# Run tests
npm run test

# Build for production
npm run build
```

## Troubleshooting

### Common Issues

1. **Firebase not initializing**
   - Check that environment variables are set correctly
   - Verify Firebase project configuration
   - Check browser console for specific error messages

2. **Firestore permission denied**
   - Check Firestore security rules
   - Ensure user is authenticated
   - Verify user is accessing their own data

3. **Real-time updates not working**
   - Check that you're properly subscribing to listeners
   - Ensure you're not unsubscribing too early
   - Verify Firestore rules allow read access

4. **Telegram WebApp features not working**
   - Ensure app is running inside Telegram
   - Check that `initTelegramWebApp()` is called
   - Verify Telegram WebApp script is loaded

### Debug Mode

Enable debug logging by adding to your `.env`:

```env
VITE_DEBUG=true
```

Then in your code:

```tsx
if (import.meta.env.VITE_DEBUG === 'true') {
  console.log('Debug information...');
}
```

## Next Steps

1. **Set up Firebase Hosting** for easy deployment
2. **Implement proper security rules** for production
3. **Add Firebase Analytics** to track user behavior
4. **Set up Firebase Cloud Messaging** for push notifications
5. **Implement Firebase Cloud Functions** for server-side logic

## Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Data Modeling](https://firebase.google.com/docs/firestore/manage-data/structure-data)
- [Firebase Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Telegram WebApp Documentation](https://core.telegram.org/bots/webapps)
- [React Firebase Hooks](https://react-firebase-hooks.com/)

## Support

If you encounter issues:

1. Check the browser console for error messages
2. Review Firebase and Telegram documentation
3. Search for similar issues on Stack Overflow
4. Check Firebase Status Dashboard for service outages

---

**Note**: This integration uses Firebase v9 modular SDK with modern best practices. All code is TypeScript-compatible and follows React best practices.