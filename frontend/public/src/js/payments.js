// Shree ERP - Payments Journal View controller

const paymentsView = {
  init: async () => {
    try {
      const res = await apiClient.get(`/api/reports/collections?project_id=${app.currentProject}`);
      paymentsView.renderLedgerJournal(res.collections);
    } catch (err) {
      console.error('Failed to retrieve ledger journal list:', err);
    }
  },

  renderLedgerJournal: (collections) => {
    const tbody = document.getElementById('payments-ledger-table-body');
    tbody.innerHTML = '';

    if (collections.length === 0) {
      tbody.innerHTML = `<tr><td colspan="10" class="text-center">No payment entries found in ledger.</td></tr>`;
      return;
    }

    collections.forEach(pay => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong class="text-green">${pay.receipt_number}</strong></td>
        <td>${pay.customer_name}</td>
        <td>Unit ${pay.unit_number}</td>
        <td><strong>₹${pay.amount.toLocaleString('en-IN')}</strong></td>
        <td><span class="pill pill-blue">${pay.payment_type}</span></td>
        <td><strong>${pay.payment_mode}</strong></td>
        <td><code>${pay.transaction_number || '-'}</code></td>
        <td>${pay.payment_date}</td>
        <td>Accounts Agent</td>
        <td>
          <button onclick="app.showReceiptPreview('${pay.id || `pay-id-${pay.customer_id}-${pay.receipt_number}`}')" class="btn btn-sm btn-outline"><i class="fa-solid fa-file-invoice"></i> Receipt</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }
};
