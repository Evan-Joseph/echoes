// --- Mock User Type ---
// We create a mock User type that is compatible with the original Firebase User type
// to minimize changes in the rest of the application code.
export interface User {
    uid: string;
    isAnonymous: boolean;
    displayName: string | null;
    photoURL: string | null;
    createdAt: string; // Added for compatibility with AppUser type
    // Add other fields if needed by the app, otherwise keep it simple
}

// --- Local Auth Service ---

const USER_STORAGE_KEY = 'local_user';

// Helper to get window object safely
const getWindow = () => {
    if (typeof window !== 'undefined') {
        return window;
    }
    return undefined;
};

/**
 * Gets the current user from localStorage.
 * This replaces onAuthStateChanged and getCurrentUser.
 */
export function getCurrentUser(): Promise<User | null> {
    return new Promise((resolve) => {
        const windowObject = getWindow();
        if (!windowObject) {
            return resolve(null);
        }
        const userJson = windowObject.localStorage.getItem(USER_STORAGE_KEY);
        if (userJson) {
            resolve(JSON.parse(userJson) as User);
        } else {
            resolve(null);
        }
    });
}

/**
 * Creates a new anonymous user and stores it in localStorage.
 * This replaces signInAnonymously.
 */
export async function createAnonymousUser(): Promise<User> {
    const windowObject = getWindow();
    if (!windowObject) {
        throw new Error("Window is not available for anonymous sign-in.");
    }

    const newUser: User = {
        uid: `local_user_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`,
        isAnonymous: true,
        displayName: 'Anonymous User',
        photoURL: null,
        createdAt: new Date().toISOString(),
    };

    windowObject.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(newUser));
    return newUser;
}

/**
 * Signs out the user by clearing localStorage.
 * This replaces signOut.
 */
export async function logOut(): Promise<void> {
    const windowObject = getWindow();
    if (windowObject) {
        windowObject.localStorage.removeItem(USER_STORAGE_KEY);
    }
}

// --- Deprecated Firebase Functions (mocked or removed) ---

// Replace phone auth with a simplified username sign-in for local dev
// This function is just a placeholder to show the concept.
// The app's UI might need to be adapted to use this instead of the phone flow.
export async function signInWithUsername(username: string): Promise<User> {
     const windowObject = getWindow();
    if (!windowObject) {
        throw new Error("Window is not available for sign-in.");
    }

    // In a real local setup, you might check a local DB of users.
    // Here, we just create a new user based on the username.
    const newUser: User = {
        uid: `local_user_${username}`,
        isAnonymous: false,
        displayName: username,
        photoURL: null,
        createdAt: new Date().toISOString(),
    };

    windowObject.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(newUser));
    return newUser;
}


// The following functions are no longer needed and are removed or mocked to avoid errors.
export function setupRecaptcha(): null {
    console.warn("Recaptcha is not available in local mode.");
    return null;
}

export async function sendVerificationCode(): Promise<string> {
    throw new Error("Phone verification is not available in local mode.");
}

export async function verifyCodeAndSignIn(): Promise<User> {
    throw new Error("Phone verification is not available in local mode.");
}

// This function's original purpose was to "sign in" on another device.
// We'll simulate this by just creating a new anonymous user, as the original did.
export async function signInWithToken(token: string): Promise<User> {
    console.log(`Simulating sign-in for token (user UID): ${token}. Creating a new local anonymous session.`);
    return createAnonymousUser();
}

// Mock the 'auth' object export if other files import it.
// It doesn't need any properties for our local implementation.
export const auth = {};
