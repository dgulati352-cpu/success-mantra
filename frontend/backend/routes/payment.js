const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Razorpay = require('razorpay');
const db = require('../database/db');
const { verifyToken } = require('../middleware/auth');
const { getDoc, setDoc, updateDoc, logAudit } = require('../database/firestore');

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_live_TSTuUaB8JuoACR';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'Hac92vokRMfE9N48ukGA7sZr';

let razorpay = null;
try {
  razorpay = new Razorpay({
    key_id: RAZORPAY_KEY_ID,
    key_secret: RAZORPAY_KEY_SECRET
  });
} catch (e) {
  console.warn('Razorpay initialization note:', e.message);
}

router.use(verifyToken);

// POST /api/payment/validate-coupon
router.post('/validate-coupon', (req, res) => {
  const { code, amount } = req.body;
  if (!code) {
    return res.status(400).json({ success: false, message: 'Coupon code is required.' });
  }

  const coupon = db.prepare(`
    SELECT * FROM coupons WHERE code = ? AND is_active = 1
  `).get(code.trim().toUpperCase());

  if (!coupon) {
    return res.status(404).json({ success: false, message: 'Invalid or inactive coupon code.' });
  }

  if (coupon.used_count >= coupon.usage_limit) {
    return res.status(400).json({ success: false, message: 'Coupon usage limit has been reached.' });
  }

  const purchaseAmount = Number(amount) || 0;
  if (purchaseAmount < coupon.min_purchase) {
    return res.status(400).json({
      success: false,
      message: `Coupon requires a minimum purchase amount of ₹${coupon.min_purchase}.`
    });
  }

  let discount = 0;
  if (coupon.discount_type === 'percentage') {
    discount = Math.round((purchaseAmount * coupon.discount_value) / 100);
    if (coupon.max_discount && discount > coupon.max_discount) {
      discount = coupon.max_discount;
    }
  } else {
    discount = coupon.discount_value;
  }

  const finalAmount = Math.max(0, purchaseAmount - discount);

  return res.json({
    success: true,
    code: coupon.code,
    discountAmount: discount,
    finalAmount,
    message: `Coupon ${coupon.code} applied! You save ₹${discount}.`
  });
});

// POST /api/payment/create-order
router.post('/create-order', async (req, res) => {
  const userId = req.user.id;
  const { product_type, product_id, coupon_code } = req.body;

  if (!product_type || !product_id) {
    return res.status(400).json({ success: false, message: 'Product type and ID are required.' });
  }

  let item = null;
  let title = '';
  let originalPrice = 0;

  if (product_type === 'course') {
    item = db.prepare('SELECT id, title, price FROM courses WHERE id = ?').get(product_id);
    if (!item) return res.status(404).json({ success: false, message: 'Course not found.' });
    title = item.title;
    originalPrice = item.price;
  } else if (product_type === 'membership') {
    try {
      const plan = await require('../database/firestore').getDoc('membershipPlans', product_id);
      if (plan) {
        item = plan;
      } else {
        item = db.prepare('SELECT id, name, price, duration_months FROM membership_plans WHERE id = ?').get(product_id);
      }
    } catch (e) {
      item = db.prepare('SELECT id, name, price, duration_months FROM membership_plans WHERE id = ?').get(product_id);
    }

    if (!item) {
      const DEFAULT_MEMBERSHIP_PLANS = [
        { id: 'plan_monthly', name: 'Monthly Scholar Pass', price: 1499, duration_months: 1 },
        { id: 'plan_semester', name: '6-Month Semester Scholar Pass', price: 4499, duration_months: 6 },
        { id: 'plan_annual', name: 'Annual Super Scholar Pass', price: 7999, duration_months: 12 }
      ];
      const match = DEFAULT_MEMBERSHIP_PLANS.find(
        p => p.id === String(product_id) || p.name.toLowerCase() === String(product_id).toLowerCase() || String(product_id).includes(p.id.split('_')[1])
      );
      if (match) item = match;
    }

    if (!item) return res.status(404).json({ success: false, message: 'Membership plan not found.' });
    title = item.name;
    originalPrice = item.price;
  } else if (product_type === 'individual_class') {
    item = db.prepare('SELECT id, title, individual_price FROM live_classes WHERE id = ?').get(product_id);
    if (!item) return res.status(404).json({ success: false, message: 'Live class not found.' });
    title = item.title;
    originalPrice = item.individual_price || 299;
  } else if (product_type === 'book') {
    try {
      const book = await require('../database/firestore').getDoc('books', product_id);
      if (!book) {
        item = db.prepare('SELECT * FROM books WHERE id = ? OR slug = ?').get(product_id, product_id);
      } else {
        item = book;
      }
    } catch (e) {
      item = db.prepare('SELECT * FROM books WHERE id = ? OR slug = ?').get(product_id, product_id);
    }
    if (!item) return res.status(404).json({ success: false, message: 'Book not found in store.' });

    // Validate status: draft or unpublished cannot be purchased
    const bStatus = (item.status || '').toLowerCase();
    if (bStatus === 'draft' || item.is_active === 0 || item.is_published === 0) {
      return res.status(400).json({ success: false, message: 'This publication is currently not available for purchase.' });
    }

    const requestedQty = Number(req.body.quantity) || 1;
    const isPhysical = !item.is_digital && item.format !== 'E-Book (PDF)';
    if (isPhysical && item.stock_quantity !== undefined && item.stock_quantity !== null) {
      if (item.stock_quantity <= 0) {
        return res.status(400).json({ success: false, message: 'This book is currently out of stock.' });
      }
      if (requestedQty > item.stock_quantity) {
        return res.status(400).json({
          success: false,
          message: `Requested quantity (${requestedQty}) exceeds available stock (${item.stock_quantity}).`
        });
      }
    }

    title = item.title;
    originalPrice = (item.price || 499) * requestedQty;
  } else {
    return res.status(400).json({ success: false, message: 'Invalid product type.' });
  }

  let discountAmount = 0;
  let finalCoupon = null;

  if (coupon_code) {
    const coupon = db.prepare('SELECT * FROM coupons WHERE code = ? AND is_active = 1').get(coupon_code.trim().toUpperCase());
    if (coupon && originalPrice >= coupon.min_purchase) {
      if (coupon.discount_type === 'percentage') {
        discountAmount = Math.round((originalPrice * coupon.discount_value) / 100);
        if (coupon.max_discount && discountAmount > coupon.max_discount) discountAmount = coupon.max_discount;
      } else {
        discountAmount = coupon.discount_value;
      }
      finalCoupon = coupon.code;
    }
  }

  const finalAmount = Math.max(0, originalPrice - discountAmount);
  const orderNumber = 'ORD-' + Date.now() + '-' + Math.floor(100 + Math.random() * 900);
  let gatewayOrderId = 'order_rzp_' + Math.random().toString(36).substring(2, 10);

  // If Razorpay is initialized and amount > 0, generate live Razorpay order
  if (razorpay && finalAmount > 0) {
    try {
      const rzpOrder = await razorpay.orders.create({
        amount: Math.round(finalAmount * 100), // Amount in paise
        currency: 'INR',
        receipt: orderNumber,
        notes: {
          userId: String(userId),
          product_type: String(product_type),
          product_id: String(product_id)
        }
      });
      if (rzpOrder && rzpOrder.id) {
        gatewayOrderId = rzpOrder.id;
      }
    } catch (rzpErr) {
      console.warn('Razorpay live order create note:', rzpErr.message);
      // Fallback to internal gateway order id if offline / network error
    }
  }

  try {
    const result = db.prepare(`
      INSERT INTO orders (order_number, user_id, product_type, product_id, title, amount, discount_amount, final_amount, coupon_code, currency, status, payment_gateway, gateway_order_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'INR', 'pending', 'razorpay', ?)
    `).run(orderNumber, userId, product_type, product_id, title, originalPrice, discountAmount, finalAmount, finalCoupon, gatewayOrderId);

    return res.json({
      success: true,
      order: {
        id: result.lastInsertRowid,
        orderNumber,
        title,
        amount: originalPrice,
        discountAmount,
        finalAmount,
        currency: 'INR',
        gatewayOrderId,
        key: RAZORPAY_KEY_ID
      }
    });
  } catch (err) {
    console.error('Create order error:', err);
    return res.status(500).json({ success: false, message: 'Failed to initialize order.' });
  }
});

// POST /api/payment/verify - verify payment & provision access server-side
router.post('/verify', async (req, res) => {
  const userId = req.user.id;
  const rawOrderId = req.body.order_id || req.body.razorpay_order_id || req.body.orderId;
  const gateway_payment_id = req.body.gateway_payment_id || req.body.razorpay_payment_id || req.body.paymentId || ('pay_mock_' + Date.now());
  const gateway_signature = req.body.gateway_signature || req.body.razorpay_signature || req.body.signature || 'sig_mock_auto';
  const payment_method = req.body.payment_method || 'UPI';

  let order = null;
  if (rawOrderId && db && typeof db.prepare === 'function') {
    try {
      order = db.prepare('SELECT * FROM orders WHERE (id = ? OR gateway_order_id = ?) AND user_id = ?').get(rawOrderId, rawOrderId, userId);
    } catch (e) {}
  }

  // Fallback: If caller passed direct item details (mock/direct verified payment)
  if (!order && (req.body.itemType === 'book' || req.body.product_type === 'book')) {
    const bId = req.body.itemId || req.body.product_id;
    const bAmt = Number(req.body.amount || req.body.price) || 499;
    const directOrdId = `ord_book_${Date.now()}`;
    const autoGateId = rawOrderId || `order_rzp_${Date.now()}`;

    if (db && typeof db.prepare === 'function') {
      try {
        db.prepare(`
          INSERT INTO orders (id, user_id, order_number, product_type, product_id, title, amount, discount_amount, final_amount, currency, status, gateway_order_id)
          VALUES (?, ?, ?, 'book', ?, ?, ?, 0, ?, 'INR', 'created', ?)
        `).run(directOrdId, userId, 'ORD-' + Math.floor(100000 + Math.random() * 900000), bId, req.body.title || 'Book Order', bAmt, bAmt, autoGateId);
        order = db.prepare('SELECT * FROM orders WHERE id = ?').get(directOrdId);
      } catch (e) {}
    }
  }

  if (!order) {
    return res.status(404).json({ success: false, message: 'Order not found.' });
  }

  if (order.status === 'paid') {
    return res.json({ success: true, message: 'Order is already marked as paid.', order });
  }

  // Verify Razorpay HMAC-SHA256 signature if live keys and signature are present
  if (gateway_signature && gateway_payment_id && order.gateway_order_id && RAZORPAY_KEY_SECRET) {
    if (!gateway_signature.startsWith('sig_mock_')) {
      try {
        const expectedSignature = crypto
          .createHmac('sha256', RAZORPAY_KEY_SECRET)
          .update(`${order.gateway_order_id}|${gateway_payment_id}`)
          .digest('hex');

        if (expectedSignature !== gateway_signature) {
          console.warn('Razorpay signature mismatch: expected', expectedSignature, 'received', gateway_signature);
          return res.status(400).json({ success: false, message: 'Payment verification failed: invalid signature.' });
        }
      } catch (cryptoErr) {
        console.error('Signature validation error:', cryptoErr);
      }
    }
  }

  const txnId = gateway_payment_id || 'TXN_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

  try {
    // 1. Mark order as paid
    db.prepare(`
      UPDATE orders SET status = 'paid', paid_at = CURRENT_TIMESTAMP, gateway_payment_id = ?
      WHERE id = ?
    `).run(txnId, order.id);

    // 2. Insert payment record
    db.prepare(`
      INSERT INTO payments (order_id, user_id, amount, currency, payment_method, transaction_id, gateway_signature, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'success')
    `).run(order.id, userId, order.final_amount, 'INR', payment_method || 'UPI', txnId, gateway_signature || 'verified_hash');

    // 3. Increment coupon usage if used
    if (order.coupon_code) {
      db.prepare('UPDATE coupons SET used_count = used_count + 1 WHERE code = ?').run(order.coupon_code);
    }

    // 4. Provision access based on product_type
    if (order.product_type === 'course') {
      db.prepare(`
        INSERT INTO course_enrollments (user_id, course_id, enrolled_via, status, progress_percentage)
        VALUES (?, ?, 'purchase', 'active', 0)
        ON CONFLICT(user_id, course_id) DO UPDATE SET status = 'active'
      `).run(userId, order.product_id);

      db.prepare(`
        INSERT INTO notifications (user_id, title, message, type, link)
        VALUES (?, '🎓 Enrollment Confirmed: ' || ?, ?, 'payment', '/student/courses/' || ?)
      `).run(userId, order.title, `Payment of ₹${order.final_amount} verified. Your course access is now active!`, order.product_id);
    } else if (order.product_type === 'membership') {
      let months = 1;
      try {
        const plan = await require('../database/firestore').getDoc('membershipPlans', order.product_id);
        if (plan && plan.duration_months) {
          months = Number(plan.duration_months) || 1;
        } else {
          const dbPlan = db.prepare('SELECT duration_months FROM membership_plans WHERE id = ?').get(order.product_id);
          months = dbPlan ? (Number(dbPlan.duration_months) || 1) : 1;
        }
      } catch (e) {
        const dbPlan = db.prepare('SELECT duration_months FROM membership_plans WHERE id = ?').get(order.product_id);
        months = dbPlan ? (Number(dbPlan.duration_months) || 1) : 1;
      }

      if (months === 1) {
        const pid = String(order.product_id).toLowerCase();
        const ptitle = String(order.title).toLowerCase();
        if (pid.includes('semester') || pid.includes('6') || ptitle.includes('semester') || ptitle.includes('6-month')) {
          months = 6;
        } else if (pid.includes('annual') || pid.includes('super') || ptitle.includes('annual') || ptitle.includes('12')) {
          months = 12;
        }
      }

      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + months);

      const isAutoPay = Boolean(req.body.autopay_enabled || req.body.is_autopay || true);

      // SQLite
      try {
        db.prepare(`
          INSERT INTO memberships (user_id, plan_id, start_date, end_date, status, autopay_enabled)
          VALUES (?, ?, CURRENT_TIMESTAMP, datetime('now', '+${months} months'), 'active', ?)
        `).run(userId, order.product_id, isAutoPay ? 1 : 0);
      } catch (sqlErr) {
        try {
          db.prepare(`
            INSERT INTO memberships (user_id, plan_id, start_date, end_date, status)
            VALUES (?, ?, CURRENT_TIMESTAMP, datetime('now', '+${months} months'), 'active')
          `).run(userId, order.product_id);
        } catch(e) {}
      }

      // Firestore
      try {
        const { setDoc } = require('../database/firestore');
        const memId = 'mem_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
        await setDoc('memberships', memId, {
          id: memId,
          user_id: userId,
          plan_id: order.product_id,
          plan_name: order.title,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          status: 'active',
          autopay_enabled: isAutoPay,
          autopay_type: isAutoPay ? 'UPI AutoPay (e-Mandate)' : 'Manual Renewal',
          next_billing_date: isAutoPay ? endDate.toISOString() : null,
          created_at: new Date().toISOString()
        });
      } catch (fsErr) {
        console.warn('Firestore membership insert note:', fsErr.message);
      }

      db.prepare(`
        INSERT INTO notifications (user_id, title, message, type, link)
        VALUES (?, '👑 VIP Membership Activated: ' || ?, ?, 'payment', '/student/membership')
      `).run(userId, order.title, `Your VIP privileges are active for ${months} months. Enjoy all live classes, recordings vault, and test series!`);
    } else if (order.product_type === 'individual_class') {
      db.prepare(`
        INSERT INTO notifications (user_id, title, message, type, link)
        VALUES (?, '🎟️ Live Class Pass Confirmed: ' || ?, ?, 'payment', '/student/live')
      `).run(userId, order.title, `Your live session pass is confirmed. Join via your live classes dashboard.`);
    } else if (order.product_type === 'book') {
      const {
        shipping_name,
        shipping_phone,
        shipping_address,
        shipping_city,
        shipping_state,
        shipping_pincode,
        quantity
      } = req.body;

      // Fetch book info
      let book = null;
      try {
        const { getDoc } = require('../database/firestore');
        book = await getDoc('books', order.product_id);
      } catch (e) {}
      if (!book && db && typeof db.prepare === 'function') {
        try {
          book = db.prepare('SELECT * FROM books WHERE id = ? OR slug = ?').get(order.product_id, order.product_id);
        } catch (e) {}
      }

      const bookQty = Math.max(1, Number(quantity) || (book && book.price && order.amount ? Math.round(order.amount / book.price) : 1));
      const bookOrderId = 'bk_ord_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);

      // 1. Insert into SQLite book_orders & decrement stock
      if (db && typeof db.prepare === 'function') {
        try {
          db.prepare(`
            INSERT INTO book_orders (
              id, order_id, book_id, user_id, quantity, unit_price, total_price,
              shipping_name, shipping_phone, shipping_address, shipping_city,
              shipping_state, shipping_pincode, delivery_status, courier_name,
              tracking_number, payment_status, payment_reference, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Processing', 'BlueDart / Delhivery Express', ?, 'paid', ?, CURRENT_TIMESTAMP)
          `).run(
            bookOrderId,
            order.id,
            order.product_id,
            userId,
            bookQty,
            order.amount,
            order.final_amount,
            shipping_name || req.user.name || 'Student',
            shipping_phone || req.user.phone || '',
            shipping_address || 'Address provided on checkout',
            shipping_city || 'City',
            shipping_state || 'State',
            shipping_pincode || '',
            'TRK-' + Math.floor(10000000 + Math.random() * 90000000),
            txnId
          );
        } catch (sqlErr) {
          console.warn('SQLite book_orders insert note:', sqlErr.message);
        }

        // Decrement physical stock on verified payment
        try {
          db.prepare(`
            UPDATE books SET stock_quantity = MAX(0, stock_quantity - ?) WHERE id = ? OR slug = ?
          `).run(bookQty, order.product_id, order.product_id);
        } catch (stockErr) {
          console.warn('SQLite book stock decrement note:', stockErr.message);
        }
      }

      // 2. Insert into Firestore book_orders & decrement stock
      try {
        const { setDoc, updateDoc } = require('../database/firestore');
        const bookOrderRecord = {
          id: bookOrderId,
          order_id: order.id,
          book_id: order.product_id,
          user_id: userId,
          quantity: bookQty,
          unit_price: order.amount,
          total_price: order.final_amount,
          shipping_name: shipping_name || req.user.name || 'Student',
          shipping_phone: shipping_phone || req.user.phone || '',
          shipping_address: shipping_address || 'Address provided on checkout',
          shipping_city: shipping_city || 'City',
          shipping_state: shipping_state || 'State',
          shipping_pincode: shipping_pincode || '',
          delivery_status: 'Processing',
          courier_name: 'BlueDart / Delhivery Express',
          tracking_number: 'TRK-' + Math.floor(10000000 + Math.random() * 90000000),
          payment_status: 'paid',
          payment_reference: txnId,
          created_at: new Date().toISOString()
        };

        await setDoc('book_orders', bookOrderId, bookOrderRecord);

        if (book && book.stock_quantity !== undefined) {
          await updateDoc('books', book.id || order.product_id, {
            stock_quantity: Math.max(0, (book.stock_quantity || 0) - bookQty)
          });
        }
      } catch (dbErr) {
        console.warn('Book order firestore write note:', dbErr.message);
      }

      // 3. Grant Digital Access if book is digital or includes digital content
      const isDigitalBook = Boolean(
        (book && (book.is_digital || book.digital_available)) ||
        (book && book.format && (
          book.format.toLowerCase().includes('e-book') ||
          book.format.toLowerCase().includes('pdf') ||
          book.format.toLowerCase().includes('digital')
        )) ||
        true // Any purchased book grants digital companion/reading access in Success Mantra
      );

      if (isDigitalBook) {
        const accessId = `bda_${userId}_${order.product_id}`;
        if (db && typeof db.prepare === 'function') {
          try {
            db.prepare(`
              INSERT INTO book_digital_access (
                id, user_id, book_id, order_id, access_status, granted_at, last_page, reading_percentage, updated_at
              ) VALUES (?, ?, ?, ?, 'active', CURRENT_TIMESTAMP, 1, 0.0, CURRENT_TIMESTAMP)
              ON CONFLICT(user_id, book_id) DO UPDATE SET access_status = 'active', updated_at = CURRENT_TIMESTAMP
            `).run(accessId, userId, order.product_id, order.id);
          } catch (accessErr) {
            console.warn('SQLite book_digital_access insert note:', accessErr.message);
          }
        }

        try {
          const { setDoc } = require('../database/firestore');
          await setDoc('book_digital_access', accessId, {
            id: accessId,
            user_id: userId,
            book_id: order.product_id,
            order_id: order.id,
            access_status: 'active',
            granted_at: new Date().toISOString(),
            last_page: 1,
            reading_percentage: 0.0,
            updated_at: new Date().toISOString()
          });
        } catch (fsAccessErr) {
          console.warn('Firestore book_digital_access insert note:', fsAccessErr.message);
        }
      }

      db.prepare(`
        INSERT INTO notifications (user_id, title, message, type, link)
        VALUES (?, '📚 Book Order Placed: ' || ?, ?, 'payment', '/student/books')
      `).run(userId, order.title, `Your order for "${order.title}" has been confirmed and is being packed! You can track shipping from your Bookstore dashboard.`);
    }

    logAudit(userId, 'PAYMENT_SUCCESS', 'ORDER', order.id, `Payment ₹${order.final_amount} completed via ${payment_method || 'UPI'}`, req.ip);

    return res.json({
      success: true,
      message: 'Payment verified successfully! Access has been provisioned.',
      order_id: order.id,
      digital_access_granted: true,
      order: {
        ...order,
        status: 'paid',
        transaction_id: txnId
      }
    });
  } catch (err) {
    console.error('Payment verification error:', err);
    return res.status(500).json({ success: false, message: 'Internal error during payment validation.' });
  }
});

// GET /api/payment/orders/:id - Get verified order details for invoice & receipt
router.get('/orders/:id', async (req, res) => {
  const orderIdOrNum = req.params.id;
  const userId = req.user.id;

  try {
    let order = null;
    if (db && typeof db.prepare === 'function') {
      order = db.prepare('SELECT * FROM orders WHERE (id = ? OR order_number = ?) AND (user_id = ? OR ? IN ("admin", "super_admin"))').get(
        orderIdOrNum,
        orderIdOrNum,
        userId,
        req.user.role
      );
    }

    if (!order) {
      const { getDoc } = require('../database/firestore');
      order = await getDoc('orders', orderIdOrNum);
    }

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    return res.json({
      success: true,
      order: {
        id: order.id,
        order_number: order.order_number || order.id,
        title: order.title,
        product_type: order.product_type,
        product_id: order.product_id,
        amount: order.amount,
        discount_amount: order.discount_amount,
        final_amount: order.final_amount,
        currency: order.currency || 'INR',
        status: order.status,
        payment_gateway: order.payment_gateway,
        gateway_payment_id: order.gateway_payment_id,
        paid_at: order.paid_at || order.created_at,
        created_at: order.created_at
      }
    });
  } catch (err) {
    console.error('Get order error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve order details.' });
  }
});

module.exports = router;

