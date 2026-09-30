import dotenv from 'dotenv';
dotenv.config();
const token = process.env.VITE_SUPABASE_ANON_KEY;
console.log(JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString()));
