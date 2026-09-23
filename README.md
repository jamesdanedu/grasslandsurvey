# Multispecies Grass Survey

Irish Angus Schools Competition project — St Mary's Edenderry.
Survey team: Sean Monahan, Eamon Gill, Micheal Glennon, Charlie Minnock.

A static site (no build step) hosted on Vercel, with responses stored in Supabase.

| Page | URL | Who |
|---|---|---|
| Survey | `/` | Anyone with the link — farmers fill it in on phone or computer |
| Results & analytics | `/results` | Survey team only (email + password sign-in) |

## Files

```
index.html          Survey form
results.html        Results dashboard (sign-in required)
assets/styles.css   Shared styles (light + dark mode)
assets/config.js    Supabase URL + publishable key
assets/common.js    Questions, counties, farm types, shared helpers
assets/survey.js    Survey form logic
assets/results.js   Sign-in, analytics, CSV export, delete
supabase/schema.sql Database table, security rules and admin list
vercel.json         Clean URLs (/results) and security headers
```

## Deploy on Vercel

1. Push these files to the `main` branch of `jamesdanedu/grasslandsurvey`.
2. In Vercel: **Add New → Project → Import** the repo.
3. Framework preset: **Other**. Leave Build Command and Output Directory empty. Deploy.

Every push to `main` redeploys automatically.

## One-time Supabase setup (sign-in for the results page)

The database table and security rules are already applied to the Supabase project
`musicbrainimpact` (tables are prefixed `grass_` so they don't clash with anything else).

To be able to sign in to `/results`:

1. Supabase dashboard → **Authentication → Users → Add user → Create new user**.
2. Email: `josullivanedu@gmail.com`, choose a password, tick **Auto Confirm User**.

To give a student or colleague access, create a user for them the same way, then run in the SQL editor:

```sql
insert into public.grass_survey_admins (email) values ('their.email@example.com');
```

## Security model

- Farmers (not signed in) can **only add** responses. They cannot read, change or delete anything.
- Only signed-in users whose email is in `grass_survey_admins` can read or delete responses.
- The database rejects invalid values (unknown county, farm type, missing answers, back-dated rows).
- The publishable key in `assets/config.js` is designed to be public; the rules above are what protect the data.
