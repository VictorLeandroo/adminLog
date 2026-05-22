<template>
    <div class="dashboard-container premium-page min-vh-100">
        <div class="container py-1">
            <section class="dash-hero">
                <div>
                    <span class="eyebrow">Resumo do mês</span>
                    <h4>{{ formatMoney(finalBalance) }}</h4>
                    <p>{{ monthLabel }} • {{ totalRoutes }} rotas • {{ formatKm(totalKm) }} km rodados</p>
                </div>

                <div class="hero-badge" :class="{ negative: finalBalance < 0 }">
                    <i class="fa-solid" :class="finalBalance >= 0 ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down'"></i>
                    {{ finalBalance >= 0 ? 'Positivo' : 'Negativo' }}
                </div>
            </section>

            <section class="quick-grid">
                <article class="quick-card income">
                    <small>Ganhos</small>
                    <strong>{{ formatMoney(totalRevenue) }}</strong>
                    <span>Entradas registradas</span>
                </article>

                <article class="quick-card expense">
                    <small>Gastos</small>
                    <strong>{{ formatMoney(totalExpenses) }}</strong>
                    <span>Despesas do mês</span>
                </article>

                <article class="quick-card balance">
                    <small>Lucro</small>
                    <strong>{{ formatMoney(finalBalance) }}</strong>
                    <span>Antes das reservas</span>
                </article>

                <article class="quick-card city">
                    <small>Cidade mais frequente</small>
                    <strong>{{ topCity.name }}</strong>
                    <span>{{ topCity.count }} visita(s)</span>
                </article>
            </section>

            <section class="insight-strip">
                <div>
                    <small>1 quinzena</small>
                    <strong>{{ formatMoney(firstHalfBalance) }}</strong>
                </div>
                <div>
                    <small>2 quinzena</small>
                    <strong>{{ formatMoney(secondHalfBalance) }}</strong>
                </div>
                <div>
                    <small>Média por rota</small>
                    <strong>{{ formatMoney(averagePerRoute) }}</strong>
                </div>
            </section>

            <section class="chart-card city-frequency">
                <div class="section-head">
                    <div>
                            <span class="eyebrow">Operação</span>
                            <h5>Frequência por cidade</h5>
                    </div>
                    <span>{{ cityFrequency.length }} cidades</span>
                </div>

                <div class="chart-wrapper city-chart">
                    <Bar v-if="cityFrequency.length" :data="cityFrequencyChartData" :options="cityChartOptions" />
                    <div v-else class="empty-chart">
                        <i class="fa-solid fa-location-dot"></i>
                        <p>Nenhuma cidade registrada ainda</p>
                    </div>
                </div>
            </section>

            <section class="dashboard-stack">
                <article class="chart-card">
                    <div class="section-head">
                        <div>
                            <span class="eyebrow">Financeiro</span>
                            <h5>Ganhos x gastos</h5>
                        </div>
                    </div>

                    <div class="chart-wrapper">
                        <Doughnut :data="gainVsExpenseChartData" :options="doughnutOptions" />
                    </div>
                </article>

                <article class="focus-card">
                    <div class="section-head">
                        <div>
                            <span class="eyebrow">Atenção</span>
                            <h5>Maiores gastos</h5>
                        </div>
                    </div>

                    <div class="expense-line" v-for="expense in topExpenses" :key="expense.category">
                        <div>
                            <strong>{{ expense.category }}</strong>
                            <small>{{ expense.count }} lancamento(s)</small>
                        </div>
                        <span>{{ formatMoney(expense.total) }}</span>
                    </div>

                    <div v-if="!topExpenses.length" class="soft-empty-state compact">
                        <span class="empty-icon">
                            <i class="fa-solid fa-receipt"></i>
                        </span>
                        <div>
                            <strong>Nenhum gasto no período</strong>
                            <p>Quando houver despesas lançadas, as maiores categorias aparecem aqui.</p>
                        </div>
                    </div>
                </article>
            </section>
        </div>
    </div>
</template>

<script>
import {
    Chart as ChartJS,
    Title,
    Tooltip,
    Legend,
    BarElement,
    CategoryScale,
    LinearScale,
    ArcElement
} from 'chart.js'
import { Bar, Doughnut } from 'vue-chartjs'
import { getDashboardData, money } from '@/services/backendService'

ChartJS.register(Title, Tooltip, Legend, ArcElement, BarElement, CategoryScale, LinearScale)

export default {
    name: 'DashboardView',

    components: { Bar, Doughnut },

    data() {
        return {
            dashboard: {
                totalRevenue: 0,
                totalExpenses: 0,
                finalBalance: 0,
                totalRoutes: 0,
                totalKm: 0,
                averagePerRoute: 0,
                firstHalfBalance: 0,
                secondHalfBalance: 0,
                cityFrequency: [],
                topCity: { name: 'Sem dados', count: 0 },
                topExpenses: []
            },
            selectedMonth: new Date().getMonth() + 1,
            selectedYear: new Date().getFullYear(),
            months: [
                { value: 1, label: 'Jan' },
                { value: 2, label: 'Fev' },
                { value: 3, label: 'Mar' },
                { value: 4, label: 'Abr' },
                { value: 5, label: 'Mai' },
                { value: 6, label: 'Jun' },
                { value: 7, label: 'Jul' },
                { value: 8, label: 'Ago' },
                { value: 9, label: 'Set' },
                { value: 10, label: 'Out' },
                { value: 11, label: 'Nov' },
                { value: 12, label: 'Dez' }
            ],
            doughnutOptions: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '72%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            usePointStyle: true,
                            boxWidth: 8,
                            padding: 14
                        }
                    }
                }
            },
            cityChartOptions: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        ticks: { precision: 0 }
                    },
                    y: {
                        ticks: {
                            font: { size: 11 }
                        }
                    }
                }
            }
        }
    },

    mounted() {
        this.fetchDashboardData()
    },

    computed: {
        monthLabel() {
            const month = this.months.find(item => item.value === this.selectedMonth)?.label
            return `${month}/${this.selectedYear}`
        },

        totalRevenue() {
            return this.dashboard.totalRevenue
        },

        totalExpenses() {
            return this.dashboard.totalExpenses
        },

        finalBalance() {
            return this.dashboard.finalBalance
        },

        totalRoutes() {
            return this.dashboard.totalRoutes
        },

        totalKm() {
            return this.dashboard.totalKm
        },

        averagePerRoute() {
            return this.dashboard.averagePerRoute
        },

        firstHalfBalance() {
            return this.dashboard.firstHalfBalance
        },

        secondHalfBalance() {
            return this.dashboard.secondHalfBalance
        },

        cityFrequency() {
            return this.dashboard.cityFrequency
        },

        topCity() {
            return this.dashboard.topCity
        },

        topExpenses() {
            return this.dashboard.topExpenses
        },

        cityFrequencyChartData() {
            return {
                labels: this.cityFrequency.map(city => city.name),
                datasets: [
                    {
                        data: this.cityFrequency.map(city => city.value),
                        backgroundColor: '#62a8ff',
                        borderRadius: 8,
                        barThickness: 18
                    }
                ]
            }
        },

        gainVsExpenseChartData() {
            return {
                labels: ['Ganhos', 'Gastos'],
                datasets: [
                    {
                        data: [this.totalRevenue, this.totalExpenses],
                        backgroundColor: ['#16a34a', '#ef4444'],
                        borderWidth: 0
                    }
                ]
            }
        }
    },

    methods: {
        async fetchDashboardData() {
            try {
                this.dashboard = await getDashboardData({
                    month: this.selectedMonth,
                    year: this.selectedYear
                })
            } catch (error) {
                console.error(error)
            }
        },

        formatMoney(value) {
            return money(value)
        },

        formatKm(value) {
            return Number(value || 0).toLocaleString('pt-BR')
        }
    }
}
</script>

<style scoped>
.dash-hero,
.quick-card,
.insight-strip,
.chart-card,
.focus-card {
    border: 1px solid var(--border-soft);
    background: var(--surface-card);
    box-shadow: var(--shadow-soft);
}

.dash-hero {
    border-radius: 24px;
    padding: 22px;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 14px;
    background:
        radial-gradient(circle at top right, rgba(var(--primary-color-rgb), 0.2), transparent 42%),
        linear-gradient(145deg, var(--surface-card), var(--surface-strong));
}

.eyebrow {
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--primary-color);
    font-size: 11px;
    font-weight: 800;
}

.dash-hero h4 {
    margin: 4px 0;
    color: var(--text-strong);
    font-size: clamp(30px, 8vw, 46px);
    line-height: 1;
}

.dash-hero p,
.quick-card small,
.quick-card span,
.section-head span,
.expense-line small {
    color: var(--text-muted);
}

.hero-badge {
    border-radius: 999px;
    padding: 8px 11px;
    color: #16a34a;
    background: rgba(22, 163, 74, 0.14);
    font-weight: 800;
    white-space: nowrap;
}

.hero-badge.negative {
    color: #ef4444;
    background: rgba(239, 68, 68, 0.14);
}

.quick-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
    margin: 12px 0;
}

.quick-card {
    border-radius: 18px;
    padding: 16px;
    min-width: 0;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.quick-card:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-elevated);
}

.quick-card strong {
    display: block;
    color: var(--text-strong);
    font-size: 20px;
    line-height: 1.08;
    margin: 6px 0;
    overflow-wrap: anywhere;
}

.quick-card.income strong {
    color: #16a34a;
}

.quick-card.expense strong {
    color: #ef4444;
}

.quick-card.balance strong,
.quick-card.city strong {
    color: var(--primary-color);
}

.insight-strip {
    border-radius: 20px;
    padding: 10px;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
    margin-bottom: 12px;
}

.insight-strip div {
    background: var(--surface-muted);
    border-radius: 14px;
    padding: 10px;
}

.insight-strip small {
    display: block;
    color: var(--text-muted);
    font-size: 11px;
}

.insight-strip strong {
    display: block;
    color: var(--text-strong);
    font-size: 14px;
    margin-top: 3px;
    overflow-wrap: anywhere;
}

.chart-card,
.focus-card {
    border-radius: 18px;
    padding: 18px;
    min-width: 0;
    overflow: hidden;
}

.city-frequency {
    margin-bottom: 12px;
}

.section-head {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    align-items: flex-start;
    margin-bottom: 12px;
}

.section-head h5 {
    margin: 0;
    color: var(--text-strong);
}

.chart-wrapper {
    position: relative;
    width: 100%;
    max-width: 100%;
    height: 230px;
    overflow: hidden;
}

.city-chart {
    height: 250px;
}

.dashboard-stack {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.expense-line {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    padding: 12px 0;
    border-bottom: 1px solid var(--border-soft);
}

.expense-line:hover {
    background: var(--surface-muted);
    border-radius: 12px;
    padding-left: 10px;
    padding-right: 10px;
}

.expense-line:last-child {
    border-bottom: 0;
}

.expense-line strong {
    display: block;
    color: var(--text-strong);
}

.expense-line span {
    color: #ef4444;
    font-weight: 900;
    white-space: nowrap;
}

.empty-chart,
.soft-empty-state {
    height: 100%;
    border-radius: 18px;
    background: var(--surface-muted);
    color: var(--text-muted);
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
}

.empty-chart {
    flex-direction: column;
    border: 1px dashed var(--border-soft);
}

.empty-chart i {
    color: var(--primary-color);
    font-size: 24px;
    margin-bottom: 8px;
}

.soft-empty-state {
    min-height: 150px;
    padding: 18px;
    gap: 12px;
    text-align: left;
    justify-content: flex-start;
    border: 1px dashed var(--border-soft);
}

.soft-empty-state.compact {
    min-height: 168px;
}

.empty-icon {
    width: 44px;
    height: 44px;
    border-radius: 14px;
    background: var(--primary-soft);
    color: var(--primary-color);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;
}

.soft-empty-state strong {
    display: block;
    color: var(--text-strong);
    font-size: 15px;
}

.soft-empty-state p {
    color: var(--text-muted);
    margin-top: 3px;
    line-height: 1.35;
}

@media (min-width: 820px) {
    .quick-grid {
        grid-template-columns: repeat(4, minmax(0, 1fr));
    }

    .dashboard-stack {
        grid-template-columns: 0.9fr 1.1fr;
    }
}

@media (max-width: 420px) {
    .dash-hero {
        flex-direction: column;
    }

    .hero-badge {
        align-self: flex-start;
    }

    .quick-grid,
    .insight-strip {
        grid-template-columns: 1fr;
    }

    .chart-wrapper {
        height: 220px;
    }
}
</style>
