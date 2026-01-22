<template>
    <div class="dashboard-container min-vh-100">
        <div class="container py-2">
            <!-- Cards resumo -->
            <div class="row g-2 mb-2">
                <div class="col-6" v-for="card in summaryCards" :key="card.title">
                    <div class="card">
                        <div class="card-body">
                            <h6 class="text-muted mb-1">{{ card.title }}</h6>
                            <h5 class="fw-bold mb-0 text-primary">{{ card.value }}</h5>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Gráficos -->
            <div class="row g-3">
                <div class="col-12 col-md-6">
                    <div class="card">
                        <div class="card-body">
                            <h6 class="fw-bold mb-3">KM rodados por dia</h6>
                            <div class="chart-wrapper">
                                <Line :data="kmChartData" :options="chartOptions" />
                            </div>
                        </div>
                    </div>
                </div>

                <div class="col-12 col-md-6">
                    <div class="card">
                        <div class="card-body">
                            <h6 class="fw-bold mb-3">Ganho diário (R$)</h6>
                            <div class="chart-wrapper">
                                <Bar :data="gainChartData" :options="chartOptions" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="row g-3">
                <div class="col-12 col-md-6">
                    <div class="card">
                        <div class="card-body">
                            <h6 class="fw-bold mb-3">Frequência por cidade</h6>
                            <div class="chart-wrapper">
                                <Bar :data="cityFrequencyChartData" :options="cityFrequencyChartOptions" />
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-12 col-md-6">
                    <div class="card">
                        <div class="card-body text-center">
                            <h6 class="fw-bold mb-3">Comparativo: Ganhos x Despesas</h6>

                            <div class="chart-wrapper mb-3">
                                <Doughnut :data="gainVsExpenseChartData" :options="gainVsExpenseDoughnutOptions" />
                            </div>

                            <div class="d-flex justify-content-around flex-wrap text-center">
                                <div class="p-2">
                                    <h6 class="text-success mb-0 fw-bold">{{ formatMoney(totalGain) }}</h6>
                                    <small class="text-muted">Ganhos</small>
                                </div>
                                <div class="p-2">
                                    <h6 class="text-danger mb-0 fw-bold">{{ formatMoney(totalGas + totalToll) }}</h6>
                                    <small class="text-muted">Despesas</small>
                                </div>
                                <div class="p-2">
                                    <h6 :class="[
                                        'fw-bold mb-0',
                                        totalNet >= 0 ? 'text-primary' : 'text-danger'
                                    ]">
                                        {{ formatMoney(totalNet) }}
                                    </h6>
                                    <small class="text-muted">Saldo Líquido</small>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>

        </div>
    </div>
</template>

<script>
import {
    Chart as ChartJS,
    Title,
    Tooltip,
    Legend,
    LineElement,
    BarElement,
    CategoryScale,
    LinearScale,
    PointElement,
    ArcElement
} from 'chart.js'
import { Line, Bar, Doughnut } from 'vue-chartjs'

ChartJS.register(Title, Tooltip, Legend, LineElement, ArcElement, BarElement, CategoryScale, LinearScale, PointElement)

export default {
    name: 'DashboardView',
    components: { Line, Bar, Doughnut },
    data() {
        return {
            dailyData: [
                { date: '2025-10-01', city: 'São Paulo', km: 140, gas: 180, toll: 30 },
                { date: '2025-10-01', city: 'São Paulo', km: 140, gas: 180, toll: 30 },
                { date: '2025-10-01', city: 'São Paulo', km: 140, gas: 180, toll: 30 },
                { date: '2025-10-01', city: 'São Paulo', km: 140, gas: 180, toll: 30 },
                { date: '2025-10-01', city: 'São Paulo', km: 140, gas: 180, toll: 30 },
                { date: '2025-10-01', city: 'São Paulo', km: 140, gas: 180, toll: 30 },
                { date: '2025-10-01', city: 'São Paulo', km: 140, gas: 180, toll: 30 },
                { date: '2025-10-01', city: 'São Paulo', km: 140, gas: 180, toll: 30 },
                { date: '2025-10-01', city: 'São Paulo', km: 140, gas: 180, toll: 30 },
                { date: '2025-10-01', city: 'São Paulo', km: 140, gas: 180, toll: 30 },
                { date: '2025-10-02', city: 'Campinas', km: 100, gas: 150, toll: 25 },
                { date: '2025-10-02', city: 'Campinas', km: 100, gas: 150, toll: 25 },
                { date: '2025-10-02', city: 'Campinas', km: 100, gas: 150, toll: 25 },
                { date: '2025-10-03', city: 'Itu', km: 180, gas: 200, toll: 40 },
                { date: '2025-10-03', city: 'Itu', km: 180, gas: 200, toll: 40 },
                { date: '2025-10-04', city: 'Boituva', km: 90, gas: 140, toll: 0 },
                { date: '2025-10-04', city: 'Caraguatatuba', km: 90, gas: 140, toll: 0 },
                { date: '2025-10-04', city: 'Praia Grande', km: 90, gas: 140, toll: 0 },
                { date: '2025-10-04', city: 'Boituva', km: 90, gas: 140, toll: 0 },
                { date: '2025-10-04', city: 'Praia Grande', km: 90, gas: 140, toll: 0 },
                { date: '2025-10-04', city: 'Boituva', km: 90, gas: 140, toll: 0 },
                { date: '2025-10-04', city: 'Boituva', km: 90, gas: 140, toll: 0 },
                { date: '2025-10-04', city: 'Boituva', km: 90, gas: 140, toll: 0 },
            ],
            dailyAllowance: 400,
            kmLimit: 120,
            extraKmRate: 1.5,
            chartOptions: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: { beginAtZero: true }
                }
            }
        }
    },
    computed: {
        totalKm() {
            return this.dailyData.reduce((sum, d) => sum + d.km, 0)
        },
        totalGas() {
            return this.dailyData.reduce((sum, d) => sum + d.gas, 0)
        },
        totalToll() {
            return this.dailyData.reduce((sum, d) => sum + d.toll, 0)
        },
        totalGain() {
            return this.dailyData.reduce((sum, d) => sum + this.calcDailyGain(d.km), 0)
        },
        totalNet() {
            return this.totalGain - (this.totalGas + this.totalToll)
        },
        summaryCards() {
            return [
                { title: 'Total rodado (km)', value: this.totalKm.toFixed(1), class: 'text-primary' },
                { title: 'Ganhos brutos', value: this.formatMoney(this.totalGain), class: 'text-success' },
                { title: 'Despesas', value: this.formatMoney(this.totalGas + this.totalToll), class: 'text-danger' },
                { title: 'Saldo final', value: this.formatMoney(this.totalNet), class: 'text-dark' }
            ]
        },
        kmChartData() {
            return {
                labels: this.dailyData.map(d => d.date),
                datasets: [
                    {
                        label: 'KM rodado',
                        data: this.dailyData.map(d => d.km),
                        borderColor: '#0d6efd',
                        backgroundColor: 'rgba(13,110,253,0.1)',
                        tension: 0.2
                    }
                ]
            }
        },
        gainChartData() {
            return {
                labels: this.dailyData.map(d => d.date),
                datasets: [
                    {
                        label: 'Ganho líquido',
                        data: this.dailyData.map(d => this.calcDailyGain(d.km) - (d.gas + d.toll)),
                        backgroundColor: '#198754',
                        borderRadius: 4,
                        maxBarThickness: 25
                    }
                ]
            }
        },
        cityFrequencyChartData() {
            const cityCount = this.dailyData.reduce((acc, d) => {
                acc[d.city] = (acc[d.city] || 0) + 1
                return acc
            }, {})

            const labels = Object.keys(cityCount)
            const values = Object.values(cityCount)

            return {
                labels,
                datasets: [
                    {
                        label: 'Visitas no mês',
                        data: values,
                        backgroundColor: '#0d6efd',
                        borderRadius: 4,
                        maxBarThickness: 25
                    }
                ]
            }
        },
        cityFrequencyChartOptions() {
            return {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (context) => `${context.parsed.x} visita(s)`
                        }
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        ticks: { precision: 0 }
                    },
                    y: {
                        ticks: {
                            stepSize: 1,
                            precision: 0,
                            callback: (value) => Number.isInteger(value) ? value : null,
                            color: '#212529', font: { size: 12 }
                        },
                    }
                }
            }
        },

        gainVsExpenseChartData() {
            const totalGain = this.totalGain
            const totalExpense = this.totalGas + this.totalToll

            return {
                labels: ['Ganhos', 'Despesas'],
                datasets: [
                    {
                        data: [totalGain, totalExpense],
                        backgroundColor: ['#198754', '#dc3545'],
                        hoverBackgroundColor: ['#20c997', '#e35d6a'],
                        borderWidth: 3,
                        cutout: '65%'
                    }
                ]
            }
        },
        gainVsExpenseDoughnutOptions() {
            return {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            usePointStyle: true,
                            boxWidth: 10
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: (ctx) =>
                                `${ctx.label}: R$ ${ctx.parsed.toLocaleString('pt-BR', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2
                                })}`
                        }
                    }
                }
            }
        }

    },
    methods: {
        calcDailyGain(km) {
            const extraKm = Math.max(0, km - this.kmLimit)
            return this.dailyAllowance + extraKm * this.extraKmRate
        },
        formatMoney(v) {
            return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
        }
    }
}
</script>

<style scoped>
.chart-wrapper {
    position: relative;
    width: 100%;
    height: 230px;
}

@media (min-width: 768px) {
    .chart-wrapper {
        height: 300px;
    }
}
</style>
