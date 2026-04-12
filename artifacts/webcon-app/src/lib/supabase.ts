export const supabase = {
  auth: {
    getSession: async () => ({ data: { session: null }, error: null }),
    signInWithPassword: async () => ({ data: null, error: new Error('Supabase removed') }),
    signUp: async () => ({ data: null, error: new Error('Supabase removed') }),
    signOut: async () => ({ error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    updateUser: async () => ({ data: null, error: null }),
  },
  from: (_table: string) => ({
    select: () => ({
      eq: () => ({
        single: async () => ({ data: null, error: null }),
        order: () => ({
          limit: () => ({
            single: async () => ({ data: null, error: null }),
          }),
          ascending: () => ({
            limit: () => ({ data: null, error: null }),
          }),
        }),
        gte: () => ({ data: null, error: null, count: 0 }),
        limit: () => ({ data: null, error: null }),
      }),
      order: () => ({
        limit: () => ({ data: [], error: null }),
        ascending: () => ({ data: [], error: null }),
      }),
    }),
    insert: () => ({
      select: () => ({
        single: async () => ({ data: null, error: null }),
      }),
    }),
    update: () => ({
      eq: () => ({ error: null }),
    }),
    delete: () => ({
      eq: () => ({ error: null }),
    }),
    rpc: () => ({}),
  }),
  storage: {
    from: (_bucket: string) => ({
      upload: async () => ({ error: null }),
      getPublicUrl: () => ({ data: { publicUrl: '' } }),
    }),
  },
  rpc: async () => ({ data: null, error: null }),
};

export function createClient() {
  return supabase;
}
