const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'tity.db');
const db = new sqlite3.Database(dbPath);

function init() {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      stock INTEGER NOT NULL DEFAULT 0,
      image TEXT,
      style TEXT NOT NULL
    )`);

    // Seed minimal products if table empty
    db.get('SELECT COUNT(*) as count FROM products', (err, row) => {
      if (err) return console.error('DB count error:', err);
      if (row && row.count === 0) {
        const seed = [
          ['Blusa hippie', 255.0, 10, '/img/blusa.jpg', 'hippie'],
          ['Cadenas', 120.0, 15, '/img/cadenas.jpg', 'gotico'],
          ['Chamarra', 370.0, 5, '/img/chamarra.jpg', 'colorido'],
          ['Collares', 50.0, 20, '/img/collares.jpg', 'minimalista'],
        ];
        const stmt = db.prepare('INSERT INTO products (name, price, stock, image, style) VALUES (?, ?, ?, ?, ?)');
        seed.forEach((p) => stmt.run(p));
        stmt.finalize();
        console.log('Seeded initial products');
      }
    });
  });
}

function findProductsByStyle(style) {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM products WHERE style = ? ORDER BY id DESC', [style], (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

function createUser(email, password) {
  return new Promise((resolve, reject) => {
    db.run('INSERT INTO users (email, password) VALUES (?, ?)', [email, password], function (err) {
      if (err) return reject(err);
      resolve({ id: this.lastID, email });
    });
  });
}

function findUserByEmail(email) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

module.exports = { db, init, findProductsByStyle, createUser, findUserByEmail };
