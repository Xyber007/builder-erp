// Shree ERP - Unit Inventory View controller

const unitsView = {
  init: async () => {
    try {
      const res = await apiClient.get(`/api/units?project_id=${app.currentProject}`);
      unitsView.renderFloorPlanGrid(res.units);
    } catch (err) {
      console.error('Failed to retrieve project units inventory:', err);
    }
  },

  renderFloorPlanGrid: (units) => {
    const container = document.getElementById('units-visual-map');
    container.innerHTML = '';

    // Group units by floor
    const floorsMap = {};
    units.forEach(u => {
      if (!floorsMap[u.floor]) {
        floorsMap[u.floor] = [];
      }
      floorsMap[u.floor].push(u);
    });

    // Get sorted floor numbers desc (9th floor on top, ground floor at bottom)
    const sortedFloors = Object.keys(floorsMap).map(Number).sort((a, b) => b - a);

    sortedFloors.forEach(floorNum => {
      const floorRow = document.createElement('div');
      floorRow.className = 'floor-row';

      const floorLabel = document.createElement('div');
      floorLabel.className = 'floor-label';
      floorLabel.innerText = `Floor ${floorNum}`;

      const grid = document.createElement('div');
      grid.className = 'units-grid';

      // Sort units by unit number ascending within the floor
      const floorUnits = floorsMap[floorNum].sort((a, b) => a.unit_number.localeCompare(b.unit_number));

      floorUnits.forEach(unit => {
        const box = document.createElement('div');
        box.className = `unit-box ${unit.status}`;
        
        box.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <h4>${unit.unit_number}</h4>
            <span class="pill pill-${unitsView.getStatusPillClass(unit.status)}" style="font-size:0.65rem; padding: 2px 6px;">${unit.status}</span>
          </div>
          <div class="size"><i class="fa-solid fa-expand"></i> ${unit.saleable_area} sq ft</div>
          <div class="buyer mt-2">
            ${unit.customer_name 
              ? `<i class="fa-solid fa-user text-green"></i> ${unit.customer_name}` 
              : `<span class="text-secondary"><i class="fa-solid fa-circle-check"></i> ₹${(unit.final_sale_price / 100000).toFixed(1)} L</span>`}
          </div>
        `;

        box.onclick = () => {
          if (unit.customer_id) {
            window.location.hash = `#customer-profile/${unit.customer_id}`;
          } else {
            // Show detailed inventory alert card
            alert(`--- UNIT ${unit.unit_number} INVENTORY OVERVIEW ---
Project: Meraki Studio Baner (Wing A)
Floor Rise Level: Floor ${unit.floor}
Facing View: ${unit.facing}
Carpet Area: ${unit.carpet_area} sq ft | Saleable Area: ${unit.saleable_area} sq ft
Parking Allocated: ${unit.parking}
Stage: ${unit.current_construction_stage}
-----------------------------------------------
Base Price: ₹${Number(unit.basic_price).toLocaleString('en-IN')}
GST (5%): ₹${Number(unit.gst).toLocaleString('en-IN')}
Stamp Duty (6%): ₹${Number(unit.stamp_duty).toLocaleString('en-IN')}
Other Charges: ₹${(Number(unit.registration_fee) + Number(unit.maintenance_charges) + Number(unit.plc)).toLocaleString('en-IN')}
-----------------------------------------------
Final Sale Price: ₹${Number(unit.final_sale_price).toLocaleString('en-IN')}
Status: Available for booking.`);
          }
        };

        grid.appendChild(box);
      });

      floorRow.appendChild(floorLabel);
      floorRow.appendChild(grid);
      container.appendChild(floorRow);
    });
  },

  getStatusPillClass: (status) => {
    if (status === 'Available') return 'green';
    if (status === 'Booked') return 'yellow';
    if (status === 'Blocked') return 'red';
    if (status === 'Agreement Done') return 'blue';
    if (status === 'Registered') return 'purple';
    return 'green';
  }
};
