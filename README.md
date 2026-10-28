# Mr. Liempo — Inventory & POS System

Expo (React Native) app + Express/MySQL API.

```
ITPM_Inventory-POS_System/
├── backend/
│   ├── server.js                 # entry point (npm start)
│   ├── .env.example              # copy to .env and fill in
│   ├── database/
│   │   ├── pos_schema.sql        # tables, triggers, stored procedures
│   │   ├── seed.js               # manager login, menu, stock items (npm run db:seed)
│   │   ├── migrations/           # changes for databases created from an older schema
│   │   └── migrate_legacy.sql    # one-time import from the old database (optional)
│   └── src/
│       ├── app.js                # express app + route mounting
│       ├── config/               # env, MySQL pool, mailer
│       ├── middleware/           # JWT auth, role checks, error handler
│       ├── routes/               # auth, account, reports, inventory, menu, staff, orders
│       └── utils/
└── frontend/
    └── src/
        ├── app/
        │   ├── _layout.tsx       # loads Poppins, stack navigator
        │   ├── (auth)/           # login, forgot password, OTP, new/change password
        │   └── (main)/           # manager + cashier screens
        ├── components/           # RoleSideDrawer
        ├── config/apiConfig.ts   # ← the ONLY place with the server IP / API URLs
        ├── config/theme.ts       # brand colors & fonts
        ├── constants/            # routes, images, app constants
        ├── hooks/  services/  store/  utils/
```

## First-time setup

**Database (MySQL 8)**

```bash
mysql -u root -p -e "CREATE DATABASE myapp_db"
mysql -u root -p myapp_db < backend/database/pos_schema.sql
```

Already have a database from the old schema? Just run
`backend/database/migrations/001_add_suspended_until.sql` instead.

**Backend**

```bash
cd backend
npm install
copy .env.example .env      # then fill in DB_PASSWORD, JWT_SECRET, EMAIL_USER, EMAIL_PASS
npm run db:seed             # creates the manager login, menu items and stock items
npm start                   # http://localhost:3000/health should say "ok"
```

The seed prints the manager login. The first login asks you to change the password.

**Frontend**

```bash
cd frontend
npm install
npx expo start
```

On a phone, the API address is detected from the Expo dev server automatically.
If that fails, change `FALLBACK_HOST_IP` in `frontend/src/config/apiConfig.ts`
(or set `EXPO_PUBLIC_API_URL`).

## Notes

- Stock quantities start at 0 — use **Restock** to add stock before selling.
- Each menu item has a **portion**: how much stock one order uses (e.g. Half Juicy
  Chicken = 0.5 pcs Raw Chicken). Every sale deducts it, and the POS shows how many
  orders are left and blocks items that are out of stock. Change portions in
  **Manage Price → Edit Price → Portion per order**. Starting values are in
  `backend/src/config/catalog.js`.
- The backend applies database upgrades by itself on start (`src/config/ensureSchema.js`).
- Only cash payments are recorded today; the "E-wallet" export filter returns no rows.
