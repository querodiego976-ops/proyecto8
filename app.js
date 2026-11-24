document.addEventListener('DOMContentLoaded', () => {
  const btnProcess = document.getElementById('btn-process');
  const bankStatus = document.getElementById('bank-status');
  const systemStatus = document.getElementById('system-status');
  const tbody = document.getElementById('reconciliation-tbody');
  
  const countMatchedEl = document.getElementById('count-matched');
  const countDiscrepanciesEl = document.getElementById('count-discrepancies');
  const countTotalEl = document.getElementById('count-total');

  btnProcess.addEventListener('click', async () => {
    try {
      const response = await fetch('data.json');
      const data = await fetchJsonData(response);
      
      bankStatus.textContent = 'Cargado';
      bankStatus.style.backgroundColor = '#dcfce7';
      bankStatus.style.color = '#16a34a';

      systemStatus.textContent = 'Cargado';
      systemStatus.style.backgroundColor = '#dcfce7';
      systemStatus.style.color = '#16a34a';

      const results = reconcileData(data.banco, data.sistema);
      renderResults(results);
    } catch (error) {
      console.error('Error al procesar los datos:', error);
      alert('Asegúrate de ejecutar esta app mediante un servidor local (ej. Live Server en VS Code) para cargar el archivo data.json.');
    }
  });

  async function fetchJsonData(response) {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  }

  // Lógica principal de conciliación
  function reconcileData(banco, sistema) {
    const results = [];
    const systemVisited = new Set();

    banco.forEach(b => {
      // 1. Coincidencia Exacta: Referencia + Monto
      let matchIndex = sistema.findIndex((s, idx) => 
        !systemVisited.has(idx) && s.referencia === b.referencia && Math.abs(s.monto - b.monto) < 0.01
      );

      if (matchIndex !== -1) {
        systemVisited.add(matchIndex);
        results.push({
          status: 'MATCHED',
          banco: b,
          sistema: sistema[matchIndex],
          detail: 'Conciliación exacta'
        });
        return;
      }

      // 2. Coincidencia Parcial: Referencia igual pero Monto diferente
      matchIndex = sistema.findIndex((s, idx) => 
        !systemVisited.has(idx) && s.referencia === b.referencia
      );

      if (matchIndex !== -1) {
        systemVisited.add(matchIndex);
        results.push({
          status: 'DISCREPANCY',
          banco: b,
          sistema: sistema[matchIndex],
          detail: 'Diferencia de monto'
        });
        return;
      }

      // 3. Coincidencia Parcial: Monto y Fecha igual pero Referencia diferente
      matchIndex = sistema.findIndex((s, idx) => 
        !systemVisited.has(idx) && Math.abs(s.monto - b.monto) < 0.01 && s.fecha === b.fecha
      );

      if (matchIndex !== -1) {
        systemVisited.add(matchIndex);
        results.push({
          status: 'DISCREPANCY',
          banco: b,
          sistema: sistema[matchIndex],
          detail: 'Referencia discrepante'
        });
        return;
      }

      // 4. Movimiento solo presente en el Banco
      results.push({
        status: 'DISCREPANCY',
        banco: b,
        sistema: null,
        detail: 'No registrado en el sistema'
      });
    });

    // 5. Movimientos del sistema no emparejados con el Banco
    sistema.forEach((s, idx) => {
      if (!systemVisited.has(idx)) {
        results.push({
          status: 'DISCREPANCY',
          banco: null,
          sistema: s,
          detail: 'No registrado en el banco'
        });
      }
    });

    return results;
  }

  // Renderizado dinámico en el DOM
  function renderResults(results) {
    tbody.innerHTML = '';
    
    let matchedCount = 0;
    let discrepancyCount = 0;

    results.forEach(res => {
      const tr = document.createElement('tr');
      const isMatched = res.status === 'MATCHED';
      
      if (isMatched) {
        matchedCount++;
        tr.classList.add('row-matched');
      } else {
        discrepancyCount++;
        tr.classList.add('row-discrepancy');
      }

      const bancoMonto = res.banco ? `$${res.banco.monto.toFixed(2)}` : '-';
      const sistemaMonto = res.sistema ? `$${res.sistema.monto.toFixed(2)}` : '-';
      
      // Resaltar en rojo si hay diferencia de montos
      const montoMismatch = (res.banco && res.sistema && res.banco.monto !== res.sistema.monto);
      const refMismatch = (res.banco && res.sistema && res.banco.referencia !== res.sistema.referencia);

      tr.innerHTML = `
        <td><span class="status-badge">${isMatched ? 'CORRECTO' : 'REVISAR'}</span></td>
        <td>${res.banco ? res.banco.fecha : '-'}</td>
        <td class="${refMismatch ? 'highlight-red' : ''}">${res.banco ? res.banco.referencia : '-'}</td>
        <td class="${montoMismatch ? 'highlight-red' : ''}">${bancoMonto}</td>
        <td class="${montoMismatch ? 'highlight-red' : ''}">${sistemaMonto}</td>
        <td class="${refMismatch ? 'highlight-red' : ''}">${res.sistema ? res.sistema.referencia : '-'}</td>
        <td>${res.sistema ? res.sistema.fecha : '-'}</td>
        <td class="${!isMatched ? 'highlight-red' : ''}">${res.detail}</td>
      `;

      tbody.appendChild(tr);
    });

    countMatchedEl.textContent = matchedCount;
    countDiscrepanciesEl.textContent = discrepancyCount;
    countTotalEl.textContent = results.length;
  }
});