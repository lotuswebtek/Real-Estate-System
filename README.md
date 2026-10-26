# Lead Finder

Search every UAE property-owner spreadsheet from one box. This copy runs **on your PC** (Option A): PostgreSQL and Meilisearch run in Docker, and the website runs in Windows with Node.

The database choice at the top of the request was left blank, so this build uses Option A. Your lead files stay on this computer.

Phase 1 is the shell, sign-in, database, and a Search page filled with **sample rows** so you can judge the layout. Importing your real Excel files is the next phase.

## What you need installed

1. **Node.js 20 or newer.** Check with `node -v` in PowerShell. If the command is missing, install the LTS build from [https://nodejs.org](https://nodejs.org).
2. **Docker Desktop for Windows.** Install it from [https://www.docker.com/products/docker-desktop/](https://www.docker.com/products/docker-desktop/), open it, and wait until it says Docker is running. Postgres and Meilisearch live here. The website itself does **not** run inside Docker, because later it has to read folders on this PC, including the `G:` drive from Google Drive for Desktop.

## First-time setup

Open PowerShell in this project folder (the folder that contains `package.json`).

1. Copy the example environment file:

   ```powershell
   copy .env.example .env
   ```

   A `.env` file is already filled in for local testing. Open it and change `ADMIN_PASSWORD` before you import real phone numbers. The sign-in page uses `ADMIN_EMAIL` and `ADMIN_PASSWORD`.

2. Start the database and the search engine:

   ```powershell
   docker compose up -d
   ```

   The first run downloads the images. Wait until both containers are healthy. You can check with `docker compose ps`.

3. Install the JavaScript packages:

   ```powershell
   npm install
   ```

4. Create the database tables:

   ```powershell
   npx prisma migrate dev
   ```

   If Prisma asks for a migration name, type `init` and press Enter. This also turns on the `pg_trgm` and `unaccent` extensions and the search indexes.

5. Save the default column names (Name, Mobile, Email, and the rest):

   ```powershell
   npx prisma db seed
   ```

6. Start the website:

   ```powershell
   npm run dev
   ```

7. Open [http://localhost:3000](http://localhost:3000).

Sign in with the email and password from `.env`. The local defaults are:

- Email: `admin@leadfinder.local`
- Password: `LeadFinder-local-1`

Change that password in `.env` before real data, then restart `npm run dev`.

Stop the website with `Ctrl+C` in the PowerShell window. The database keeps running in Docker. Stop it, without deleting data, with:

```powershell
docker compose stop
```

## What to try in this phase

- Search the sample rows. `ahmed`, `moham`, and `501112233` should find the same owner. These numbers are fake.
- Try the same person as `0501112233`, `+971 50 111 2233`, and `501112233`.
- Open Area, Folder, and Nationality. The counts change with the search.
- Click a row. The detail panel stays beside the table. `Esc` closes it. Arrow keys move between rows.
- Press `Ctrl+K` and jump to a page or an area.
- Switch light and dark from the sidebar, and collapse the sidebar.
- Narrow the window to a phone width. The sidebar becomes a bottom bar and rows become cards.
- Columns, Files, Sync, Upload, and Dashboard are laid out, and they fill in over the next phases.

The result line says “Sample rows” on purpose. Nothing from your Drive folder is loaded yet.

## Set up Google Drive access

You can do this now, even though the **Connect Google Drive** button arrives in Phase 3. The folder is shared with you, so the app signs in as **you**, with read-only access. It does not need to own the folder.

1. Open [https://console.cloud.google.com](https://console.cloud.google.com) and sign in with the Google account that can see the folder.
2. At the top, open the project picker and choose **New project**. Name it `Lead Finder`. Create it, then make sure that project is selected.
3. Open the navigation menu (three lines), go to **APIs & Services**, then **Library**.
4. Search for **Google Drive API**. Open it and click **Enable**.
5. Go to **APIs & Services → OAuth consent screen**.
   - User type: **External**. Create.
   - App name: `Lead Finder`.
   - User support email: your email.
   - Developer contact: your email.
   - Save and continue.
   - On **Scopes**, click **Add or remove scopes**. Search for Drive, and add the read-only scope `https://www.googleapis.com/auth/drive.readonly`. Update, then save and continue.
   - On **Test users**, click **Add users** and add the same Gmail address you will use to connect the folder. Save.
6. Go to **APIs & Services → Credentials → Create credentials → OAuth client ID**.
   - Application type: **Web application**.
   - Name: `Lead Finder local`.
   - Under **Authorized redirect URIs**, add exactly:

     `http://localhost:3000/api/google/callback`

   - Create. Copy the **Client ID** and **Client secret**.
7. Paste them into `.env`:

   ```
   GOOGLE_CLIENT_ID=your-client-id
   GOOGLE_CLIENT_SECRET=your-client-secret
   GOOGLE_REDIRECT_URI=http://localhost:3000/api/google/callback
   ```

8. Restart `npm run dev` after saving `.env`.

Leave the app in testing mode. Only the Gmail addresses you added as test users can connect. A service account is optional, and only works if that account can already see the folder. If you have one, put its email in `GOOGLE_SERVICE_ACCOUNT_EMAIL` and the JSON key on one line in `GOOGLE_SERVICE_ACCOUNT_JSON`. Most shared “Shared with me” folders will not be visible to a service account, so the normal path is the OAuth button.

When Phase 3 is in place you will paste the folder link from Drive. The link looks like `https://drive.google.com/drive/folders/FOLDER_ID`. The app reads `.xlsx`, `.xls`, `.xlsm`, `.csv`, and native Google Sheets, walks every subfolder, and skips `.trashed-` files.

## Google Drive for Desktop (the G: drive)

This is the simplest way to read the shared folder, and it needs no Google Cloud project. The “Add local folder” button also arrives in Phase 3. Set the drive up now if you want.

1. Install **Google Drive for Desktop** from [https://www.google.com/drive/download/](https://www.google.com/drive/download/) and sign in with the account that can see the folder.
2. A folder that is only under **Shared with me** does not appear on `G:` until you add a shortcut. In the browser, open Drive, right-click the folder **NEW Updated Data of Real Estate**, choose **Organize**, then **Add shortcut to Drive** (sometimes shown as **Add shortcut to My Drive**). Confirm.
3. In Drive for Desktop settings, set the Google Drive streaming mode to **Mirror files**, or right-click the folder and choose **Available offline**. The app can only read a file after Windows has the real bytes. A cloud-only placeholder is retried later and shown as “waiting for download”, not as a failed import.
4. The path will look like `G:\My Drive\NEW Updated Data of Real Estate` or `G:\Shared drives\...`. You will paste that path into Settings.

A local folder only works on the PC where this app is running. A cloud server cannot see your `G:` drive. Online Drive sync is the path for that.

## Where things live

| Piece | Where |
| --- | --- |
| Website | This folder, `npm run dev` (port 3000) |
| Postgres 16 | Docker, port **5433** on this PC (5432 was already taken), user `leadfinder`, database `leadfinder` |
| Meilisearch | Docker, port 7700 |
| Imported file copies | `storage` (change `STORAGE_PATH` in `.env`) |
| Admin password | `.env`, never commit this file |

Postgres is the source of truth. Meilisearch is the search index, added in Phase 4. If you move to a team server later, the database and search calls stay behind `src/lib/db` and `src/lib/search`.

## Publish on Railway

Railway runs the website and a Postgres database. Search uses that database. The Excel files on this PC are not uploaded. After the site is online, copy the local database if you want the leads you already imported.

1. Create a Railway account at [https://railway.com](https://railway.com).
2. Install the Railway CLI and sign in:

   ```powershell
   npm install -g @railway/cli
   railway login
   ```

3. In this project folder, create a project and add Postgres:

   ```powershell
   railway init
   railway add --database postgres
   ```

4. Open the new project in the Railway dashboard. On the **web service** (not the Postgres service), add these variables:

   | Name | Value |
   | --- | --- |
   | `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
   | `ADMIN_EMAIL` | the email you will type on the sign-in page |
   | `ADMIN_PASSWORD` | at least 8 characters, different from the local default |
   | `SESSION_SECRET` | at least 32 random characters |
   | `ENCRYPTION_KEY` | another random string of at least 32 characters |
   | `MAX_UPLOAD_MB` | `50` |

   Pick the Postgres variable from the reference menu so the host name stays inside Railway. Do not paste the local `localhost:5433` URL.

5. Deploy from this folder:

   ```powershell
   railway up
   ```

   The first start creates the tables and the column names. Then generate a public address:

   ```powershell
   railway domain
   ```

   Open that address and sign in with `ADMIN_EMAIL` and `ADMIN_PASSWORD` from the Railway variables.

The published site starts empty. To copy the leads already imported on this PC, install nothing extra and run this after `railway up` has finished once. In the Postgres service, open **Connect** and copy the **public** connection URL (it must include `sslmode=require`).

```powershell
docker exec realesatateapp-postgres-1 pg_dump -U leadfinder -d leadfinder --data-only --no-owner --no-acl -Fc -f /tmp/leadfinder.dump
docker cp realesatateapp-postgres-1:/tmp/leadfinder.dump .\leadfinder.dump
docker run --rm -v "${PWD}:/backup" postgres:16 pg_restore --data-only --no-owner --no-acl --disable-triggers -d "PASTE_THE_PUBLIC_RAILWAY_URL" /backup/leadfinder.dump
```

Delete `leadfinder.dump` when the restore finishes. It contains the lead rows.

Uploads on Railway disappear when the service restarts unless you add a volume mounted at `/data` and set `STORAGE_PATH=/data`. Search does not need that volume. The rows live in Postgres.

## If something fails

**`docker compose` is not recognized.** Docker Desktop is not installed, or its window is not open yet.

**Port 5433 is already in use.** This project publishes Postgres on 5433 because 5432 was already taken on this PC. If 5433 is also taken, change the left side of `"5433:5432"` in `docker-compose.yml` and the port in `DATABASE_URL` to the same free port.

**Prisma cannot connect.** Run `docker compose ps` and wait until `postgres` is healthy, then run `npx prisma migrate dev` again.

**The sign-in page says the server is missing settings.** `.env` is missing a value, or you edited it and did not restart `npm run dev`.

**Google later says the app is blocked.** Add your Gmail address under OAuth consent screen → Test users, and use the same account when you connect.

**A shared folder is not on G:.** Add the shortcut to My Drive, as described above, and set the folder to available offline.
