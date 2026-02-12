
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hyejthvtxcdvsxqrcpxi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh5ZWp0aHZ0eGNkdnN4cXJjcHhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxMDgyMjMsImV4cCI6MjA3MjY4NDIyM30.sRYKZc3-Nm08-PDoF4p4IPI9o7vxMRHIqiU4j0VIF_Q';

if (!supabaseUrl || supabaseUrl.includes('TU_SUPABASE_URL')) {
  console.error("Advertencia: La URL de Supabase no está configurada. Por favor, añádela en supabaseClient.ts");
}

if (!supabaseKey || supabaseKey.includes('TU_SUPABASE_ANON_KEY')) {
  console.error("Advertencia: La clave anónima de Supabase no está configurada. Por favor, añádela en supabaseClient.ts");
}


export const supabase = createClient(supabaseUrl, supabaseKey);