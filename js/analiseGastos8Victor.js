document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('gastoForm');
    const gerarAnaliseBtn = document.getElementById('btnGerarAnalise');

    const periodoFiltro = document.getElementById('periodoFiltro');
    const categoriaFiltro = document.getElementById('categoriaFiltro');

    const somAlert = document.getElementById('somErro');

    function carregarCategorias() {
        const gastos = JSON.parse(localStorage.getItem('controlegastos')).gastos || [];
        const categorias = [...new Set(gastos.map(gasto => gasto.categoria))];
        categoriaFiltro.innerHTML = '<option value="">Todas</option>';

        categorias.forEach(categoria => {
            const option = document.createElement('option');
            option.value = categoria;
            option.textContent = categoria;
            categoriaFiltro.appendChild(option);
        });
    }

    carregarCategorias();

    function gerarAnalise() {
        const recursos = parseFloat(document.getElementById('recursos').value) || 0;
        const gastos = JSON.parse(localStorage.getItem('controlegastos')).gastos || [];

        const dataAtual = new Date();
        dataAtual.setHours(0, 0, 0, 0);

        const diasFiltro = parseInt(periodoFiltro.value);
        const categoriaSelecionada = categoriaFiltro.value;

        // Calcula o número de dias decorridos no mês atual
        const diasDecorridosMes = dataAtual.getDate();

        // Validação do período filtrado - Exatamente como no código velho
        if (!isNaN(diasFiltro) && diasFiltro > diasDecorridosMes) {
            const dataFormatada = dataAtual.toLocaleDateString('pt-BR');
            const mesAtual = dataAtual.toLocaleDateString('pt-BR', { month: 'long' });

            // Reproduz o som de alerta (erro)
            somAlert.play();

            alert(`Sem dados suficientes para emitir um parecer adequado, pois estamos em ${dataFormatada} e não temos ${diasFiltro} dias decorridos no mês de ${mesAtual}. Solicite a análise sem o filtro de período!`);

            periodoFiltro.value = '';
            return; // Interrompe a execução caso o período seja inválido
        }


        let dataInicio = new Date();
        if (!isNaN(diasFiltro)) {
            dataInicio.setDate(dataAtual.getDate() - diasFiltro + 1);
        } else {
            dataInicio = new Date(dataAtual.getFullYear(), dataAtual.getMonth(), 1);
        }
        dataInicio.setHours(0, 0, 0, 0);

        const diasDecorridos = (dataAtual - dataInicio) / (1000 * 60 * 60 * 24) + 1;

        let gastosFiltrados = gastos.filter(gasto => new Date(gasto.data) >= dataInicio);
        if (categoriaSelecionada) {
            gastosFiltrados = gastosFiltrados.filter(gasto => gasto.categoria === categoriaSelecionada);
        }

        const totalGastos = gastosFiltrados.reduce((sum, gasto) => sum + gasto.valor, 0);
        const mediaGastos = totalGastos / diasDecorridos;
        const diasRestantes = (new Date(dataAtual.getFullYear(), dataAtual.getMonth() + 1, 0).getDate() - dataAtual.getDate()) + 1;
        const previsaoFimMes = mediaGastos * diasRestantes;
        const saldoRestante = recursos - totalGastos;
        const mediaPermitida = recursos / new Date(dataAtual.getFullYear(), dataAtual.getMonth() + 1, 0).getDate();

        let analise;
        if (categoriaSelecionada) {
            const totalGastosGlobal = gastos.reduce((sum, gasto) => sum + gasto.valor, 0);
            const porcentagemCategoria = ((totalGastos / totalGastosGlobal) * 100).toFixed(2);

            analise = `Você gastou ${totalGastos.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} com <b><i>${categoriaSelecionada}</i></b> até hoje, o que representa ${porcentagemCategoria}% dos gastos totais.`;
        } else {
            analise = `Você já consumiu ${totalGastos.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}, o que equivale a ${((totalGastos / recursos) * 100).toFixed(2)}% dos seus recursos disponíveis. `;
            analise += `A média de gastos diários até o dia de hoje é de ${mediaGastos.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}. `;
            analise += `Se continuar assim, você gastará ${previsaoFimMes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} até o final do mês. `;
            analise += `Lembre-se de que, para manter-se dentro do orçamento e alcançar sua meta de economia, seu limite diário de gastos até o fim do mês não deverá ultrapassar ${mediaPermitida.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.`;
        }

        if (totalGastos > recursos) {
            analise += ` Você já ultrapassou seus recursos!`;
            showModal('Alerta de Gastos!', analise, 'modal-danger');
        } else if (saldoRestante <= mediaGastos) {
            analise += ` Atenção redobrada nos próximos gastos.`;
            showModal('Atenção!', analise, 'modal-warning');
        } else {
            showModal('Análise de Gastos', analise, 'modal-info');
        }

        periodoFiltro.value = '';
    }

    function showModal(titulo, mensagem, classeModal) {
        const modal = document.createElement('div');
        modal.className = `modal ${classeModal}`;
        modal.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">${titulo}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <p>${mensagem}</p>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fechar</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        const modalInstance = new bootstrap.Modal(modal);
        modalInstance.show();
    }

    gerarAnaliseBtn.addEventListener('click', gerarAnalise);
});
