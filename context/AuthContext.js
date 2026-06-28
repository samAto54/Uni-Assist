import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [session, setSession] = useState(null);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isVisitor, setIsVisitor] = useState(false);

    useEffect(() => {
        // Get the initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session) setIsVisitor(false);
            setLoading(false);
        });

        // Listen for auth state changes (login, logout, token refresh)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session) setIsVisitor(false);
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    const continueAsVisitor = () => {
        setIsVisitor(true);
        setSession(null);
        setUser(null);
    };

    const signOut = async () => {
        await supabase.auth.signOut();
        setIsVisitor(false);
    };

    const value = {
        session,
        user,
        loading,
        isVisitor,
        continueAsVisitor,
        signOut,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
