const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// 1. Load Local Database
const db = require('./db');

// 2. Initialize Express
const app = express();

// 3. Middlewares
app.use(cors());
app.use(express.json());

// 4. Make the "uploads" folder public so images can be viewed in browser
app.use('/uploads', express.static(uploadsDir));

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

// 5.5 Serve Frontend Website (index.html, customize.html, admin.html, images)
app.use(express.static(path.join(__dirname, '../client')));

// When visiting root http://localhost:5000, serve the main website directly!
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
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

// Helper function to normalize Indian / 10-digit mobile numbers
function cleanPhoneNumber(phone) {
  if (!phone) return '';
  let cleaned = phone.toString().replace(/[\s\-\(\)]/g, '').trim();
  if (cleaned.startsWith('+91')) cleaned = cleaned.slice(3);
  else if (cleaned.startsWith('91') && cleaned.length === 12) cleaned = cleaned.slice(2);
  else if (cleaned.startsWith('0') && cleaned.length === 11) cleaned = cleaned.slice(1);
  return cleaned;
}

// Temporary in-memory store for pending phone registration OTPs (15 min expiry)
const pendingRegistrations = new Map();

// 9.1 SEND REGISTRATION OTP (Verify phone before creating account)
app.post('/api/auth/send-register-otp', async (req, res) => {
  try {
    const { name, phone, contact } = req.body;
    const phoneInput = phone || contact;

    if (!phoneInput) {
      return res.status(400).json({ status: 'error', message: 'Please enter your 10-digit phone number.' });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({ status: 'error', message: 'Please enter your name.' });
    }

    const cleanPhone = cleanPhoneNumber(phoneInput);
    if (!/^\d{10}$/.test(cleanPhone)) {
      return res.status(400).json({ status: 'error', message: 'Please enter a valid 10-digit mobile number.' });
    }

    // Check if account with this phone already exists
    const existing = await db.users.findOneAsync({ contact: cleanPhone });
    if (existing) {
      return res.status(400).json({ status: 'error', message: 'An account with this phone number already exists. Please log in.' });
    }

    // Generate 6-digit verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 mins
    pendingRegistrations.set(cleanPhone, { name: name.trim(), code, expiresAt });

    const whatsappNumber = process.env.SHOP_WHATSAPP || '917803859907';
    const msg = `Hello, I am verifying my phone number (${cleanPhone}) to create my account on The Surprise House. My verification code is ${code}.`;
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(msg)}`;

    res.json({
      status: 'success',
      message: 'Verification code sent to your phone number!',
      code,
      phone: cleanPhone,
      contact: cleanPhone,
      whatsappUrl
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// 9.2 REGISTER (Complete account creation with phone verification code)
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, phone, contact, code, password } = req.body;
    const phoneInput = phone || contact;

    if (!phoneInput || !password) {
      return res.status(400).json({ status: 'error', message: 'Phone number and password are required.' });
    }

    const cleanPhone = cleanPhoneNumber(phoneInput);
    if (!/^\d{10}$/.test(cleanPhone)) {
      return res.status(400).json({ status: 'error', message: 'Please enter a valid 10-digit mobile number.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ status: 'error', message: 'Password must be at least 6 characters long.' });
    }

    // Check verification code
    if (code) {
      const pending = pendingRegistrations.get(cleanPhone);
      if (!pending || pending.code !== code.toString().trim()) {
        return res.status(400).json({ status: 'error', message: 'Invalid verification code. Please check and try again.' });
      }
      if (Date.now() > pending.expiresAt) {
        return res.status(400).json({ status: 'error', message: 'Verification code has expired. Please request a new one.' });
      }
      pendingRegistrations.delete(cleanPhone);
    }

    // Check if user already exists
    const existing = await db.users.findOneAsync({ contact: cleanPhone });
    if (existing) {
      return res.status(400).json({ status: 'error', message: 'An account with this phone number already exists. Please log in.' });
    }

    // Hash password securely with bcrypt
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const userName = (name || (pendingRegistrations.get(cleanPhone) && pendingRegistrations.get(cleanPhone).name) || 'Customer').trim();

    // Save user with phone & contact fields for full compatibility
    const newUser = await db.users.insertAsync({
      name: userName,
      phone: cleanPhone,
      contact: cleanPhone,
      passwordHash,
      createdAt: new Date()
    });

    const token = jwt.sign(
      { id: newUser._id, contact: newUser.contact },
      process.env.JWT_SECRET || 'surprisehouse_secret_key_123',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      status: 'success',
      message: 'Account created successfully! 🌸',
      user: { name: newUser.name, phone: newUser.phone, contact: newUser.contact },
      token
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// 10. LOGIN (Log in using 10-digit Phone Number and Password)
app.post('/api/auth/login', async (req, res) => {
  try {
    const { phone, contact, password } = req.body;
    const phoneInput = phone || contact;

    if (!phoneInput || !password) {
      return res.status(400).json({ status: 'error', message: 'Phone number and password are required.' });
    }

    const cleanPhone = cleanPhoneNumber(phoneInput);

    // Find the user by clean 10-digit phone, or fallback to exact string
    let user = await db.users.findOneAsync({ contact: cleanPhone });
    if (!user) {
      user = await db.users.findOneAsync({ contact: phoneInput.toString().trim().toLowerCase() });
    }

    if (!user) {
      return res.status(400).json({ status: 'error', message: 'No account found with this phone number. Please create an account.' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ status: 'error', message: 'Incorrect password. Please try again or click "Forgot password?".' });
    }

    const token = jwt.sign(
      { id: user._id, contact: user.contact },
      process.env.JWT_SECRET || 'surprisehouse_secret_key_123',
      { expiresIn: '7d' }
    );

    res.json({
      status: 'success',
      message: 'Logged in successfully! 🌸',
      user: { name: user.name, phone: user.phone || user.contact, contact: user.contact },
      token
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// 10.5 FORGOT PASSWORD: Generate OTP / Reset Code for Phone Number
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { phone, contact } = req.body;
    const phoneInput = phone || contact;
    if (!phoneInput) {
      return res.status(400).json({ status: 'error', message: 'Please provide your registered 10-digit phone number.' });
    }

    const cleanPhone = cleanPhoneNumber(phoneInput);
    let user = await db.users.findOneAsync({ contact: cleanPhone });
    if (!user) {
      user = await db.users.findOneAsync({ contact: phoneInput.toString().trim().toLowerCase() });
    }

    if (!user) {
      return res.status(404).json({ status: 'error', message: 'No registered account found with this phone number.' });
    }

    // Generate 6-digit verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes

    await db.users.updateAsync({ _id: user._id }, { $set: { resetOtp: code, resetOtpExpires: expiresAt } }, {});

    const whatsappNumber = process.env.SHOP_WHATSAPP || '917803859907';
    const msg = `Hello, I requested a password reset for my account (${cleanPhone}) on The Surprise House. My verification code is ${code}.`;
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(msg)}`;

    res.json({
      status: 'success',
      message: 'Password reset code generated!',
      code,
      phone: cleanPhone,
      contact: cleanPhone,
      whatsappUrl
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// 10.6 RESET PASSWORD: Set new password with verified OTP
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { phone, contact, code, newPassword } = req.body;
    const phoneInput = phone || contact;
    if (!phoneInput || !code || !newPassword) {
      return res.status(400).json({ status: 'error', message: 'Phone number, verification code, and new password are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ status: 'error', message: 'Password must be at least 6 characters long.' });
    }

    const cleanPhone = cleanPhoneNumber(phoneInput);
    let user = await db.users.findOneAsync({ contact: cleanPhone });
    if (!user) {
      user = await db.users.findOneAsync({ contact: phoneInput.toString().trim().toLowerCase() });
    }

    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User not found.' });
    }

    if (!user.resetOtp || user.resetOtp !== code.toString().trim()) {
      return res.status(400).json({ status: 'error', message: 'Invalid verification code. Please check and try again.' });
    }

    if (Date.now() > (user.resetOtpExpires || 0)) {
      return res.status(400).json({ status: 'error', message: 'Verification code has expired. Please request a new one.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await db.users.updateAsync(
      { _id: user._id },
      { $set: { passwordHash }, $unset: { resetOtp: true, resetOtpExpires: true } },
      {}
    );

    res.json({
      status: 'success',
      message: 'Password reset successfully! 🌸 You can now log in.'
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
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✨ Server running smoothly on port ${PORT}`);
});
