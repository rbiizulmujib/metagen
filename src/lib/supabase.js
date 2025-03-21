import { createClient } from '@supabase/supabase-js';

// Create a single supabase client for interacting with your database
const supabase = createClient('https://ofwircklikygwohcpsua.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9md2lyY2tsaWt5Z3dvaGNwc3VhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczODgyODYzOCwiZXhwIjoyMDU0NDA0NjM4fQ.9jvULbOXcFAwafzRm0W4xdIi_tu8zRPc9JJPCv-Y_Dw');

export default supabase;