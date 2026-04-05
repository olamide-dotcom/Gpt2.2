# Real-time Deposit System Setup Guide

This guide explains how the real-time deposit approval system works and how to set it up.

## Overview

The real-time deposit system allows:
1. **Users** to submit deposit requests that are instantly visible to admins
2. **Admins** to approve/reject deposits from the control panel
3. **Real-time updates** - when an admin approves/rejects a deposit, the user sees the change instantly without refreshing

## Architecture

```
┌─────────────────┐    Firebase Firestore    ┌─────────────────┐
│   User Page     │◄───────Real-time────────►│  Admin Console  │
│                 │       Updates            │                 │
└─────────────────┘                          └─────────────────┘
        │                                            │
        │                                            │
        v                                            v
┌─────────────────┐                         ┌─────────────────┐
│  localStorage   │                         │  localStorage   │
│  (Local State)  │                         │  (Local State)  │
└─────────────────┘                         └─────────────────┘
```

## Key Files

### New Files Created

1. **`src/lib/firebase-deposits.ts`**
   - Firebase Firestore functions for deposit requests
   - Real-time listeners for pending requests and user-specific requests
   - Functions to create, review, and fetch deposit requests

2. **`src/hooks/use-realtime-deposits.ts`**
   - React hooks for real-time deposit synchronization
   - `useUserDepositRequests()` - For users to track their requests
   - `usePendingDepositRequests()` - For admins to see all pending requests
   - `useRealtimeDepositSync()` - Enhanced sync hook

3. **`src/components/deposits/RealtimeDepositConsole.tsx`**
   - Admin interface for reviewing deposits in real-time
   - Shows pending requests with approve/reject buttons
   - Updates instantly when actions are taken

4. **`src/components/deposits/RealtimeDepositStatus.tsx`**
   - User interface for tracking deposit status
   - Shows real-time status updates (Pending → Approved/Rejected)
   - Displays connection status and last update time

### Modified Files

1. **`src/hooks/use-account-workflow.ts`**
   - Integrated Firebase sync for deposit requests
   - When a user submits a deposit, it's synced to Firebase
   - When an admin reviews, the change is pushed to Firebase

2. **`src/pages/DepositPage.tsx`**
   - Added `RealtimeDepositStatus` component
   - Users now see live updates of their deposit requests

3. **`src/pages/ControlPanelPage.tsx`**
   - Added `RealtimeDepositConsole` component
   - Admins can now review deposits with real-time updates

## Firebase Setup

### 1. Create Firestore Collection

Create a collection named `deposit_requests` in your Firebase Firestore database with the following structure:

```typescript
{
  id: string;              // Unique request ID
  userId: string;          // User who submitted the request
  tokenCode: string;       // "ETH", "USDT", "BTC"
  tokenName: string;       // Full token name
  networkLabel: string;    // Network (e.g., "ERC20", "TRC20")
  address: string;         // Deposit address
  requestedAmountUsd: number;
  creditedAmountUsd: number | null;
  status: string;          // "pending_review", "approved", "rejected"
  submittedAt: timestamp;
  reviewedAt: timestamp | null;
  approvalMessage: string | null;
  submittedByTelegramId?: string | null;
  createdAt: timestamp;
  updatedAt: timestamp;
}
```

### 2. Create Firestore Indexes

For real-time queries to work efficiently, create these indexes in Firestore:

1. **User's deposit requests (sorted by submission date)**
   - Collection: `deposit_requests`
   - Fields: `userId` (Ascending), `submittedAt` (Descending)

2. **Pending deposit requests (for admin)**
   - Collection: `deposit_requests`
   - Fields: `status` (Ascending), `submittedAt` (Descending)

### 3. Firebase Security Rules

Add these rules to your Firestore security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Deposit requests collection
    match /deposit_requests/{requestId} {
      // Users can create their own requests
      allow create: if request.auth != null 
                    && request.resource.data.userId == request.auth.uid;
      
      // Users can read their own requests
      allow read: if request.auth != null 
                  && (resource.data.userId == request.auth.uid);
      
      // No user can update deposit requests (only admin via server)
      allow update: if false;
      
      // No user can delete deposit requests
      allow delete: if false;
    }
    
    // Users collection (existing)
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## How It Works

### User Flow

1. User navigates to the Deposit page
2. User submits a deposit request (clicks "I've sent now")
3. Request is saved to:
   - **Local storage** (for immediate UI feedback)
   - **Firebase Firestore** (for admin visibility)
4. User sees the request in their "Real-time Deposit Status" section
5. When admin reviews, the status updates automatically (no refresh needed)

### Admin Flow

1. Admin navigates to Control Panel (passcode: 0803)
2. Admin sees all pending requests in "Live Deposit Request Queue"
3. Admin clicks "Approve" or "Reject" on any request
4. Action is saved to:
   - **Firebase Firestore** (triggers real-time update for user)
   - **Local storage** (updates admin's local state)
5. User instantly sees the status change

## Testing the Real-time System

### Prerequisites
- Firebase project configured with Firestore enabled
- Environment variables set in `.env`:
  ```
  VITE_FIREBASE_API_KEY=your-api-key
  VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
  VITE_FIREBASE_PROJECT_ID=your-project-id
  VITE_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
  VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
  VITE_FIREBASE_APP_ID=your-app-id
  ```

### Test Steps

1. **Start the application:**
   ```bash
   npm run dev
   ```

2. **As a User:**
   - Complete onboarding to unlock deposits
   - Navigate to the Deposit page
   - Submit a deposit request
   - Observe the request appear in "Your Deposit Requests" section
   - Keep the page open

3. **As an Admin (in another browser/incognito window):**
   - Navigate to `/control-panel`
   - Enter passcode: `0803`
   - You should see the pending request in "Live Deposit Request Queue"
   - Click "Approve" or "Reject"

4. **Back to User window:**
   - The status should update automatically within seconds
   - No page refresh required!

## Troubleshooting

### Requests not appearing in admin panel
- Check Firebase console to verify the document was created
- Ensure Firestore indexes are created
- Check browser console for Firebase errors

### Real-time updates not working
- Verify Firebase configuration in `.env`
- Check if Firebase authentication is working
- Ensure Firestore rules allow the operations

### Build errors
- Run `npm install` to ensure all dependencies are installed
- Check TypeScript errors with `npm run type-check`

## API Reference

### `createDepositRequest(data)`
Creates a new deposit request in Firestore.

```typescript
await createDepositRequest({
  userId: "user-123",
  tokenCode: "ETH",
  tokenName: "Ethereum",
  networkLabel: "ERC20",
  address: "0x...",
  requestedAmountUsd: 1000,
  status: "pending_review",
  // ... other fields
});
```

### `reviewDepositRequest(input)`
Updates a deposit request with admin review decision.

```typescript
await reviewDepositRequest({
  requestId: "request-123",
  status: "approved",
  creditedAmountUsd: 1000,
  approvalMessage: "Deposit confirmed.",
});
```

### `listenToUserDepositRequests(userId, callback)`
Sets up real-time listener for a user's deposit requests.

```typescript
const unsubscribe = listenToUserDepositRequests(userId, (requests) => {
  console.log("Requests updated:", requests);
});
// Later: unsubscribe();
```

### `listenToPendingDepositRequests(callback)`
Sets up real-time listener for all pending requests (admin).

```typescript
const unsubscribe = listenToPendingDepositRequests((requests) => {
  console.log("Pending requests:", requests);
});
```

## Migration Notes

The existing local-only deposit system continues to work. The new real-time system:
- Syncs with Firebase in addition to local storage
- Falls back gracefully if Firebase is unavailable
- Maintains backward compatibility with existing data

Users with existing local deposit requests will see them in the UI, and new requests will be synced to Firebase for real-time admin review.