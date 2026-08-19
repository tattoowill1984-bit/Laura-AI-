import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Sanitize firebaseConfig to handle unreplaced placeholder strings
const safeApiKey = (firebaseConfig.apiKey && !firebaseConfig.apiKey.includes('${'))
  ? firebaseConfig.apiKey
  : (import.meta as any).env?.VITE_FIREBASE_API_KEY || 'AIzaSyCj8e65gcFRwXo3H9ONUY78nJxcAI6uenE';

const safeConfig = {
  ...firebaseConfig,
  apiKey: safeApiKey,
};

// Reuse or initialize Firebase app instance safely
let app: any = null;
try {
  app = getApps().length === 0 ? initializeApp(safeConfig) : getApp();
} catch (err) {
  console.warn('[driveAuthService] Firebase initializeApp notice:', err);
  if (getApps().length > 0) {
    app = getApp();
  }
}

export const auth = app ? getAuth(app) : null as any;

const provider = new GoogleAuthProvider();
// Google Drive Workspace scopes
provider.addScope('https://www.googleapis.com/auth/drive');
provider.addScope('https://www.googleapis.com/auth/drive.file');
provider.addScope('https://www.googleapis.com/auth/drive.readonly');
provider.addScope('https://www.googleapis.com/auth/drive.metadata');

let isSigningIn = false;
let cachedAccessToken: string | null = null;

/**
 * Initializes Firebase Auth state listener and keeps token in memory.
 */
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  if (!auth) {
    if (onAuthFailure) onAuthFailure();
    return () => {};
  }
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

/**
 * Signs in user via Google OAuth popup and stores token in memory.
 */
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to retrieve access token from Google sign-in credentials');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('[DriveAuthService] Sign-in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const setCachedAccessToken = (token: string | null) => {
  cachedAccessToken = token;
};

export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
};
