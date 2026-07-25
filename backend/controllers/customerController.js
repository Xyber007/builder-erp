const dbRepository = require('../services/dbRepository');

// List all customers
exports.getCustomers = async (req, res, next) => {
  try {
    const { project_id } = req.query;
    if (!project_id) {
      return res.status(400).json({ error: 'project_id query param is required' });
    }

    const customers = await dbRepository.getCustomers(project_id);
    res.json({ customers });
  } catch (err) {
    next(err);
  }
};

// Retrieve comprehensive customer profile (heart of application)
exports.getCustomerProfile = async (req, res, next) => {
  try {
    const { id } = req.params;
    const profile = await dbRepository.getCustomerProfile(id);
    if (!profile) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const { customer, payments, paymentSchedules, loan, documents, timeline, notes } = profile;

    // Calculate aggregated financial summaries
    const propertyValue = Number(customer.final_sale_price);
    const totalReceived = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const outstandingBalance = propertyValue - totalReceived;

    // Calculate taxes and registrations paid
    // Let's check matching payment types for GST, Stamp Duty, and Registration
    const gstPaid = payments.filter(p => p.payment_type === 'Other' && p.remarks.toLowerCase().includes('gst'))
                            .reduce((sum, p) => sum + Number(p.amount), 0);
    const stampPaid = payments.filter(p => p.payment_type === 'Registration' || p.remarks.toLowerCase().includes('stamp'))
                              .reduce((sum, p) => sum + Number(p.amount), 0);
    const regPaid = payments.filter(p => p.payment_type === 'Registration' || p.remarks.toLowerCase().includes('reg'))
                            .reduce((sum, p) => sum + Number(p.amount), 0);

    const lastPayment = payments.length > 0 ? payments[payments.length - 1] : null;
    const nextDue = paymentSchedules.find(s => s.status !== 'Completed');

    // Run Ledger Report
    const ledgerReport = await dbRepository.getLedgerReport(id);

    res.json({
      customer,
      financials: {
        propertyValue,
        bookingAmount: Math.round(propertyValue * 0.10), // standard 10%
        totalReceived,
        outstandingBalance,
        gstPaid,
        gstPending: Math.max(0, Number(customer.gst) - gstPaid),
        stampDutyPaid: stampPaid,
        stampDutyPending: Math.max(0, Number(customer.stamp_duty) - stampPaid),
        registrationPaid: regPaid,
        registrationPending: Math.max(0, Number(customer.registration_fee) - regPaid),
        loanAmount: loan ? Number(loan.loan_amount) : 0,
        loanSanctioned: loan ? Number(loan.sanction_amount) : 0,
        loanDisbursed: loan ? Number(loan.disbursed_amount) : 0,
        loanPending: loan ? Number(loan.pending_amount) : 0,
        discount: Number(customer.discount) || 0,
        paymentPercentage: Math.round((totalReceived / propertyValue) * 100) || 0,
        lastPaymentDate: lastPayment ? lastPayment.payment_date : 'N/A',
        nextPaymentDue: nextDue ? nextDue.due_date : 'Fully Settled',
        nextPaymentAmount: nextDue ? Number(nextDue.due_amount) : 0,
        nextPaymentMilestone: nextDue ? nextDue.milestone_name : 'N/A',
        paymentStatus: outstandingBalance <= 0 ? 'Settled' : (nextDue && nextDue.status === 'Overdue' ? 'Overdue' : 'Active')
      },
      ledger: ledgerReport ? ledgerReport.ledger : [],
      payments,
      paymentSchedules,
      loan,
      documents,
      timeline,
      notes
    });
  } catch (err) {
    next(err);
  }
};

// Add note to customer CRM timeline
exports.addCustomerNote = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { note } = req.body;
    if (!note) {
      return res.status(400).json({ error: 'Note content is required' });
    }

    const newNote = await dbRepository.addCustomerNote(id, req.user.id, note);
    res.status(201).json({ note: newNote });
  } catch (err) {
    next(err);
  }
};

// Update Legal document registration status
exports.updateLegalStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { agreement_date, registration_date, possession_date, unit_status } = req.body;

    await dbRepository.updateLegalStatus(id, {
      agreement_date,
      registration_date,
      possession_date,
      unit_status
    });

    res.json({ message: 'Legal status updated successfully' });
  } catch (err) {
    next(err);
  }
};
