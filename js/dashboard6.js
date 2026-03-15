document.addEventListener('DOMContentLoaded', async function () {
    await window.AppDB.ready();

    const RESUMO_VISIBILITY_STORAGE_KEY = 'financeVisibility';
    const DASH_MASK_TOKEN = '******';

    function isValuesHidden() {
        return localStorage.getItem(RESUMO_VISIBILITY_STORAGE_KEY) === 'hidden';
    }

    function formatCurrencyBRL(value) {
        if (isValuesHidden()) return `R$ ${DASH_MASK_TOKEN}`;
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    }

    function parseLocalDate(dateValue) {
        if (!dateValue) return null;
        if (dateValue instanceof Date) {
            const d = new Date(dateValue);
            d.setHours(0, 0, 0, 0);
            return d;
        }

        const raw = String(dateValue).trim();
        const isoDateOnly = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (isoDateOnly) {
            const year = Number(isoDateOnly[1]);
            const month = Number(isoDateOnly[2]) - 1;
            const day = Number(isoDateOnly[3]);
            const d = new Date(year, month, day);
            d.setHours(0, 0, 0, 0);
            return d;
        }

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

    function toLocalISODateString(date) {
        const pad = (n) => String(n).padStart(2, '0');
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    }

    // Função para agrupar dados por período
    function groupDataByPeriod(gastos, period) {
        return gastos.reduce((acc, item) => {
            let key;
            const date = parseLocalDate(item.data);
            if (!date) return acc;

            switch (period) {
                case 'daily':
                    key = toLocalISODateString(date);
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

    document.getElementById('financeDashboardModal').addEventListener('show.bs.modal', async function () {
        const storedData = await window.AppDB.getCurrentData();
        const gastos = storedData?.gastos || [];
        const { meta, recursos, ultimaData } = storedData;

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
            },
            options: {
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                const label = context.label || '';
                                return `${label}: ${formatCurrencyBRL(context.raw)}`;
                            }
                        }
                    }
                }
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
                                    return formatCurrencyBRL(value);
                                }
                            }
                        }
                    },
                    plugins: {
                        tooltip: {
                            callbacks: {
                                label: function (context) {
                                    return formatCurrencyBRL(context.raw);
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
        const totalGastos = gastos.reduce((sum, item) => sum + item.valor, 0);
        const saldoRestante = (Number(recursos) || 0) - totalGastos;

        document.getElementById('financeDashMeta').textContent =
            formatCurrencyBRL(totalGastos);

        document.getElementById('financeDashResources').textContent =
            formatCurrencyBRL(saldoRestante);

        document.getElementById('financeDashLastUpdate').textContent =
            ultimaData ? new Date(ultimaData).toLocaleString() : '-';
    });
});
