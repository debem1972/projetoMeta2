document.addEventListener('DOMContentLoaded', async function () {
  await window.AppDB.ready();

  const openModalBtn = document.getElementById('openModalBtnEdit');
  const searchInput = document.getElementById('search-input');
  const contentList = document.getElementById('content-list');
  const spendingModalEl = document.getElementById('spendingModal');

  let spendingData = (await window.AppDB.getCurrentData()) || { gastos: [] };
  spendingData.gastos = Array.isArray(spendingData.gastos) ? spendingData.gastos : [];

  const myModal = new bootstrap.Modal(spendingModalEl, {
    backdrop: 'static',
    keyboard: false
  });

  function normalizeText(text) {
    return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }

  function formatDateBR(dateString) {
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  }

  function formatCurrencyBR(value) {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  async function saveSpendingData() {
    await window.AppDB.saveCurrentData(spendingData);
    await renderSpendingList(searchInput.value || '');
  }

  async function renderSpendingList(filterTerm = '') {
    spendingData = (await window.AppDB.getCurrentData()) || { gastos: [] };
    spendingData.gastos = Array.isArray(spendingData.gastos) ? spendingData.gastos : [];

    const normalizedFilterParts = normalizeText(filterTerm).split(' ').filter(Boolean);
    contentList.innerHTML = '';

    spendingData.gastos.forEach((item, index) => {
      const dateFormatted = formatDateBR(item.data);
      const valueFormatted = formatCurrencyBR(item.valor);
      const searchText = `${dateFormatted} ${item.categoria} ${valueFormatted}`;
      const normalizedSearchText = normalizeText(searchText);
      const matchesFilter = normalizedFilterParts.every(part => normalizedSearchText.includes(part));

      if (!matchesFilter) return;

      const listItem = document.createElement('li');
      listItem.className = 'list-group-item d-flex justify-content-between align-items-center';
      listItem.innerHTML = `
        <div>
          <span class="fw-bold">${dateFormatted}</span> - ${item.categoria} - ${valueFormatted}
        </div>
        <div>
          <button class="btn btn-sm btn-primary me-2 editButton" data-index="${index}">
            <i class="bi bi-pencil-fill"></i>
          </button>
          <button class="btn btn-sm btn-danger deleteButton" data-index="${index}">
            <i class="bi bi-trash-fill"></i>
          </button>
        </div>
      `;
      contentList.appendChild(listItem);
    });
  }

  async function editSpending(index) {
    const spending = spendingData.gastos[index];
    if (!spending) return;

    const oldData = spending.data;
    const oldCategoria = spending.categoria;
    const oldValor = spending.valor;

    const newData = prompt('Digite a nova data (AAAA-MM-DD):', oldData);
    const newCategoria = prompt('Digite a nova categoria:', oldCategoria);
    const valorInput = prompt('Digite o novo valor:', oldValor.toFixed(2).replace('.', ','));

    if (!newData || !newCategoria || !valorInput) return;
    const newValor = parseFloat(valorInput.replace(',', '.'));
    if (Number.isNaN(newValor)) return;

    spendingData.gastos[index] = { data: newData, categoria: newCategoria, valor: newValor };
    spendingData.ultimaData = new Date().toISOString();
    await saveSpendingData();
    alert('Os dados foram salvos com sucesso!');
  }

  async function deleteSpending(index) {
    if (!confirm('Tem certeza que deseja excluir este gasto?')) return;
    spendingData.gastos.splice(index, 1);
    spendingData.ultimaData = new Date().toISOString();
    await saveSpendingData();
  }

  openModalBtn.addEventListener('click', async () => {
    await renderSpendingList();
    myModal.show();
    myModal._element.addEventListener('shown.bs.modal', () => {
      searchInput.focus();
    }, { once: true });
  });

  searchInput.addEventListener('keyup', function () {
    renderSpendingList(this.value);
  });

  contentList.addEventListener('click', async (event) => {
    const editButton = event.target.closest('.editButton');
    if (editButton) {
      await editSpending(Number(editButton.dataset.index));
      return;
    }
    const deleteButton = event.target.closest('.deleteButton');
    if (deleteButton) {
      await deleteSpending(Number(deleteButton.dataset.index));
    }
  });

  spendingModalEl.addEventListener('hidden.bs.modal', function () {
    searchInput.value = '';
    document.body.classList.remove('modal-open');
    document.querySelector('.modal-backdrop')?.remove();
    location.reload();
  });
});
