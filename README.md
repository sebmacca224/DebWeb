# Deborah Fowler website

Static public author website plus a small FastAPI backend.

## Local preview

```bash
python3 -m http.server 4174
```

Open `http://127.0.0.1:4174`.

For the API, see [backend/README.md](backend/README.md). Copy
`backend/.env.example` to `backend/.env` and add secrets only there or in
Railway's Variables screen. Never commit a real `.env` file.

## Production shape

- Cloudflare Pages: public website
- Railway: FastAPI API
- Supabase: books and images
- Brevo: newsletter subscribers and email campaigns

The `/admin` interface uses Supabase Auth and FastAPI-signed sessions. Configure
`ADMIN_EMAILS` and `SESSION_SECRET` in Railway before attempting to sign in.
