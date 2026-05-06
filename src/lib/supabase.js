import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  'https://usumagkouerikehambwz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzdW1hZ2tvdWVyaWtlaGFtYnd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwNTEzMTEsImV4cCI6MjA5MzYyNzMxMX0.-k6N7oKKXGmIldDMLPyFxiIhB9mmYLIcAmCOT95eoRU'
)
