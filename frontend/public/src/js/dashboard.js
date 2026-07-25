// Shree ERP - Home Dashboard View controller

const dashboardView = {
  chartInstance: null,

  init: async () => {
    try {
      const res = await apiClient.get(`/api/projects/${app.currentProject}/dashboard`);
      dashboardView.renderStats(res.summary);
      dashboardView.renderConstructionStatus(res.project, res.summary);
      dashboardView.renderRecentPayments(res.recentTransactions);
      dashboardView.renderCharts(res.summary);
    } catch (err) {
      console.error('Failed to load dashboard metrics:', err);
    }
  },

  renderStats: (summary) => {
    document.getElementById('dash-stat-total-units').innerText = summary.totalUnits;
    document.getElementById('dash-stat-avail-units').innerText = `${summary.available} Available`;
    document.getElementById('dash-stat-booked-units').innerText = `${summary.booked} Booked`;

    document.getElementById('dash-stat-booked-count').innerText = summary.booked;
    document.getElementById('dash-stat-booked-pct').innerText = `${Math.round((summary.booked / summary.totalUnits) * 100)}%`;
    document.getElementById('dash-stat-agreed-count').innerText = `${summary.agreementDone} Agreements`;
    document.getElementById('dash-stat-reg-count').innerText = `${summary.registered} Registered`;

    document.getElementById('dash-stat-sales-value').innerText = `₹${summary.totalSalesValue.toLocaleString('en-IN')}`;

    document.getElementById('dash-stat-collections-value').innerText = `₹${summary.totalCollection.toLocaleString('en-IN')}`;
    const collPct = Math.round((summary.totalCollection / summary.totalSalesValue) * 100) || 0;
    document.getElementById('dash-stat-collection-pct').innerText = `${collPct}% Coll.`;
    document.getElementById('dash-stat-outstanding-value').innerText = `Outstanding: ₹${summary.totalOutstanding.toLocaleString('en-IN')}`;
  },

  renderConstructionStatus: (project, summary) => {
    document.getElementById('dash-construction-stage-name').innerText = project.construction_status;
    document.getElementById('dash-construction-stage-pct').innerText = `${project.construction_percentage}%`;
    document.getElementById('dash-construction-progress-bar').style.width = `${project.construction_percentage}%`;
  },

  renderRecentPayments: (payments) => {
    const tableBody = document.getElementById('dash-recent-payments-table');
    tableBody.innerHTML = '';

    if (payments.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="8" class="text-center">No payment transactions recorded.</td></tr>`;
      return;
    }

    payments.forEach(pay => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong class="text-green">${pay.receipt_number}</strong></td>
        <td>${pay.customer_name}</td>
        <td>Unit ${pay.unit_number}</td>
        <td><span class="pill pill-blue">${pay.payment_type}</span></td>
        <td><strong>${pay.payment_mode}</strong></td>
        <td>${pay.payment_date}</td>
        <td><strong>₹${pay.amount.toLocaleString('en-IN')}</strong></td>
        <td>
          <button onclick="app.showReceiptPreview('${pay.id || `pay-id-${pay.customer_id}-${pay.receipt_number}`}')" class="btn btn-sm btn-outline"><i class="fa-solid fa-eye"></i> View</button>
        </td>
      `;
      tableBody.appendChild(tr);
    });
  },

  renderCharts: (summary) => {
    const ctx = document.getElementById('revenueChart').getContext('2d');
    
    // Destroy existing chart instance to prevent redraw overlay bugs
    if (dashboardView.chartInstance) {
      dashboardView.chartInstance.destroy();
    }

    // Colors adjusted for Light/Dark modes
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textCol = isDark ? '#9ca3af' : '#6b7280';
    const borderCol = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(17, 24, 39, 0.08)';

    dashboardView.chartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Collections Received', 'Outstanding Balances', 'Available Stock Value'],
        datasets: [{
          data: [
            summary.totalCollection,
            summary.totalOutstanding,
            summary.available * 7000000 // estimate available value roughly for visualization
          ],
          backgroundColor: [
            'rgba(16, 185, 129, 0.85)', // emerald
            'rgba(244, 63, 94, 0.85)',  // rose
            'rgba(99, 102, 241, 0.4)'    // indigo border
          ],
          borderColor: isDark ? '#111827' : '#ffffff',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: textCol,
              font: {
                family: 'Inter',
                size: 11
              }
            }
          }
        }
      }
    });
  }
};
