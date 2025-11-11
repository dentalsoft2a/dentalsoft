import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];
type UserProfile = Database['public']['Tables']['user_profiles']['Row'];

interface EmployeeInfo {
  laboratory_profile_id: string;
  role_name: string;
  is_active: boolean;
}

interface ImpersonationSession {
  sessionId: string;
  adminUserId: string;
  adminEmail: string;
  targetUserId: string;
  targetEmail: string;
  expiresAt: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  userProfile: UserProfile | null;
  loading: boolean;
  hasActiveSubscription: boolean;
  isEmployee: boolean;
  employeeInfo: EmployeeInfo | null;
  laboratoryId: string | null;
  userEmail: string | null;
  isImpersonating: boolean;
  impersonationSession: ImpersonationSession | null;
  signUp: (email: string, password: string, firstName: string, lastName: string, laboratoryName: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<Profile>) => Promise<{ error: Error | null }>;
  impersonateUser: (targetUserId: string) => Promise<{ error: Error | null }>;
  endImpersonation: () => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [employeeInfo, setEmployeeInfo] = useState<EmployeeInfo | null>(null);
  const [laboratoryUserProfile, setLaboratoryUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [impersonationSession, setImpersonationSession] = useState<ImpersonationSession | null>(null);
  const [isImpersonating, setIsImpersonating] = useState(false);

  useEffect(() => {
    if (employeeInfo) {
      console.log('Employee Info:', employeeInfo);
      console.log('Laboratory User Profile:', laboratoryUserProfile);
      console.log('User Profile:', userProfile);
    }
  }, [employeeInfo, laboratoryUserProfile, userProfile]);

  useEffect(() => {
    const storedSession = sessionStorage.getItem('impersonation_session');
    if (storedSession) {
      try {
        const session = JSON.parse(storedSession);
        const expiresAt = new Date(session.expiresAt).getTime();
        const now = new Date().getTime();

        if (expiresAt > now) {
          setImpersonationSession(session);
          setIsImpersonating(true);
        } else {
          sessionStorage.removeItem('impersonation_session');
          sessionStorage.removeItem('admin_session');
        }
      } catch (e) {
        console.error('Failed to parse impersonation session:', e);
        sessionStorage.removeItem('impersonation_session');
        sessionStorage.removeItem('admin_session');
      }
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        setUser(session?.user ?? null);
        if (session?.user) {
          await loadProfile(session.user.id);
        } else {
          setProfile(null);
          setUserProfile(null);
          setLoading(false);
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadProfile = async (userId: string) => {
    try {
      console.log('Loading profile for userId:', userId);

      const [profileResult, userProfileResult, employeeResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle(),
        supabase
          .from('user_profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle(),
        supabase
          .from('laboratory_employees')
          .select('laboratory_profile_id, role_name, is_active, email')
          .eq('email', (await supabase.auth.getUser()).data.user?.email || '')
          .eq('is_active', true)
          .maybeSingle()
      ]);

      console.log('Profile result:', profileResult.data);
      console.log('UserProfile result:', userProfileResult.data);
      console.log('Employee result:', employeeResult.data);

      if (profileResult.error && profileResult.error.code !== 'PGRST116') throw profileResult.error;
      if (userProfileResult.error && userProfileResult.error.code !== 'PGRST116') throw userProfileResult.error;

      setProfile(profileResult.data);
      setUserProfile(userProfileResult.data);
      setEmployeeInfo(employeeResult.data);

      if (employeeResult.data?.laboratory_profile_id) {
        console.log('Loading laboratory profile for:', employeeResult.data.laboratory_profile_id);
        const { data: labUserProfile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', employeeResult.data.laboratory_profile_id)
          .maybeSingle();

        console.log('Laboratory user profile:', labUserProfile);
        setLaboratoryUserProfile(labUserProfile);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    laboratoryName: string,
    isDentist: boolean = false,
    referralCode?: string
  ) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        if (isDentist) {
          const { error: dentistError } = await supabase.from('dentist_accounts').insert({
            id: data.user.id,
            email: email,
            name: firstName,
            phone: lastName,
          });

          if (dentistError) throw dentistError;
        } else {
          const { error: profileError } = await supabase.from('profiles').insert({
            id: data.user.id,
            first_name: firstName,
            last_name: lastName,
            laboratory_name: laboratoryName,
          });

          if (profileError) throw profileError;

          // Process referral if a code was provided
          if (referralCode && referralCode.trim()) {
            const { error: referralError } = await supabase.rpc('process_referral_rewards', {
              p_referee_id: data.user.id,
              p_referral_code: referralCode.trim().toUpperCase()
            });

            // Don't throw error if referral processing fails (invalid code, etc.)
            // Just log it silently so user can still sign up
            if (referralError) {
              console.warn('Referral processing failed:', referralError);
            }
          }
        }
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    try {
      if (isImpersonating) {
        await endImpersonation();
        return;
      }

      await supabase.auth.signOut({ scope: 'local' });
      setUser(null);
      setProfile(null);
      setUserProfile(null);
      setEmployeeInfo(null);
      setLaboratoryUserProfile(null);
      setImpersonationSession(null);
      setIsImpersonating(false);
      sessionStorage.removeItem('impersonation_session');
      sessionStorage.removeItem('admin_session');
    } catch (error) {
      console.error('Error signing out:', error);
      setUser(null);
      setProfile(null);
      setUserProfile(null);
      setEmployeeInfo(null);
      setLaboratoryUserProfile(null);
      setImpersonationSession(null);
      setIsImpersonating(false);
      sessionStorage.removeItem('impersonation_session');
      sessionStorage.removeItem('admin_session');
    }
  };

  const impersonateUser = async (targetUserId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      sessionStorage.setItem('admin_session', JSON.stringify({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        user: session.user,
      }));

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/impersonate-user`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ targetUserId }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        console.error('Impersonation failed:', result);

        if (result.error && result.error.includes('already have an active impersonation session')) {
          sessionStorage.removeItem('impersonation_session');
          sessionStorage.removeItem('admin_session');
          setImpersonationSession(null);
          setIsImpersonating(false);

          throw new Error('Session expirée détectée. Veuillez réessayer.');
        }
        throw new Error(result.error || 'Failed to impersonate user');
      }

      const impSession: ImpersonationSession = {
        sessionId: result.sessionId,
        adminUserId: result.adminUser.id,
        adminEmail: result.adminUser.email,
        targetUserId: result.targetUser.id,
        targetEmail: result.targetUser.email,
        expiresAt: result.expiresAt,
      };

      sessionStorage.setItem('impersonation_session', JSON.stringify(impSession));
      setImpersonationSession(impSession);
      setIsImpersonating(true);

      const { error } = await supabase.auth.setSession({
        access_token: result.accessToken,
        refresh_token: result.refreshToken,
      });

      if (error) throw error;

      window.location.reload();

      return { error: null };
    } catch (error) {
      console.error('Impersonation error:', error);
      sessionStorage.removeItem('admin_session');
      return { error: error as Error };
    }
  };

  const endImpersonation = async () => {
    try {
      if (!impersonationSession) {
        throw new Error('No active impersonation session');
      }

      const adminSession = sessionStorage.getItem('admin_session');
      if (!adminSession) {
        throw new Error('Admin session not found');
      }

      const { access_token } = JSON.parse(adminSession);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/end-impersonation`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sessionId: impersonationSession.sessionId }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to end impersonation');
      }

      sessionStorage.removeItem('impersonation_session');
      setImpersonationSession(null);
      setIsImpersonating(false);

      const { access_token: adminAccessToken, refresh_token: adminRefreshToken } = JSON.parse(adminSession);
      await supabase.auth.setSession({
        access_token: adminAccessToken,
        refresh_token: adminRefreshToken,
      });

      sessionStorage.removeItem('admin_session');

      window.location.reload();

      return { error: null };
    } catch (error) {
      console.error('End impersonation error:', error);
      return { error: error as Error };
    }
  };

  const updateProfile = async (data: Partial<Profile>) => {
    try {
      if (!user) throw new Error('No user logged in');

      const { error } = await supabase
        .from('profiles')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', user.id);

      if (error) throw error;

      await loadProfile(user.id);
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const isEmployee = !!employeeInfo && !profile?.laboratory_name;
  const laboratoryId = isEmployee ? employeeInfo.laboratory_profile_id : (profile?.id || null);
  const effectiveUserProfile = isEmployee ? laboratoryUserProfile : userProfile;
  const hasActiveSubscription = effectiveUserProfile?.subscription_status === 'active' || effectiveUserProfile?.subscription_status === 'trial';

  const effectiveUser = user ? {
    ...user,
    id: laboratoryId || user.id
  } : null;

  const userEmail = user?.email || null;

  return (
    <AuthContext.Provider value={{
      user: effectiveUser,
      profile,
      userProfile: effectiveUserProfile,
      loading,
      hasActiveSubscription,
      isEmployee,
      employeeInfo,
      laboratoryId,
      userEmail,
      isImpersonating,
      impersonationSession,
      signUp,
      signIn,
      signOut,
      updateProfile,
      impersonateUser,
      endImpersonation
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
