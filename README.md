 
notes -- 
## Supabase mode

GitHub Pages is static, so it cannot save everyone’s votes by itself. Without Supabase, votes save only in the visitor’s browser for demo/testing.

For real shared vote tracking:

1. Create a Supabase project.
2. Open the SQL editor and run `supabase_setup.sql`.
3. In `config.js`, set:

```js
useSupabase: true,
supabaseUrl: "YOUR_SUPABASE_URL",
supabaseAnonKey: "YOUR_SUPABASE_ANON_KEY",
```
 