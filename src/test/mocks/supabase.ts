/**
 * Supabase Client Mock
 *
 * Provides a mock factory for the Supabase client used in tests.
 * All chained query methods return `this` for fluent API support.
 */

import { vi } from 'vitest';

export interface MockQueryBuilder {
  select: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  upsert: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  neq: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
  or: ReturnType<typeof vi.fn>;
  ilike: ReturnType<typeof vi.fn>;
  gte: ReturnType<typeof vi.fn>;
  lte: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  range: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  then: ReturnType<typeof vi.fn>;
}

/**
 * Create a chainable mock query builder that resolves with the given result
 */
export function createMockQueryBuilder(
  result: { data: unknown; error: unknown; count?: number | null } = { data: null, error: null }
): MockQueryBuilder {
  const builder: MockQueryBuilder = {} as MockQueryBuilder;

  builder.select = vi.fn().mockReturnValue(builder);
  builder.insert = vi.fn().mockReturnValue(builder);
  builder.update = vi.fn().mockReturnValue(builder);
  builder.delete = vi.fn().mockReturnValue(builder);
  builder.upsert = vi.fn().mockReturnValue(builder);
  builder.eq = vi.fn().mockReturnValue(builder);
  builder.neq = vi.fn().mockReturnValue(builder);
  builder.in = vi.fn().mockReturnValue(builder);
  builder.or = vi.fn().mockReturnValue(builder);
  builder.ilike = vi.fn().mockReturnValue(builder);
  builder.gte = vi.fn().mockReturnValue(builder);
  builder.lte = vi.fn().mockReturnValue(builder);
  builder.order = vi.fn().mockReturnValue(builder);
  builder.limit = vi.fn().mockReturnValue(builder);
  builder.range = vi.fn().mockReturnValue(builder);
  builder.single = vi.fn().mockResolvedValue(result);
  builder.then = vi.fn((resolve) => resolve(result));

  // Make the builder itself thenable (for queries without .single())
  Object.defineProperty(builder, 'then', {
    value: vi.fn((resolve: (value: unknown) => void) => resolve(result)),
    writable: true,
    configurable: true,
  });

  return builder;
}

/**
 * Create a mock Supabase client
 */
export function createMockSupabaseClient() {
  const mockQueryBuilder = createMockQueryBuilder();

  return {
    from: vi.fn().mockReturnValue(mockQueryBuilder),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      signInWithPassword: vi.fn().mockResolvedValue({ data: { user: null, session: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
    _queryBuilder: mockQueryBuilder,
  };
}

/**
 * Setup the supabase mock for vi.mock('@/lib/supabase')
 */
export function setupSupabaseMock() {
  const mockClient = createMockSupabaseClient();

  vi.mock('@/lib/supabase', () => ({
    supabase: mockClient,
  }));

  return mockClient;
}

export type MockSupabaseClient = ReturnType<typeof createMockSupabaseClient>;
