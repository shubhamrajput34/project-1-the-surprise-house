const Datastore = require('@seald-io/nedb');
const path = require('path');
const fs = require('fs');

// Ensure data folder exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// 4 Local Database Collections (Saved permanently on your laptop)
const db = {
  customizations: new Datastore({ filename: path.join(dataDir, 'customizations.db'), autoload: true }),
  orders: new Datastore({ filename: path.join(dataDir, 'orders.db'), autoload: true }),
  users: new Datastore({ filename: path.join(dataDir, 'users.db'), autoload: true }),
  products: new Datastore({ filename: path.join(dataDir, 'products.db'), autoload: true }),
};

console.log('📂 Local Database initialized successfully in server/data/ folder!');

module.exports = db;
