document.addEventListener('DOMContentLoaded', function () {
    const consultorIa = document.getElementById('consultorIa');

    function gerarConsultaFinanceira(event) {
        event.preventDefault();  // Evita que o link abra imediatamente

        const dados = JSON.parse(localStorage.getItem('controlegastos')) || {};

        if (!dados.gastos || dados.gastos.length === 0) {
            alert('Você precisa registrar seus gastos para que a IA possa fornecer uma análise financeira.');
            return;
        }

        const meta = dados.meta || 0;
        const recursos = dados.recursos || 0;
        const totalGastos = dados.gastos.reduce((sum, gasto) => sum + gasto.valor, 0);
        const saldoRestante = recursos - totalGastos;
        const ultimoGasto = dados.gastos[dados.gastos.length - 1];
        const dataUltimoGasto = ultimoGasto ? ultimoGasto.data : 'N/A';
        const valorUltimoGasto = ultimoGasto ? ultimoGasto.valor : 'N/A';

        const promptConsultor = `
            Dados Financeiros:
            - Meta: R$ ${meta.toLocaleString('pt-BR')}
            - Recursos Disponíveis: R$ ${recursos.toLocaleString('pt-BR')}
            - Total de Gastos até agora: R$ ${totalGastos.toLocaleString('pt-BR')}
            - Saldo Restante: R$ ${saldoRestante.toLocaleString('pt-BR')}
            - Último Gasto: R$ ${valorUltimoGasto} em ${dataUltimoGasto}
            
            Com base nesses dados, qual é o seu conselho financeiro para atingir a meta, considerando o saldo atual e o comportamento de gastos?`;

        navigator.clipboard.writeText(promptConsultor).then(function () {
            alert('Os dados foram copiados para a área de transferência! Agora, cole o texto no campo de entrada da IA.');

            // Após o alert ser fechado, a nova aba será aberta
            setTimeout(function () {
                window.open('https://chatgpt.com/', '_blank');
            }, 100);  // Sem atraso, só espera o alert ser fechado
        }).catch(function (err) {
            console.error('Erro ao copiar o prompt: ', err);
        });
    }

    consultorIa.addEventListener('click', gerarConsultaFinanceira);
});
