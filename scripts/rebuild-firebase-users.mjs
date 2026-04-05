import 'dotenv/config';

import { readFile } from 'node:fs/promises';

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
  measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const requiredEnvKeys = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_APP_ID',
];
const missingKeys = requiredEnvKeys.filter((key) => !process.env[key]);

if (missingKeys.length > 0) {
  console.error(`Missing Firebase environment variables: ${missingKeys.join(', ')}`);
  process.exit(1);
}

const [, , inputPath, ...flags] = process.argv;
const isDryRun = flags.includes('--dry-run');

if (!inputPath) {
  console.error('Usage: node scripts/rebuild-firebase-users.mjs <path-to-users.json> [--dry-run]');
  process.exit(1);
}

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);

const raw = await readFile(inputPath, 'utf8');
const parsed = JSON.parse(raw);

if (!Array.isArray(parsed)) {
  console.error('Input file must be a JSON array of user objects.');
  process.exit(1);
}

const sanitizeNumber = (value) => (typeof value === 'number' && Number.isFinite(value) ? value : undefined);

const sanitizeString = (value) => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const allowedStatuses = new Set(['pending', 'approved', 'rejected']);
const allowedKycStatuses = new Set(['pending', 'approved', 'rejected']);

const normalizeUser = (entry, index) => {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
    throw new Error(`Entry ${index + 1} is not a valid object.`);
  }

  const userId = sanitizeString(entry.userId);
  if (!userId) {
    throw new Error(`Entry ${index + 1} is missing a valid userId.`);
  }

  const status = allowedStatuses.has(entry.status) ? entry.status : 'pending';
  const kycStatus = allowedKycStatuses.has(entry.kycStatus) ? entry.kycStatus : undefined;

  const user = {
    userId,
    status,
    email: sanitizeString(entry.email),
    fullName: sanitizeString(entry.fullName),
    walletAddress: sanitizeString(entry.walletAddress),
    kycStatus,
    depositAmount: sanitizeNumber(entry.depositAmount),
    mainWalletBalanceUsd: sanitizeNumber(entry.mainWalletBalanceUsd),
    botWalletBalanceUsd: sanitizeNumber(entry.botWalletBalanceUsd),
  };

  return Object.fromEntries(Object.entries(user).filter(([, value]) => value !== undefined));
};

const users = parsed.map(normalizeUser);

console.log(`${isDryRun ? 'Previewing' : 'Rebuilding'} ${users.length} Firestore user document(s)...`);

for (const user of users) {
  const userRef = doc(db, 'users', user.userId);
  const existingUser = isDryRun ? null : await getDoc(userRef);
  const payload = {
    ...user,
    updatedAt: serverTimestamp(),
    createdAt: existingUser?.exists() ? existingUser.data().createdAt ?? serverTimestamp() : serverTimestamp(),
  };

  if (isDryRun) {
    console.log(`[dry-run] ${user.userId}`, payload);
    continue;
  }

  await setDoc(userRef, payload, { merge: true });
  console.log(`[ok] ${user.userId}`);
}

if (!isDryRun) {
  console.log('Finished rebuilding Firestore users collection entries.');
  console.log('Note: This restores Firestore documents only. Deleted Firebase Auth users are not recreated by this script.');
}
