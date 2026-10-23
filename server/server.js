const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// 1. Load Local Database
const db = require('./db');

// 2. Initialize Express
const app = express();

// 3. Middlewares
app.use(cors());
app.use(express.json());

// 4. Make the "uploads" folder public so images can be viewed in browser
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 5. Configure Multer to save photos with safe, unique filenames
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, 'uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// 5.5 Serve Frontend Website (indexfront.html, customize.html, admin.html, images)
app.use(express.static(path.join(__dirname, '../client')));

// When visiting root http://localhost:5000, serve the main website directly!
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/indexfront.html'));
});

// 6. Test Route
app.get('/api/health', (req, res) => {
  res.json({
    status: 'success',
    message: 'The Surprise House Backend is alive and kicking! 🌸',
    database: 'Local Database (Active & Ready)',
    time: new Date()
  });
});

// 7. Route to receive customization ideas + photo upload
app.post('/api/customizations', upload.single('ideaPic'), async (req, res) => {
  try {
    const { name, contact, product, idea } = req.body;

    if (!name || !contact || !product) {
      return res.status(400).json({
        status: 'error',
        message: 'Name, contact, and product are required.'
      });
    }

    const customizationData = {
      id: 'CUS' + Date.now().toString().slice(-6),
      name,
      contact,
      product,
      idea: idea || '',
      imagePath: req.file ? `/uploads/${req.file.filename}` : null,
      status: 'Pending',
      createdAt: new Date()
    };

    // Save into permanent local database using insertAsync
    const saved = await db.customizations.insertAsync(customizationData);

    res.status(201).json({
      status: 'success',
      message: 'Customization received successfully! 🌸',
      data: saved
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// 8. Route to view all submitted customizations
app.get('/api/customizations', async (req, res) => {
  try {
    const list = await db.customizations.findAsync({});
    // Sort newest first
    list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json({ status: 'success', count: list.length, data: list });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// ==================== AUTHENTICATION ROUTES ====================

// 9. REGISTER (Sign Up a new customer)
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, contact, password } = req.body;

    if (!name || !contact || !password) {
      return res.status(400).json({ status: 'error', message: 'Name, contact, and password are required.' });
    }

    const cleanContact = contact.trim().toLowerCase();

    // Check if user already exists
    const existing = await db.users.findOneAsync({ contact: cleanContact });
    if (existing) {
      return res.status(400).json({ status: 'error', message: 'An account with this phone or email already exists. Please log in.' });
    }

    // Scramble the password securely with bcrypt
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Save into database
    const newUser = await db.users.insertAsync({
      name: name.trim(),
      contact: cleanContact,
      passwordHash,
      createdAt: new Date()
    });

    // Create a digital session badge (token)
    const token = jwt.sign(
      { id: newUser._id, contact: newUser.contact },
      process.env.JWT_SECRET || 'surprisehouse_secret_key_123',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      status: 'success',
      message: 'Account created successfully! 🌸',
      user: { name: newUser.name, contact: newUser.contact },
      token
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// 10. LOGIN (Log in an existing customer)
app.post('/api/auth/login', async (req, res) => {
  try {
    const { contact, password } = req.body;

    if (!contact || !password) {
      return res.status(400).json({ status: 'error', message: 'Contact and password are required.' });
    }

    const cleanContact = contact.trim().toLowerCase();

    // Find the user in database
    const user = await db.users.findOneAsync({ contact: cleanContact });
    if (!user) {
      return res.status(400).json({ status: 'error', message: 'No account found with this contact. Please sign up.' });
    }

    // Check if the scrambled password matches
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ status: 'error', message: 'Incorrect password. Please try again.' });
    }

    // Create a digital session badge (token)
    const token = jwt.sign(
      { id: user._id, contact: user.contact },
      process.env.JWT_SECRET || 'surprisehouse_secret_key_123',
      { expiresIn: '7d' }
    );

    res.json({
      status: 'success',
      message: 'Logged in successfully! 🌸',
      user: { name: user.name, contact: user.contact },
      token
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// ==================== ORDER & TRACKING ROUTES ====================

// 11. PLACE ORDER (Create a new customer order)
app.post('/api/orders', async (req, res) => {
  try {
    const { customer, items, billing, paymentMethod, paymentLabel, notes } = req.body;

    if (!customer || !customer.name || !customer.address || !customer.pincode) {
      return res.status(400).json({ status: 'error', message: 'Customer name, address and pincode are required.' });
    }

    if (!items || !items.length) {
      return res.status(400).json({ status: 'error', message: 'Cart items are required to place an order.' });
    }

    const orderId = 'SH' + Date.now().toString().slice(-6);
    const newOrder = {
      id: orderId,
      orderId: orderId,
      date: new Date().toLocaleString(),
      createdAt: new Date(),
      customerContact: (customer.contact || customer.phone || '').trim().toLowerCase(),
      details: {
        name: customer.name.trim(),
        phone: customer.phone || customer.contact || '',
        address: customer.address.trim(),
        pincode: customer.pincode.trim(),
        notes: notes || ''
      },
      payment: paymentLabel || paymentMethod || 'Cash on delivery',
      items: items.map((it) => ({
        product: it.product || it.name || 'Gift Item',
        qty: it.qty || 1,
        price: it.price || 0,
        description: it.description || it.note || ''
      })),
      subtotal: billing ? billing.subtotal : null,
      deliveryFee: billing ? billing.deliveryFee : 0,
      total: billing ? billing.total : 0,
      status: 0, // 0 = Placed, 1 = Packed, 2 = Out for delivery, 3 = Delivered
      cancelled: false
    };

    const savedOrder = await db.orders.insertAsync(newOrder);

    res.status(201).json({
      status: 'success',
      message: 'Order placed successfully! 🌸',
      order: savedOrder
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// 12. GET MY ORDERS (Fetch all orders for a logged-in customer)
app.get('/api/orders/my-orders', async (req, res) => {
  try {
    const contact = (req.query.contact || '').trim().toLowerCase();
    if (!contact) {
      return res.status(400).json({ status: 'error', message: 'Contact is required to fetch orders.' });
    }

    const orders = await db.orders.findAsync({ customerContact: contact });
    // Sort newest first
    orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      status: 'success',
      count: orders.length,
      orders
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// 13. CANCEL ORDER (Customer cancels an order if still in "Placed" status)
app.patch('/api/orders/:orderId/cancel', async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await db.orders.findOneAsync({ id: orderId });

    if (!order) {
      return res.status(404).json({ status: 'error', message: 'Order not found.' });
    }

    if (order.status > 0) {
      return res.status(400).json({ status: 'error', message: 'This order is already packed and cannot be cancelled.' });
    }

    await db.orders.updateAsync({ id: orderId }, { $set: { cancelled: true } }, {});

    res.json({
      status: 'success',
      message: 'Order cancelled successfully.'
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// 14. ADMIN: UPDATE ORDER STATUS (Advance step: 0 -> 1 -> 2 -> 3)
app.patch('/api/orders/:orderId/status', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    const newStatus = parseInt(status, 10);
    if (isNaN(newStatus) || newStatus < 0 || newStatus > 3) {
      return res.status(400).json({ status: 'error', message: 'Invalid status number (0 to 3).' });
    }

    const updated = await db.orders.updateAsync({ id: orderId }, { $set: { status: newStatus } }, {});
    res.json({ status: 'success', message: 'Order status updated successfully.' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// 15. ADMIN: GET ALL ORDERS
app.get('/api/orders/all', async (req, res) => {
  try {
    const all = await db.orders.findAsync({});
    all.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json({ status: 'success', count: all.length, orders: all });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// 16. ADMIN: STORE STATISTICS (Revenue, order count, customization count, user count)
app.get('/api/admin/stats', async (req, res) => {
  try {
    const orders = await db.orders.findAsync({});
    const customizations = await db.customizations.findAsync({});
    const users = await db.users.findAsync({});

    // Calculate total revenue from non-cancelled orders
    const totalRevenue = orders
      .filter((o) => !o.cancelled && typeof o.total === 'number')
      .reduce((sum, o) => sum + o.total, 0);

    res.json({
      status: 'success',
      totalRevenue,
      ordersCount: orders.length,
      customizationsCount: customizations.length,
      usersCount: users.length
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// 17. Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✨ Server running smoothly at http://localhost:${PORT}`);
});
