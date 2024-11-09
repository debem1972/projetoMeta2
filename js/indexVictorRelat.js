document.addEventListener('DOMContentLoaded', function () {


    // Seleção de elementos do formulário
    const form = document.getElementById('gastoForm');
    const metaInput = document.getElementById('meta');
    const recursosInput = document.getElementById('recursos');
    const dataInput = document.getElementById('data');
    const gastoInput = document.getElementById('gasto');
    const tipoGastoInput = document.getElementById('tipos'); // Novo campo para categoria de gasto
    const botaoLancaGastos = document.getElementById('botaoLancar');
    const saldoRestanteEl = document.getElementById('saldoRestante');
    const gastoDiarioEl = document.getElementById('gastoDiario');
    const diasRestantesEl = document.getElementById('diasRestantes');
    const btnAnaliseGastos = document.getElementById('gerarAnalise');
    //const analiseGastosModal = new bootstrap.Modal(document.getElementById('analiseGastosModal'));
    const gerarRelatorioBtn = document.getElementById('gerarRelatorio');
    const caixaRegister = document.getElementById('som4');
    const novoLimiteVoice = document.getElementById('som5');
    const erroCamposVazios = document.getElementById('somErro');

    let gastosChart;

    // Carregar dados do localStorage
    const dados = JSON.parse(localStorage.getItem('controlegastos')) || {};
    metaInput.value = dados.meta || '';
    recursosInput.value = dados.recursos || '';

    // Verificar se é um novo mês
    const hoje = new Date();
    const ultimaData = dados.ultimaData ? new Date(dados.ultimaData) : null;
    if (!ultimaData || ultimaData.getMonth() !== hoje.getMonth() || ultimaData.getFullYear() !== hoje.getFullYear()) {
        alert('Um novo mês se inicia! Por favor, insira seus dados para análise de custos.');
        localStorage.removeItem('controlegastos');
        // Resetar dados após novo mês
        dados.meta = parseFloat(metaInput.value) || 0;
        dados.recursos = parseFloat(recursosInput.value) || 0;
        dados.ultimaData = hoje.toISOString();
        dados.gastos = [];
        localStorage.setItem('controlegastos', JSON.stringify(dados));
    }

    // Função para atualizar o resumo
    function atualizarResumo() {
        const recursos = parseFloat(recursosInput.value) || 0;
        const gastos = dados.gastos || [];
        const totalGastos = gastos.reduce((sum, gasto) => sum + gasto.valor, 0);
        const saldoRestante = recursos - totalGastos;

        const dataAtual = new Date();
        const ultimoDiaMes = new Date(dataAtual.getFullYear(), dataAtual.getMonth() + 1, 0).getDate();
        const diasRestantes = ultimoDiaMes - dataAtual.getDate() + 1;
        const gastoDiario = saldoRestante / diasRestantes;

        saldoRestanteEl.textContent = `Saldo Restante: ${saldoRestante.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`;
        gastoDiarioEl.textContent = `Gasto Diário Permitido: ${gastoDiario.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`;
        diasRestantesEl.textContent = `Você tem ${diasRestantes} dias até o final do mês vigente!`;

        // Salvar saldoRestante e totalGastos no localStorage
        localStorage.setItem('saldoRestante', saldoRestante);
        localStorage.setItem('totalGastos', totalGastos);

        atualizarGrafico();
    }

    // Função para atualizar o gráfico
    function atualizarGrafico() {
        const ctx = document.getElementById('gastosChart').getContext('2d');
        const gastos = dados.gastos || [];
        const recursos = parseFloat(recursosInput.value) || 0;

        // Calcular o gasto diário permitido
        const dataAtual = new Date();
        const ultimoDiaMes = new Date(dataAtual.getFullYear(), dataAtual.getMonth() + 1, 0).getDate();
        const gastoDiarioPermitido = recursos / ultimoDiaMes;

        // Agrupar gastos por dia
        const gastosPorDia = {};
        gastos.forEach(gasto => {
            const data = gasto.data.split('-')[2]; // Pega apenas o dia
            gastosPorDia[data] = (gastosPorDia[data] || 0) + gasto.valor;
        });

        const labels = Object.keys(gastosPorDia).sort((a, b) => a - b);
        const values = labels.map(dia => gastosPorDia[dia]);

        // Determinar as cores das barras
        const backgroundColors = values.map(valor => {
            if (valor < gastoDiarioPermitido) {
                return 'rgba(50, 205, 50, 0.7)'; // Verde para abaixo do limite
            } else if (valor === gastoDiarioPermitido) {
                return 'rgba(255, 255, 0, 0.7)'; // Amarelo para exatamente no limite
            } else {
                return 'rgba(255, 0, 0, 0.7)'; // Vermelho para acima do limite
            }
        });

        const borderColors = backgroundColors.map(color => color.replace('0.7', '1'));

        if (gastosChart) {
            gastosChart.destroy();
        }

        gastosChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Gastos por Dia',
                    data: values,
                    backgroundColor: backgroundColors,
                    borderColor: borderColors,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function (value, index, values) {
                                return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                            }
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    label += context.parsed.y.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                                }
                                const diff = context.parsed.y - gastoDiarioPermitido;
                                if (diff < 0) {
                                    label += ` (${Math.abs(diff).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} abaixo do limite)`;
                                } else if (diff > 0) {
                                    label += ` (${diff.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} acima do limite)`;
                                } else {
                                    label += ' (no limite)';
                                }
                                return label;
                            }
                        }
                    }
                }
            }
        });
    }

    //--------------------------------------------------------------------
    // Função de validação e submissão do formulário
    function validarESubmeter(e) {
        e.preventDefault();  // Previne o comportamento padrão do formulário

        // Validação dos campos
        if (metaInput.value.trim() === '' || recursosInput.value.trim() === '' || dataInput.value.trim() === '' || gastoInput.value.trim() === '' || tipoGastoInput.value.trim() === '') {
            try {
                erroCamposVazios.play();
            } catch (error) {
                console.error('Erro ao tocar o som:', error);
            }

            setTimeout(function () {
                alert("Por favor, preencha todos os campos corretamente.");
            }, 300);
            return;
        }

        const meta = parseFloat(metaInput.value);
        const recursos = parseFloat(recursosInput.value);
        const data = dataInput.value;
        const gasto = parseFloat(gastoInput.value);
        const tipoGasto = tipoGastoInput.value; // Captura a categoria de gasto

        // Processamento do formulário
        dados.meta = meta;
        dados.recursos = recursos;
        dados.ultimaData = new Date().toISOString();
        dados.gastos = dados.gastos || [];
        dados.gastos.push({ data, valor: gasto, categoria: tipoGasto });  // Salva a categoria junto com os outros dados

        localStorage.setItem('controlegastos', JSON.stringify(dados));

        // Toca o som de caixa registradora ao clicar no botão Adicionar Gasto
        caixaRegister.play();

        // Toca o som id #som5 1.7s após o botão Adicionar Gasto ser clicado.
        setTimeout(function () {
            novoLimiteVoice.play();
        }, 1700);

        // Limpar os campos data e gasto do dia após enviar os dados
        gastoInput.value = '';
        dataInput.value = '';
        tipoGastoInput.value = ''; // Limpa a seleção da categoria

        atualizarResumo();
    }
    //-----------------------------------------------------------------



    // Adicionando eventos de clique e submit
    botaoLancaGastos.addEventListener('click', validarESubmeter);
    form.addEventListener('submit', validarESubmeter);

    // Função para gerar o relatório PDF
    function gerarRelatorioPDF() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Configurações iniciais
        doc.setFont("helvetica");
        doc.setFontSize(16);

        // Cabeçalho
        const dataAtual = new Date();
        const mesAno = dataAtual.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
        doc.text(`Relatório de Gastos Diários - ${mesAno}`, 105, 20, { align: "center" });

        // Informações gerais
        doc.setFontSize(12);
        doc.text(`Meta de Economia: ${dados.meta.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`, 20, 40);
        doc.text(`Recursos Disponíveis: ${dados.recursos.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`, 20, 50);

        // Tabela de gastos
        doc.setFontSize(10);
        let yPos = 70;
        doc.text("Data", 20, yPos);
        doc.text("Valor Gasto", 100, yPos);
        yPos += 10;

        const gastosPorDia = {};
        dados.gastos.forEach(gasto => {
            const dataFormatada = gasto.data.split('-').reverse().join('/');
            gastosPorDia[dataFormatada] = (gastosPorDia[dataFormatada] || 0) + gasto.valor;
        });

        // Ordenar dias cronologicamente
        const diasOrdenados = Object.keys(gastosPorDia).sort((a, b) => {
            const [diaA, mesA, anoA] = a.split('/');
            const [diaB, mesB, anoB] = b.split('/');
            return new Date(anoA, mesA - 1, diaA) - new Date(anoB, mesB - 1, diaB);
        });

        // Iterar sobre os gastos na ordem correta
        diasOrdenados.forEach(data => {
            const valor = gastosPorDia[data];
            // Verifica se há espaço suficiente na página atual, senão adiciona uma nova página
            if (yPos + 10 > 270) {
                doc.addPage();
                yPos = 20;
                doc.setFontSize(10);
                doc.text("Data", 20, yPos);
                doc.text("Valor Gasto", 100, yPos);
                yPos += 10;
            }

            doc.text(data, 20, yPos);
            doc.text(valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), 100, yPos);
            yPos += 10;
        });

        // Total de gastos
        const totalGastos = Object.values(gastosPorDia).reduce((sum, valor) => sum + valor, 0);
        yPos += 10;
        doc.setFontSize(12);
        if (yPos + 10 > 270) { // Verifica espaço para o total na página atual
            doc.addPage();
            yPos = 20;
        }
        doc.text(`Total de Gastos: ${totalGastos.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`, 20, yPos);
        yPos += 20;

        // Inserir o gráfico
        const canvas = document.getElementById('gastosChart');
        const imgData = canvas.toDataURL('image/png', 1.0);

        // Verificar se há espaço suficiente para o gráfico na página atual
        // Ajuste a altura do gráfico conforme necessário (ex: 100 unidades)
        const graficoAltura = 100;
        if (yPos + graficoAltura > 270) { // 270 é um limite ajustável dependendo do layout
            doc.addPage();
            yPos = 20;
        }

        // Inserir a imagem do gráfico no PDF
        doc.setFontSize(12);
        doc.text("Gráfico de Gastos Mensais:", 20, yPos);
        yPos += 10;
        doc.addImage(imgData, 'PNG', 20, yPos, 170, graficoAltura); // Ajuste a largura (170) e altura (graficoAltura) conforme necessário

        // Salvar o PDF
        doc.save(`relatorio_gastos_${mesAno.replace(' ', '_')}.pdf`);
    }



    //-------------------------------------------------------------------------------------
    //Help
    //Capturando os elementos do help
    const helpMeta = document.querySelector('#metaHelp');
    const helpReceita = document.querySelector('#receitaHelp');
    const helpGastosDoDia = document.querySelector('#gastoDiaHelp');

    //Capturando os elementos de audio do help
    const ajudaMeta = document.querySelector('#som7');
    const ajudaReceita = document.querySelector('#som8');
    const ajudaGastos = document.querySelector('#som9');

    //Capturando os elementos card
    const cardMeta = document.querySelector('#ajudaEscritaMeta');
    const cardReceita = document.querySelector('#ajudaEscritaReceita');
    const cardGastosDoDia = document.querySelector('#ajudaEscritaGastoDoDia');

    //Capturando o id do botão ok dos card's
    const okCard = document.querySelectorAll('.okButton');

    //Audio da ajuda do campo meta
    helpMeta.addEventListener('click', function () {

        cardMeta.style.display = 'block';
        //Ativar o display block do card id ##ajudaEscritaMeta por 24 segundos
        setTimeout(function () {
            cardMeta.style.display = 'none';
        }, 25000);

        ajudaMeta.play();
    });

    //-----------------------------------------------------
    //Fecha o card com o ok
    // Função para fechar os cards ao clicar no botão OK
    okCard.forEach(button => {
        button.addEventListener('click', function () {
            // Verifica qual card o botão está associado e o fecha
            if (this.closest('#ajudaEscritaMeta')) {
                cardMeta.style.display = 'none'; // Fechar o card Meta
                ajudaMeta.pause(); // Pausa o áudio
                ajudaMeta.currentTime = 0; // Reseta o tempo para o início
            } else if (this.closest('#ajudaEscritaReceita')) {
                cardReceita.style.display = 'none'; // Fechar o card Receita
                ajudaReceita.pause(); // Pausa o áudio
                ajudaReceita.currentTime = 0; // Reseta o tempo para o início
            } else if (this.closest('#ajudaEscritaGastoDoDia')) {
                cardGastosDoDia.style.display = 'none'; // Fechar o card Gastos do Dia
                ajudaGastos.pause(); // Pausa o áudio
                ajudaGastos.currentTime = 0; // Reseta o tempo para o início
            }
        });
    });

    //---------------------------------------------------------------


    //Audio da ajuda do campo receita
    helpReceita.addEventListener('click', function () {

        cardReceita.style.display = 'block';
        //Ativar o display block do card id ##ajudaReceita por 16 segundos
        setTimeout(function () {
            cardReceita.style.display = 'none';
        }, 16000);

        ajudaReceita.play();
    });


    //Audio da ajuda do campo gastos do dia
    helpGastosDoDia.addEventListener('click', function () {

        cardGastosDoDia.style.display = 'block';
        //Ativar o display block do card id ##ajudaEscritaGastoDoDia por 19 segundos
        setTimeout(function () {
            cardGastosDoDia.style.display = 'none';
        }, 19000);

        ajudaGastos.play();
    })
    //--------------------------------------------------------------------------
    // Adicionando evento de clique para gerar relatório
    gerarRelatorioBtn.addEventListener('click', gerarRelatorioPDF);

    // -------------------------- FUNÇÕES DE TOGGLING --------------------------

    // 1. Toggling para Inputs (#meta e #recursos)
    // Função para alternar visibilidade dos inputs
    function toggleVisibility(inputId, iconId, storageKey) {
        const input = document.getElementById(inputId);
        const icon = document.getElementById(iconId);

        if (input.type === "text" || input.type === "number") { // Ajustado para incluir type="number"
            input.type = "password";
            icon.classList.replace('bi-eye', 'bi-eye-slash');
            localStorage.setItem(storageKey, "hidden");
        } else {
            input.type = "text";
            icon.classList.replace('bi-eye-slash', 'bi-eye');
            localStorage.setItem(storageKey, "visible");
        }
    }

    // Função para restaurar visibilidade dos inputs com base no localStorage
    function restoreVisibility(inputId, iconId, storageKey) {
        const input = document.getElementById(inputId);
        const icon = document.getElementById(iconId);
        const visibilityState = localStorage.getItem(storageKey);

        if (visibilityState === "hidden") {
            input.type = "password";
            icon.classList.replace('bi-eye', 'bi-eye-slash');
        } else {
            input.type = "text";
            icon.classList.replace('bi-eye-slash', 'bi-eye');
        }
    }

    // Adiciona eventos de clique para alternar visibilidade dos inputs
    document.getElementById('toggleMeta').addEventListener('click', function () {
        toggleVisibility('meta', 'toggleMeta', 'metaVisibility');
    });

    document.getElementById('toggleReceita').addEventListener('click', function () {
        toggleVisibility('recursos', 'toggleReceita', 'receitaVisibility');
    });

    // Restaura visibilidade ao carregar a página para os inputs
    restoreVisibility('meta', 'toggleMeta', 'metaVisibility');
    restoreVisibility('recursos', 'toggleReceita', 'receitaVisibility');

    // 2. Toggling para Spans (<p id="saldoRestante"> e <p id="gastoDiario">)
    // Função para alternar visibilidade dos spans
    function toggleVisibilitySpans(iconId, saldoId, gastoId, storageKey) {
        const icon = document.getElementById(iconId);
        const saldoSpan = document.getElementById(saldoId);
        const gastoSpan = document.getElementById(gastoId);

        // Verifica se os valores estão ocultos (se têm a classe 'hidden-text')
        if (saldoSpan.classList.contains('hidden-text') || gastoSpan.classList.contains('hidden-text')) {
            // Remove a classe de ocultação e troca o ícone para 'bi-eye'
            saldoSpan.classList.remove('hidden-text');
            gastoSpan.classList.remove('hidden-text');
            icon.classList.replace('bi-eye-slash', 'bi-eye');
            localStorage.setItem(storageKey, "visible");
        } else {
            // Adiciona a classe de ocultação e troca o ícone para 'bi-eye-slash'
            saldoSpan.classList.add('hidden-text');
            gastoSpan.classList.add('hidden-text');
            icon.classList.replace('bi-eye', 'bi-eye-slash');
            localStorage.setItem(storageKey, "hidden");
        }
    }

    // Função para restaurar visibilidade dos spans com base no localStorage
    function restoreVisibilitySpans(iconId, saldoId, gastoId, storageKey) {
        const icon = document.getElementById(iconId);
        const saldoSpan = document.getElementById(saldoId);
        const gastoSpan = document.getElementById(gastoId);
        const visibilityState = localStorage.getItem(storageKey);

        if (visibilityState === "hidden") {
            saldoSpan.classList.add('hidden-text');
            gastoSpan.classList.add('hidden-text');
            icon.classList.replace('bi-eye', 'bi-eye-slash');
        } else {
            saldoSpan.classList.remove('hidden-text');
            gastoSpan.classList.remove('hidden-text');
            icon.classList.replace('bi-eye-slash', 'bi-eye');
        }
    }

    // Adiciona evento de clique para o ícone de resumo
    document.getElementById('ocultaMostraQsj').addEventListener('click', function () {
        toggleVisibilitySpans('ocultaMostraQsj', 'saldoRestante', 'gastoDiario', 'financeVisibility');
    });

    // Restaura visibilidade ao carregar a página para os spans
    restoreVisibilitySpans('ocultaMostraQsj', 'saldoRestante', 'gastoDiario', 'financeVisibility');

    // -------------------------- FIM DAS FUNÇÕES DE TOGGLING --------------------------

   
    

    // Atualizar o resumo e gráfico na inicialização
    atualizarResumo();
});







