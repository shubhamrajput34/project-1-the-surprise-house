# 🌸 The Surprise House

A handmade, personalised gift shop web application. Customers can browse products, save their favourites to a wishlist, place orders, track them live, and submit custom design ideas — with an admin dashboard for managing orders and customization requests.

---

## 📖 Table of Contents

- [Problem / Motivation](#-problem--motivation)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Architecture / Workflow](#-architecture--workflow)
- [Folder Structure](#-folder-structure)
- [Installation & Setup](#-installation--setup)
- [Environment Variables](#-environment-variables)
- [How to Run the Project](#-how-to-run-the-project)
- [Available Commands](#-available-commands)
- [How the Main Functionality Works](#-how-the-main-functionality-works)
- [API Documentation](#-api-documentation)
- [Database Information](#-database-information)
- [Example Usage](#-example-usage)
- [Screenshots / Demo](#-screenshots--demo)
- [Future Improvements](#-future-improvements)
- [Contributing](#-contributing)
- [License](#-license)

---

## 💡 Problem / Motivation

Selling handmade and custom gifts usually means juggling DMs, WhatsApp messages and spreadsheets. **The Surprise House** bundles everything into one place:

- Customers see the catalogue and can submit a custom design idea with a reference photo.
- The shop owner gets a single dashboard with orders, revenue and customization requests.

The result is a lightweight, self-hosted storefront that requires **no cloud account** to run — data is stored in local files on your machine.

---

## ✨ Key Features

**For customers**
- 🛍️ Product catalogue with 11 items across Accessories, Clothing, Home Decor and Gifts & Hampers.
- 🔍 Product search and a scroll-driven product carousel.
- ❤️ Wishlist saved per account.
- 🛒 Cart with quantity controls and per-item customization notes.
- 📍 Delivery pincode checker.
- 💳 Checkout with UPI / Card / Net banking / Cash on delivery options.
- 📦 Order history with live tracking (Placed → Packed → Out for delivery → Delivered) and self-service cancellation while still "Placed".
- 🎨 Customization application form with image upload (`ideaPic`).
- 🎁 "Special hamper request" flow (occasion, recipient, needed-by date, details).
- 👤 Account sign-up / log-in with a persistent session token.

**For the shop owner (admin)**
- 📊 Dashboard stats: total revenue, order count, customization count, registered customers.
- 📦 Full order list with inline status updates (updates customer tracking live).
- 🎨 Customization request list with client details, idea description, uploaded reference photo, and a one-click WhatsApp chat link.

---

## 🧰 Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend runtime | Node.js (CommonJS) |
| Backend framework | Express `^5.3.0` |
| Database | NeDB (`@seald-io/nedb` `^4.1.2`) — local file-based database |
| Authentication | `jsonwebtoken` `^9.0.3` (JWT) + `bcryptjs` `^3.0.3` (password hashing) |
| File uploads | `multer` `^2.4.0` (images saved to `server/uploads/`) |
| Config | `dotenv` `^18.0.8` |
| CORS | `cors` `^2.8.6` |
| Frontend | Plain HTML, CSS and vanilla JavaScript (no build step) |
| Frontend font | Google Fonts — *Fraunces* |

> [!NOTE]
> `mongoose` `^9.11.2` is listed as a dependency and Mongoose schema files exist under `server/models/`. However, the running server (`server/server.js`) uses **NeDB** exclusively — the Mongoose models are **not** imported or used at runtime.

---

## 🏗️ Architecture / Workflow

The app is a single Express server that both serves the static frontend and exposes a JSON API.

```
┌────────────────────────────────────────────────────────────┐
│  Browser  (client/*.html — HTML + CSS + vanilla JS)        │
│  indexfront.html · customize.html · admin.html             │
└───────────────┬────────────────────────────────────────────┘
                │  fetch() → http://localhost:5000/api/...
                ▼
┌────────────────────────────────────────────────────────────┐
│  Express server  (server/server.js)                        │
│   • CORS + JSON body parsing                               │
│   • Serves /client as static files                         │
│   • Serves /uploads as static images                       │
│   • multer handles image uploads                           │
│   • JWT + bcrypt for accounts                              │
└───────────────┬────────────────────────────────────────────┘
                │
                ▼
┌────────────────────────────────────────────────────────────┐
│  Local NeDB database  (server/data/*.db)                   │
│   users.db · orders.db · customizations.db · products.db   │
└────────────────────────────────────────────────────────────┘
```

**Step-by-step flow**

1. The Express server starts on port `5000`, serves the `client/` folder, and loads the NeDB collections.
2. Opening the root URL returns `client/indexfront.html`.
3. The frontend fetches data from the `/api/*` endpoints (all hard-coded to `http://localhost:5000`).
4. Multi-step interactions (customization application, admin dashboard) use the same API.
5. Data is persisted to `.db` files under `server/data/`; uploaded photos go to `server/uploads/`.

---

## 📁 Folder Structure

```
project 1 the surprise house/
├── client/                     # Frontend (served statically by Express)
│   ├── indexfront.html         # Main storefront (catalogue, cart, orders, auth, customization)
│   ├── customize.html          # Standalone customization application page
│   ├── admin.html              # Admin dashboard (orders + customizations)
│   └── 1792082304314_image.png # Bundled image asset
├── server/                     # Backend
│   ├── server.js               # Express app + all API routes (entry point)
│   ├── db.js                   # NeDB database initialisation
│   ├── package.json            # Server dependencies
│   ├── .env                    # Environment variables (PORT, MONGO_URI)
│   ├── models/                 # Mongoose schema files (not used at runtime)
│   │   ├── user.js
│   │   ├── order.js
│   │   ├── product.js
│   │   └── Customization.js
│   ├── data/                   # NeDB database files (created at runtime)
│   │   ├── users.db
│   │   ├── orders.db
│   │   ├── customizations.db
│   │   └── products.db
│   └── uploads/                # Uploaded reference images
├── indexfront.html             # Additional/older root copy of the storefront
├── package.json                # Root manifest (bcryptjs, jsonwebtoken, multer)
├── package-lock.json
└── README.md
```

---

## ⚙️ Installation & Setup

### Prerequisites

- **Node.js** (with npm). Express 5 requires Node.js **18 or newer** — Node.js 20 LTS is recommended.
- A modern web browser (Chrome, Edge, Firefox).
- No cloud database or external service is required.

### Steps

```bash
# 1. Clone the repository
git clone <your-repository-url>
cd "project 1 the surprise house"

# 2. Install server dependencies
cd server
npm install
```

> [!IMPORTANT]
> Install dependencies inside the **`server/`** folder. That `package.json` contains all the packages the running server needs (`express`, `cors`, `dotenv`, `@seald-io/nedb`, `bcryptjs`, `jsonwebtoken`, `multer`).

---

## 🔑 Environment Variables

Configuration lives in `server/.env`. The server reads it via `dotenv`.

| Variable | Purpose | Notes |
|----------|---------|-------|
| `PORT` | Port the Express server listens on | Defaults to `5000` if unset. The frontend hard-codes `http://localhost:5000`. |
| `MONGO_URI` | MongoDB connection string | **Present but unused** — the server uses NeDB. |
| `JWT_SECRET` | Secret used to sign login tokens | Read via `process.env.JWT_SECRET`. If not set, the server falls back to a hard-coded default. **Set a strong, private value in production.** |

Example structure (do **not** commit real secrets):

```env
PORT=5000
JWT_SECRET=change-this-to-a-long-random-string
```

> [!WARNING]
> Never commit real secrets to version control. The committed `server/.env` contains a live-looking `MONGO_URI`; rotate it and move secrets out of the repository.

---

## ▶️ How to Run the Project

The frontend is served **by the backend**, so you only need to start the server.

```bash
cd server
node server.js
```

You should see:

```
📂 Local Database initialized successfully in server/data/ folder!
✨ Server running smoothly at http://localhost:5000
```

Then open:

| Page | URL |
|------|-----|
| Storefront | http://localhost:5000/ |
| Admin dashboard | http://localhost:5000/admin.html |
| Health check | http://localhost:5000/api/health |

> [!NOTE]
> `client/customize.html` and `client/admin.html` also work as standalone files, but their `fetch()` calls still target `http://localhost:5000`, so the server must be running for them to function.

---

## 📜 Available Commands

Defined scripts in the repository:

| Location | Command | Description |
|----------|---------|-------------|
| `server/` | `node server.js` | Start the Express server (main entry point) |
| `server/` | `npm install` | Install backend dependencies |
| `server/` | `npm test` | Placeholder script — prints "Error: no test specified" |
| root | `npm install` | Installs root dependencies (`bcryptjs`, `jsonwebtoken`, `multer`) |

There is **no build step, linter, or test suite** in this project.

---

## 🔄 How the Main Functionality Works

### 1. Accounts
Accounts are created at `POST /api/auth/register`. The password is hashed with **bcrypt** (`bcryptjs`), stored in `users.db`, and a **JWT** (7-day expiry) is returned. The frontend stores the user object and token in `localStorage` (`sh_current_user`, `sh_token`). Log in via `POST /api/auth/login`.

### 2. Catalogue, wishlist & cart
The 11 products are defined as a JavaScript array (`PRODUCTS`) inside `client/indexfront.html` — **not** in the database. Wishlist and cart contents are stored in `localStorage`, keyed by the logged-in user's contact. Cart totals are computed client-side (`SHOP.currencySymbol` is `₹`; `deliveryFee` and `deliveryPincodes` are configurable in the `SHOP` object).

### 3. Placing an order
At checkout the browser sends `POST /api/orders` with customer details, items, billing and a payment method. The server assigns an order ID (`SH…`) and stores it in `orders.db` with a numeric status: `0 = Placed`, `1 = Packed`, `2 = Out for delivery`, `3 = Delivered`, plus a `cancelled` flag.

### 4. Order tracking & cancellation
Customers fetch their orders from `GET /api/orders/my-orders?contact=…`. Cancellation is allowed only while status is `0` (`PATCH /api/orders/:orderId/cancel`).

### 5. Customization applications
`client/customize.html` (and the `#customize` view in `indexfront.html`) submit a **multipart/form-data** form to `POST /api/customizations`. `multer` saves the optional `ideaPic` image to `server/uploads/` with a unique filename, and the record is stored in `customizations.db`.

### 6. Admin dashboard
`client/admin.html` loads stats, orders and customizations, and can advance an order's status via `PATCH /api/orders/:orderId/status` — which instantly changes what the customer sees in their tracking.

---

## 🔌 API Documentation

Base URL: `http://localhost:5000`

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Server status check |

### Customizations

| Method | Endpoint | Body / Query | Description |
|--------|----------|--------------|-------------|
| POST | `/api/customizations` | `multipart/form-data`: `name`, `contact`, `product` (required), `idea`, `ideaPic` (file) | Submit a customization idea |
| GET | `/api/customizations` | — | List all customization requests (newest first) |

### Authentication

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | `name`, `contact`, `password` | Create an account, returns user + JWT |
| POST | `/api/auth/login` | `contact`, `password` | Log in, returns user + JWT |

### Orders

| Method | Endpoint | Body / Query | Description |
|--------|----------|--------------|-------------|
| POST | `/api/orders` | `customer` (`name`, `address`, `pincode` required), `items[]`, `billing`, `paymentMethod`, `paymentLabel`, `notes` | Place an order |
| GET | `/api/orders/my-orders` | `?contact=<contact>` | Get a customer's orders |
| PATCH | `/api/orders/:orderId/cancel` | — | Cancel an order (only while status is 0) |
| PATCH | `/api/orders/:orderId/status` | `{ "status": 0..3 }` | Admin: update order status |
| GET | `/api/orders/all` | — | Admin: list all orders |

### Admin

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/stats` | `totalRevenue`, `ordersCount`, `customizationsCount`, `usersCount` |

**Sample response — `POST /api/auth/login`**

```json
{
  "status": "success",
  "message": "Logged in successfully! 🌸",
  "user": { "name": "Aditi", "contact": "aditi@example.com" },
  "token": "<jwt-token>"
}
```

**Sample response — `GET /api/health`**

```json
{
  "status": "success",
  "message": "The Surprise House Backend is alive and kicking! 🌸",
  "database": "Local Database (Active & Ready)",
  "time": "2026-01-01T00:00:00.000Z"
}
```

---

## 🗄️ Database Information

The project uses **NeDB** (`@seald-io/nedb`), an embedded, file-based datastore — no separate database server needed. Files live in `server/data/` and are created automatically on first run.

| File | Collection | Purpose |
|------|-----------|---------|
| `users.db` | `users` | Registered accounts (`name`, `contact`, `passwordHash`, `createdAt`) |
| `orders.db` | `orders` | Customer orders (items, billing, payment, status, cancelled flag) |
| `customizations.db` | `customizations` | Custom design requests |
| `products.db` | `products` | Collection exists but is currently unused (products are hard-coded in the frontend) |

`server/db.js` initialises the four collections and prints `📂 Local Database initialized successfully…`.

> [!NOTE]
> The Mongoose schemas in `server/models/` describe MongoDB collections but are not wired into the running server. The actual persistence layer is NeDB.

---

## 🧪 Example Usage

**1. Place an order (curl)**

```bash
curl -X POST http://localhost:5000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customer": {
      "name": "Aditi",
      "contact": "aditi@example.com",
      "phone": "9000000000",
      "address": "12 Rose Lane",
      "pincode": "495001"
    },
    "items": [{ "product": "Bow", "qty": 2, "price": 150, "description": "Pastel pink" }],
    "billing": { "subtotal": 300, "deliveryFee": 0, "total": 300 },
    "paymentMethod": "cod",
    "paymentLabel": "Cash on delivery",
    "notes": "Gift wrap please"
  }'
```

**2. Register an account**

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Aditi","contact":"aditi@example.com","password":"secret123"}'
```

**3. Submit a customization request (with image)**

```bash
curl -X POST http://localhost:5000/api/customizations \
  -F "name=Aditi" \
  -F "contact=aditi@example.com" \
  -F "product=Customize hampers" \
  -F "idea=Birthday hamper with pastel colours" \
  -F "ideaPic=@/path/to/reference.jpg"
```

---

## 🖼️ Screenshots / Demo

> 📌 **Placeholder** — no screenshots are committed to this repository yet.
>
> | Screen | Suggested file | Status |
> |--------|----------------|--------|
> | Storefront hero & catalogue | `docs/screenshots/storefront.png` | ⬜ To add |
> | Cart & checkout | `docs/screenshots/checkout.png` | ⬜ To add |
> | Order tracking | `docs/screenshots/tracking.png` | ⬜ To add |
> | Admin dashboard | `docs/screenshots/admin-dashboard.png` | ⬜ To add |
> | Customization form | `docs/screenshots/customize.png` | ⬜ To add |

Once captured, replace this block with `![Storefront](docs/screenshots/storefront.png)` style images.

---

## 🚀 Future Improvements

- Move product data from the hard-coded `PRODUCTS` array into the `products` NeDB collection with admin CRUD.
- Centralise the hard-coded `http://localhost:5000` API base URL into a single config value for easy deployment.
- Add an admin login/authorization layer (the admin dashboard is currently reachable by anyone who knows the URL).
- Wire up or remove the unused Mongoose models to avoid confusion.
- Add automated tests and a linter.
- Migrate to a hosted database (MongoDB/PostgreSQL) for multi-user deployment.
- Integrate a real payment gateway.
- Add order-confirmation email/WhatsApp notifications.

---

## 🤝 Contributing

Contributions are welcome.

1. Fork the repository.
2. Create a branch: `git checkout -b feature/your-feature`.
3. Commit your changes: `git commit -m "Add your feature"`.
4. Push: `git push origin feature/your-feature`.
5. Open a Pull Request.

Please keep the existing vanilla-JS style and do not commit secrets (`.env`).

---

## 📄 License

The `server/package.json` declares the license as **ISC**. No standalone `LICENSE` file is currently present in the repository — add one if you intend to distribute the project.
