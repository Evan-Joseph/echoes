import { supabase } from './client';
import type { User, AuthChangeEvent, Session } from '@supabase/supabase-js';

export function onAuthStateChanged(callback: (event: AuthChangeEvent, session: Session | null) => void) {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(callback);
    return subscription;
}

export async function getCurrentUser(): Promise<User | null> {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user ?? null;
}

export async function createAnonymousUser(): Promise<User> {
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) {
        throw error;
    }
    if (!data.user) {
        throw new Error("Anonymous sign-in failed: no user returned.");
    }
    return data.user;
}

export async function logOut() {
    return supabase.auth.signOut();
}

// The following functions from firebase/auth.ts are not migrated
// as they are not aligned with the "anonymous-only" auth strategy.
// - setupRecaptcha
// - sendVerificationCode
// - verifyCodeAndSignIn
// - signInWithToken
