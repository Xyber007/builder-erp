const dbRepository = require('../services/dbRepository');

// List all projects with summaries
exports.getProjects = async (req, res, next) => {
  try {
    const projects = await dbRepository.getProjects();
    res.json({ projects });
  } catch (err) {
    next(err);
  }
};

// Compile project dashboard parameters (total unit counts, financial collection, construction status, recent transactions)
exports.getProjectDashboard = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Fetch project metadata
    let project = null;
    if (dbRepository.getProjectDetails) {
      project = await dbRepository.getProjectDetails(id);
    } else {
      const projects = await dbRepository.getProjects();
      project = projects.find(p => p.id === id);
    }

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Get aggregated units stats and total received payments
    const { unitStats, totalReceived } = await dbRepository.getProjectDashboard(id);

    // Calculate totals across unit statuses
    let totalUnits = 0;
    let totalSalesValue = 0;
    const breakdown = {
      Available: { count: 0, val: 0 },
      Booked: { count: 0, val: 0 },
      Blocked: { count: 0, val: 0 },
      'Agreement Done': { count: 0, val: 0 },
      Registered: { count: 0, val: 0 },
      'Possession Given': { count: 0, val: 0 },
      Cancelled: { count: 0, val: 0 }
    };

    unitStats.forEach(stat => {
      totalUnits += stat.count;
      if (stat.status !== 'Available' && stat.status !== 'Blocked' && stat.status !== 'Cancelled') {
        totalSalesValue += Number(stat.val);
      }
      if (breakdown[stat.status]) {
        breakdown[stat.status].count = stat.count;
        breakdown[stat.status].val = Number(stat.val);
      }
    });

    const outstanding = totalSalesValue - Number(totalReceived);

    // Fetch construction stages
    const constructionStages = await dbRepository.getConstructionStages(id);

    // Fetch collections list for latest transactions
    const rawCollections = await dbRepository.getCollectionsReport(id);
    const recentTransactions = rawCollections.slice(0, 10); // get last 10 payments

    res.json({
      project,
      summary: {
        totalUnits,
        available: breakdown['Available'].count,
        booked: breakdown['Booked'].count + breakdown['Agreement Done'].count + breakdown['Registered'].count + breakdown['Possession Given'].count,
        blocked: breakdown['Blocked'].count,
        agreementDone: breakdown['Agreement Done'].count,
        registered: breakdown['Registered'].count,
        possessionGiven: breakdown['Possession Given'].count,
        cancelled: breakdown['Cancelled'].count,
        totalSalesValue,
        totalCollection: Number(totalReceived),
        totalOutstanding: outstanding,
        constructionProgress: project.construction_percentage
      },
      constructionStages,
      recentTransactions
    });
  } catch (err) {
    next(err);
  }
};

exports.updateConstructionProgress = async (req, res, next) => {
  try {
    const { stageId } = req.params;
    const { progress_percentage, notes } = req.body;

    if (progress_percentage === undefined || notes === undefined) {
      return res.status(400).json({ error: 'progress_percentage and notes are required' });
    }

    await dbRepository.updateConstructionProgress(stageId, progress_percentage, notes, null);
    res.json({ message: 'Construction stage updated successfully' });
  } catch (err) {
    next(err);
  }
};

