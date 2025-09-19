window.onload = function () {
  // URLs
  const sheetCropsUrl = "https://docs.google.com/spreadsheets/d/13II_ZFEvrxK2qd0mkIX-0TNPdUH5ac4NFykmjqEPCZM/gviz/tq?tqx=out:json";
  const sheetTaskUrl = "https://docs.google.com/spreadsheets/d/13II_ZFEvrxK2qd0mkIX-0TNPdUH5ac4NFykmjqEPCZM/gviz/tq?tqx=out:json&gid=693737777";
  const sheetLegalUrl = "https://docs.google.com/spreadsheets/d/1yLzyQRiZjOxwXDNL2gKtzTULA9ODTcS0bLXTOxqELBE/gviz/tq?tqx=out:json";
  const sheetDisputedUrl = "https://docs.google.com/spreadsheets/d/1yLzyQRiZjOxwXDNL2gKtzTULA9ODTcS0bLXTOxqELBE/gviz/tq?tqx=out:json&gid=162449209";

  // state
  let rowsData = [];
  let polygons = [];
  let labelsVisible = false;
  let taskData = [];
  let highlightLayers = [];

  const cropsByName = {};
  const actualByName = {};
  const legalByName = {};
  const disputedByName = {};

  // map + groups
  const map = L.map('map', { center: [17.5089721, 106.4670833], zoom: 13, zoomControl: false });
  L.control.zoom({ position: 'bottomright' }).addTo(map);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors' }).addTo(map);

  window.cropsGroup = L.layerGroup().addTo(map);
  const companyLegalGroup = L.layerGroup();
  const actualLotsGroup = L.layerGroup();
  const disputedGroup = L.layerGroup();
  const highlightGroup = L.layerGroup().addTo(map);

  // toggle nhãn
  const toggleBtn = L.control({ position: 'bottomright' });
  toggleBtn.onAdd = function () {
    const btn = L.DomUtil.create('button', 'toggle-labels-btn');
    btn.innerHTML = '👁️ Hiện nhãn';
    btn.onclick = function () {
      labelsVisible = !labelsVisible;
      polygons.forEach(p => { if (p.myTooltip) { if (labelsVisible) map.addLayer(p.myTooltip); else map.removeLayer(p.myTooltip); } });
      btn.innerHTML = labelsVisible ? '🙈 Ẩn nhãn' : '👁️ Hiện nhãn';
    };
    return btn;
  };
  toggleBtn.addTo(map);
// --- Helper: Update tiêu đề task panel ---
  window.updateTaskPanelTitle = function(selectedDate) {
    if (!selectedDate) return;
    const today = new Date(); today.setHours(0,0,0,0);
    selectedDate.setHours(0,0,0,0);
    console.log('today', today, 'selectedDate', selectedDate);
    const suffix = selectedDate > today ? ' (dự kiến)' : '';
    const dd = String(selectedDate.getDate()).padStart(2,'0');
    const mm = String(selectedDate.getMonth()+1).padStart(2,'0');
    const yyyy = selectedDate.getFullYear();
    document.getElementById('taskPanelTitle').textContent = 'Công việc ngày ' + dd + '/' + mm + '/' + yyyy + suffix;
  }
  // helpers parse
  function parseDate_fromSheet(str) {
    if (!str) return null;
    str = String(str).trim();
    if (str.includes('/')) {
      const parts = str.split('/');
      if (parts.length === 3) return new Date(parts[2], parts[1] - 1, parts[0]);
    }
    const match = str.match(/Date\((\d+),(\d+),(\d+)\)/);
    if (match) return new Date(+match[1], +match[2], +match[3]);
    const d = new Date(str); return isNaN(d) ? null : d;
  }
  window.parseTaskDate = function(dateStr) { if (!dateStr) return null; const m = dateStr.match(/Date\((\d+),(\d+),(\d+)\)/); if (m) return new Date(+m[1], +m[2], +m[3]); const d = new Date(dateStr); return isNaN(d) ? null : d; }

  // draw crops
  window.drawCrops = function(filterCrop) {
    labelsVisible = false;
    document.querySelector('.toggle-labels-btn').innerHTML = '👁️ Hiện nhãn';
    polygons.forEach(p => { if (p.myTooltip) map.removeLayer(p.myTooltip); });
    cropsGroup.clearLayers(); polygons = []; Object.keys(cropsByName).forEach(k => delete cropsByName[k]);

    const today = new Date();
    let totalGrassArea = 0, totalCassavaArea = 0, totalCornArea = 0;

    rowsData.forEach(row => {
      const [name, areaRaw, crop, stage, dateStr, coordsStr] = row.c.map(c => c?.v);
      const area = parseFloat(areaRaw) || 0;
      if (!coordsStr) return; if (filterCrop !== 'all' && crop !== filterCrop) return;
      let coords;
      try { coords = JSON.parse(coordsStr); } catch (e) { return; }

      let color = 'blue', fillColor = 'gray', fillOpacity = 0.6, weight = 0.5;
      const plantDate = parseDate_fromSheet(dateStr);
      const monthsElapsed = plantDate ? ((today - plantDate) / (1000 * 60 * 60 * 24 * 30)) : 0;

      if (filterCrop === 'all') {
        if (crop === 'Cỏ') fillColor = 'yellow';
        else if (crop === 'Ngô') fillColor = 'orange';
        else if (crop === 'Sắn') fillColor = 'green';
        else if (crop === 'Đất trống') { fillColor = 'brown'; fillOpacity = 0.3; }
      } else {
        if (crop === 'Cỏ') { fillColor = 'yellow'; if (monthsElapsed >= 3) { color = 'red'; weight = 2; totalGrassArea += area; } fillOpacity = Math.min(1, monthsElapsed / 6); }
        else if (crop === 'Sắn') { fillColor = 'green'; if (monthsElapsed >= 10) { color = 'red'; weight = 2; totalCassavaArea += area; } fillOpacity = Math.min(1, monthsElapsed / 6 * 3 / 10); }
        else if (crop === 'Ngô') { fillColor = 'orange'; if (monthsElapsed >= 6) { color = 'red'; weight = 2; totalCornArea += area; } fillOpacity = Math.min(1, monthsElapsed / 6 * 3 / 6); }
        else if (crop === 'Đất trống') { fillColor = 'brown'; fillOpacity = 0.3; }
      }

      const poly = L.polygon(coords, { color, weight, fillColor, fillOpacity }).addTo(cropsGroup);
      poly.options.name = name;
      const displayDate = plantDate ? `${plantDate.getDate()}/${plantDate.getMonth() + 1}/${plantDate.getFullYear()}` : 'Chưa có';
      poly.bindPopup(`<b>${name}</b><br>Diện tích: ${area} ha<br>Cây: ${crop}<br>Giai đoạn: ${stage}<br>Ngày: ${displayDate}`);
      poly.myTooltip = L.tooltip({ permanent: true, direction: 'center', className: 'custom-label' })
        .setContent(`${name}<br>${area} ha`).setLatLng(poly.getBounds().getCenter());

      polygons.push(poly);
      if (name) cropsByName[String(name)] = poly;
    });

    const box = document.getElementById('infoBox');
    if (filterCrop === 'Cỏ') { box.style.display = 'block'; box.innerText = `🌱 Cỏ đến hạn thu hoạch: ${totalGrassArea.toFixed(2)} ha`; }
    else if (filterCrop === 'Sắn') { box.style.display = 'block'; box.innerText = `🥔 Sắn đến hạn thu hoạch: ${totalCassavaArea.toFixed(2)} ha`; }
    else if (filterCrop === 'Ngô') { box.style.display = 'block'; box.innerText = `🌽 Ngô đến hạn thu hoạch: ${totalCornArea.toFixed(2)} ha`; }
    else { box.style.display = 'none'; }
  }

  // fetch crops
  fetch(sheetCropsUrl).then(r => r.text()).then(data => {
    const match = data.match(/google\.visualization\.Query\.setResponse\((.*)\);/s);
    if (!match) { console.error('Không parse được dữ liệu crops'); return; }
    try { rowsData = JSON.parse(match[1]).table.rows; drawCrops('all'); } catch (e) { console.error('Lỗi parse crops', e); }
  }).catch(e => console.error('Lỗi fetch crops', e));

  // company legal
  function drawCompanyLegal() {
    Object.keys(legalByName).forEach(k => delete legalByName[k]); companyLegalGroup.clearLayers();
    fetch(sheetLegalUrl).then(r => r.text()).then(txt => {
      const match = txt.match(/google\.visualization\.Query\.setResponse\((.*)\);/s);
      if (!match) return;
      const rows = JSON.parse(match[1]).table.rows;
      rows.forEach(r => {
        const [stt, name, areaRaw, coordsStr, note] = r.c.map(c => c?.v);
        if (!coordsStr) return; let coords; try { coords = JSON.parse(coordsStr); } catch (e) { return; }
        const poly = L.polygon(coords, { color: 'blue', weight: 1, fillColor: '#add8e6', fillOpacity: 0.4 }).addTo(companyLegalGroup);
        poly.bindPopup(`<b>${name}</b><br>Diện tích: ${areaRaw || ''} ha<br>${note ? note : ''}`);
        if (name) legalByName[String(name)] = poly;
      });
    }).catch(err => console.error('Lỗi fetch sổ đỏ:', err));
  }

  // actual lots
  function drawActualLots() {
    Object.keys(actualByName).forEach(k => delete actualByName[k]); actualLotsGroup.clearLayers();
    rowsData.forEach(r => {
      const [name, areaRaw, crop, stage, dateStr, coordsStr] = r.c.map(c => c?.v);
      if (!coordsStr) return; let coords; try { coords = JSON.parse(coordsStr); } catch (e) { return; }
      const poly = L.polygon(coords, { color: 'green', weight: 1, fillColor: '#b0f2b6', fillOpacity: 0.4 }).addTo(actualLotsGroup);
      poly.bindPopup(`<b>${name}</b><br>${areaRaw} ha`);
      if (name) actualByName[String(name)] = poly;
    });
  }

  // disputed lots
  function drawDisputedLots() {
    Object.keys(disputedByName).forEach(k => delete disputedByName[k]); disputedGroup.clearLayers();
    fetch(sheetDisputedUrl).then(r => r.text()).then(txt => {
      const match = txt.match(/google\.visualization\.Query\.setResponse\((.*)\);/s);
      if (!match) return; const rows = JSON.parse(match[1]).table.rows;
      rows.forEach(r => {
        const [stt, name, areaRaw, coordsStr, note] = r.c.map(c => c?.v);
        if (!coordsStr) return; let coords; try { coords = JSON.parse(coordsStr); } catch (e) { return; }
        const poly = L.polygon(coords, { color: 'red', weight: 2, fillColor: '#f5b7b1', fillOpacity: 0.5 }).addTo(disputedGroup);
        poly.bindPopup(`<b>${name}</b><br>Diện tích: ${areaRaw || ''} ha<br>${note ? note : ''}`);
        if (name) disputedByName[String(name)] = poly;
      });
    }).catch(err => console.error('Lỗi fetch disputed:', err));
  }

  window.anyLegalChecked = function() {
    return document.getElementById('chkCompanyLegal').checked || document.getElementById('chkActualLots').checked || document.getElementById('chkDisputed').checked;
  }

    // fetch tasks
  fetch(sheetTaskUrl).then(res => res.text()).then(data => {
    const match = data.match(/google\.visualization\.Query\.setResponse\((.*)\);/s);
    if (match) taskData = JSON.parse(match[1]).table.rows;
  }).catch(e => console.error('Lỗi fetch tasks:', e));

  function clearHighlights() { highlightGroup.clearLayers(); highlightLayers = []; }
  
  // show tasks
  window.showTasks = function() {
    if (!taskDateInput.value) return;
    const selectedDate = new Date(taskDateInput.value);
    selectedDate.setHours(0,0,0,0);
    document.getElementById('taskPanelTitle').textContent = 'Công việc ngày ' + String(selectedDate.getDate()).padStart(2,'0') + '/' + String(selectedDate.getMonth() + 1).padStart(2,'0') + '/' + selectedDate.getFullYear();

    clearHighlights();

    const dayTasks = taskData.filter(row => { const [stt, dateStr] = row.c.map(c => c?.v); const d = parseTaskDate(dateStr); return d && d.toDateString() === selectedDate.toDateString(); });

    taskListDiv.innerHTML = '';
    const lotTasksMap = {};
    dayTasks.forEach(row => { const [stt, dateStr, lot, content, quantity] = row.c.map(c => c?.v); if (!lot) return; if (!lotTasksMap[lot]) lotTasksMap[lot] = []; lotTasksMap[lot].push({ content, quantity }); });

    Object.keys(lotTasksMap).forEach(lot => {
      const poly = cropsByName[lot] || actualByName[lot] || legalByName[lot] || disputedByName[lot];
      if (poly) {
        const highlight = L.polygon(poly.getLatLngs(), { color: 'red', weight: 3, fill: false }).addTo(highlightGroup);
        highlightLayers.push(highlight);
      }
      const tasksHTML = lotTasksMap[lot].map(t => `- ${t.content} (${t.quantity || ''})`).join('<br>');
      taskListDiv.innerHTML += `<div class="lot-item" data-lot="${lot}"><b>Lô ${lot}</b><br>${tasksHTML}</div><hr>`;
    });

    // hover effects (use properties on element to store timers)
    document.querySelectorAll('#taskList .lot-item').forEach(item => {
      item.addEventListener('mouseenter', () => {
        const lotName = item.dataset.lot;
        const basePoly = cropsByName[lotName] || actualByName[lotName] || legalByName[lotName] || disputedByName[lotName];
        if (!basePoly) return;
        const coords = basePoly.getLatLngs();
        item._blinkPoly = L.polygon(coords, { color: 'red', weight: 0, fillColor: 'red', fillOpacity: 0 }).addTo(highlightGroup);
        let visible = false;
        item._blinkId = setInterval(() => { if (item._blinkPoly) item._blinkPoly.setStyle({ fillOpacity: visible ? 0 : 0.4 }); visible = !visible; }, 400);
      });
      item.addEventListener('mouseleave', () => {
        if (item._blinkId) { clearInterval(item._blinkId); item._blinkId = null; }
        if (item._blinkPoly) { highlightGroup.removeLayer(item._blinkPoly); item._blinkPoly = null; }
      });
    });
  }

  // UI elements
  const taskPanel = document.getElementById('taskPanel');
  window.taskDateInput = document.getElementById('taskDate');
  window.taskListDiv = document.getElementById('taskList');





  window.resetLegalView= function() {
    ['chkCompanyLegal', 'chkActualLots', 'chkDisputed'].forEach(id => {
      const el = document.getElementById(id);
      el.checked = false;
      el.dispatchEvent(new Event('change'));
    });
  }

  // ----- mobile menu open/close (sửa logic để chỉ tác động top-level trên mobile)
  const hamburgerBtn = document.getElementById('hamburger');
  hamburgerBtn.addEventListener('click', function(){
  const menuEl = document.querySelector('#menu .menu'); // lấy đúng ul.menu
  menuEl.classList.toggle('show');
  const is = this.getAttribute('aria-expanded') === 'true';
  this.setAttribute('aria-expanded', !is);
});
// ----- Đóng menu khi click vào bất kỳ item nào (mobile) -----
// Đóng menu chính khi click vào mục cuối cùng
const menuEl = document.querySelector('#menu .menu');
  // Đóng menu và reset bản đồ khi click nút con (mobile + desktop)


};








