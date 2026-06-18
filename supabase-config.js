// =====================================================================
// CONFIGURAÇÃO DO SUPABASE — Maternidade Atípica
// =====================================================================



const SUPABASE_URL = "https://yzakngwgokhcakbtynnj.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6YWtuZ3dnb2toY2FrYnR5bm5qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1NTIyNzcsImV4cCI6MjA5NzEyODI3N30.k0g3hISSuETGqzUxi6lAapMMW7aC3QlNTCJcADm29Xw";


const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);