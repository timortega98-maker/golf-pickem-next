import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://tucimcaghqgupmiyurdo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR1Y2ltY2FnaHFndXBtaXl1cmRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1MTM5NDMsImV4cCI6MjA4OTA4OTk0M30.HHV0xpNL0WPUzpto7-EY3-IJ0RDAWJkwX5ZP61WM3uw';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
