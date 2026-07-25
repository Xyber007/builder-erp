const dbRepository = require('../services/dbRepository');

// Collection Report (aggregating all payments received)
exports.getCollectionsReport = async (req, res, next) => {
  try {
    const { project_id } = req.query;
    const collections = await dbRepository.getCollectionsReport(project_id);

    // Calculate aggregated metrics
    const totalCollected = collections.reduce((sum, c) => sum + c.amount, 0);
    const today = new Date().toISOString().split('T')[0];
    const todayCollected = collections
      .filter(c => c.payment_date === today)
      .reduce((sum, c) => sum + c.amount, 0);

    const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM
    const monthlyCollected = collections
      .filter(c => c.payment_date.startsWith(currentMonth))
      .reduce((sum, c) => sum + c.amount, 0);

    res.json({
      summary: {
        totalCollected,
        todayCollected,
        monthlyCollected
      },
      collections
    });
  } catch (err) {
    next(err);
  }
};

// Outstanding Balances Report
exports.getOutstandingReport = async (req, res, next) => {
  try {
    const { project_id } = req.query;
    const outstandings = await dbRepository.getOutstandingReport(project_id);

    const summary = outstandings.reduce((acc, curr) => {
      acc.totalSalesValue += curr.final_sale_price;
      acc.totalCollected += curr.total_received;
      acc.totalOutstanding += curr.total_outstanding;
      return acc;
    }, { totalSalesValue: 0, totalCollected: 0, totalOutstanding: 0 });

    res.json({
      summary,
      outstandings
    });
  } catch (err) {
    next(err);
  }
};

// GST Payment Compliance Report
exports.getGstReport = async (req, res, next) => {
  try {
    const { project_id } = req.query;
    const customers = await dbRepository.getCustomers(project_id);
    
    let totalGstExpected = 0;
    let totalGstCollected = 0;

    const list = [];
    for (const c of customers) {
      const profile = await dbRepository.getCustomerProfile(c.id);
      if (profile) {
        const gstExpected = Number(profile.customer.gst) || 0;
        const gstPaid = profile.payments
          .filter(p => p.payment_type === 'Other' && p.remarks.toLowerCase().includes('gst'))
          .reduce((sum, p) => sum + Number(p.amount), 0);

        totalGstExpected += gstExpected;
        totalGstCollected += gstPaid;

        list.push({
          customer_name: profile.customer.name,
          unit_number: profile.customer.unit_number,
          gst_expected: gstExpected,
          gst_paid: gstPaid,
          gst_outstanding: Math.max(0, gstExpected - gstPaid)
        });
      }
    }

    res.json({
      summary: {
        totalGstExpected,
        totalGstCollected,
        totalGstPending: totalGstExpected - totalGstCollected
      },
      report: list
    });
  } catch (err) {
    next(err);
  }
};

// Inventory report detailing units
exports.getInventoryReport = async (req, res, next) => {
  try {
    const { project_id } = req.query;
    if (!project_id) {
      return res.status(400).json({ error: 'project_id is required' });
    }

    const units = await dbRepository.getUnits(project_id);
    const summary = {
      Available: 0,
      Booked: 0,
      Blocked: 0,
      'Agreement Done': 0,
      Registered: 0,
      'Possession Given': 0,
      Cancelled: 0
    };

    units.forEach(u => {
      if (summary[u.status] !== undefined) {
        summary[u.status]++;
      }
    });

    res.json({
      summary,
      units
    });
  } catch (err) {
    next(err);
  }
};
