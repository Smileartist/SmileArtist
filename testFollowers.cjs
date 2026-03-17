const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://arcoxbheqqfomhdtpfno.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFyY294YmhlcXFmb21oZHRwZm5vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0MzgyNjQsImV4cCI6MjA3ODAxNDI2NH0.sYDVF1bXnrGvnIPjxN8PCUjCUFFZ2i64pkyl5lviPp4'
);

(async () => {
  const { count, error } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('following_id', '7804e4f4-de17-4962-a5c1-28120c5b441d');
    
  console.log('Count:', count);
  console.log('Error:', error);
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username')
    .eq('username', 'smileartist')
    .maybeSingle();
    
  console.log('Profile for @smileartist:', profile);
})();
