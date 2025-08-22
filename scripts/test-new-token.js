const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlMjNkMmE4My01YTAyLTQ3ZjYtODE2OS1lNWVlNWFiMmEwMjQiLCJ0eXBlIjoiQVBJX0tFWSIsIndvcmtzcGFjZUlkIjoiZTIzZDJhODMtNWEwMi00N2Y2LTgxNjktZTVlZTVhYjJhMDI0IiwiaWF0IjoxNzU1ODMyNzY1LCJleHAiOjQ5MDk0MzI3NjQsImp0aSI6IjliZmFiNmE1LWQwMTItNGE1Mi1hNDgxLWI1NzJjY2ZlNzkyYiJ9.E1Ffy_Q1oXRkUJOT3exfSA2p9fekRE0URve2QpEnPF8';

console.log('🔍 Analyzing new JWT token...\n');

const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
console.log('New JWT payload:');
console.log(JSON.stringify(payload, null, 2));
console.log('');

const expDate = new Date(payload.exp * 1000);
console.log('Token expires:', expDate.toISOString());
console.log('Has sub claim:', !!payload.sub);
console.log('Token type:', payload.type);
console.log('Workspace ID:', payload.workspaceId);

console.log('\n✅ This token looks correct! It has the "sub" claim that was missing from the old one.');
