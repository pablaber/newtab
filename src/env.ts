export const isHosted = import.meta.env.VITE_HOSTED === 'true';

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
export const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const isSyncAvailable = Boolean(
  isHosted && supabaseUrl && supabasePublishableKey,
);
