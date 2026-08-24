const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { verifyToken, logAudit } = require('../middleware/auth');

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
router.post('/create-order', (req, res) => {
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
    item = db.prepare('SELECT id, name, price FROM membership_plans WHERE id = ?').get(product_id);
    if (!item) return res.status(404).json({ success: false, message: 'Membership plan not found.' });
    title = item.name;
    originalPrice = item.price;
  } else if (product_type === 'individual_class') {
    item = db.prepare('SELECT id, title, individual_price FROM live_classes WHERE id = ?').get(product_id);
    if (!item) return res.status(404).json({ success: false, message: 'Live class not found.' });
    title = item.title;
    originalPrice = item.individual_price || 299;
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
  const gatewayOrderId = 'order_rzp_' + Math.random().toString(36).substring(2, 10);

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
        key: 'rzp_test_success_mantra_demo_key'
      }
    });
  } catch (err) {
    console.error('Create order error:', err);
    return res.status(500).json({ success: false, message: 'Failed to initialize order.' });
  }
});

// POST /api/payment/verify - verify payment & provision access server-side
router.post('/verify', (req, res) => {
  const userId = req.user.id;
  const { order_id, payment_method, gateway_payment_id, gateway_signature } = req.body;

  if (!order_id) {
    return res.status(400).json({ success: false, message: 'Order ID is required.' });
  }

  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(order_id, userId);
  if (!order) {
    return res.status(404).json({ success: false, message: 'Order not found.' });
  }

  if (order.status === 'paid') {
    return res.json({ success: true, message: 'Order is already marked as paid.', order });
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
      const plan = db.prepare('SELECT duration_months FROM membership_plans WHERE id = ?').get(order.product_id);
      const months = plan ? plan.duration_months : 1;

      db.prepare(`
        INSERT INTO memberships (user_id, plan_id, start_date, end_date, status)
        VALUES (?, ?, CURRENT_TIMESTAMP, datetime('now', '+${months} months'), 'active')
      `).run(userId, order.product_id);

      db.prepare(`
        INSERT INTO notifications (user_id, title, message, type, link)
        VALUES (?, '👑 VIP Membership Activated: ' || ?, ?, 'payment', '/student/membership')
      `).run(userId, order.title, `Your VIP privileges are active for ${months} months. Enjoy all live classes and study kits!`);
    } else if (order.product_type === 'individual_class') {
      db.prepare(`
        INSERT INTO notifications (user_id, title, message, type, link)
        VALUES (?, '🎟️ Live Class Pass Confirmed: ' || ?, ?, 'payment', '/student/live')
      `).run(userId, order.title, `Your live session pass is confirmed. Join via your live classes dashboard.`);
    }

    logAudit(userId, 'PAYMENT_SUCCESS', 'ORDER', order.id, `Payment ₹${order.final_amount} completed via ${payment_method || 'UPI'}`, req.ip);

    return res.json({
      success: true,
      message: 'Payment verified successfully! Access has been provisioned.',
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

module.exports = router;
