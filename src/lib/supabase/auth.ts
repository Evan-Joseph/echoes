import { supabase } from './client';
import type { User, AuthChangeEvent, Session } from '@supabase/supabase-js';

export function onAuthStateChanged(
  callback: (event: AuthChangeEvent, session: Session | null) => void
) {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(callback);
  return { subscription };
}

export async function getCurrentUser(): Promise<User | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user ?? null;
}

export async function logOut() {
  return supabase.auth.signOut();
}
