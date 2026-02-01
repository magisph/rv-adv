import { supabase } from "@/lib/supabase";

export const authService = {
  async login({ email, password }) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return this._mapUser(data.user);
  },

  async logout() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getCurrentUser() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return null;
    return this._mapUser(session.user);
  },
  
  // Alias for compatibility if needed
  async me() {
      return this.getCurrentUser();
  },

  _mapUser(supabaseUser) {
    if (!supabaseUser) return null;
    return {
      id: supabaseUser.id,
      email: supabaseUser.email,
      ...supabaseUser.user_metadata, 
    };
  }
};
