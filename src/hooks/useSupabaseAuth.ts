
import { useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';

export function useSupabaseAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [adminLoading, setAdminLoading] = useState<boolean>(false);
  const { toast } = useToast();

  // Check admin status whenever user changes
  useEffect(() => {
    async function checkAdminStatus() {
      if (!user) {
        setIsAdmin(false);
        return;
      }

      setAdminLoading(true);
      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching admin status:', error);
          toast({
            title: 'Error',
            description: 'Could not check admin status',
            variant: 'destructive',
          });
          setIsAdmin(false);
        } else {
          setIsAdmin(!!profile?.is_admin);
        }
      } catch (error) {
        console.error('Error in admin check:', error);
        setIsAdmin(false);
      } finally {
        setAdminLoading(false);
      }
    }

    if (user) {
      checkAdminStatus();
    }
  }, [user, toast]);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        
        if (event === 'SIGNED_IN' && currentSession) {
          setTimeout(() => {
            console.log('User signed in:', currentSession.user.email);
          }, 0);
        } else if (event === 'SIGNED_OUT') {
          setTimeout(() => {
            console.log('User signed out');
            setIsAdmin(false);
          }, 0);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
    } catch (error: any) {
      toast({
        title: 'Login failed',
        description: error.message || 'Unable to sign in',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) throw error;
      
      toast({
        title: 'Account created',
        description: 'Please check your email for verification link',
      });
    } catch (error: any) {
      toast({
        title: 'Registration failed',
        description: error.message || 'Unable to create account',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      toast({
        title: 'Signed out',
        description: 'You have been signed out successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Sign out failed',
        description: error.message || 'Unable to sign out',
        variant: 'destructive',
      });
      throw error;
    }
  };

  return {
    user,
    session,
    loading: loading || adminLoading,
    isAdmin,
    signIn,
    signUp,
    signOut,
  };
}
