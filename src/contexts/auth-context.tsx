
'use client';

import * as React from 'react';
import { onAuthStateChanged, logOut as supabaseLogout } from '@/lib/supabase/auth';
import { useRouter } from 'next/navigation';
import { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { getUserProfile } from '@/lib/supabase/db';
import type { AppUser } from '@/lib/types';


interface AuthContextType {
    user: AppUser | null;
    isLoading: boolean;
    logout: () => void;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = React.useState<AppUser | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const router = useRouter();

    React.useEffect(() => {
        // This listener will update the user state whenever Supabase auth state changes.
        const { subscription } = onAuthStateChanged(async (_event: AuthChangeEvent, session: Session | null) => {
            if (session?.user) {
                try {
                    const userProfile = await getUserProfile(session.user.id);
                    setUser(userProfile);
                } catch (error) {
                    console.error("Failed to fetch user profile:", error);
                    // Set a basic user object or handle error appropriately
                    setUser(null);
                }
            } else {
                setUser(null);
            }
             setIsLoading(false);
        });

        // Cleanup subscription on unmount
        return () => {
            subscription?.unsubscribe();
        };
    }, []);

    const logout = async () => {
        await supabaseLogout();
        setUser(null);
        router.push('/login');
    };

    return (
        <AuthContext.Provider value={{ user, isLoading, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = React.useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
