# Deborah Fowler website API

This is the deliberately small FastAPI service behind the static author website.
It is built for a public Cloudflare Pages frontend, Supabase for catalogue data and
public image URLs, and Brevo for subscriptions and campaigns. Admin writes are
protected by Supabase Auth, an explicit administrator email list, signed HTTP-only
sessions, approved-origin checks, and FastAPI authorization.

## What works now

- `GET /health` returns a simple health response.
- `GET /api/books` and `GET /api/books/{slug}` return the book shape already used
  by the public JavaScript. Before Supabase is configured they expose the visible,
  read-only development seed catalogue.
- `POST /api/newsletter/subscribe` validates a name/email and, only when Brevo is
  configured, adds the contact to the chosen Brevo list.
- `POST /api/contact` validates the submitted fields but deliberately returns an
  honest service-not-configured response until a secure contact destination is
  selected.
- `POST /api/auth/login` verifies a Supabase Auth account; `/api/admin/*` requires
  the resulting signed session and a permitted email.
- Authenticated admin routes manage books, images, author information and private
  newsletter drafts, tests and confirmed Brevo sends.

Newsletters are email-only: they are not published, archived, or displayed on the
public website.

## Local setup

From the project root:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

Open `http://127.0.0.1:8000/health`; it should return `{"status":"healthy"}`.
The API documentation is available locally at `http://127.0.0.1:8000/docs`.

To have the public frontend use the local API, edit the **public** configuration in
`js/config.js` to:

```js
apiBaseUrl: "http://127.0.0.1:8000",
```

Then serve the project root with a static server (for example
`python3 -m http.server 4174`) and open `http://127.0.0.1:4174`. Do not open the
site from a `file://` URL: clean routes and JavaScript module imports need a web
server.

When finished with local API testing, set `apiBaseUrl` back to `null` to use the
static seed data again.

## Supabase setup

1. Create a Supabase project in the UK/EU region if desired.
2. In its SQL Editor, run `backend/sql/schema.sql`.
3. Create public image URLs in the `author-assets` bucket. Keep upload access
   server-side; the public browser only receives final public URLs.
4. Add the project URL and **service role** key to `backend/.env`:

   ```dotenv
   SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   SUPABASE_SERVICE_KEY=server-only-secret
   ```

5. Insert the real book records. `purchase_links` is a JSON array such as:

   ```json
   [{"label":"Publisher’s page","url":"https://publisher.example/book"}]
   ```

The service role key must never be added to the frontend, Cloudflare Pages files,
or GitHub. Once these values exist, the public book endpoints read from Supabase
instead of the seed data.

## Admin access

1. In Supabase **Authentication → Users**, create Deborah's email/password user.
2. Add `ADMIN_EMAILS` and a long random `SESSION_SECRET` only in Railway.
3. Keep `CORS_ORIGINS` restricted to the actual Pages and custom-domain origins.
4. Visit `/admin`; FastAPI authorizes every data-changing request independently
   of the frontend page.

## Brevo setup

1. Create a Brevo contact list and copy its numeric list ID.
2. Set up and verify Deborah’s sender address. Authenticate its domain before
   production sending.
3. Under **Transactional → Templates**, create and activate a double-opt-in
   confirmation email. Its confirmation button must link to
   `{{ params.DOIurl }}`. Copy the numeric template ID.
4. Add these only to `backend/.env` or Railway variables:

   ```dotenv
   BREVO_API_KEY=server-only-secret
   BREVO_LIST_ID=123
   BREVO_DOI_TEMPLATE_ID=456
   BREVO_DOI_REDIRECT_URL=https://debweb.pages.dev/newsletter?confirmed=1
   BREVO_SENDER_EMAIL=newsletter@deborahfowler.co.uk
   ```

The signup endpoint uses Brevo's double-opt-in API, so a reader joins the list
only after following the confirmation email. Campaigns include a visible Brevo
unsubscribe link. Brevo sends the email and handles subscribers/unsubscribes. Newsletter editions
are delivered by email only. If drafts need to be kept outside Brevo, the private
`newsletter_drafts` table can support the authenticated admin workflow; it must
never be used to create a public archive.

## Deployment outline

1. Create a **private** GitHub repository and push this project. Check that `.env`
   and `backend/.env` are not included.
2. In Cloudflare Pages, connect the GitHub repository as a static site. Build
   command is blank; output directory is the repository root. The existing
   `_redirects` file provides SPA routes, including `/admin/*` for development.
3. In Railway, create a service from the same repository. Set its root directory
   to `backend`, build command to `pip install -r requirements.txt`, and start
   command to `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.
4. Add the contents of `backend/.env` as Railway environment variables. Do not add
   them to Cloudflare Pages.
5. Change `js/config.js` to the public Railway HTTPS URL, e.g.
   `https://deborah-fowler-api.up.railway.app`, and redeploy Pages.
6. Set Railway `CORS_ORIGINS` to the precise Pages preview/production and custom
   domain origins, e.g.

   ```dotenv
   CORS_ORIGINS=https://YOUR_PROJECT.pages.dev,https://deborahfowler.co.uk,https://www.deborahfowler.co.uk
   ```

7. Test `/health`, the book catalogue, a book cover, and a newsletter subscription
   before attaching the final domain.
8. Only after the Pages preview is approved, add `deborahfowler.co.uk` to
   Cloudflare, change nameservers at its existing registrar, and attach the domain
   to the Pages project. Keep the domain; no new domain purchase is needed.
9. Create Deborah's Supabase Auth user and configure `ADMIN_EMAILS` and
   `SESSION_SECRET` before using the admin.

## Protected endpoints

Authenticated admin routes include:

- `POST`, `PUT`, `DELETE /api/admin/books`
- `POST /api/admin/images`
- `GET`, `POST`, `PUT /api/admin/newsletters`
- `POST /api/admin/newsletters/{id}/test`
- `POST /api/admin/newsletters/{id}/send`

The public `/api/books` and `/api/author` endpoints stay read-only. FastAPI—not
hidden frontend pages—enforces access control.
