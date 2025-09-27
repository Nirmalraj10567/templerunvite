# Welcome to your Lovable project

## Project info


## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**


**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/ef0d919c-a6d3-434c-9506-bdd2888ee774) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)

## Database & Member Flow

This project uses SQLite via Knex on the backend.

- Database file (active): `server/deev.sqlite3`
- Alternative file (present but not used by current config): `server/database.sqlite3`
- Migrations directory: `server/db/migrations/`
- Seeds directory: `server/db/seed/`

The SQLite connection is configured in `server/backend.js`:

```js
// server/backend.js
const db = knex({
  client: 'sqlite3',
  connection: { filename: path.join(__dirname, 'deev.sqlite3') },
  useNullAsDefault: true,
});
```

### Member creation (POST /api/members)

- Frontend submit: `src/pages/MemberEntryPage.tsx` calls `POST /api/members` with a JWT in `Authorization: Bearer <token>`.
- Backend route: implemented in `server/backend.js` at `app.post('/api/members', ...)`.
- Access control: requires JWT and `member_entry` permission with `full` access.
- Writes to database (inside a transaction):
  - `user_registrations`: creates the member record (`name`, `username`, `mobile_number`, `email`, `temple_id`).
  - If `createLogin` is true:
    - `users`: creates a login with hashed password, role, and `temple_id`.
    - `user_permissions`: assigns provided `customPermissions` or a legacy single `permissionLevel`. Special case: mobile `9999999999` becomes `superadmin` and is granted all permissions.

Expected request body fields:

```json
{
  "name": "<fullName>",
  "username": "<optional; required if createLogin>",
  "mobile": "<10-digit>",
  "email": "<nullable>",
  "createLogin": true,
  "password": "<required if createLogin>",
  "role": "member|admin|superadmin",
  "permissionLevel": "<optional legacy>",
  "customPermissions": [{ "id": "member_entry", "access": "full" }]
}
```

### Member list (GET /api/members)

- Backend route: `server/backend.js` at `app.get('/api/members', ...)`.
- Access control: requires JWT and `member_view` with `view` access.
- Joins `user_registrations` to `users` by mobile and filters by the caller's `temple_id`.

### Member/user update (PUT /api/users/:userId)

- Frontend usage: edit flow from `src/pages/MemberEntryPage.tsx` calls `PUT /api/users/:id`.
- Backend handler: `server/users.js` at `router.put('/:userId', ...)`.
- Access control: public login endpoints are allowed, all other routes (including update) require JWT; route enforces same-temple rule and role restrictions (e.g., non-superadmins cannot assign superadmin).
- Writes to database:
  - `users`: updates `email`, `full_name`, `status`, and optionally `role`.
  - `user_permissions`: replaces records if `customPermissions` is provided.

### Inspecting the database locally

If you have the SQLite CLI installed, you can inspect the DB file directly:

```bash
sqlite3 server/deev.sqlite3 ".tables"
sqlite3 server/deev.sqlite3 "PRAGMA table_info(user_registrations);"
sqlite3 server/deev.sqlite3 "SELECT id, name, mobile_number FROM user_registrations ORDER BY id DESC LIMIT 5;"
```

Note: The backend enforces JWT auth and fine-grained permissions. Ensure your user has `member_entry` (full) to create members and `member_view` (view) to list them. See `server/backend.js` for the exact middleware wiring and `server/middlewares/auth.js` if additional auth helpers are used.

# templerunvite




build and zip it in cpanel


cd "/Volumes/KANINFOTECH/templerunvite" && npm ci --no-audit --no-fund

npm install --no-audit --no-fund


npm run build


cd dist && zip -r ../dist-cpanel.zip . -x "*.DS_Store" && cd .. && ls -lh dist-cpanel.zip | cat



Built production bundle and created archive: dist-cpanel.zip (size ~1.2 MB) at the project root.
Includes index.html, assets/, uploads/, robots.txt, placeholder.svg, and .htaccess.
Deploy steps on cPanel:
Upload dist-cpanel.zip to your target folder (public_html or a subfolder).
Extract it so index.html, assets/, and .htaccess are in the same directory.
If in a subfolder, ensure the folder is the site root for that domain/subdomai



