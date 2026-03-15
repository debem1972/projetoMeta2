document.addEventListener('DOMContentLoaded', async function () {
    await window.AppDB.ready();

    const gerarAnaliseBtn = document.getElementById('btnGerarAnalise');
    const periodoFiltro = document.getElementById('periodoFiltro');
    const categoriaFiltro = document.getElementById('categoriaFiltro');
    const somAlert = document.getElementById('somErro');

    function parseLocalDate(dateValue) {
        if (!dateValue) return null;

        if (dateValue instanceof Date) {
            const d = new Date(dateValue);
            d.setHours(0, 0, 0, 0);
            return d;
        }

        const raw = String(dateValue).trim();

        // "YYYY-MM-DD" (input[type="date"]) is parsed as UTC by Date(), which can shift a day in negative timezones.
        // Parse it manually to local time to keep the correct day-of-month filters.
        const isoDateOnly = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (isoDateOnly) {
            const year = Number(isoDateOnly[1]);
            const month = Number(isoDateOnly[2]) - 1;
            const day = Number(isoDateOnly[3]);
            const d = new Date(year, month, day);
            d.setHours(0, 0, 0, 0);
            return d;
        }

        // "DD/MM/YYYY" (legacy/local display)
        const brDate = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
        if (brDate) {
            const day = Number(brDate[1]);
            const month = Number(brDate[2]) - 1;
            const year = Number(brDate[3]);
            const d = new Date(year, month, day);
            d.setHours(0, 0, 0, 0);
            return d;
        }

        const d = new Date(raw);
        if (Number.isNaN(d.getTime())) return null;
        d.setHours(0, 0, 0, 0);
        return d;
    }

    async function carregarCategorias() {
        const dados = await window.AppDB.getCurrentData();
        const gastos = dados.gastos || [];
        const categorias = [...new Set(gastos.map(gasto => gasto.categoria))];
        categoriaFiltro.innerHTML = '<option value="">Todas</option>';

        categorias.forEach(categoria => {
            const option = document.createElement('option');
            option.value = categoria;
            option.textContent = categoria;
            categoriaFiltro.appendChild(option);
        });
    }

    await carregarCategorias();

    async function gerarAnalise() {
        const dados = await window.AppDB.getCurrentData();
        // Extrair valor numérico do campo recursos corretamente
        const recursosInput = document.getElementById('recursos');
        const recursosValue = recursosInput.value
            .replace(/[R$\s]/g, '') // Remove R$ e espaços
            .replace(/\./g, '')      // Remove pontos (separador de milhar)
            .replace(',', '.');      // Substitui vírgula por ponto (decimal)
        const recursos = parseFloat(recursosValue) || dados.recursos || 0;
        const gastos = dados.gastos || [];

        const dataAtual = new Date();
        dataAtual.setHours(0, 0, 0, 0);

        const diasFiltro = parseInt(periodoFiltro.value, 10);
        const categoriaSelecionada = categoriaFiltro.value;
        const diasDecorridosMes = dataAtual.getDate();

        if (!Number.isNaN(diasFiltro) && diasFiltro > diasDecorridosMes) {
            const dataFormatada = dataAtual.toLocaleDateString('pt-BR');
            const mesAtual = dataAtual.toLocaleDateString('pt-BR', { month: 'long' });
            somAlert.play();

            alert(`Sem dados suficientes para emitir um parecer adequado, pois estamos em ${dataFormatada} e não temos ${diasFiltro} dias decorridos no mês de ${mesAtual}. Solicite a análise sem o filtro de período!`);
            periodoFiltro.value = '';
            return;
        }

        // Definir período de análise
        let dataInicio;
        let diasAnalisados;
        
        if (!Number.isNaN(diasFiltro)) {
            // Filtro de período: do dia 1 até o dia especificado no filtro
            dataInicio = new Date(dataAtual.getFullYear(), dataAtual.getMonth(), 1);
            diasAnalisados = diasFiltro;
        } else {
            // Sem filtro: do dia 1 até hoje
            dataInicio = new Date(dataAtual.getFullYear(), dataAtual.getMonth(), 1);
            diasAnalisados = diasDecorridosMes;
        }
        dataInicio.setHours(0, 0, 0, 0);

        // Data final do período analisado
        const dataFimAnalise = new Date(dataAtual.getFullYear(), dataAtual.getMonth(), diasAnalisados);
        dataFimAnalise.setHours(23, 59, 59, 999);

        // Filtrar gastos pelo período
        let gastosFiltrados = gastos.filter(gasto => {
            const dataGasto = parseLocalDate(gasto.data);
            if (!dataGasto) return false;
            return dataGasto >= dataInicio && dataGasto <= dataFimAnalise;
        });

        // Filtrar por categoria se selecionada
        if (categoriaSelecionada) {
            gastosFiltrados = gastosFiltrados.filter(gasto => gasto.categoria === categoriaSelecionada);
        }

        const totalGastos = gastosFiltrados.reduce((sum, gasto) => sum + gasto.valor, 0);
        const mediaGastos = totalGastos / diasAnalisados;
        
        // Calcular dias restantes do mês
        const ultimoDiaMes = new Date(dataAtual.getFullYear(), dataAtual.getMonth() + 1, 0).getDate();
        const diasRestantes = ultimoDiaMes - diasAnalisados;
        
        // Projeção de gastos até o final do mês
        const previsaoFimMes = mediaGastos * diasRestantes;
        
        // Saldo restante após os gastos analisados
        const saldoRestante = recursos - totalGastos;
        
        // Limite diário para os dias restantes
        const mediaPermitida = diasRestantes > 0 ? saldoRestante / diasRestantes : 0;

        let analise;
        if (categoriaSelecionada) {
            const totalGastosGlobal = gastos.reduce((sum, gasto) => sum + gasto.valor, 0);
            const porcentagemCategoria = totalGastosGlobal > 0 ? ((totalGastos / totalGastosGlobal) * 100).toFixed(2) : '0.00';
            analise = `Você gastou ${totalGastos.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} com <b><i>${categoriaSelecionada}</i></b> `;
            analise += `nos ${diasAnalisados} ${diasAnalisados === 1 ? 'dia' : 'dias'} analisados, o que representa ${porcentagemCategoria}% dos gastos totais.`;
        } else {
            const percentualRecursos = recursos > 0 ? ((totalGastos / recursos) * 100).toFixed(2) : '0.00';
            analise = `Você já consumiu ${totalGastos.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}, o que equivale a ${percentualRecursos}% dos seus recursos disponíveis. `;
            analise += `Seu saldo disponível após esse período é de ${saldoRestante.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}. `;
            analise += `A média de gastos diários nos ${diasAnalisados} ${diasAnalisados === 1 ? 'dia' : 'dias'} é de ${mediaGastos.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}. `;
            
            if (diasRestantes > 0) {
                analise += `Se continuar assim, você gastará ${previsaoFimMes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} até o final do mês. `;
                analise += `Lembre-se de que, para manter-se dentro do orçamento e alcançar sua meta de economia, seu limite diário de gastos até o fim do mês não deverá ultrapassar ${mediaPermitida.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.`;
            } else {
                analise += `Hoje é o último dia do mês.`;
            }
        }

        if (totalGastos > recursos) {
            analise += ' Você já ultrapassou seus recursos!';
            showModal('Alerta de Gastos!', analise, 'modal-danger');
        } else if (saldoRestante <= mediaGastos) {
            analise += ' Atenção redobrada nos próximos gastos.';
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
