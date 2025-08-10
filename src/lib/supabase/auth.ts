import { getSupabaseClient } from './client';
import type { User, AuthChangeEvent, Session } from '@supabase/supabase-js';

export function onAuthStateChanged(
  callback: (event: AuthChangeEvent, session: Session | null) => void
) {
  const supabase = getSupabaseClient();
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(callback);
  return { subscription };
}

export async function getCurrentUser(): Promise<User | null> {
  const supabase = getSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user ?? null;
}

export async function logOut() {
  const supabase = getSupabaseClient();
  return supabase.auth.signOut();
}
