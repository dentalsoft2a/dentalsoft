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

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  userProfile: UserProfile | null;
  loading: boolean;
  hasActiveSubscription: boolean;
  isEmployee: boolean;
  employeeInfo: EmployeeInfo | null;
  laboratoryId: string | null;
  signUp: (email: string, password: string, firstName: string, lastName: string, laboratoryName: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<Profile>) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [employeeInfo, setEmployeeInfo] = useState<EmployeeInfo | null>(null);
  const [laboratoryUserProfile, setLaboratoryUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const effectiveUserProfile = employeeInfo ? laboratoryUserProfile : userProfile;
  const hasActiveSubscription = effectiveUserProfile?.subscription_status === 'active' || effectiveUserProfile?.subscription_status === 'trialing';

  useEffect(() => {
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
          .select('laboratory_profile_id, role_name, is_active')
          .eq('user_profile_id', userId)
          .eq('is_active', true)
          .maybeSingle()
      ]);

      if (profileResult.error) throw profileResult.error;
      if (userProfileResult.error) throw userProfileResult.error;

      setProfile(profileResult.data);
      setUserProfile(userProfileResult.data);
      setEmployeeInfo(employeeResult.data);

      if (employeeResult.data?.laboratory_profile_id) {
        const { data: labUserProfile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', employeeResult.data.laboratory_profile_id)
          .maybeSingle();

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
    isDentist: boolean = false
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
      await supabase.auth.signOut({ scope: 'local' });
      setUser(null);
      setProfile(null);
      setUserProfile(null);
      setEmployeeInfo(null);
      setLaboratoryUserProfile(null);
    } catch (error) {
      console.error('Error signing out:', error);
      // Force local cleanup even if server fails
      setUser(null);
      setProfile(null);
      setUserProfile(null);
      setEmployeeInfo(null);
      setLaboratoryUserProfile(null);
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

  const effectiveUser = user ? {
    ...user,
    id: laboratoryId || user.id
  } : null;

  return (
    <AuthContext.Provider value={{
      user: effectiveUser,
      profile,
      userProfile,
      loading,
      hasActiveSubscription,
      isEmployee,
      employeeInfo,
      laboratoryId,
      signUp,
      signIn,
      signOut,
      updateProfile
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
