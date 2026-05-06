import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
  type User as FirebaseUser,
} from 'firebase/auth';
import { auth } from './client';

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// ─── Register with email/password ─────────────────────────────────────────────

export async function registerWithEmail(
  email: string,
  password: string,
  displayName: string
) {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(credential.user, { displayName });
  return credential;
}

// ─── Login with email/password ────────────────────────────────────────────────

export async function loginWithEmail(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password);
}

// ─── Google sign-in ───────────────────────────────────────────────────────────

export async function loginWithGoogle() {
  return signInWithPopup(auth, googleProvider);
}

// ─── Sign out ─────────────────────────────────────────────────────────────────

export async function logout() {
  return signOut(auth);
}

// ─── Password reset ───────────────────────────────────────────────────────────

export async function resetPassword(email: string) {
  return sendPasswordResetEmail(auth, email);
}

// ─── Auth state observer ──────────────────────────────────────────────────────

export function onAuthChange(callback: (user: FirebaseUser | null) => void) {
  return onAuthStateChanged(auth, callback);
}

// ─── Get current user ─────────────────────────────────────────────────────────

export function getCurrentUser() {
  return auth.currentUser;
}
