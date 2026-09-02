import '@testing-library/jest-dom';

// Mocks para Supabase (para que no llore en los tests)
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://mock-url.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'mock-anon-key';
