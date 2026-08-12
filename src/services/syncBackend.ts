import type { AppConfig } from '../types/config.ts';
import {
  isSyncAvailable,
  supabasePublishableKey,
  supabaseUrl,
} from '../env.ts';

export interface AccountUser {
  id: string;
  email: string;
}

export interface CloudConfigRecord {
  config: unknown;
  updatedAt: string;
}

export interface SyncBackend {
  getCurrentUser: () => Promise<AccountUser | null>;
  onAuthStateChange: (callback: (user: AccountUser | null) => void) => () => void;
  requestEmailCode: (email: string) => Promise<void>;
  verifyEmailCode: (email: string, code: string) => Promise<AccountUser>;
  signOut: () => Promise<void>;
  getConfig: (userId: string) => Promise<CloudConfigRecord | null>;
  saveConfig: (userId: string, config: AppConfig) => Promise<string>;
}

function toAccountUser(user: { id: string; email?: string }): AccountUser {
  if (!user.email) throw new Error('The signed-in account has no email address.');
  return { id: user.id, email: user.email };
}

let backendPromise: Promise<SyncBackend | null> | null = null;

export function getSyncBackend(): Promise<SyncBackend | null> {
  if (!isSyncAvailable || !supabaseUrl || !supabasePublishableKey) {
    return Promise.resolve(null);
  }

  if (backendPromise) return backendPromise;

  const url = supabaseUrl;
  const publishableKey = supabasePublishableKey;
  backendPromise = import('@supabase/supabase-js').then(({ createClient }) => {
    const client = createClient(url, publishableKey);

    const backend: SyncBackend = {
      async getCurrentUser() {
        const { data, error } = await client.auth.getSession();
        if (error) throw error;
        return data.session?.user ? toAccountUser(data.session.user) : null;
      },

      onAuthStateChange(callback) {
        const { data } = client.auth.onAuthStateChange((_event, session) => {
          callback(session?.user ? toAccountUser(session.user) : null);
        });
        return () => data.subscription.unsubscribe();
      },

      async requestEmailCode(email) {
        const { error } = await client.auth.signInWithOtp({
          email,
          options: { shouldCreateUser: true },
        });
        if (error) throw error;
      },

      async verifyEmailCode(email, code) {
        const { data, error } = await client.auth.verifyOtp({
          email,
          token: code,
          type: 'email',
        });
        if (error) throw error;
        if (!data.user) throw new Error('The login code could not be verified.');
        return toAccountUser(data.user);
      },

      async signOut() {
        const { error } = await client.auth.signOut();
        if (error) throw error;
      },

      async getConfig(userId) {
        const { data, error } = await client
          .from('user_configs')
          .select('config, updated_at')
          .eq('user_id', userId)
          .maybeSingle();
        if (error) throw error;
        return data
          ? { config: data.config, updatedAt: data.updated_at as string }
          : null;
      },

      async saveConfig(userId, config) {
        const { data, error } = await client
          .from('user_configs')
          .upsert({ user_id: userId, config })
          .select('updated_at')
          .single();
        if (error) throw error;
        return data.updated_at as string;
      },
    };

    return backend;
  });

  return backendPromise;
}
