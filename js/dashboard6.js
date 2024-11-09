document.addEventListener('DOMContentLoaded', function () {
    // Função para agrupar dados por período
    function groupDataByPeriod(gastos, period) {
        return gastos.reduce((acc, item) => {
            let key;
            const date = new Date(item.data);

            switch (period) {
                case 'daily':
                    key = date.toISOString().split('T')[0];
                    break;
                case 'weekly':
                    const startOfYear = new Date(date.getFullYear(), 0, 1);
                    const daysSinceStartOfYear = (date - startOfYear) / (1000 * 60 * 60 * 24);
                    const weekNumber = Math.ceil((daysSinceStartOfYear + startOfYear.getDay() + 1) / 7);
                    key = `Semana ${weekNumber}`;
                    break;
                case 'biweekly':
                    key = date.getDate() <= 15 ? '1ª Quinzena' : '2ª Quinzena';
                    break;
                default:
                    key = date.toLocaleString('default', { month: 'short' });
            }

            if (!acc[key]) {
                acc[key] = { label: key, value: 0 };
            }
            acc[key].value += item.valor;
            return acc;
        }, {});
    }

    document.getElementById('financeDashboardModal').addEventListener('show.bs.modal', function () {
        const storedData = JSON.parse(localStorage.getItem('controlegastos'));
        const { gastos, meta, ultimaData } = storedData;

        // Limpar gráficos existentes
        const categChart = Chart.getChart("financeCategChart");
        const monthChart = Chart.getChart("financeMonthChart");
        if (categChart) categChart.destroy();
        if (monthChart) monthChart.destroy();

        // Render Category Chart
        const spendingByCategory = gastos.reduce((acc, item) => {
            if (!acc[item.categoria]) {
                acc[item.categoria] = { label: item.categoria, value: 0 };
            }
            acc[item.categoria].value += item.valor;
            return acc;
        }, {});
        const categoryChartData = Object.values(spendingByCategory);

        new Chart(document.getElementById('financeCategChart'), {
            type: 'pie',
            data: {
                labels: categoryChartData.map(item => item.label),
                datasets: [{
                    data: categoryChartData.map(item => item.value),
                    backgroundColor: categoryChartData.map(() =>
                        `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`)
                }]
            }
        });

        // Função para atualizar o gráfico de barras
        function updateBarChart(period) {
            const groupedData = groupDataByPeriod(gastos, period);
            const sortedData = Object.values(groupedData).sort((a, b) =>
                new Date(a.label) - new Date(b.label));

            new Chart(document.getElementById('financeMonthChart'), {
                type: 'bar',
                data: {
                    labels: sortedData.map(item => item.label),
                    datasets: [{
                        label: 'Gastos por Período',
                        data: sortedData.map(item => item.value),
                        backgroundColor: '#8884d8',
                        borderColor: '#8884d8',
                        borderWidth: 1
                    }]
                },
                options: {
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function (value) {
                                    return new Intl.NumberFormat('pt-BR', {
                                        style: 'currency',
                                        currency: 'BRL'
                                    }).format(value);
                                }
                            }
                        }
                    },
                    plugins: {
                        tooltip: {
                            callbacks: {
                                label: function (context) {
                                    return new Intl.NumberFormat('pt-BR', {
                                        style: 'currency',
                                        currency: 'BRL'
                                    }).format(context.raw);
                                }
                            }
                        }
                    }
                }
            });
        }

        // Inicializar o gráfico de barras com a visualização diária
        updateBarChart('daily');

        // Adicionar event listeners para os botões de filtro com as opções Diário, Semanal e Quinzenal
        document.querySelectorAll('[data-period]').forEach(button => {
            if (['daily', 'weekly', 'biweekly'].includes(button.dataset.period)) {
                button.addEventListener('click', function () {
                    document.querySelectorAll('[data-period]').forEach(btn =>
                        btn.classList.remove('active'));
                    this.classList.add('active');

                    const period = this.dataset.period;
                    const monthChart = Chart.getChart("financeMonthChart");
                    if (monthChart) monthChart.destroy();
                    updateBarChart(period);
                });
            } else {
                button.style.display = 'none'; // Ocultar botão de filtro Mensal
            }
        });

        // Render Overview Cards
        document.getElementById('financeDashMeta').textContent =
            new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
                .format(meta);

        // Exibir o total de gastos no card de Meta Mensal
        const totalGastos = JSON.parse(localStorage.getItem('totalGastos'));
        document.getElementById('financeDashMeta').textContent =
            new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
                .format(totalGastos);

        // Exibir o saldo restante no card de Recursos Disponíveis
        const saldoRestante = JSON.parse(localStorage.getItem('saldoRestante'));
        document.getElementById('financeDashResources').textContent =
            new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
                .format(saldoRestante);

        document.getElementById('financeDashLastUpdate').textContent =
            new Date(ultimaData).toLocaleString();
    });
});
