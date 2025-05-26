import supabase from './supabase';

export async function test() {
const { data, error } = await supabase
  .from('libraries')
  .insert([{ branch_code: 'TESTCLIENT', branch_name: 'Test from client', closed: false }]);

if (error) {
  console.error('Supabase insert error:', error);
} else {
  console.log('Insert succeeded:', data);
}
}
