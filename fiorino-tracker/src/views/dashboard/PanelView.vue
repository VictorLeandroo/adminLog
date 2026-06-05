<template>
    <div class="dashboard-container premium-page min-vh-100">
        <div class="container py-1">
            <section class="executive-toolbar">
                <div>
                    <span class="eyebrow">Painel executivo</span>
                    <h4>Fiorino Tracker</h4>
                    <p>{{ dashboardPeriodLabel }} - gestao financeira, frota e operacao</p>
                </div>
                <button class="refresh-btn" type="button" @click="fetchDashboardData">
                    <i class="fa-solid fa-rotate-right"></i>
                    Atualizar
                </button>
            </section>

            <div v-if="isLoading" class="dashboard-skeleton">
                <div v-for="item in 10" :key="item" class="skeleton-card"></div>
            </div>

            <template v-else>
                <section class="finance-hero" :class="hero.status">
                    <div class="hero-main">
                        <span class="eyebrow">Lucro liquido do mes</span>
                        <strong>{{ formatMoney(hero.netProfit) }}</strong>
                        <p>
                            Receita {{ formatMoney(hero.totalRevenue) }} -
                            despesas {{ formatMoney(hero.totalExpenses) }} -
                            margem {{ formatPercent(hero.margin) }}
                        </p>
                        <div class="hero-metrics">
                            <div>
                                <small>Receita total</small>
                                <span>{{ formatMoney(hero.totalRevenue) }}</span>
                            </div>
                            <div>
                                <small>Despesas totais</small>
                                <span>{{ formatMoney(hero.totalExpenses) }}</span>
                            </div>
                            <div>
                                <small>Margem</small>
                                <span>{{ formatPercent(hero.margin) }}</span>
                            </div>
                        </div>
                    </div>
                    <div class="hero-side">
                        <div class="status-pill">
                            <i class="fa-solid" :class="heroIcon"></i>
                            {{ heroStatusLabel }}
                        </div>
                        <small>Comparativo mes anterior</small>
                        <strong>{{ trendLabel(hero.previousMonth) }}</strong>
                    </div>
                </section>

                <section class="health-row">
                    <article class="health-card" :class="health.status">
                        <div>
                            <span class="eyebrow">Saude da empresa</span>
                            <h5>{{ health.label }}</h5>
                            <p>Score geral considerando lucro, margem, reservas, frota e pendencias.</p>
                        </div>
                        <div class="score-ring">
                            <strong>{{ health.score }}</strong>
                            <span>/100</span>
                        </div>
                    </article>

                    <article class="distribution-card">
                        <div class="section-head compact">
                            <div>
                                <span class="eyebrow">Sobra inteligente</span>
                                <h5>Distribuicao sugerida</h5>
                            </div>
                        </div>
                        <div class="distribution-list">
                            <div v-for="item in financialBoxes.suggestedDistribution" :key="item.label">
                                <span>{{ item.label }}</span>
                                <strong>{{ formatMoney(item.value) }}</strong>
                            </div>
                        </div>
                    </article>
                </section>

                <section class="operations-summary">
                    <div class="section-head">
                        <div>
                            <span class="eyebrow">Operacao do mes</span>
                            <h5>Indicadores principais</h5>
                        </div>
                    </div>

                    <div class="primary-kpis">
                        <article v-for="item in primaryKpiCards" :key="item.label" class="metric-card featured"
                            :class="item.tone">
                            <span class="metric-icon" :class="item.tone">
                                <i class="fa-solid" :class="item.icon"></i>
                            </span>
                            <div>
                                <small>{{ item.label }}</small>
                                <strong>{{ item.value }}</strong>
                                <em>{{ item.hint }}</em>
                            </div>
                        </article>
                    </div>

                    <div class="secondary-kpis">
                        <div v-for="item in secondaryKpiCards" :key="item.label" class="mini-metric">
                            <span>{{ item.label }}</span>
                            <strong>{{ item.value }}</strong>
                        </div>
                    </div>
                </section>

                <section class="dashboard-grid operation-row">
                    <article class="panel-card city-frequency">
                        <div class="section-head">
                            <div>
                                <span class="eyebrow">Operacao</span>
                                <h5>Idas por cidade</h5>
                            </div>
                            <span>{{ cityFrequency.length }} cidade(s)</span>
                        </div>
                        <div class="chart-wrapper city-chart">
                            <Bar v-if="cityFrequency.length" :data="cityFrequencyChartData"
                                :options="cityChartOptions" />
                            <div v-else class="empty-chart">
                                <i class="fa-solid fa-location-dot"></i>
                                <strong>Nenhuma cidade registrada</strong>
                                <p>As cidades aparecem quando rotas concluidas tiverem cidades informadas.</p>
                            </div>
                        </div>
                    </article>

                    <article class="panel-card top-expenses-card">
                        <div class="section-head">
                            <div>
                                <span class="eyebrow">Onde perde dinheiro</span>
                                <h5>Maiores gastos</h5>
                            </div>
                        </div>
                        <div v-if="topExpenses.length" class="expense-stack">
                            <div v-for="expense in topExpenses.slice(0, 5)" :key="expense.category"
                                class="expense-line">
                                <div>
                                    <strong>{{ expense.category }}</strong>
                                    <small>{{ expense.count }} lancamento(s)</small>
                                </div>
                                <span>{{ formatMoney(expense.total) }}</span>
                            </div>
                        </div>
                        <div v-else class="empty-state compact">
                            <i class="fa-solid fa-receipt"></i>
                            <strong>Nenhum gasto no periodo</strong>
                        </div>
                    </article>
                </section>

                <section class="dashboard-grid two-columns">
                    <article class="panel-card alerts-card">
                        <div class="section-head">
                            <div>
                                <span class="eyebrow">Centro de alertas</span>
                                <h5>Pendencias e riscos</h5>
                            </div>
                            <span>{{ alerts.length }} alerta(s)</span>
                        </div>
                        <div v-if="alerts.length" class="alerts-list">
                            <div v-for="alert in alerts.slice(0, 8)" :key="alert.id" class="alert-line"
                                :class="alert.severity">
                                <span></span>
                                <div>
                                    <strong>{{ alert.title }}</strong>
                                    <small>{{ alert.description }}</small>
                                </div>
                                <em>{{ severityLabel(alert.severity) }}</em>
                            </div>
                        </div>
                        <div v-else class="empty-state">
                            <i class="fa-solid fa-circle-check"></i>
                            <strong>Nenhuma pendencia critica</strong>
                            <p>Seguro, documentos, rotas e reservas estao sem alertas relevantes.</p>
                        </div>
                    </article>

                    <article class="panel-card">
                        <div class="section-head">
                            <div>
                                <span class="eyebrow">Caixas financeiras</span>
                                <h5>Reservas e fundos</h5>
                            </div>
                        </div>
                        <div class="fund-list">
                            <div v-for="box in financialBoxes.boxes" :key="box.key" class="fund-line">
                                <div>
                                    <strong>{{ box.label }}</strong>
                                    <small>{{ box.locked ? 'Distribuicao limitada ate bater a meta' : `Meta
                                        ${formatMoney(box.target)}` }}</small>
                                </div>
                                <div class="fund-value">
                                    <strong>{{ formatMoney(box.value) }}</strong>
                                    <span><i :style="{ width: progressWidth(box.progress) }"></i></span>
                                </div>
                            </div>
                        </div>
                    </article>
                </section>
                <section class="dashboard-grid">
                    <article class="panel-card">
                        <div class="section-head">
                            <div>
                                <span class="eyebrow">DRE por veiculo</span>
                                <h5>Performance real das Fiorinos</h5>
                            </div>
                        </div>
                        <div v-if="vehiclesPerformance.length" class="vehicle-table-wrap">
                            <table class="vehicle-table">
                                <thead>
                                    <tr>
                                        <th>Fiorino</th>
                                        <th>Receita</th>
                                        <th>Custos</th>
                                        <th>Lucro</th>
                                        <th>Margem</th>
                                        <th>KM</th>
                                        <th>Custo/KM</th>
                                        <th>Receita/KM</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="vehicle in vehiclesPerformance" :key="vehicle.id">
                                        <td>
                                            <strong>{{ vehicle.plate }}</strong>
                                            <small>{{ vehicle.model }} - {{ vehicle.driver?.name || 'Sem motorista'
                                            }}</small>
                                        </td>
                                        <td>{{ formatMoney(vehicle.revenue) }}</td>
                                        <td>
                                            {{ formatMoney(vehicle.costs.total) }}
                                            <small>Comb. {{ formatMoney(vehicle.costs.fuel) }} - Ped. {{
                                                formatMoney(vehicle.costs.toll) }}</small>
                                        </td>
                                        <td
                                            :class="{ positive: vehicle.netProfit >= 0, negative: vehicle.netProfit < 0 }">
                                            {{ formatMoney(vehicle.netProfit) }}
                                        </td>
                                        <td>{{ formatPercent(vehicle.margin) }}</td>
                                        <td>{{ formatKm(vehicle.km) }}</td>
                                        <td>{{ formatMoney(vehicle.costPerKm) }}</td>
                                        <td>{{ formatMoney(vehicle.revenuePerKm) }}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <div v-else class="empty-state">
                            <i class="fa-solid fa-truck-fast"></i>
                            <strong>Nenhum veiculo com dados no periodo</strong>
                            <p>Rotas concluidas e custos vinculados aos veiculos formam a DRE.</p>
                        </div>
                    </article>

                </section>

                <section class="dashboard-grid charts-grid">
                    <article class="panel-card">
                        <div class="section-head">
                            <div>
                                <span class="eyebrow">Financeiro</span>
                                <h5>Receita x despesas</h5>
                            </div>
                        </div>
                        <div class="chart-wrapper">
                            <Bar v-if="charts.monthly.length" :data="monthlyChartData" :options="barOptions" />
                            <div v-else class="empty-chart">Sem historico mensal</div>
                        </div>
                    </article>

                    <article class="panel-card">
                        <div class="section-head">
                            <div>
                                <span class="eyebrow">Custos</span>
                                <h5>Despesas por categoria</h5>
                            </div>
                        </div>
                        <div class="chart-wrapper">
                            <Doughnut v-if="charts.expensesByCategory.length" :data="expenseChartData"
                                :options="doughnutOptions" />
                            <div v-else class="empty-chart">Sem despesas no periodo</div>
                        </div>
                    </article>

                    <article class="panel-card">
                        <div class="section-head">
                            <div>
                                <span class="eyebrow">Frota</span>
                                <h5>Lucro por veiculo</h5>
                            </div>
                        </div>
                        <div class="chart-wrapper">
                            <Bar v-if="charts.profitByVehicle.length" :data="profitVehicleChartData"
                                :options="horizontalBarOptions" />
                            <div v-else class="empty-chart">Sem lucro por veiculo</div>
                        </div>
                    </article>

                    <article class="panel-card">
                        <div class="section-head">
                            <div>
                                <span class="eyebrow">Reserva</span>
                                <h5>Evolucao projetada</h5>
                            </div>
                        </div>
                        <div class="chart-wrapper">
                            <Line v-if="charts.reserveEvolution.length" :data="reserveChartData"
                                :options="lineOptions" />
                            <div v-else class="empty-chart">Sem evolucao de reserva</div>
                        </div>
                    </article>
                </section>

                <section class="dashboard-grid two-columns">
                    <article class="panel-card">
                        <div class="section-head">
                            <div>
                                <span class="eyebrow">Motoristas</span>
                                <h5>Ranking operacional</h5>
                            </div>
                        </div>
                        <div v-if="driversRanking.length" class="driver-list">
                            <div v-for="driver in driversRanking.slice(0, 6)" :key="driver.id" class="driver-line">
                                <div>
                                    <strong>{{ driver.name }}</strong>
                                    <small>{{ driver.vehicle }}</small>
                                </div>
                                <div class="driver-stats">
                                    <span>{{ driver.completedRoutes }} rotas</span>
                                    <span>{{ formatKm(driver.km) }} km</span>
                                    <strong>{{ driver.score }}</strong>
                                </div>
                            </div>
                        </div>
                        <div v-else class="empty-state compact">
                            <i class="fa-solid fa-id-card"></i>
                            <strong>Nenhum motorista no ranking</strong>
                        </div>
                    </article>

                    <article class="panel-card insights-card">
                        <div class="section-head">
                            <div>
                                <span class="eyebrow">Insights do mes</span>
                                <h5>Leituras automaticas</h5>
                            </div>
                        </div>
                        <div class="insight-list">
                            <div v-for="insight in insights" :key="`${insight.title}-${insight.text}`"
                                class="insight-line" :class="insight.tone">
                                <i class="fa-solid" :class="insightIcon(insight.tone)"></i>
                                <div>
                                    <strong>{{ insight.title }}</strong>
                                    <small>{{ insight.text }}</small>
                                </div>
                            </div>
                        </div>
                    </article>
                </section>
            </template>
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
    ArcElement,
    LineElement,
    PointElement
} from 'chart.js'
import { Bar, Doughnut, Line } from 'vue-chartjs'
import { getExecutiveDashboardData, money } from '@/services/backendService'

ChartJS.register(Title, Tooltip, Legend, ArcElement, BarElement, CategoryScale, LinearScale, LineElement, PointElement)

export default {
    name: 'DashboardView',

    components: { Bar, Doughnut, Line },

    data() {
        return {
            isLoading: false,
            selectedMonth: new Date().getMonth() + 1,
            selectedYear: new Date().getFullYear(),
            dashboard: this.emptyDashboard(),
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
            barOptions: this.baseBarOptions(),
            horizontalBarOptions: { ...this.baseBarOptions(), indexAxis: 'y' },
            lineOptions: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: this.chartScales()
            },
            doughnutOptions: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '68%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { usePointStyle: true, boxWidth: 8, padding: 12, color: '#9ca3af' }
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
                scales: this.chartScales()
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

        dashboardPeriodLabel() {
            const period = this.summary.period
            if (!period?.month || !period?.year) return this.monthLabel
            const month = this.months.find(item => item.value === period.month)?.label
            return `${month}/${period.year}`
        },

        summary() {
            return this.dashboard.summary || this.emptyDashboard().summary
        },

        hero() {
            return this.summary.hero
        },

        health() {
            return this.summary.health
        },

        financialBoxes() {
            return this.dashboard.financialBoxes || this.summary.financialBoxes
        },

        vehiclesPerformance() {
            return this.dashboard.vehiclesPerformance || []
        },

        alerts() {
            return this.dashboard.alerts || []
        },

        driversRanking() {
            return this.dashboard.driversRanking || []
        },

        charts() {
            return this.dashboard.charts || this.emptyDashboard().charts
        },

        insights() {
            return this.dashboard.insights || []
        },

        cityFrequency() {
            return this.summary.cityFrequency || []
        },

        topExpenses() {
            return this.summary.topExpenses || []
        },

        heroStatusLabel() {
            return {
                positive: 'Positivo',
                attention: 'Atencao',
                negative: 'Negativo'
            }[this.hero.status] || 'Sem dados'
        },

        heroIcon() {
            return {
                positive: 'fa-arrow-trend-up',
                attention: 'fa-triangle-exclamation',
                negative: 'fa-arrow-trend-down'
            }[this.hero.status] || 'fa-circle-info'
        },

        primaryKpiCards() {
            const kpis = this.summary.kpis
            return [
                { label: 'Rotas concluidas', value: kpis.completedRoutes, hint: `${kpis.inProgressRoutes} em andamento`, icon: 'fa-flag-checkered', tone: 'green' },
                { label: 'KM rodado', value: this.formatKm(kpis.totalKm), hint: `${this.formatKm(kpis.averageKmPerRoute)} km por rota`, icon: 'fa-gauge-high', tone: 'blue' },
                { label: 'Receita por KM', value: this.formatMoney(kpis.revenuePerKm), hint: `${this.formatMoney(kpis.averageRevenuePerRoute)} por rota`, icon: 'fa-sack-dollar', tone: 'green' },
                { label: 'Custo por KM', value: this.formatMoney(kpis.costPerKm), hint: `${kpis.pendingReviewRoutes} rota(s) em revisao`, icon: 'fa-coins', tone: kpis.pendingReviewRoutes ? 'yellow' : 'red' }
            ]
        },

        secondaryKpiCards() {
            const kpis = this.summary.kpis
            return [
                { label: 'Veiculos ativos', value: kpis.activeVehicles },
                { label: 'Em manutencao', value: kpis.maintenanceVehicles },
                { label: 'Motoristas ativos', value: kpis.activeDrivers },
                { label: 'Aguardando revisao', value: kpis.pendingReviewRoutes }
            ]
        },

        monthlyChartData() {
            return {
                labels: this.charts.monthly.map(item => item.month),
                datasets: [
                    { label: 'Receita', data: this.charts.monthly.map(item => item.revenue), backgroundColor: '#22c55e', borderRadius: 8 },
                    { label: 'Despesas', data: this.charts.monthly.map(item => item.expenses), backgroundColor: '#ef4444', borderRadius: 8 },
                    { label: 'Lucro', data: this.charts.monthly.map(item => item.profit), backgroundColor: '#62a8ff', borderRadius: 8 }
                ]
            }
        },

        expenseChartData() {
            return {
                labels: this.charts.expensesByCategory.map(item => item.category),
                datasets: [
                    {
                        data: this.charts.expensesByCategory.map(item => item.total),
                        backgroundColor: ['#ef4444', '#f59e0b', '#62a8ff', '#22c55e', '#a855f7', '#14b8a6', '#f97316'],
                        borderWidth: 0
                    }
                ]
            }
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

        profitVehicleChartData() {
            return {
                labels: this.charts.profitByVehicle.map(item => item.label),
                datasets: [
                    {
                        data: this.charts.profitByVehicle.map(item => item.value),
                        backgroundColor: this.charts.profitByVehicle.map(item => item.value >= 0 ? '#22c55e' : '#ef4444'),
                        borderRadius: 8
                    }
                ]
            }
        },

        reserveChartData() {
            return {
                labels: this.charts.reserveEvolution.map(item => item.month),
                datasets: [
                    {
                        data: this.charts.reserveEvolution.map(item => item.value),
                        borderColor: '#62a8ff',
                        backgroundColor: 'rgba(98, 168, 255, 0.18)',
                        tension: 0.35,
                        fill: true
                    }
                ]
            }
        }
    },

    methods: {
        emptyDashboard() {
            return {
                summary: {
                    hero: { netProfit: 0, totalRevenue: 0, totalExpenses: 0, margin: 0, status: 'attention', previousMonth: { previous: 0, change: 0, percent: null } },
                    health: { score: 0, status: 'attention', label: 'Sem dados' },
                    kpis: {
                        activeVehicles: 0,
                        maintenanceVehicles: 0,
                        activeDrivers: 0,
                        completedRoutes: 0,
                        inProgressRoutes: 0,
                        pendingReviewRoutes: 0,
                        totalKm: 0,
                        averageKmPerRoute: 0,
                        costPerKm: 0,
                        revenuePerKm: 0,
                        averageRevenuePerRoute: 0
                    },
                    financialBoxes: { boxes: [], suggestedDistribution: [] },
                    cityFrequency: [],
                    topExpenses: [],
                    period: { month: this.selectedMonth, year: this.selectedYear }
                },
                financialBoxes: { boxes: [], suggestedDistribution: [] },
                vehiclesPerformance: [],
                alerts: [],
                driversRanking: [],
                charts: { monthly: [], expensesByCategory: [], profitByVehicle: [], reserveEvolution: [] },
                insights: []
            }
        },

        baseBarOptions() {
            return {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: '#9ca3af', usePointStyle: true, boxWidth: 8 }
                    }
                },
                scales: this.chartScales()
            }
        },

        chartScales() {
            return {
                x: { grid: { color: 'rgba(148, 163, 184, 0.12)' }, ticks: { color: '#9ca3af' } },
                y: { grid: { color: 'rgba(148, 163, 184, 0.12)' }, ticks: { color: '#9ca3af' } }
            }
        },

        async fetchDashboardData() {
            this.isLoading = true
            try {
                this.dashboard = await getExecutiveDashboardData({
                    month: this.selectedMonth,
                    year: this.selectedYear
                })
            } catch (error) {
                console.error(error)
                this.dashboard = this.emptyDashboard()
            } finally {
                this.isLoading = false
            }
        },

        formatMoney(value) {
            return money(value)
        },

        formatKm(value) {
            return Number(value || 0).toLocaleString('pt-BR')
        },

        formatPercent(value) {
            return `${Number(value || 0).toFixed(1)}%`
        },

        trendLabel(trend) {
            if (!trend || trend.percent === null) return 'Sem historico'
            const signal = trend.change >= 0 ? '+' : '-'
            return `${signal}${Math.abs(trend.percent).toFixed(1)}%`
        },

        severityLabel(value) {
            return { low: 'baixo', medium: 'medio', high: 'alto', critical: 'critico' }[value] || value
        },

        progressWidth(value) {
            return `${Math.min(100, Math.max(0, Number(value || 0)))}%`
        },

        insightIcon(tone) {
            return {
                positive: 'fa-arrow-trend-up',
                negative: 'fa-arrow-trend-down',
                attention: 'fa-triangle-exclamation',
                neutral: 'fa-circle-info'
            }[tone] || 'fa-circle-info'
        }
    }
}
</script>

<style scoped>
.executive-toolbar,
.finance-hero,
.health-card,
.distribution-card,
.metric-card,
.panel-card {
    border: 1px solid var(--border-soft);
    background: var(--surface-card);
    box-shadow: var(--shadow-soft);
}

.executive-toolbar {
    border-radius: 18px;
    padding: 18px;
    display: flex;
    justify-content: space-between;
    gap: 14px;
    align-items: center;
    margin-bottom: 12px;
}

.executive-toolbar h4 {
    margin: 3px 0;
    color: var(--text-strong);
    font-size: 24px;
}

.executive-toolbar p,
.finance-hero p,
.health-card p,
.section-head span,
.metric-card small,
.fund-line small,
.alert-line small,
.driver-line small,
.insight-line small,
.vehicle-table small {
    color: var(--text-muted);
}

.eyebrow {
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--primary-color);
    font-size: 11px;
    font-weight: 800;
}

.refresh-btn {
    border: 0;
    border-radius: 12px;
    padding: 10px 13px;
    background: var(--primary-color);
    color: #fff;
    font-weight: 800;
    display: inline-flex;
    gap: 8px;
    align-items: center;
}

.dashboard-skeleton {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
}

.skeleton-card {
    min-height: 130px;
    border-radius: 18px;
    background: linear-gradient(90deg, var(--surface-card), var(--surface-muted), var(--surface-card));
    background-size: 200% 100%;
    animation: shimmer 1.2s infinite;
}

.finance-hero {
    border-radius: 24px;
    padding: 22px;
    display: grid;
    grid-template-columns: 1fr;
    gap: 18px;
    margin-bottom: 12px;
    background:
        radial-gradient(circle at top right, rgba(var(--primary-color-rgb), 0.26), transparent 42%),
        radial-gradient(circle at bottom left, rgba(34, 197, 94, 0.1), transparent 34%),
        linear-gradient(145deg, var(--surface-card), var(--surface-strong));
}

.finance-hero.positive {
    border-color: rgba(34, 197, 94, 0.35);
}

.finance-hero.attention {
    border-color: rgba(245, 158, 11, 0.35);
}

.finance-hero.negative {
    border-color: rgba(239, 68, 68, 0.4);
}

.hero-main strong {
    display: block;
    color: var(--text-strong);
    font-size: clamp(34px, 8vw, 56px);
    line-height: 1;
    margin: 8px 0;
    overflow-wrap: anywhere;
}

.hero-metrics {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
    margin-top: 16px;
    max-width: 760px;
}

.hero-metrics div {
    border-radius: 16px;
    background: rgba(148, 163, 184, 0.09);
    border: 1px solid rgba(148, 163, 184, 0.16);
    padding: 11px;
}

.hero-metrics small {
    display: block;
    color: var(--text-muted);
    font-size: 11px;
}

.hero-metrics span {
    display: block;
    color: var(--text-strong);
    font-weight: 900;
    margin-top: 4px;
    overflow-wrap: anywhere;
}

.hero-side {
    border-radius: 18px;
    background: var(--surface-muted);
    padding: 14px;
    min-width: 210px;
}

.hero-side strong {
    display: block;
    color: var(--text-strong);
    font-size: 22px;
}

.status-pill {
    width: fit-content;
    border-radius: 999px;
    padding: 8px 11px;
    background: var(--primary-soft);
    color: var(--primary-color);
    font-weight: 900;
    margin-bottom: 14px;
}

.health-row,
.dashboard-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 12px;
    margin-bottom: 12px;
}

.operation-row {
    grid-template-columns: 1fr;
}

.city-frequency {
    background:
        radial-gradient(circle at top right, rgba(var(--primary-color-rgb), 0.18), transparent 42%),
        var(--surface-card);
}

.city-chart {
    height: 280px;
}

.health-card,
.distribution-card,
.panel-card {
    border-radius: 18px;
    padding: 18px;
    min-width: 0;
    overflow: hidden;
}

.health-card {
    display: flex;
    justify-content: space-between;
    gap: 14px;
    align-items: center;
}

.health-card h5,
.section-head h5 {
    color: var(--text-strong);
    margin: 0;
}

.score-ring {
    width: 92px;
    height: 92px;
    border-radius: 50%;
    border: 8px solid var(--primary-color);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;
}

.score-ring strong {
    color: var(--text-strong);
    font-size: 25px;
    line-height: 1;
}

.score-ring span {
    color: var(--text-muted);
    font-size: 11px;
}

.distribution-list,
.fund-list,
.alerts-list,
.driver-list,
.expense-stack,
.insight-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.expense-line {
    border-radius: 14px;
    background: var(--surface-muted);
    padding: 12px;
    display: flex;
    justify-content: space-between;
    gap: 12px;
    align-items: flex-start;
    transition: transform 0.18s ease, background 0.18s ease;
}

.expense-line:hover {
    transform: translateY(-1px);
    background: rgba(148, 163, 184, 0.12);
}

.expense-line strong {
    display: block;
    color: var(--text-strong);
}

.expense-line small {
    color: var(--text-muted);
}

.expense-line span {
    color: #ef4444;
    font-weight: 900;
    white-space: nowrap;
}

.distribution-list div,
.fund-line,
.driver-line {
    border-radius: 14px;
    background: var(--surface-muted);
    padding: 11px;
    display: flex;
    justify-content: space-between;
    gap: 10px;
    align-items: center;
}

.distribution-list span,
.fund-line strong,
.driver-line strong,
.insight-line strong,
.alert-line strong {
    color: var(--text-strong);
}

.operations-summary {
    border: 1px solid var(--border-soft);
    background: var(--surface-card);
    box-shadow: var(--shadow-soft);
    border-radius: 18px;
    padding: 18px;
    margin-bottom: 12px;
}

.primary-kpis {
    display: grid;
    grid-template-columns: 1fr;
    gap: 10px;
}

.metric-card {
    border-radius: 16px;
    padding: 15px;
    min-width: 0;
}

.metric-card.featured {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 12px;
    align-items: center;
    background:
        linear-gradient(145deg, rgba(148, 163, 184, 0.08), rgba(148, 163, 184, 0.03)),
        var(--surface-muted);
    box-shadow: none;
}

.metric-card.featured.green {
    border-color: rgba(34, 197, 94, 0.28);
}

.metric-card.featured.blue {
    border-color: rgba(98, 168, 255, 0.28);
}

.metric-card.featured.yellow {
    border-color: rgba(245, 158, 11, 0.3);
}

.metric-card.featured.red {
    border-color: rgba(239, 68, 68, 0.28);
}

.metric-icon {
    width: 42px;
    height: 42px;
    border-radius: 12px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;
}

.metric-icon.green {
    background: rgba(34, 197, 94, 0.15);
    color: #22c55e;
}

.metric-icon.red {
    background: rgba(239, 68, 68, 0.15);
    color: #ef4444;
}

.metric-icon.yellow {
    background: rgba(245, 158, 11, 0.15);
    color: #f59e0b;
}

.metric-icon.blue {
    background: rgba(98, 168, 255, 0.16);
    color: #62a8ff;
}

.metric-card strong {
    display: block;
    color: var(--text-strong);
    font-size: 23px;
    line-height: 1.05;
    margin-top: 3px;
    overflow-wrap: anywhere;
}

.metric-card em {
    display: block;
    color: var(--text-muted);
    font-size: 12px;
    font-style: normal;
    margin-top: 5px;
}

.secondary-kpis {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
    margin-top: 10px;
}

.mini-metric {
    border-radius: 13px;
    background: rgba(148, 163, 184, 0.08);
    border: 1px solid rgba(148, 163, 184, 0.12);
    padding: 10px 11px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
}

.mini-metric span {
    color: var(--text-muted);
    font-size: 12px;
}

.mini-metric strong {
    color: var(--text-strong);
    font-size: 16px;
}

.section-head {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    align-items: flex-start;
    margin-bottom: 14px;
}

.alert-line,
.insight-line {
    border-radius: 14px;
    background: var(--surface-muted);
    padding: 11px;
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: 10px;
    align-items: center;
}

.alert-line>span {
    width: 10px;
    height: 42px;
    border-radius: 999px;
    background: #62a8ff;
}

.alert-line.low>span {
    background: #62a8ff;
}

.alert-line.medium>span {
    background: #f59e0b;
}

.alert-line.high>span {
    background: #f97316;
}

.alert-line.critical>span {
    background: #ef4444;
}

.alert-line em {
    color: var(--text-muted);
    font-style: normal;
    font-size: 11px;
    text-transform: uppercase;
    font-weight: 900;
}

.fund-line {
    align-items: flex-start;
}

.fund-value {
    min-width: 138px;
    text-align: right;
}

.fund-value strong {
    display: block;
    color: var(--text-strong);
    margin-bottom: 7px;
}

.fund-value span {
    display: block;
    height: 7px;
    border-radius: 999px;
    background: rgba(148, 163, 184, 0.2);
    overflow: hidden;
}

.fund-value i {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: var(--primary-color);
}

.vehicle-table-wrap {
    overflow-x: auto;
}

.vehicle-table {
    width: 100%;
    min-width: 940px;
    border-collapse: collapse;
}

.vehicle-table th {
    color: var(--text-muted);
    font-size: 11px;
    text-align: left;
    text-transform: uppercase;
    padding: 10px;
    border-bottom: 1px solid var(--border-soft);
}

.vehicle-table td {
    color: var(--text-strong);
    padding: 12px 10px;
    border-bottom: 1px solid var(--border-soft);
    vertical-align: top;
}

.vehicle-table td small,
.vehicle-table td strong {
    display: block;
}

.positive {
    color: #22c55e !important;
}

.negative {
    color: #ef4444 !important;
}

.charts-grid {
    grid-template-columns: 1fr;
}

.chart-wrapper {
    position: relative;
    width: 100%;
    height: 260px;
}

.empty-chart,
.empty-state {
    min-height: 210px;
    border: 1px dashed var(--border-soft);
    background: var(--surface-muted);
    color: var(--text-muted);
    border-radius: 16px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 18px;
}

.empty-state.compact {
    min-height: 120px;
}

.empty-state i {
    color: var(--primary-color);
    font-size: 25px;
    margin-bottom: 8px;
}

.empty-chart i {
    color: var(--primary-color);
    font-size: 24px;
    margin-bottom: 8px;
}

.empty-chart strong {
    color: var(--text-strong);
}

.empty-state strong {
    color: var(--text-strong);
}

.driver-stats {
    display: flex;
    gap: 8px;
    align-items: center;
    flex-wrap: wrap;
    justify-content: flex-end;
}

.driver-stats span {
    color: var(--text-muted);
    font-size: 12px;
}

.driver-stats strong {
    width: 40px;
    height: 40px;
    border-radius: 12px;
    background: var(--primary-soft);
    color: var(--primary-color);
    display: inline-flex;
    align-items: center;
    justify-content: center;
}

.insight-line {
    grid-template-columns: auto 1fr;
}

.insight-line i {
    width: 38px;
    height: 38px;
    border-radius: 12px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
}

.insight-line.positive i {
    color: #22c55e;
    background: rgba(34, 197, 94, 0.15);
}

.insight-line.negative i {
    color: #ef4444;
    background: rgba(239, 68, 68, 0.15);
}

.insight-line.attention i {
    color: #f59e0b;
    background: rgba(245, 158, 11, 0.15);
}

.insight-line.neutral i {
    color: #62a8ff;
    background: rgba(98, 168, 255, 0.16);
}

@keyframes shimmer {
    from {
        background-position: 200% 0;
    }

    to {
        background-position: -200% 0;
    }
}

@media (min-width: 760px) {
    .finance-hero {
        grid-template-columns: 1fr auto;
        align-items: stretch;
    }

    .health-row,
    .two-columns,
    .charts-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .operation-row {
        grid-template-columns: minmax(0, 1.25fr) minmax(280px, 0.75fr);
    }

    .primary-kpis {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .secondary-kpis {
        grid-template-columns: repeat(4, minmax(0, 1fr));
    }

    .dashboard-skeleton {
        grid-template-columns: repeat(3, minmax(0, 1fr));
    }
}

@media (min-width: 1120px) {
    .primary-kpis {
        grid-template-columns: repeat(4, minmax(0, 1fr));
    }
}

@media (max-width: 520px) {

    .executive-toolbar,
    .health-card,
    .distribution-list div,
    .fund-line,
    .driver-line {
        flex-direction: column;
        align-items: flex-start;
    }

    .refresh-btn {
        width: 100%;
        justify-content: center;
    }

    .primary-kpis,
    .secondary-kpis {
        grid-template-columns: 1fr;
    }

    .hero-metrics {
        grid-template-columns: 1fr;
    }

    .fund-value {
        width: 100%;
        min-width: 0;
        text-align: left;
    }

    .chart-wrapper {
        height: 230px;
    }
}
</style>
