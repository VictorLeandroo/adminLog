<template>
    <div class="finance-page">
        <div class="container py-2">

            <!-- Header -->
            <div class="card">
                <div class="card-body">
                    <h5 class="mb-2">Financeiro</h5>

                    <div class="d-flex gap-2">

                        <select v-model="periodType" class="form-select w-100 mr-1">
                            <option value="quinzena">Quinzena</option>
                            <option value="mes">Mês</option>
                            <option value="ano">Ano</option>
                        </select>

                        <select v-if="periodType !== 'ano'" v-model="selectedMonth" class="form-select w-100">
                            <option v-for="m in months" :key="m.value" :value="m.value">
                                {{ m.label }}
                            </option>
                        </select>

                        <select v-if="periodType === 'ano'" v-model="selectedYear" class="form-select w-100">
                            <option v-for="y in years" :key="y" :value="y">
                                {{ y }}
                            </option>
                        </select>

                    </div>
                </div>
            </div>


            <!-- RESUMO -->
            <div class="row">
                <div class="col-6 col-md-2" v-for="card in summaryCards" :key="card.label">
                    <div class="card">
                        <div class="card-body">
                            <h6 class="text-muted mb-1">{{ card.label }}</h6>
                            <h5 class="fw-bold mb-0 text-primary" :class="{ 'text-red': card.value.includes('-') }">{{
                                card.value }}</h5>
                        </div>
                    </div>
                </div>
            </div>

            <!-- RECEITAS -->
            <div class="card mb-2 d-none d-md-block">
                <div class="card-header fw-bold">
                    Receitas
                </div>

                <div class="table-responsive ">
                    <table class="table table-sm mb-0">
                        <thead>
                            <tr>
                                <th>Período</th>
                                <th>Rotas</th>
                                <th>KM Total</th>
                                <th>Valor</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="item in revenues" :key="item.id">
                                <td>{{ item.period }}</td>
                                <td>{{ item.routes }}</td>
                                <td>{{ item.km }} km</td>
                                <td class="fw-bold">{{ formatMoney(item.amount) }}</td>
                                <td>
                                    <span class="badge w-25" :class="item.paid ? 'badge-green' : 'badge-orange'">
                                        {{ item.paid ? 'Pago' : 'A receber' }}
                                    </span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- RECEITAS MOBILE -->
            <div class="d-md-none mb-2">
                <div class="finance-section-card">
                    <div class="section-header" @click="toggleSection('revenues')">
                        <div>
                            <h5 class="mb-0">
                                <i class="fa-solid fa-arrow-trend-up text-success me-1"></i>
                                Receitas
                            </h5>
                            <p class="obs-card">
                                {{ formatMoney(totalRevenue) }}
                            </p>
                        </div>

                        <i class="fa-solid" :class="openSections.revenues ? 'fa-chevron-up' : 'fa-chevron-down'"></i>
                    </div>

                    <transition @enter="onEnter" @after-enter="onAfterEnter" @leave="onLeave">
                        <div v-show="openSections.revenues" class="section-body">
                            <div v-for="item in revenues" :key="item.id" class="finance-row">
                                <div>
                                    <strong>{{ item.period }}</strong>
                                    <p class="obs-card d-block">
                                        {{ item.routes }} rotas • {{ item.km }} km
                                    </p>
                                </div>

                                <div class="d-flex flex-column align-items-end">
                                    <strong class="text-success">
                                        {{ formatMoney(item.amount) }}
                                    </strong>
                                    <span class="badge ms-1" :class="item.paid ? 'badge-green' : 'badge-orange'">
                                        {{ item.paid ? 'Pago' : 'A receber' }}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </transition>
                    <div v-if="!revenues.length" class="text-center py-4 text-muted">
                        <i class="fa-solid fa-file-invoice-dollar fa-2x mb-2"></i>
                        <p class="mb-0">Nenhuma receita no período</p>
                    </div>
                </div>
            </div>



            <!-- DESPESAS -->
            <div class="card mb-3 d-none d-md-block">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <span class="fw-bold">Despesas</span>
                    <ButtonComp btn-class="button-primary" :click-action="() => { showExpenseModal = true }">
                        + Nova despesa
                    </ButtonComp>
                </div>

                <div class="table-responsive">
                    <table class="table table-sm mb-0">
                        <thead>
                            <tr>
                                <th>Data</th>
                                <th>Categoria</th>
                                <th>Descrição</th>
                                <th>Valor</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="expense in expenses" :key="expense.id">
                                <td>{{ formatDate(expense.date) }}</td>
                                <td>{{ expense.category }}</td>
                                <td>{{ expense.description }}</td>
                                <td class="text-danger fw-bold">
                                    {{ formatMoney(expense.amount) }}
                                </td>
                                <td>
                                    <span class="badge w-25" :class="expense.paid ? 'badge-green' : 'badge-orange'">
                                        {{ expense.paid ? 'Pago' : 'A receber' }}
                                    </span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- DESPESAS MOBILE -->
            <div class="d-md-none mb-3">
                <div class="finance-section-card">
                    <div class="section-header">
                        <div @click="toggleSection('expenses')" class="flex-grow-1">
                            <h5 class="mb-0">
                                <i class="fa-solid fa-arrow-trend-down text-danger me-1"></i>
                                Despesas
                            </h5>
                            <p class="obs-card">
                                {{ formatMoney(totalExpenses) }}
                            </p>
                        </div>

                        <ButtonComp class="button-primary h-100" :click-action="() => { showExpenseModal = true }">
                            <i class="fa-solid fa-plus"></i>
                        </ButtonComp>
                    </div>

                    <transition @enter="onEnter" @after-enter="onAfterEnter" @leave="onLeave">
                        <div v-show="openSections.expenses" class="section-body">
                            <div v-for="expense in expenses" :key="expense.id" class="finance-row">
                                <div>
                                    <strong>{{ expense.category }}</strong>
                                    <p class="obs-card d-block">
                                        {{ expense.description }}
                                    </p>
                                </div>

                                <div class="text-end">
                                    <strong class="text-danger">
                                        {{ formatMoney(expense.amount) }}
                                    </strong>
                                    <p class="obs-card d-block">
                                        {{ formatDate(expense.date) }}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </transition>

                    <div v-if="!expenses.length" class="text-center py-4 text-muted">
                        <i class="fa-solid fa-file-invoice-dollar fa-2x mb-2"></i>
                        <p class="mb-0">Nenhuma despesa no período</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- MODAL NOVA DESPESA -->
        <ModalDefault :is-visible="showExpenseModal" @update:isVisible="showExpenseModal = false" max-width="400px"
            min-width="400px">
            <div class="mb-2">
                <label>Data</label>
                <input type="date" v-model="expenseForm.date" class="w-100" />
            </div>

            <div class="mb-2">
                <label>Categoria</label>
                <select v-model="expenseForm.category" class="form-select w-100">
                    <option>Combustível</option>
                    <option>Manutenção</option>
                    <option>Seguro</option>
                    <option>Multa</option>
                    <option>Outros</option>
                </select>
            </div>

            <div class="mb-2">
                <label>Descrição</label>
                <input type="text" v-model="expenseForm.description" class="w-100" />
            </div>

            <div class="mb-3">
                <label>Valor</label>
                <input type="text" v-currency="2" v-model="expenseForm.amount" class="w-100" />
            </div>

            <ButtonComp class="button-primary w-100" :click-action="addExpense">
                Salvar despesa
            </ButtonComp>
        </ModalDefault>

    </div>
</template>

<script>
import ButtonComp from '@/components/ButtonComp.vue';
import ModalDefault from '@/components/modals/ModalDefault.vue'

export default {
    name: 'FinanceView',

    components: {
        ModalDefault,
        ButtonComp
    },

    data() {
        return {
            periodType: 'mes',
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
                { value: 12, label: 'Dez' },
            ],
            years: [2023, 2024, 2025, 2026],


            openSections: {
                revenues: true,
                expenses: true
            },

            revenues: [
                {
                    id: 1,
                    period: '01–15/10',
                    routes: 12,
                    km: 1320,
                    amount: 4850,
                    paid: true
                },
                {
                    id: 2,
                    period: '16–31/10',
                    routes: 10,
                    km: 980,
                    amount: 3920,
                    paid: false
                }
            ],

            expenses: [
                {
                    id: 1,
                    date: '2025-10-05',
                    category: 'Combustível',
                    description: 'Abastecimento',
                    amount: 600,
                    paid: true
                },
                {
                    id: 2,
                    date: '2025-10-10',
                    category: 'Manutenção',
                    description: 'Troca de óleo',
                    amount: 350,
                    paid: true
                }
            ],

            showExpenseModal: false,

            expenseForm: {
                date: '',
                category: '',
                description: '',
                amount: null
            }
        }
    },

    computed: {
        summaryCards() {
            const totalRevenue = this.revenues.reduce((s, r) => s + r.amount, 0)
            const received = this.revenues.filter(r => r.paid).reduce((s, r) => s + r.amount, 0)
            const expenses = this.expenses.reduce((s, e) => s + e.amount, 0)

            return [
                { label: 'Total recebido', value: this.formatMoney(received) },
                { label: 'A receber', value: this.formatMoney(totalRevenue - received) },
                { label: 'Despesas', value: this.formatMoney(expenses) },
                { label: 'Lucro', value: this.formatMoney(received - expenses) }
            ]
        },

        totalRevenue() {
            return this.revenues.reduce((s, r) => s + r.amount, 0)
        },
        totalExpenses() {
            return this.expenses.reduce((s, e) => s + e.amount, 0)
        }
    },

    methods: {
        addExpense() {
            this.expenses.push({
                id: Date.now(),
                ...this.expenseForm,
                paid: true
            })

            this.expenseForm = {
                date: '',
                category: '',
                description: '',
                amount: null
            }

            this.showExpenseModal = false
        },

        formatMoney(value) {
            return value.toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL'
            })
        },

        formatDate(date) {
            return new Date(date).toLocaleDateString('pt-BR')
        },

        toggleSection(section) {
            this.openSections[section] = !this.openSections[section]
        },

        onEnter(el) {
            el.style.height = '0'
            el.style.opacity = '0'
            el.style.overflow = 'hidden'

            requestAnimationFrame(() => {
                el.style.transition = 'height 280ms ease, opacity 200ms ease'
                el.style.height = el.scrollHeight + 'px'
                el.style.opacity = '1'
            })
        },

        onAfterEnter(el) {
            el.style.height = 'auto'
            el.style.overflow = 'visible'
        },

        onLeave(el) {
            el.style.height = el.scrollHeight + 'px'
            el.style.opacity = '1'
            el.style.overflow = 'hidden'

            requestAnimationFrame(() => {
                el.style.transition = 'height 240ms ease, opacity 180ms ease'
                el.style.height = '0'
                el.style.opacity = '0'
            })
        },

        fetchFinanceData(){
            console.log('aaaa')
        }


    },

    watch: {
        periodType() {
            this.fetchFinanceData()
        },
        selectedMonth() {
            this.fetchFinanceData()
        },
        selectedYear() {
            this.fetchFinanceData()
        }
    }
}
</script>

<style scoped>
.finance-page {
    background: #f8f9fa;
}
.table td,
.table th {
    vertical-align: middle;
}

.finance-section-card {
    background: #fff;
    border-radius: 14px;
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.06);
    overflow: hidden;
}

.section-header {
    padding: 12px 14px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid #f1f1f1;
}

.section-body {
    /* padding: 6px 14px; */
    will-change: height, opacity;
}

.finance-row {
    display: flex;
    justify-content: space-between;
    padding: 10px 14px;
    border-bottom: 1px solid #f5f5f5;
}

.finance-row:last-child {
    border-bottom: none;
}

.fade-slide-enter-active,
.fade-slide-leave-active {
    transition: all 0.25s ease;
}

.fade-slide-enter-from {
    opacity: 0;
    transform: translateY(-6px);
}

.fade-slide-leave-to {
    opacity: 0;
    transform: translateY(-6px);
}
</style>
