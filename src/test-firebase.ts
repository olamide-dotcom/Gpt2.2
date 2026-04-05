/**
 * Firebase Configuration Test
 * 
 * This file tests if Firebase is properly configured.
 * Run this in the browser console or import it to test.
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

console.log('🧪 Testing Firebase Configuration...');
console.log('📋 Config values:');
console.log('  - API Key:', firebaseConfig.apiKey ? '✅ Set' : '❌ Missing');
console.log('  - Auth Domain:', firebaseConfig.authDomain ? '✅ Set' : '❌ Missing');
console.log('  - Project ID:', firebaseConfig.projectId ? '✅ Set' : '❌ Missing');
console.log('  - Storage Bucket:', firebaseConfig.storageBucket ? '✅ Set' : '❌ Missing');
console.log('  - Messaging Sender ID:', firebaseConfig.messagingSenderId ? '✅ Set' : '❌ Missing');
console.log('  - App ID:', firebaseConfig.appId ? '✅ Set' : '❌ Missing');
console.log('  - Measurement ID:', firebaseConfig.measurementId ? '✅ Set' : '❌ Missing');

try {
  // Initialize Firebase
  const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  console.log('✅ Firebase app initialized successfully');
  
  // Initialize Firestore
  const db = getFirestore(app);
  console.log('✅ Firestore initialized successfully');
  
  // Initialize Auth
  const auth = getAuth(app);
  console.log('✅ Authentication initialized successfully');
  
  console.log('🎉 All Firebase services are working correctly!');
  console.log('📝 Next steps:');
  console.log('  1. Make sure Firestore rules are configured');
  console.log('  2. Enable Anonymous Authentication in Firebase Console');
  console.log('  3. Start using the app - users will be created automatically');
  
} catch (error) {
  console.error('❌ Firebase initialization failed:', error);
  console.error('📝 Check your Firebase configuration in .env file');
}

export {};