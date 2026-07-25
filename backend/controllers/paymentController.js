const dbRepository = require('../services/dbRepository');

// Record a payment entry, update customer balances, adjust milestone due lists, log system timelines
exports.createPayment = async (req, res, next) => {
  try {
    const {
      customer_id,
      amount,
      payment_date,
      payment_type,
      payment_mode,
      transaction_number,
      bank_name,
      remarks
    } = req.body;

    // Validate parameters
    if (!customer_id || !amount || !payment_date || !payment_type || !payment_mode) {
      return res.status(400).json({ error: 'Missing mandatory payment details' });
    }

    if (Number(amount) <= 0) {
      return res.status(400).json({ error: 'Payment amount must be greater than zero' });
    }

    // Role checking validation:
    // Sales can only enter 'Booking' payments.
    if (req.user.role === 'Sales' && payment_type !== 'Booking') {
      return res.status(403).json({ error: 'Sales team can only record initial Booking payments.' });
    }

    // Generate unique receipt number REC-YYYYMMDD-HHMMSS-RAND
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
    const rand = Math.floor(1000 + Math.random() * 9000);
    const receipt_number = `REC-${dateStr}-${rand}`;

    const paymentData = {
      customer_id,
      amount: Number(amount),
      payment_date,
      payment_type,
      payment_mode,
      transaction_number: transaction_number || 'N/A',
      bank_name: bank_name || 'N/A',
      receipt_number,
      remarks: remarks || `Receipt issued for ${payment_type}`,
      entered_by: req.user.id
    };

    const newPayment = await dbRepository.createPayment(paymentData);

    // Automatically record a timeline event or note
    res.status(201).json({
      message: 'Payment recorded successfully, ledger balances recalculated.',
      payment: newPayment
    });
  } catch (err) {
    next(err);
  }
};

// Retrieve a single receipt view
exports.getReceipt = async (req, res, next) => {
  try {
    const { id } = req.params;
    // Look up in the database payments array
    let payment = null;
    const store = require('../config/database').getJsonDb();
    if (require('../config/database').isPg) {
      const res = await require('../config/database').query('SELECT * FROM payments WHERE id = $1', [id]);
      payment = res.rows[0];
    } else {
      payment = store.payments.find(p => p.id === id);
    }

    if (!payment) {
      return res.status(404).json({ error: 'Receipt payment not found' });
    }

    const customer = store.customers.find(c => c.id === payment.customer_id) || {};
    const unit = store.units.find(u => u.id === customer.unit_id) || {};

    res.json({
      payment,
      customer: {
        name: customer.name,
        email: customer.email,
        mobile: customer.mobile_number,
        pan: customer.pan
      },
      unit: {
        unit_number: unit.unit_number,
        wing: unit.wing,
        floor: unit.floor
      }
    });
  } catch (err) {
    next(err);
  }
};
