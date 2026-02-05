 import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
 import { User, Session } from '@supabase/supabase-js';
 import { supabase } from '@/integrations/supabase/client';
 
 interface Profile {
   id: string;
   email: string | null;
   full_name: string | null;
   avatar_url: string | null;
   phone: string | null;
 }
 
 interface CompanyUser {
   company_id: string;
   role: 'admin' | 'user';
   company: {
     id: string;
     name: string;
     siret: string | null;
   } | null;
 }
 
 interface AuthContextType {
   user: User | null;
   session: Session | null;
   profile: Profile | null;
   companyUser: CompanyUser | null;
   loading: boolean;
   signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
   signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
   signOut: () => Promise<void>;
   refreshProfile: () => Promise<void>;
 }
 
 const AuthContext = createContext<AuthContextType | undefined>(undefined);
 
 export function AuthProvider({ children }: { children: ReactNode }) {
   const [user, setUser] = useState<User | null>(null);
   const [session, setSession] = useState<Session | null>(null);
   const [profile, setProfile] = useState<Profile | null>(null);
   const [companyUser, setCompanyUser] = useState<CompanyUser | null>(null);
   const [loading, setLoading] = useState(true);
 
   const fetchProfile = async (userId: string) => {
     const { data: profileData } = await supabase
       .from('profiles')
       .select('*')
       .eq('id', userId)
       .single();
     
     if (profileData) {
       setProfile(profileData);
     }
 
     const { data: companyUserData } = await supabase
       .from('company_users')
       .select(`
         company_id,
         role,
         company:companies(id, name, siret)
       `)
       .eq('user_id', userId)
       .single();
     
     if (companyUserData) {
       setCompanyUser(companyUserData as unknown as CompanyUser);
     }
   };
 
   const refreshProfile = async () => {
     if (user) {
       await fetchProfile(user.id);
     }
   };
 
   useEffect(() => {
     // Set up auth state listener FIRST
     const { data: { subscription } } = supabase.auth.onAuthStateChange(
       async (event, session) => {
         setSession(session);
         setUser(session?.user ?? null);
         
         if (session?.user) {
           // Defer profile fetch to avoid blocking
           setTimeout(() => fetchProfile(session.user.id), 0);
         } else {
           setProfile(null);
           setCompanyUser(null);
         }
         setLoading(false);
       }
     );
 
     // THEN check for existing session
     supabase.auth.getSession().then(({ data: { session } }) => {
       setSession(session);
       setUser(session?.user ?? null);
       if (session?.user) {
         fetchProfile(session.user.id);
       }
       setLoading(false);
     });
 
     return () => subscription.unsubscribe();
   }, []);
 
   const signUp = async (email: string, password: string, fullName: string) => {
     const { error } = await supabase.auth.signUp({
       email,
       password,
       options: {
         emailRedirectTo: window.location.origin,
         data: {
           full_name: fullName,
         },
       },
     });
     return { error };
   };
 
   const signIn = async (email: string, password: string) => {
     const { error } = await supabase.auth.signInWithPassword({
       email,
       password,
     });
     return { error };
   };
 
   const signOut = async () => {
     await supabase.auth.signOut();
     setUser(null);
     setSession(null);
     setProfile(null);
     setCompanyUser(null);
   };
 
   return (
     <AuthContext.Provider
       value={{
         user,
         session,
         profile,
         companyUser,
         loading,
         signUp,
         signIn,
         signOut,
         refreshProfile,
       }}
     >
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