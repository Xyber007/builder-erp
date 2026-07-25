const dbRepository = require('../services/dbRepository');

// List units for a project (with wing/status filters)
exports.getUnits = async (req, res, next) => {
  try {
    const { project_id, wing, status } = req.query;
    if (!project_id) {
      return res.status(400).json({ error: 'project_id query param is required' });
    }

    const units = await dbRepository.getUnits(project_id, wing, status);
    res.json({ units });
  } catch (err) {
    next(err);
  }
};

// Get high-fidelity details of a single unit (incorporating customer, financial summary, and documents)
exports.getUnitDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Fetch base unit details
    const unit = await dbRepository.getUnitDetails(id);
    if (!unit) {
      return res.status(404).json({ error: 'Unit not found' });
    }

    // Check if there is an active customer linked to this unit
    const customers = await dbRepository.getCustomers(unit.project_id);
    const unitCustomer = customers.find(c => c.unit_id === unit.id);

    let customerDetails = null;
    let financialSummary = null;

    if (unitCustomer) {
      // Fetch full customer profile data (ledger, schedules, loan, documents)
      const profile = await dbRepository.getCustomerProfile(unitCustomer.id);
      if (profile) {
        // Calculate financial statistics
        const propertyValue = Number(unit.final_sale_price);
        const payments = profile.payments;
        const totalReceived = payments.reduce((sum, p) => sum + Number(p.amount), 0);
        const outstandingBalance = propertyValue - totalReceived;
        
        // Next due payment calculation
        const nextPayment = profile.paymentSchedules.find(s => s.status !== 'Completed');

        financialSummary = {
          propertyValue,
          totalReceived,
          outstandingBalance,
          paymentPercentage: Math.round((totalReceived / propertyValue) * 100) || 0,
          nextPayment: nextPayment ? {
            milestone: nextPayment.milestone_name,
            dueAmount: Number(nextPayment.due_amount),
            dueDate: nextPayment.due_date,
            status: nextPayment.status
          } : null
        };

        customerDetails = {
          profile: profile.customer,
          ledger: profile.payments,
          paymentSchedules: profile.paymentSchedules,
          loan: profile.loan,
          documents: profile.documents,
          notes: profile.notes,
          timeline: profile.timeline
        };
      }
    }

    res.json({
      unit,
      customerDetails,
      financialSummary
    });
  } catch (err) {
    next(err);
  }
};
