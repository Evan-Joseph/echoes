
import { 
    getAuth, 
    signInAnonymously, 
    onAuthStateChanged, 
    signOut,
    RecaptchaVerifier,
    signInWithPhoneNumber,
    type User, 
    type Auth
} from 'firebase/auth';
import { app } from './config';

const auth = getAuth(app);

// Helper to get window object safely
const getWindow = () => {
    if (typeof window !== 'undefined') {
        return window;
    }
    return undefined;
}

// Ensure window is available before initializing recaptcha
const windowObject = getWindow();

export function setupRecaptcha(auth: Auth, elementId: string): RecaptchaVerifier | null {
    if (!windowObject) return null;
    
    // Ensure the recaptcha verifier is only created once per element
    if (!(windowObject as any).recaptchaVerifier) {
        (windowObject as any).recaptchaVerifier = new RecaptchaVerifier(auth, elementId, {
            'size': 'invisible',
            'callback': (response: any) => {
                // reCAPTCHA solved, allow signInWithPhoneNumber.
                console.log("reCAPTCHA verified");
            }
        });
    }
    return (windowObject as any).recaptchaVerifier;
}


export function getCurrentUser(): Promise<User | null> {
    return new Promise((resolve, reject) => {
        const unsubscribe = onAuthStateChanged(auth, user => {
            unsubscribe();
            resolve(user);
        }, reject);
    });
}

export async function createAnonymousUser(): Promise<User> {
    const userCredential = await signInAnonymously(auth);
    return userCredential.user;
}

export async function sendVerificationCode(phoneNumber: string, appVerifier: RecaptchaVerifier): Promise<string> {
    const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
    if (windowObject) {
         (windowObject as any).confirmationResult = confirmationResult;
    }
    return confirmationResult.verificationId;
}

export async function verifyCodeAndSignIn(verificationCode: string): Promise<User> {
    if (!windowObject || !(windowObject as any).confirmationResult) {
        throw new Error("Confirmation result not found. Please send the verification code first.");
    }
    const confirmationResult = (windowObject as any).confirmationResult;
    const result = await confirmationResult.confirm(verificationCode);
    return result.user;
}

// In a real app, signInWithToken would be more complex, involving custom tokens or re-authentication.
// For this app, we will treat the "token" (anonymous UID) as a way to inform the user,
// but the actual sign-in will create a new anonymous session on the new device.
// A true data migration would require a backend and more complex logic.
export async function signInWithToken(token: string): Promise<User | null> {
    // This is a simplified version. A real implementation would require custom auth.
    // We'll just create a new anonymous user and the user can manually migrate data if needed.
    console.log(`A real app would now find a way to link data for user UID: ${token}`);
    return createAnonymousUser();
}


export async function logOut() {
    return signOut(auth);
}

export { auth };
