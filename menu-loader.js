// Nạp menu.html và chèn vào placeholder
fetch('menu.html')
  .then(res => res.text())
  .then(html => {
    document.getElementById('menu-placeholder').innerHTML = html;

    // --- Gắn sự kiện sau khi menu đã chèn xong ---
    const btnHeThongTuoi = document.getElementById('btnHeThongTuoi');
    if (btnHeThongTuoi) {
      btnHeThongTuoi.addEventListener('click', () => {
        window.location.href = 'he-thong-tuoi.html';
      });
    }

    // Ví dụ: các sự kiện khác của menu
    document.querySelectorAll('#menu .menu > li > button').forEach(topBtn => {
      topBtn.addEventListener('click', function () {
        const li = this.parentElement;

        // Thu gọn menu ở mobile
        if (window.innerWidth <= 768) {
          document.querySelectorAll('#menu .menu>li').forEach(item => {
            if (item !== li) item.classList.remove('open');
          });
          li.classList.toggle('open');
        }

        // Code xử lý khác
        if (!this.textContent.includes('Cây trồng')) {
          resetLegalView();
          drawCrops('all');
        }
      });
    });

    document.querySelectorAll('#menu .final-item').forEach(subBtn => {
      subBtn.addEventListener('click', function () {
        if (window.innerWidth <= 768) {
          document.querySelector('#menu .menu').classList.remove('show');
          document.getElementById('hamburger').setAttribute('aria-expanded','false');
        }

        if (this.dataset.crop) {
          drawCrops(this.dataset.crop);
        }

        if (this.id === 'dailyTaskBtn') {
          const now = new Date();
          const yyyy = now.getFullYear();
          const mm = String(now.getMonth()+1).padStart(2,'0');
          const dd = String(now.getDate()).padStart(2,'0');

          taskDateInput.value = `${yyyy}-${mm}-${dd}`;
          updateTaskPanelTitle(new Date(taskDateInput.value));
          taskPanel.style.display = 'block';
          showTasks();
        }
      });
    });
  document.getElementById('dailyTaskBtn').addEventListener('click', function () {
    drawCrops('all');
    if (!anyLegalChecked() && !map.hasLayer(cropsGroup)) map.addLayer(cropsGroup);
    const now = new Date(); const yyyy = now.getFullYear(); const mm = String(now.getMonth() + 1).padStart(2, '0'); const dd = String(now.getDate()).padStart(2, '0');
    taskDateInput.value = `${yyyy}-${mm}-${dd}`;
  });
    // checkbox events
  document.getElementById('chkCompanyLegal').addEventListener('change', function () {
    if (this.checked) { if (map.hasLayer(cropsGroup)) map.removeLayer(cropsGroup); highlightGroup.clearLayers(); drawCompanyLegal(); map.addLayer(companyLegalGroup); }
    else { companyLegalGroup.clearLayers(); map.removeLayer(companyLegalGroup); if (!anyLegalChecked()) map.addLayer(cropsGroup); }
  });
  document.getElementById('chkActualLots').addEventListener('change', function () {
    if (this.checked) { if (map.hasLayer(cropsGroup)) map.removeLayer(cropsGroup); highlightGroup.clearLayers(); drawActualLots(); map.addLayer(actualLotsGroup); }
    else { actualLotsGroup.clearLayers(); map.removeLayer(actualLotsGroup); if (!anyLegalChecked()) map.addLayer(cropsGroup); }
  });
  document.getElementById('chkDisputed').addEventListener('change', function () {
    if (this.checked) { if (map.hasLayer(cropsGroup)) map.removeLayer(cropsGroup); highlightGroup.clearLayers(); drawDisputedLots(); map.addLayer(disputedGroup); }
    else { disputedGroup.clearLayers(); map.removeLayer(disputedGroup); if (!anyLegalChecked()) map.addLayer(cropsGroup); }
  });
  document.getElementById('dailyTaskBtn').addEventListener('click', function () {
  drawCrops('all');
  if (!anyLegalChecked() && !map.hasLayer(cropsGroup)) map.addLayer(cropsGroup);
  const now = new Date(); const yyyy = now.getFullYear(); const mm = String(now.getMonth() + 1).padStart(2, '0'); const dd = String(now.getDate()).padStart(2, '0');
  taskDateInput.value = `${yyyy}-${mm}-${dd}`;
  });
    // --- Kết thúc gắn sự kiện ---
  });
