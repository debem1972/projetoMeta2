document.addEventListener('DOMContentLoaded', function () {
  const openModalBtn = document.getElementById('openModalBtnEdit');
  const searchInput = document.getElementById('search-input');
  const contentList = document.getElementById('content-list');


  let spendingData = JSON.parse(localStorage.getItem('controlegastos')) || { gastos: [] };

  //--------------------------------------------------------------------------------
  //Nova abordagem de outra instancia de modal
  const myModal = new bootstrap.Modal(document.getElementById('spendingModal'), {
    backdrop: 'static',
    keyboard: false
  });
  //--------------------------------------------------------------------
  // Evento para abrir o modal e dar foco no campo de busca após abertura completa
  openModalBtn.addEventListener('click', () => {
    renderSpendingList(); // Atualizar lista ao abrir o modal
    myModal.show();
    myModal._element.addEventListener('shown.bs.modal', () => {
      searchInput.focus(); // Dar foco no campo de busca após o modal ser mostrado
    }, { once: true }); // Executar apenas uma vez
  });

  // Evento para limpar o campo de busca e garantir que o modal seja fechado corretamente
  document.getElementById('spendingModal').addEventListener('hidden.bs.modal', () => {
    searchInput.value = ''; // Limpar o campo de busca
    document.body.classList.remove('modal-open'); // Remover a classe que escurece a tela
    document.querySelector('.modal-backdrop')?.remove(); // Remover o backdrop, se presente
  });


  //-----------------------------------------------------------------------

  // Função para normalizar texto, ignorando acentos, maiúsculas e caracteres especiais
  function normalizeText(text) {
    return text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remove acentuação
      .toLowerCase();
  }

  // Função para formatar a data para o formato brasileiro (dd/mm/aaaa)
  function formatDateBR(dateString) {
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  }

  // Função para formatar o valor para o formato de moeda brasileira (R$ X,XX)
  function formatCurrencyBR(value) {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  // Função para renderizar a lista de gastos com filtro de busca em tempo real
  function renderSpendingList(filterTerm = '') {
    spendingData = JSON.parse(localStorage.getItem('controlegastos')) || { gastos: [] };

    const normalizedFilterParts = normalizeText(filterTerm).split(' '); // Divide o termo em partes

    contentList.innerHTML = '';
    spendingData.gastos.forEach((item, index) => {
      const dateFormatted = formatDateBR(item.data);
      const valueFormatted = formatCurrencyBR(item.valor);
      const searchText = `${dateFormatted} ${item.categoria} ${valueFormatted}`;
      const normalizedSearchText = normalizeText(searchText);

      // Verificar se todas as partes do termo de busca estão na linha
      const matchesFilter = normalizedFilterParts.every(part => normalizedSearchText.includes(part));

      if (matchesFilter) {
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
      }
    });
  }

  // Evento de digitação no campo de filtro
  searchInput.addEventListener('keyup', function () {
    renderSpendingList(this.value);
  });

  function saveSpendingData() {
    localStorage.setItem('controlegastos', JSON.stringify(spendingData));
    renderSpendingList();
  }

  function addNewSpending(data, categoria, valor) {
    spendingData.gastos.push({ data, categoria, valor });
    saveSpendingData();
  }

  function editSpending(index) {
    const spending = spendingData.gastos[index];
    const oldData = spending.data;
    const oldCategoria = spending.categoria;
    const oldValor = spending.valor;

    const newData = prompt('Digite a nova data (AAAA-MM-DD):', oldData);
    const newCategoria = prompt('Digite a nova categoria:', oldCategoria);
    const valorInput = prompt('Digite o novo valor:', oldValor.toFixed(2).replace('.', ','));
    const newValor = parseFloat(valorInput.replace(',', '.'));

    if (newData && newCategoria && !isNaN(newValor)) {
      spendingData.gastos[index] = { data: newData, categoria: newCategoria, valor: newValor };
      saveSpendingData();
      alert('Os dados foram salvos com sucesso!');
    }
  }

  function deleteSpending(index) {
    if (confirm('Tem certeza que deseja excluir este gasto?')) {
      spendingData.gastos.splice(index, 1);
      saveSpendingData();
    }
  }

  contentList.addEventListener('click', (event) => {
    if (event.target.classList.contains('editButton')) {
      const index = event.target.dataset.index;
      editSpending(index);
    }
  });

  contentList.addEventListener('click', (event) => {
    if (event.target.classList.contains('deleteButton')) {
      const index = event.target.dataset.index;
      deleteSpending(index);
    }
  });


  // Atualize a função de abertura do modal para usar a nova instância:
  openModalBtn.addEventListener('click', () => {
    renderSpendingList();
    myModal.show(); // Exibe o modal usando a nova instância
  });

  //----------------------------------------------------------------

  // Adicione o evento de recarregar a página ao fechar o modal
  document.getElementById('spendingModal').addEventListener('hidden.bs.modal', function () {
    location.reload(); // Recarrega a página após fechar o modal
  });



});
