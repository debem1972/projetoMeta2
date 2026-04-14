document.addEventListener('DOMContentLoaded', async function () {


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
    const gerarRelatorioBtn = document.getElementById('gerarRelatorio');
    const exportarJsonBtn = document.getElementById('exportarJsonBtn');
    const importarJsonBtn = document.getElementById('importarJsonBtn');
    const importarJsonInput = document.getElementById('importarJsonInput');
    const caixaRegister = document.getElementById('som4');
    const novoLimiteVoice = document.getElementById('som5');
    const erroCamposVazios = document.getElementById('somErro');

    let gastosChart;
    let dados = (await window.AppDB.getCurrentData()) || { gastos: [] };
    dados.gastos = Array.isArray(dados.gastos) ? dados.gastos : [];

    function obterUltimoDiaDoMes(dataReferencia) {
        return new Date(dataReferencia.getFullYear(), dataReferencia.getMonth() + 1, 0).getDate();
    }

    function obterDiasAteFimDoMes(dataReferencia) {
        return Math.max(obterUltimoDiaDoMes(dataReferencia) - dataReferencia.getDate(), 0);
    }

    function obterDivisorDiario(dataReferencia) {
        return Math.max(obterDiasAteFimDoMes(dataReferencia), 1);
    }

    function calcularOrcamentoDisponivel(recursos, meta, totalGastos = 0) {
        return Math.max((recursos - meta) - totalGastos, 0);
    }

    function parseLocalDate(dateValue) {
        if (!dateValue) return null;

        const isoDateOnly = String(dateValue).trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (isoDateOnly) {
            const year = Number(isoDateOnly[1]);
            const month = Number(isoDateOnly[2]) - 1;
            const day = Number(isoDateOnly[3]);
            const parsed = new Date(year, month, day);
            parsed.setHours(0, 0, 0, 0);
            return parsed;
        }

        const parsed = new Date(dateValue);
        if (Number.isNaN(parsed.getTime())) return null;
        parsed.setHours(0, 0, 0, 0);
        return parsed;
    }

    function formatarDataBR(dateValue) {
        const parsed = parseLocalDate(dateValue);
        return parsed ? parsed.toLocaleDateString('pt-BR') : '';
    }

    function obterMapaGastosPorDia(gastos) {
        return (gastos || []).reduce((acc, gasto) => {
            const parsedDate = parseLocalDate(gasto.data);
            if (!parsedDate) return acc;
            if (!acc[gasto.data]) {
                acc[gasto.data] = 0;
            }
            acc[gasto.data] += gasto.valor;
            return acc;
        }, {});
    }

    function calcularLimiteDiarioDaData(dataAlvo, gastos, recursos, meta) {
        const parsedTargetDate = parseLocalDate(dataAlvo);
        if (!parsedTargetDate) {
            return { limiteDoDia: 0, gastoDoDia: 0, saldoRestanteDoDia: 0 };
        }

        const gastosPorDia = obterMapaGastosPorDia(gastos);
        const datasOrdenadas = Object.keys(gastosPorDia).sort((a, b) => parseLocalDate(a) - parseLocalDate(b));
        let saldoAntesDoDia = Math.max(recursos - meta, 0);

        for (const data of datasOrdenadas) {
            const dataLancamento = parseLocalDate(data);
            const limiteDoDia = saldoAntesDoDia / obterDivisorDiario(dataLancamento);
            const gastoDoDia = gastosPorDia[data];

            if (data === dataAlvo) {
                return {
                    limiteDoDia,
                    gastoDoDia,
                    saldoRestanteDoDia: limiteDoDia - gastoDoDia
                };
            }

            if (dataLancamento <= parsedTargetDate) {
                saldoAntesDoDia = Math.max(saldoAntesDoDia - gastoDoDia, 0);
            }
        }

        return {
            limiteDoDia: saldoAntesDoDia / obterDivisorDiario(parsedTargetDate),
            gastoDoDia: 0,
            saldoRestanteDoDia: saldoAntesDoDia / obterDivisorDiario(parsedTargetDate)
        };
    }

    let toastTimer;

    function mostrarToastSaldoDia(mensagem, tipo = 'success') {
        let toast = document.getElementById('dailyBalanceToast');

        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'dailyBalanceToast';
            toast.className = 'daily-balance-toast';
            document.body.appendChild(toast);
        }

        toast.classList.remove('is-success', 'is-danger', 'is-visible');
        toast.classList.add(tipo === 'danger' ? 'is-danger' : 'is-success');
        toast.textContent = mensagem;

        if (toastTimer) {
            clearTimeout(toastTimer);
        }

        requestAnimationFrame(() => {
            toast.classList.add('is-visible');
        });

        toastTimer = setTimeout(() => {
            toast.classList.remove('is-visible');
        }, 5000);
    }

    // -------------------------- MÁSCARA DE MOEDA BRL --------------------------

    // Função para formatar valor em BRL
    function formatarMoedaBRL(valor) {
        if (!valor) return '';
        const numero = parseFloat(valor);
        if (isNaN(numero)) return '';
        return numero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    // Função para extrair apenas números do input
    function extrairNumeros(valor) {
        return valor.replace(/\D/g, '');
    }

    // Função para converter centavos em reais
    function centavosParaReais(centavos) {
        return (parseInt(centavos) / 100).toFixed(2);
    }

    // Função para obter valor numérico puro do campo formatado
    function obterValorNumerico(input) {
        const valorFormatado = input.value;
        const apenasNumeros = extrairNumeros(valorFormatado);
        if (!apenasNumeros) return 0;
        return parseFloat(centavosParaReais(apenasNumeros));
    }

    // Função para aplicar máscara em tempo real
    function aplicarMascaraMoeda(input) {
        let valor = extrairNumeros(input.value);
        if (!valor) {
            input.value = '';
            return;
        }
        const valorEmReais = centavosParaReais(valor);
        input.value = formatarMoedaBRL(valorEmReais);
    }

    // Aplicar máscara nos campos de moeda
    [metaInput, recursosInput, gastoInput].forEach(input => {
        input.addEventListener('input', function () {
            aplicarMascaraMoeda(this);
        });

        input.addEventListener('focus', function () {
            // Remove formatação ao focar para facilitar edição
            const valorNumerico = obterValorNumerico(this);
            if (valorNumerico > 0) {
                this.value = formatarMoedaBRL(valorNumerico);
            }
        });
    });

    // Carregar valores salvos com formatação
    if (dados.meta) {
        metaInput.value = formatarMoedaBRL(dados.meta);
    }
    if (dados.recursos) {
        recursosInput.value = formatarMoedaBRL(dados.recursos);
    }

    // -------------------------- FIM DA MÁSCARA DE MOEDA BRL --------------------------

    const appInit = await window.AppDB.ready();
    if (appInit.shouldPromptExport && appInit.pendingExportMonthKey && appInit.pendingExportData) {
        const confirmExport = confirm(
            `Novo mês detectado. Deseja exportar agora os dados de ${appInit.pendingExportMonthKey} em JSON?`
        );
        if (confirmExport) {
            const exported = await window.AppDB.exportMonthData(appInit.pendingExportMonthKey);
            if (exported) {
                await window.AppDB.clearPendingExport();
                alert('Exportação concluída com sucesso.');
            }
        } else {
            alert('Você pode exportar depois pelo botão "Exportar Dados JSON".');
        }
    }

    const RESUMO_VISIBILITY_STORAGE_KEY = 'financeVisibility';
    const RESUMO_MASK_TOKEN = '******';

    function isResumoHidden() {
        return localStorage.getItem(RESUMO_VISIBILITY_STORAGE_KEY) === 'hidden';
    }

    function maskResumoLine(text) {
        if (!text) return '';
        return String(text).replace(/R\$\s*[\d\.,]+/g, `R$ ${RESUMO_MASK_TOKEN}`);
    }

    function setResumoLineText(element, realText, hidden) {
        if (!element) return;
        element.dataset.realText = realText;
        element.textContent = hidden ? maskResumoLine(realText) : realText;
    }

    // Função para atualizar o resumo
    function atualizarResumo() {
        const recursos = obterValorNumerico(recursosInput);
        const meta = obterValorNumerico(metaInput);
        const gastos = dados.gastos || [];
        const totalGastos = gastos.reduce((sum, gasto) => sum + gasto.valor, 0);
        const saldoRestante = calcularOrcamentoDisponivel(recursos, meta, totalGastos);

        const dataAtual = new Date();
        const diasRestantes = obterDiasAteFimDoMes(dataAtual);
        const gastoDiario = saldoRestante / obterDivisorDiario(dataAtual);

        const saldoText = `Saldo Restante: ${saldoRestante.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`;
        const gastoText = `Saldo Diário Disponível: ${gastoDiario.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`;
        const hidden = isResumoHidden();

        setResumoLineText(saldoRestanteEl, saldoText, hidden);
        setResumoLineText(gastoDiarioEl, gastoText, hidden);
        diasRestantesEl.textContent = diasRestantes > 0
            ? `Você tem ${diasRestantes} dias restantes até o final do mês vigente (sem contar hoje).`
            : 'Hoje é o último dia do mês.';

        atualizarGrafico();
    }

    // Função para atualizar o gráfico
    function atualizarGrafico() {
        const ctx = document.getElementById('gastosChart').getContext('2d');
        const recursos = obterValorNumerico(recursosInput);
        const meta = obterValorNumerico(metaInput);
        const gastos = [...(dados.gastos || [])]
            .filter(gasto => parseLocalDate(gasto.data))
            .sort((a, b) => parseLocalDate(a.data) - parseLocalDate(b.data));

        const gastosPorDia = obterMapaGastosPorDia(gastos);

        const datasOrdenadas = Object.keys(gastosPorDia).sort((a, b) => parseLocalDate(a) - parseLocalDate(b));
        const labels = datasOrdenadas.map(data => data.split('-')[2]);
        const values = datasOrdenadas.map(data => gastosPorDia[data]);
        const limitesPorDia = [];
        let saldoAntesDoDia = Math.max(recursos - meta, 0);

        datasOrdenadas.forEach(data => {
            const dataLancamento = parseLocalDate(data);
            const limiteDoDia = saldoAntesDoDia / obterDivisorDiario(dataLancamento);
            limitesPorDia.push(limiteDoDia);
            saldoAntesDoDia = Math.max(saldoAntesDoDia - gastosPorDia[data], 0);
        });

        // Determinar as cores das barras
        const backgroundColors = values.map((valor, index) => {
            const gastoDiarioPermitido = limitesPorDia[index] || 0;
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
                                const gastoDiarioPermitido = limitesPorDia[context.dataIndex] || 0;
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
    async function validarESubmeter(e) {
        e.preventDefault();  // Previne o comportamento padrão do formulário

        // Validação dos campos (meta agora é opcional)
        if (recursosInput.value.trim() === '' || dataInput.value.trim() === '' || gastoInput.value.trim() === '' || tipoGastoInput.value.trim() === '') {
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

        const meta = obterValorNumerico(metaInput); // Usa 0 se vazio
        const recursos = obterValorNumerico(recursosInput);
        const data = dataInput.value;
        const gasto = obterValorNumerico(gastoInput);
        const tipoGasto = tipoGastoInput.value; // Captura a categoria de gasto

        // Processamento do formulário
        dados.meta = meta;
        dados.recursos = recursos;
        dados.ultimaData = new Date().toISOString();
        dados.gastos = dados.gastos || [];
        dados.gastos.push({ data, valor: gasto, categoria: tipoGasto });  // Salva a categoria junto com os outros dados

        await window.AppDB.saveCurrentData(dados);

        const { saldoRestanteDoDia } = calcularLimiteDiarioDaData(data, dados.gastos, recursos, meta);
        const dataLancamentoFormatada = formatarDataBR(data);
        const hojeFormatado = formatarDataBR(new Date());
        const referenciaDia = dataLancamentoFormatada === hojeFormatado
            ? 'do saldo do dia de hoje'
            : `do saldo do dia ${dataLancamentoFormatada}`;

        if (saldoRestanteDoDia >= 0) {
            mostrarToastSaldoDia(
                `Você ainda possui ${saldoRestanteDoDia.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} ${referenciaDia} para consumir! Mantenha-se na meta!`,
                'success'
            );
        } else {
            mostrarToastSaldoDia(
                `Você ultrapassou ${Math.abs(saldoRestanteDoDia).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} ${referenciaDia}!`,
                'danger'
            );
        }

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
        const metaValue = dados.meta || 0;
        if (metaValue > 0) {
            doc.text(`Meta de Economia: ${metaValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`, 20, 40);
            doc.text(`Recursos Disponíveis: ${dados.recursos.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`, 20, 50);
        } else {
            doc.text(`Recursos Disponíveis: ${dados.recursos.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`, 20, 40);
        }

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

    exportarJsonBtn.addEventListener('click', async function () {
        const pendingInfo = await window.AppDB.getPendingExportInfo();
        if (pendingInfo && pendingInfo.pendingExportMonthKey) {
            const exportPending = confirm(
                `Existe exportação pendente do mês ${pendingInfo.pendingExportMonthKey}. Deseja exportar esse mês agora?`
            );
            if (exportPending) {
                const ok = await window.AppDB.exportMonthData(pendingInfo.pendingExportMonthKey);
                if (ok) {
                    await window.AppDB.clearPendingExport();
                    alert('Dados do mês anterior exportados com sucesso.');
                }
                return;
            }
        }

        if (!dados || !dados.monthKey) {
            dados = await window.AppDB.getCurrentData();
        }
        const exported = await window.AppDB.exportMonthData(dados.monthKey);
        if (exported) {
            alert('Dados do mês atual exportados com sucesso.');
        }
    });

    importarJsonBtn.addEventListener('click', function () {
        importarJsonInput.click();
    });

    importarJsonInput.addEventListener('change', async function (event) {
        const file = event.target.files && event.target.files[0];
        if (!file) return;

        try {
            const textContent = await file.text();
            const parsedJson = JSON.parse(textContent);
            const importedData = await window.AppDB.importMonthData(parsedJson);
            const currentMonthKey = await window.AppDB.getCurrentMonthKey();

            if (importedData.monthKey === currentMonthKey) {
                dados = await window.AppDB.getCurrentData();
                metaInput.value = dados.meta ? formatarMoedaBRL(dados.meta) : '';
                recursosInput.value = dados.recursos ? formatarMoedaBRL(dados.recursos) : '';
                atualizarResumo();
            }

            alert(`Importação concluída para o mês ${importedData.monthKey}.`);
        } catch (error) {
            console.error('Erro ao importar JSON:', error);
            alert('Não foi possível importar o arquivo. Verifique se o JSON é válido.');
        } finally {
            importarJsonInput.value = '';
        }
    });

    // -------------------------- FUNÇÕES DE TOGGLING --------------------------

    // 1. Toggling para Inputs (#meta e #recursos)
    // Função para alternar visibilidade dos inputs
    function toggleVisibility(inputId, iconId, storageKey) {
        const input = document.getElementById(inputId);
        const icon = document.getElementById(iconId);
        const isHidden = input.dataset.hidden === 'true';

        if (!isHidden) {
            input.dataset.hidden = 'true';
            input.style.webkitTextSecurity = 'disc';
            input.style.textSecurity = 'disc';
            icon.classList.replace('bi-eye', 'bi-eye-slash');
            localStorage.setItem(storageKey, "hidden");
        } else {
            input.dataset.hidden = 'false';
            input.style.webkitTextSecurity = 'none';
            input.style.textSecurity = 'none';
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
            input.dataset.hidden = 'true';
            input.style.webkitTextSecurity = 'disc';
            input.style.textSecurity = 'disc';
            icon.classList.replace('bi-eye', 'bi-eye-slash');
        } else {
            input.dataset.hidden = 'false';
            input.style.webkitTextSecurity = 'none';
            input.style.textSecurity = 'none';
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

    // 2. Toggling para Resumo (<p id="saldoRestante"> e <p id="gastoDiario">)
    function setResumoVisibility(hidden) {
        const icon = document.getElementById('ocultaMostraQsj');
        if (!icon) return;

        if (hidden) {
            icon.classList.replace('bi-eye', 'bi-eye-slash');
            localStorage.setItem(RESUMO_VISIBILITY_STORAGE_KEY, 'hidden');
        } else {
            icon.classList.replace('bi-eye-slash', 'bi-eye');
            localStorage.setItem(RESUMO_VISIBILITY_STORAGE_KEY, 'visible');
        }

        const saldoReal = saldoRestanteEl.dataset.realText || saldoRestanteEl.textContent || '';
        const gastoReal = gastoDiarioEl.dataset.realText || gastoDiarioEl.textContent || '';
        setResumoLineText(saldoRestanteEl, saldoReal, hidden);
        setResumoLineText(gastoDiarioEl, gastoReal, hidden);
    }

    // Adiciona evento de clique para o ícone de resumo
    document.getElementById('ocultaMostraQsj').addEventListener('click', function () {
        setResumoVisibility(!isResumoHidden());
    });

    // Restaura visibilidade ao carregar a página para o resumo
    setResumoVisibility(isResumoHidden());

    // -------------------------- FIM DAS FUNÇÕES DE TOGGLING --------------------------




    // Atualizar o resumo e gráfico na inicialização
    atualizarResumo();
});
