const dbRepository = require('../services/dbRepository');
const db = require('../config/database');
const excelSyncService = require('../services/excelSyncService');

// Get all raised demands and summaries for a project
exports.getDemands = async (req, res, next) => {
  try {
    const { project_id } = req.query;
    if (!project_id) {
      return res.status(400).json({ error: 'project_id query param is required' });
    }

    const store = db.getJsonDb();
    store.demands = store.demands || [];

    // Filter demands belonging to the project
    const customers = await dbRepository.getCustomers(project_id);
    const cIds = customers.map(c => c.id);

    const projectDemands = store.demands.filter(d => cIds.includes(d.customer_id));

    // Resolve details (customer name, unit number, milestone name)
    const formattedDemands = projectDemands.map(d => {
      const customer = customers.find(c => c.id === d.customer_id);
      const schedule = store.payment_schedules.find(s => s.id === d.schedule_id) || {};
      
      return {
        id: d.id,
        demand_number: d.demand_number,
        customer_name: customer ? customer.name : 'Unknown',
        unit_number: customer ? customer.unit_number : '-',
        milestone_name: schedule.milestone_name || 'Other',
        raised_date: d.raised_date,
        due_date: d.due_date,
        amount: Number(d.amount),
        received: Number(schedule.received_amount || 0),
        outstanding: Number(schedule.outstanding_amount || d.amount),
        status: schedule.status || d.status
      };
    });

    // Compile aggregates
    const totalRaised = formattedDemands.reduce((sum, d) => sum + d.amount, 0);
    const totalCollected = formattedDemands.reduce((sum, d) => sum + d.received, 0);
    const totalOutstanding = totalRaised - totalCollected;

    res.json({
      summary: {
        totalRaised,
        totalCollected,
        totalOutstanding,
        collectedPercentage: Math.round((totalCollected / totalRaised) * 100) || 0
      },
      demands: formattedDemands
    });
  } catch (err) {
    next(err);
  }
};

// Raise a demand letter for a customer milestone schedule
exports.raiseDemand = async (req, res, next) => {
  try {
    const { customer_id, schedule_id, due_date } = req.body;
    if (!customer_id || !schedule_id || !due_date) {
      return res.status(400).json({ error: 'customer_id, schedule_id and due_date are required' });
    }

    const store = db.getJsonDb();
    store.demands = store.demands || [];

    // Check if demand already exists
    const exists = store.demands.some(d => d.schedule_id === schedule_id);
    if (exists) {
      return res.status(400).json({ error: 'A demand letter has already been raised for this milestone.' });
    }

    // Find schedule milestone
    const schedule = store.payment_schedules.find(s => s.id === schedule_id);
    if (!schedule) {
      return res.status(404).json({ error: 'Milestone schedule record not found.' });
    }

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
    const rand = Math.floor(1000 + Math.random() * 9000);
    const demand_number = `DEM-${dateStr}-${rand}`;

    const newDemand = {
      id: `demand-id-${Date.now()}`,
      customer_id,
      schedule_id,
      demand_number,
      raised_date: now.toISOString().split('T')[0],
      due_date,
      amount: Number(schedule.due_amount),
      status: 'Unpaid',
      created_at: now.toISOString()
    };

    store.demands.push(newDemand);

    // Add Timeline event to customer profile
    store.customer_timeline.push({
      id: `time-id-${customer_id}-${Date.now()}`,
      customer_id,
      event_type: 'Demand Raised',
      description: `Demand Letter ${demand_number} raised for ${schedule.milestone_name} milestone. Amount: ₹${Number(schedule.due_amount).toLocaleString('en-IN')} (Due: ${due_date})`,
      event_date: now.toISOString().split('T')[0],
      created_at: now.toISOString()
    });

    db.saveJsonDb(store);
    try { excelSyncService.syncJSONToExcel(); } catch (e) { console.error(e); }

    res.status(201).json({
      message: 'Demand Letter raised successfully.',
      demand: newDemand
    });
  } catch (err) {
    next(err);
  }
};

// Retrieve single demand details for PDF printable invoices
exports.getDemandInvoice = async (req, res, next) => {
  try {
    const { id } = req.params;
    const store = db.getJsonDb();
    store.demands = store.demands || [];

    const demand = store.demands.find(d => d.id === id);
    if (!demand) {
      return res.status(404).json({ error: 'Demand letter record not found.' });
    }

    const customer = store.customers.find(c => c.id === demand.customer_id) || {};
    const unit = store.units.find(u => u.id === customer.unit_id) || {};
    const schedule = store.payment_schedules.find(s => s.id === demand.schedule_id) || {};

    res.json({
      demand,
      customer,
      unit,
      schedule
    });
  } catch (err) {
    next(err);
  }
};
