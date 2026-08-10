<template>
    <div class="finance-page premium-page min-vh-100">
        <div class="container py-1">
            <section class="finance-hero">
                <div>
                    <span class="eyebrow">{{ isDriverUser ? 'Financeiro do motorista' : 'Centro financeiro' }}</span>
                    <h4>{{ isDriverUser ? 'Meus gastos' : 'Financeiro' }}</h4>
                    <p>{{ isDriverUser ? 'Registre gastos do seu veiculo e acompanhe aprovacoes.' :
                        'Despesas, receitas, caixa e resultado da frota em uma visao organizada.' }}</p>
                </div>
                <div class="hero-actions">
                    <ButtonComp btn-class="button-primary button-big" :click-action="openExpenseModal">
                        <i class="fa-solid fa-plus"></i>
                        Nova despesa
                    </ButtonComp>
                    <ButtonComp v-if="!isDriverUser" btn-class="button-secundary button-big"
                        :click-action="openRevenueModal">
                        <i class="fa-solid fa-arrow-trend-up"></i>
                        Nova receita
                    </ButtonComp>
                </div>
            </section>

            <div v-if="isLoading" class="page-loading-state">
                <span class="loader"></span>
                <strong>Carregando financeiro</strong>
                <p>Organizando lancamentos, comprovantes e indicadores.</p>
            </div>

            <template v-else>
                <section class="summary-grid">
                    <article v-for="card in summaryCards" :key="card.label" class="summary-card" :class="card.tone">
                        <small>{{ card.label }}</small>
                        <strong>{{ card.value }}</strong>
                        <span>{{ card.hint }}</span>
                    </article>
                </section>

                <section v-if="isDriverUser" class="driver-quick-panel">
                    <button v-for="action in quickExpenseActions" :key="action.category" type="button"
                        @click="openExpenseModal(null, action.category)">
                        <i class="fa-solid" :class="action.icon"></i>
                        <span>{{ action.label }}</span>
                    </button>
                </section>

                <nav class="finance-tabs" v-if="!isDriverUser">
                    <button v-for="tab in adminTabs" :key="tab.key" type="button"
                        :class="{ active: activeTab === tab.key }" @click="activeTab = tab.key">
                        <i class="fa-solid" :class="tab.icon"></i>
                        {{ tab.label }}
                    </button>
                </nav>

                <section class="filter-card">
                    <div class="search-box">
                        <i class="fa-solid fa-magnifying-glass"></i>
                        <input v-model="searchTerm" type="text" placeholder="Buscar por descricao, categoria ou data" />
                    </div>
                    <select v-model.number="selectedMonth" class="form-select" @change="fetchFinance">
                        <option v-for="month in months" :key="month.value" :value="month.value">{{ month.label }}
                        </option>
                    </select>
                    <select v-model.number="selectedYear" class="form-select" @change="fetchFinance">
                        <option v-for="year in years" :key="year" :value="year">{{ year }}</option>
                    </select>
                    <select v-if="!isDriverUser && activeTab === 'expenses'" v-model="filters.status"
                        class="form-select">
                        <option value="">Todos status</option>
                        <option value="PENDING">Pendente</option>
                        <option value="APPROVED">Aprovada</option>
                        <option value="REJECTED">Recusada</option>
                        <option value="CORRECTION_REQUESTED">Correcao</option>
                    </select>
                </section>

                <section v-if="isDriverUser || activeTab === 'expenses'" class="finance-layout">
                    <div class="finance-column">
                        <div class="section-title">
                            <div>
                                <span class="eyebrow">Despesas</span>
                                <h5>{{ isDriverUser ? 'Meus lancamentos' : 'Gastos registrados' }}</h5>
                            </div>
                            <strong>{{ formatMoney(totalExpenses) }}</strong>
                        </div>

                        <article v-for="expense in filteredExpenses" :key="expense.id" class="expense-card">
                            <div class="expense-title">
                                <span class="expense-icon">
                                    <i class="fa-solid" :class="expenseCategoryIcon(expense.category)"></i>
                                </span>
                                <div class="expense-copy">
                                    <strong>{{ expense.category }}</strong>
                                    <small class="expense-meta">
                                        <span><i class="fa-regular fa-calendar-days"></i>{{ formatDate(expense.date) }}</span>
                                        <span>{{ expense.quinzenna }} quinzena</span>
                                    </small>
                                    <p class="expense-description">{{ expense.description || 'Sem descricao' }}</p>
                                    <p v-if="expense.reviewNote" class="review-note">{{ expense.reviewNote }}</p>

                                    <div class="photo-strip" v-if="expense.photos?.length">
                                        <button v-for="(photo, index) in expense.photos" :key="index" type="button"
                                            @click="openLightbox(photo.url || photo.preview)">
                                            <img :src="photo.url || photo.preview" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <span class="status-badge" :class="expense.status">{{ statusLabel(expense.status) }}</span>
                            <strong class="amount danger">{{ formatMoney(expense.amount) }}</strong>

                            <div class="expense-actions" v-if="canManageExpenses && expense.editable">
                                <ButtonComp btn-class="button-secundary w-100"
                                    :click-action="() => openExpenseModal(expense)">
                                    <i class="fa-solid fa-pen"></i>
                                    Editar
                                </ButtonComp>
                                <ButtonComp v-if="expense.status === 'PENDING'" btn-class="button-primary w-100"
                                    :click-action="() => reviewExpense(expense, 'APPROVED')">
                                    <i class="fa-solid fa-check"></i>
                                    Aprovar
                                </ButtonComp>
                                <ButtonComp v-if="expense.status === 'PENDING'" btn-class="button-secundary w-100"
                                    :click-action="() => askReview(expense, 'CORRECTION_REQUESTED')">
                                    <i class="fa-solid fa-rotate-left"></i>
                                    Corrigir
                                </ButtonComp>
                                <ButtonComp v-if="expense.status === 'PENDING'" btn-class="button-secundary-red w-100"
                                    :click-action="() => askReview(expense, 'REJECTED')">
                                    <i class="fa-solid fa-xmark"></i>
                                    Recusar
                                </ButtonComp>
                                <ButtonComp btn-class="button-secundary-red w-100"
                                    :click-action="() => deleteExpense(expense.id)">
                                    <i class="fa-solid fa-trash-can"></i>
                                    Excluir
                                </ButtonComp>
                            </div>
                        </article>

                        <div v-if="!filteredExpenses.length" class="empty-state">
                            <span class="empty-icon"><i class="fa-solid fa-receipt"></i></span>
                            <strong>Nenhuma despesa encontrada</strong>
                            <p>{{ isDriverUser ? 'Use os botoes rapidos para registrar um gasto do veiculo.' :
                                'Crie uma despesa ou ajuste os filtros do periodo.' }}</p>
                        </div>
                    </div>

                    <aside class="finance-side">
                        <div class="section-title">
                            <div>
                                <span class="eyebrow">Categorias</span>
                                <h5>Resumo do periodo</h5>
                            </div>
                        </div>
                        <div class="category-list" v-if="categoryTotals.length">
                            <div class="category-row" v-for="category in categoryTotals" :key="category.name">
                                <div>
                                    <strong>{{ category.name }}</strong>
                                    <small>{{ category.count }} lancamento(s)</small>
                                </div>
                                <span>{{ formatMoney(category.total) }}</span>
                            </div>
                        </div>
                        <div v-else class="mini-empty">
                            <span class="empty-icon small"><i class="fa-solid fa-chart-pie"></i></span>
                            <div><strong>Sem categorias</strong>
                                <p>Nenhuma despesa encontrada.</p>
                            </div>
                        </div>
                    </aside>
                </section>

                <section v-if="!isDriverUser && activeTab === 'revenues'" class="finance-panel revenue-panel">
                    <div class="revenue-panel-head">
                        <div>
                            <span class="eyebrow">Receitas</span>
                            <h5>Entradas registradas</h5>
                            <p>Total do periodo selecionado</p>
                        </div>
                        <div class="revenue-total">
                            <small>Total</small>
                            <strong>{{ formatMoney(totalRevenues) }}</strong>
                        </div>
                    </div>

                    <div class="revenue-list" v-if="filteredRevenues.length">
                        <article v-for="revenue in filteredRevenues" :key="revenue.id" class="revenue-card">
                            <div class="revenue-title">
                                <span class="revenue-icon">
                                    <i class="fa-solid fa-file-lines"></i>
                                </span>
                                <div class="revenue-copy">
                                    <strong>{{ revenue.description || 'Receita' }}</strong>
                                    <small class="revenue-meta">
                                        <span><i class="fa-regular fa-calendar-days"></i>{{ formatDate(revenue.date) }}</span>
                                        <span><i class="fa-solid fa-tag"></i>{{ revenue.company || 'Sem cliente' }}</span>
                                    </small>
                                </div>
                            </div>

                            <strong class="amount positive">{{ formatMoney(revenue.amount) }}</strong>

                            <div class="revenue-actions">
                                <button type="button" @click="openRevenueModal(revenue)" title="Editar receita">
                                    <i class="fa-solid fa-pen"></i>
                                </button>
                                <button type="button" class="danger-action" @click="deleteRevenue(revenue.id)"
                                    title="Excluir receita">
                                    <i class="fa-solid fa-trash-can"></i>
                                </button>
                            </div>
                        </article>
                    </div>

                    <div v-else class="empty-state compact"><strong>Nenhuma receita no periodo</strong></div>
                </section>

                <section v-if="!isDriverUser && activeTab === 'cashflow'" class="finance-panel cashflow-panel">
                    <div class="cashflow-head">
                        <span class="eyebrow">Fluxo de caixa</span>
                        <h5>Entradas, saidas e saldo acumulado</h5>
                    </div>

                    <div class="cashflow-metrics">
                        <article v-for="card in cashFlowCards" :key="card.label" class="cashflow-metric" :class="card.type">
                            <span class="cashflow-metric-icon">
                                <i class="fa-solid" :class="card.icon"></i>
                            </span>
                            <div>
                                <small>{{ card.label }}</small>
                                <strong>{{ card.value }}</strong>
                                <p>{{ card.hint }}</p>
                            </div>
                        </article>
                    </div>

                    <div v-if="filteredCashFlow.length" class="cashflow-table">
                        <div class="cashflow-table-head">
                            <span>Tipo</span>
                            <span>Descricao</span>
                            <span>Data</span>
                            <span>Categoria</span>
                            <span>Valor</span>
                            <span>Saldo acumulado</span>
                        </div>

                        <article v-for="item in filteredCashFlow" :key="item.id" class="cashflow-row" :class="item.type">
                            <span class="cashflow-type-chip">
                                <i class="fa-solid" :class="cashFlowTypeIcon(item)"></i>
                                {{ cashFlowTypeLabel(item) }}
                            </span>
                            <strong>{{ item.description }}</strong>
                            <span>{{ formatDate(item.date) }}</span>
                            <span>{{ item.category }}{{ item.related ? ' - ' + item.related : '' }}</span>
                            <strong class="cashflow-amount">{{ cashFlowAmountLabel(item) }}</strong>
                            <span class="cashflow-balance">{{ formatMoney(item.balance) }}</span>
                        </article>
                    </div>

                    <div v-else class="empty-state compact"><strong>Nenhum movimento no periodo</strong></div>
                </section>

                <section v-if="!isDriverUser && activeTab === 'dre'" class="panel-grid">
                    <article class="finance-panel">
                        <div class="section-title">
                            <div><span class="eyebrow">DRE geral</span>
                                <h5>Resultado do mes</h5>
                            </div>
                        </div>
                        <div class="dre-line positive"><span>Receitas</span><strong>{{ formatMoney(dre.totalRevenue)
                        }}</strong></div>
                        <div v-for="category in dre.categories" :key="category.category" class="dre-line"><span>{{
                            category.category }}</span><strong>{{ formatMoney(category.total) }}</strong></div>
                        <div class="dre-line total"><span>Lucro liquido</span><strong>{{ formatMoney(dre.netProfit)
                        }}</strong></div>
                    </article>
                    <article class="finance-panel">
                        <div class="section-title">
                            <div><span class="eyebrow">DRE por Fiorino</span>
                                <h5>Lucro real por veiculo</h5>
                            </div>
                        </div>
                        <div v-for="vehicle in vehicleDre" :key="vehicle.vehicleId" class="vehicle-dre-row">
                            <div><strong>{{ vehicle.plate }}</strong><small>{{ vehicle.driver }} - {{
                                formatKm(vehicle.km) }} km</small></div>
                            <div><span :class="{ positive: vehicle.netProfit >= 0, danger: vehicle.netProfit < 0 }">{{
                                formatMoney(vehicle.netProfit) }}</span><small>{{ formatPercent(vehicle.margin)
                                    }}</small></div>
                        </div>
                    </article>
                </section>

                <section v-if="!isDriverUser && activeTab === 'salaries'" class="finance-panel">
                    <div class="section-title">
                        <div><span class="eyebrow">Salarios</span>
                            <h5>Motoristas e pagamentos</h5>
                        </div>
                    </div>
                    <div v-for="salary in salaries" :key="salary.driverId" class="list-row">
                        <div><strong>{{ salary.driver }}</strong><small>{{ salary.vehicle }} - descontos {{
                            formatMoney(salary.discounts) }}</small></div>
                        <span>{{ formatMoney(salary.totalToPay) }}</span>
                    </div>
                </section>

            </template>
        </div>

        <ModalDefault :isLoading="isLoading" :is-visible="showExpenseModal" max-width="460px" min-width="320px"
            @update:isVisible="cancelExpense">
            <div class="modal-head">
                <span class="modal-icon"><i class="fa-solid fa-receipt"></i></span>
                <div>
                    <h6>{{ expenseForm.id ? 'Editar despesa' : 'Nova despesa' }}</h6>
                    <p>Foto do comprovante e descricao ajudam na aprovacao.</p>
                </div>
            </div>
            <label class="form-label">Data</label>
            <input type="date" v-model="expenseForm.date" class="w-100 mb-2" />
            <label class="form-label">Categoria</label>
            <select v-model="expenseForm.category" class="form-select w-100 mb-2">
                <option v-for="option in availableExpenseCategories" :key="option" :value="option">{{ option }}</option>
            </select>
            <template v-if="showVehicleField && !isDriverUser">
                <label class="form-label">Veiculo {{ vehicleRequiredForExpense ? '' : '(opcional)' }}</label>
                <select v-model="expenseForm.vehicleId" class="form-select w-100 mb-2">
                    <option value="">{{ vehicleRequiredForExpense ? 'Selecione um veiculo' : 'Sem vinculo com veiculo'
                    }}</option>
                    <option v-for="vehicle in vehicles" :key="vehicle.id" :value="vehicle.id">{{ vehicle.plate }} - {{
                        vehicle.model }}</option>
                </select>
            </template>
            <template v-if="expenseForm.category === expenseCategories.SALARY">
                <label class="form-label">Motorista</label>
                <select v-model="expenseForm.driverId" class="form-select w-100 mb-2">
                    <option value="">Selecione um motorista</option>
                    <option v-for="driver in drivers" :key="driver.id" :value="driver.id">{{ driver.name }} - {{
                        driver.email }}</option>
                </select>
            </template>
            <label class="form-label">Descricao</label>
            <input type="text" v-model="expenseForm.description" class="w-100 mb-2"
                placeholder="Ex: abastecimento, pedagio, troca de pneu" />
            <label class="form-label">Valor</label>
            <input type="number" v-model.number="expenseForm.amount" class="w-100 mb-2" placeholder="0,00" />
            <label class="form-label">Comprovante</label>
            <PhotoUploadComp v-model="photos" />
            <p v-if="driverVehicleRequiredWithoutVehicle" class="review-note">Vincule um veiculo ao motorista para registrar esta categoria.</p>
            <ButtonComp btn-class="button-primary button-big w-100 mt-2" :is-disabled="!canSaveExpense"
                :click-action="saveExpense">Salvar despesa</ButtonComp>
        </ModalDefault>

        <ModalDefault :isLoading="isLoading" :is-visible="showRevenueModal" max-width="460px" min-width="320px"
            @update:isVisible="cancelRevenue">
            <div class="modal-head">
                <span class="modal-icon positive-bg"><i class="fa-solid fa-arrow-trend-up"></i></span>
                <div>
                    <h6>{{ revenueForm.id ? 'Editar receita' : 'Nova receita' }}</h6>
                    <p>Registre entradas por cliente/transportadora.</p>
                </div>
            </div>
            <label class="form-label">Data</label>
            <input type="date" v-model="revenueForm.date" class="w-100 mb-2" />
            <label class="form-label">Descricao</label>
            <input type="text" v-model="revenueForm.description" class="w-100 mb-2" />
            <label class="form-label">Cliente/transportadora</label>
            <input type="text" v-model="revenueForm.company" class="w-100 mb-2" />
            <label class="form-label">Valor</label>
            <input type="number" v-model.number="revenueForm.amount" class="w-100 mb-2" />
            <ButtonComp btn-class="button-primary button-big w-100 mt-2" :is-disabled="!canSaveRevenue"
                :click-action="saveRevenue">Salvar receita</ButtonComp>
        </ModalDefault>

        <div v-if="lightboxPhoto" class="lightbox" @click.self="closeLightbox">
            <button class="lightbox-close" @click="closeLightbox"><i class="fa-solid fa-xmark"></i></button>
            <img :src="lightboxPhoto" class="lightbox-image" />
        </div>
    </div>
</template>

<script>
import ButtonComp from '@/components/ButtonComp.vue'
import ModalDefault from '@/components/modals/ModalDefault.vue'
import PhotoUploadComp from '@/components/PhotoUploadComp.vue'
import {
    formatLocalDate,
    getCashFlow,
    getDre,
    getFinanceSummary,
    getMyVehicle,
    getQuinzenna,
    getSalarySettlements,
    getVehicleDre,
    listDrivers,
    listExpenses,
    listRevenues,
    listVehicles,
    money,
    parseLocalDate,
    createFundMovementApi,
    removeExpenseApi,
    removeRevenueApi,
    reviewExpenseApi,
    saveExpenseApi,
    saveFinanceFundApi,
    saveRevenueApi
} from '@/services/backendService'

export default {
    name: 'FinanceView',
    components: { ButtonComp, ModalDefault, PhotoUploadComp },
    data() {
        return {
            activeTab: 'expenses',
            isLoading: false,
            selectedMonth: new Date().getMonth() + 1,
            selectedYear: new Date().getFullYear(),
            searchTerm: '',
            filters: { status: '' },
            finance: { expenses: [], revenues: [] },
            summary: {},
            cashFlow: [],
            dre: { categories: [], totalRevenue: 0, totalExpenses: 0, netProfit: 0, margin: 0 },
            vehicleDre: [],
            funds: { surplus: 0, funds: [] },
            salaries: [],
            insights: [],
            vehicles: [],
            drivers: [],
            myVehicleId: '',
            showExpenseModal: false,
            showRevenueModal: false,
            showFundModal: false,
            showFundMovementModal: false,
            lightboxPhoto: null,
            photos: [],
            selectedFund: null,
            expenseCategories: {
                FUEL: 'Combustivel',
                TOLL: 'Pedagio',
                MAINTENANCE: 'Manutencao do carro',
                TIRE: 'Pneus',
                INSURANCE: 'Seguro',
                FINE: 'Multa',
                SALARY: 'Salario',
                ADMINISTRATION: 'Administracao',
                OFFICE: 'Escritorio',
                TAX: 'Impostos',
                INSTALLMENT: 'Parcela/financiamento',
                OTHER: 'Outros'
            },
            expenseForm: this.emptyExpenseFormBase(),
            revenueForm: this.emptyRevenueForm(),
            fundForm: this.emptyFundForm(),
            fundMovementForm: this.emptyFundMovementForm(),
            adminTabs: [
                { key: 'expenses', label: 'Despesas', icon: 'fa-receipt' },
                { key: 'revenues', label: 'Receitas', icon: 'fa-arrow-trend-up' },
                { key: 'cashflow', label: 'Fluxo', icon: 'fa-timeline' },
                { key: 'dre', label: 'DRE', icon: 'fa-chart-line' },
                { key: 'salaries', label: 'Pagamentos', icon: 'fa-money-check-dollar' }
            ],
            months: [
                { value: 1, label: 'Jan' }, { value: 2, label: 'Fev' }, { value: 3, label: 'Mar' },
                { value: 4, label: 'Abr' }, { value: 5, label: 'Mai' }, { value: 6, label: 'Jun' },
                { value: 7, label: 'Jul' }, { value: 8, label: 'Ago' }, { value: 9, label: 'Set' },
                { value: 10, label: 'Out' }, { value: 11, label: 'Nov' }, { value: 12, label: 'Dez' }
            ],
            years: [2024, 2025, 2026, 2027]
        }
    },
    computed: {
        currentUser() {
            try { return JSON.parse(localStorage.getItem('user') || 'null') } catch (_error) { return null }
        },
        isDriverUser() {
            return this.currentUser?.role === 'DRIVER'
        },
        canManageExpenses() {
            return ['ADMIN', 'FINANCE'].includes(this.currentUser?.role)
        },
        availableExpenseCategories() {
            if (this.isDriverUser) {
                return [this.expenseCategories.FUEL, this.expenseCategories.TOLL, this.expenseCategories.MAINTENANCE, this.expenseCategories.TIRE, this.expenseCategories.INSURANCE, this.expenseCategories.FINE, this.expenseCategories.OTHER]
            }
            return Object.values(this.expenseCategories)
        },
        quickExpenseActions() {
            return [
                { label: 'Registrar combustivel', category: this.expenseCategories.FUEL, icon: 'fa-gas-pump' },
                { label: 'Registrar pedagio', category: this.expenseCategories.TOLL, icon: 'fa-road' },
                { label: 'Registrar manutencao', category: this.expenseCategories.MAINTENANCE, icon: 'fa-screwdriver-wrench' },
                { label: 'Enviar comprovante', category: this.expenseCategories.OTHER, icon: 'fa-camera' }
            ]
        },
        showVehicleField() {
            return this.expenseForm.category !== this.expenseCategories.SALARY
        },
        vehicleRequiredForExpense() {
            return [
                this.expenseCategories.FUEL,
                this.expenseCategories.TOLL,
                this.expenseCategories.MAINTENANCE,
                this.expenseCategories.TIRE
            ].includes(this.expenseForm.category)
        },
        periodQuery() {
            return { month: this.selectedMonth, year: this.selectedYear }
        },
        filteredExpenses() {
            const term = this.searchTerm.trim().toLowerCase()
            return this.finance.expenses
                .filter(item => this.matchesPeriod(item.date))
                .filter(item => !this.filters.status || item.status === this.filters.status)
                .filter(item => !term || [item.category, item.description, item.date, item.status].join(' ').toLowerCase().includes(term))
                .sort((a, b) => parseLocalDate(b.date) - parseLocalDate(a.date))
        },
        filteredRevenues() {
            const term = this.searchTerm.trim().toLowerCase()
            return this.finance.revenues
                .filter(item => this.matchesPeriod(item.date))
                .filter(item => !term || [item.description, item.company, item.date].join(' ').toLowerCase().includes(term))
        },
        totalExpenses() {
            return this.filteredExpenses.reduce((sum, item) => sum + Number(item.amount || 0), 0)
        },
        totalRevenues() {
            return this.filteredRevenues.reduce((sum, item) => sum + Number(item.amount || 0), 0)
        },
        filteredCashFlow() {
            const term = this.searchTerm.trim().toLowerCase()
            return this.cashFlow
                .filter(item => this.matchesPeriod(item.date))
                .filter(item => !term || [item.type, item.description, item.category, item.related, item.date].join(' ').toLowerCase().includes(term))
        },
        cashFlowInTotal() {
            return this.filteredCashFlow
                .filter(item => item.type === 'IN')
                .reduce((sum, item) => sum + Math.abs(Number(item.amount || 0)), 0)
        },
        cashFlowOutTotal() {
            return this.filteredCashFlow
                .filter(item => item.type === 'OUT')
                .reduce((sum, item) => sum + Math.abs(Number(item.amount || 0)), 0)
        },
        cashFlowFinalBalance() {
            const last = this.filteredCashFlow[this.filteredCashFlow.length - 1]
            return Number(last?.balance || 0)
        },
        cashFlowCards() {
            return [
                { label: 'Entradas', value: this.formatMoney(this.cashFlowInTotal), hint: this.filteredCashFlow.filter(item => item.type === 'IN').length + ' lancamento(s)', icon: 'fa-arrow-down-to-bracket', type: 'IN' },
                { label: 'Saidas', value: '-' + this.formatMoney(this.cashFlowOutTotal), hint: this.filteredCashFlow.filter(item => item.type === 'OUT').length + ' lancamento(s)', icon: 'fa-arrow-up-from-bracket', type: 'OUT' },
                { label: 'Saldo final', value: this.formatMoney(this.cashFlowFinalBalance), hint: 'Saldo acumulado', icon: 'fa-wallet', type: 'BALANCE' }
            ]
        },
        categoryTotals() {
            const categories = this.filteredExpenses.reduce((acc, expense) => {
                const name = expense.category || 'Outros'
                if (!acc[name]) acc[name] = { name, total: 0, count: 0 }
                acc[name].total += Number(expense.amount || 0)
                acc[name].count += 1
                return acc
            }, {})
            return Object.values(categories).sort((a, b) => b.total - a.total)
        },
        summaryCards() {
            if (this.isDriverUser) {
                return [
                    { label: 'Meus gastos', value: this.formatMoney(this.totalExpenses), hint: 'Periodo filtrado', tone: 'expense' },
                    { label: 'Pendentes', value: String(this.filteredExpenses.filter(item => item.status === 'PENDING').length), hint: 'Aguardando aprovacao', tone: 'pending' },
                    { label: 'Correcoes', value: String(this.filteredExpenses.filter(item => item.status === 'CORRECTION_REQUESTED').length), hint: 'Precisam de ajuste', tone: 'info' }
                ]
            }
            return [
                { label: 'Receitas', value: this.formatMoney(this.summary.totalRevenue), hint: 'Entradas do periodo', tone: 'income' },
                { label: 'Despesas', value: this.formatMoney(this.summary.totalExpenses), hint: `${this.summary.expenseCount || 0} lancamento(s)`, tone: 'expense' },
                { label: 'Saldo', value: this.formatMoney(this.summary.netBalance), hint: `${this.summary.pendingExpenses || 0} pendente(s)`, tone: 'done' }
            ]
        },
        driverVehicleRequiredWithoutVehicle() { return this.isDriverUser && this.vehicleRequiredForExpense && !this.myVehicleId },
        canSaveExpense() {
            const hasBase = Boolean(this.expenseForm.date && this.expenseForm.category && this.expenseForm.amount)
            if (!hasBase) return false
            if (this.expenseForm.category === this.expenseCategories.SALARY) return Boolean(this.expenseForm.driverId)
            return this.isDriverUser ? (!this.vehicleRequiredForExpense || Boolean(this.myVehicleId)) : (!this.vehicleRequiredForExpense || Boolean(this.expenseForm.vehicleId))
        },
        canSaveRevenue() {
            return Boolean(this.revenueForm.date && this.revenueForm.description && this.revenueForm.amount)
        },
        canSaveFundMovement() {
            return Boolean(this.selectedFund?.id && this.fundMovementForm.date && this.fundMovementForm.amount)
        }
    },
    mounted() {
        window.addEventListener('profile-updated', this.syncProfile)
        this.fetchReferences()
        this.fetchFinance()
    },
    beforeUnmount() {
        window.removeEventListener('profile-updated', this.syncProfile)
    },
    methods: {
        emptyExpenseFormBase() {
            return { id: null, date: new Date().toISOString().slice(0, 10), vehicleId: '', driverId: '', category: 'Combustivel', description: '', amount: null }
        },
        emptyRevenueForm() {
            return { id: null, date: new Date().toISOString().slice(0, 10), description: '', company: '', amount: null, paid: true }
        },
        emptyFundForm() {
            return { id: null, name: '', description: '', target: 0, active: true }
        },
        emptyFundMovementForm() {
            return { type: 'IN', date: new Date().toISOString().slice(0, 10), amount: null, note: '' }
        },
        async fetchReferences() {
            try {
                if (this.isDriverUser) {
                    const [vehicle] = await getMyVehicle()
                    this.vehicles = vehicle ? [vehicle] : []
                    this.myVehicleId = vehicle?.id || ''
                    this.drivers = []
                    return
                }
                const [vehicles, drivers] = await Promise.all([listVehicles(), listDrivers()])
                this.vehicles = vehicles
                this.drivers = drivers
                this.myVehicleId = ''
            } catch (error) { console.error(error) }
        },
        async fetchFinance() {
            this.isLoading = true
            try {
                const query = this.periodQuery
                if (this.isDriverUser) {
                    const [expenses, summary] = await Promise.all([listExpenses(query), getFinanceSummary(query)])
                    this.finance.expenses = expenses
                    this.summary = summary
                    return
                }
                const [expenses, revenues, summary, cashFlow, dre, vehicleDre, salaries] = await Promise.all([
                    listExpenses(query), listRevenues(query), getFinanceSummary(query), getCashFlow(query), getDre(query), getVehicleDre(query), getSalarySettlements(query)
                ])
                this.finance.expenses = expenses
                this.finance.revenues = revenues
                this.summary = summary
                this.cashFlow = cashFlow
                this.dre = dre
                this.vehicleDre = vehicleDre
                this.salaries = salaries
            } catch (error) { console.error(error) } finally { this.isLoading = false }
        },
        syncProfile() {
            this.fetchReferences()
            this.fetchFinance()
        },
        openExpenseModal(expense = null, category = null) {
            this.expenseForm = expense ? { ...expense } : { ...this.emptyExpenseFormBase(), vehicleId: this.myVehicleId || '', category: category || this.expenseCategories.FUEL }
            this.photos = expense?.photos || []
            this.showExpenseModal = true
        },
        openRevenueModal(revenue = null) {
            this.revenueForm = revenue ? { ...revenue } : this.emptyRevenueForm()
            this.showRevenueModal = true
        },
        openFundModal(fund = null) {
            this.fundForm = fund ? { id: fund.id, name: fund.name || fund.label, description: fund.description || '', target: fund.target || 0, active: fund.active !== false } : this.emptyFundForm()
            this.showFundModal = true
        },
        openFundMovementModal(fund) {
            this.selectedFund = fund
            this.fundMovementForm = this.emptyFundMovementForm()
            this.showFundMovementModal = true
        },
        async saveExpense() {
            if (!this.canSaveExpense) return
            const payload = {
                ...this.expenseForm,
                vehicleId: this.isDriverUser ? (this.myVehicleId || null) : (this.expenseForm.vehicleId || null),
                amount: Number(this.expenseForm.amount),
                quinzenna: getQuinzenna(this.expenseForm.date),
                paid: true,
                photos: this.photos.map((photo, index) => ({ file: photo.file, name: photo.file?.name || photo.name || `comprovante-${Date.now()}-${index}`, url: photo.preview || photo.url }))
            }
            this.isLoading = true
            try {
                await saveExpenseApi(payload)
                await this.fetchFinance()
                this.cancelExpense()
            } catch (error) { console.error(error) } finally { this.isLoading = false }
        },
        async saveRevenue() {
            if (!this.canSaveRevenue) return
            this.isLoading = true
            try {
                await saveRevenueApi(this.revenueForm)
                await this.fetchFinance()
                this.cancelRevenue()
            } catch (error) { console.error(error) } finally { this.isLoading = false }
        },
        async deleteRevenue(id) {
            if (!window.confirm('Excluir esta receita?')) return
            this.isLoading = true
            try {
                await removeRevenueApi(id)
                this.finance.revenues = this.finance.revenues.filter(revenue => revenue.id !== id)
                await this.fetchFinance()
            } catch (error) { console.error(error) } finally { this.isLoading = false }
        },
        async saveFund() {
            this.isLoading = true
            try {
                await saveFinanceFundApi(this.fundForm)
                await this.fetchFinance()
                this.cancelFund()
            } catch (error) { console.error(error) } finally { this.isLoading = false }
        },
        async saveFundMovement() {
            if (!this.canSaveFundMovement) return
            this.isLoading = true
            try {
                await createFundMovementApi(this.selectedFund.id, this.fundMovementForm)
                await this.fetchFinance()
                this.cancelFundMovement()
            } catch (error) { console.error(error) } finally { this.isLoading = false }
        },
        async reviewExpense(expense, status, reviewNote = null) {
            this.isLoading = true
            try {
                await reviewExpenseApi(expense.id, { status, reviewNote })
                await this.fetchFinance()
            } catch (error) { console.error(error) } finally { this.isLoading = false }
        },
        askReview(expense, status) {
            const note = window.prompt(status === 'REJECTED' ? 'Motivo da recusa' : 'O que o motorista deve corrigir?')
            if (!note) return
            this.reviewExpense(expense, status, note)
        },
        async deleteExpense(id) {
            this.isLoading = true
            try {
                await removeExpenseApi(id)
                this.finance.expenses = this.finance.expenses.filter(expense => expense.id !== id)
            } catch (error) { console.error(error) } finally { this.isLoading = false }
        },
        cancelExpense() {
            this.showExpenseModal = false
            this.expenseForm = this.emptyExpenseFormBase()
            this.photos = []
        },
        cancelRevenue() {
            this.showRevenueModal = false
            this.revenueForm = this.emptyRevenueForm()
        },
        cancelFund() {
            this.showFundModal = false
            this.fundForm = this.emptyFundForm()
        },
        cancelFundMovement() {
            this.showFundMovementModal = false
            this.selectedFund = null
            this.fundMovementForm = this.emptyFundMovementForm()
        },
        matchesPeriod(date) {
            const parsed = parseLocalDate(date)
            return parsed.getMonth() + 1 === this.selectedMonth && parsed.getFullYear() === this.selectedYear
        },
        statusLabel(status) {
            return { PENDING: 'Pendente', APPROVED: 'Aprovada', REJECTED: 'Recusada', CORRECTION_REQUESTED: 'Correcao' }[status] || 'Aprovada'
        },
        expenseCategoryIcon(category) {
            const icons = {
                Combustivel: 'fa-gas-pump',
                'Manutencao do carro': 'fa-screwdriver-wrench',
                Pedagio: 'fa-road',
                Pneus: 'fa-circle-dot',
                Seguro: 'fa-shield-halved',
                Multa: 'fa-triangle-exclamation',
                Salario: 'fa-money-check-dollar',
                Administracao: 'fa-briefcase',
                Escritorio: 'fa-building',
                Impostos: 'fa-file-invoice-dollar',
                'Parcela/financiamento': 'fa-calendar-check',
                Outros: 'fa-receipt'
            }

            return icons[category] || 'fa-receipt'
        },
        progressWidth(value) {
            return `${Math.min(100, Math.max(0, Number(value || 0)))}%`
        },
        cashFlowTypeLabel(item) {
            return item.type === 'IN' ? 'Entrada' : 'Saida'
        },
        cashFlowTypeIcon(item) {
            return item.type === 'IN' ? 'fa-file-invoice-dollar' : 'fa-road'
        },
        cashFlowAmountLabel(item) {
            const value = Math.abs(Number(item.amount || 0))
            return (item.type === 'OUT' ? '-' : '') + this.formatMoney(value)
        },
        formatMoney(value) { return money(value) },
        formatKm(value) { return Number(value || 0).toLocaleString('pt-BR') },
        formatPercent(value) { return `${Number(value || 0).toFixed(1)}%` },
        formatDate(date) { return formatLocalDate(date) },
        openLightbox(url) { this.lightboxPhoto = url },
        closeLightbox() { this.lightboxPhoto = null }
    }
}
</script>

<style scoped>
.finance-hero,
.summary-card,
.filter-card,
.expense-card,
.finance-side,
.finance-panel,
.empty-state,
.driver-quick-panel,
.finance-tabs {
    border: 1px solid var(--border-soft);
    background: var(--surface-card);
    box-shadow: var(--shadow-soft);
}

.finance-hero {
    border-radius: 22px;
    padding: 18px;
    display: flex;
    justify-content: space-between;
    gap: 14px;
    align-items: flex-start;
}

.finance-hero h4,
.finance-hero p,
.section-title h5,
.modal-head h6 {
    margin: 0;
}

.finance-hero p,
.expense-card p,
.section-title small,
.category-row small,
.modal-head p,
.empty-state p,
.list-row small,
.cash-row small,
.vehicle-dre-row small,
.insight-row small,
.fund-card small {
    color: var(--text-muted);
}

.eyebrow {
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--primary-color);
    font-size: 11px;
    font-weight: 800;
}

.hero-actions,
.finance-tabs,
.driver-quick-panel {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
}

.hero-actions {
    justify-content: flex-end;
}

.summary-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
    margin: 12px 0;
}

.summary-card {
    border-radius: 18px;
    padding: 14px;
}

.summary-card small,
.summary-card span {
    color: var(--text-muted);
    display: block;
}

.summary-card strong {
    color: var(--text-strong);
    display: block;
    font-size: 21px;
    line-height: 1.12;
    margin: 5px 0;
}

.summary-card.income strong,
.positive {
    color: #22c55e !important;
}

.summary-card.expense strong,
.danger,
.amount.danger {
    color: #ef4444 !important;
}

.summary-card.pending strong {
    color: #f59e0b;
}

.summary-card.info strong,
.summary-card.done strong {
    color: var(--primary-color);
}

.finance-tabs {
    border-radius: 18px;
    padding: 8px;
    margin-bottom: 12px;
}

.finance-tabs button,
.driver-quick-panel button {
    border: 0;
    border-radius: 13px;
    background: var(--surface-muted);
    color: var(--text-muted);
    padding: 10px 12px;
    font-weight: 800;
}

.finance-tabs button.active {
    background: var(--primary-color);
    color: #fff;
}

.driver-quick-panel {
    border-radius: 18px;
    padding: 10px;
    margin-bottom: 12px;
}

.driver-quick-panel button {
    color: var(--text-strong);
    flex: 1 1 160px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
}

.filter-card {
    border-radius: 18px;
    padding: 10px;
    display: flex;
    gap: 10px;
    align-items: center;
    margin-bottom: 12px;
}

.search-box {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
    background: var(--surface-muted);
    border-radius: 12px;
    padding: 0 10px;
}

.search-box input {
    border: 0 !important;
    background: transparent !important;
    min-height: 42px;
    width: 100%;
}

.filter-card select {
    max-width: 150px;
}

.finance-layout {
    display: grid;
    gap: 12px;
    min-width: 0;
}

.finance-column {
    display: grid;
    gap: 12px;
    min-width: 0;
}

.finance-side,
.finance-panel {
    border-radius: 22px;
    padding: 16px;
}

.section-title,
.expense-head,
.expense-actions,
.category-row,
.modal-head,
.list-row,
.cash-row,
.vehicle-dre-row,
.dre-line {
    display: flex;
    gap: 12px;
    justify-content: space-between;
    align-items: center;
}

.category-row>div {
    display: flex;
    flex-direction: column;
}

.section-title {
    margin-bottom: 12px;
}

.section-title h5,
.expense-head strong,
.category-row strong,
.list-row strong,
.cash-row strong,
.vehicle-dre-row strong,
.dre-line strong,
.fund-card strong,
.insight-row strong {
    color: var(--text-strong);
}

.expense-card {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto minmax(112px, auto) minmax(250px, auto);
    align-items: center;
    gap: 18px 22px;
    border-radius: 18px;
    padding: 18px;
    overflow: hidden;
}

.expense-title {
    display: flex;
    align-items: center;
    gap: 18px;
    min-width: 0;
}

.expense-copy {
    min-width: 0;
}

.expense-title strong {
    display: block;
    overflow: hidden;
    color: var(--text-strong);
    font-size: 18px;
    line-height: 1.16;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.expense-meta {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 7px 14px;
    margin-top: 8px;
    color: var(--text-muted);
    font-size: 13px;
    line-height: 1.2;
}

.expense-meta span {
    display: inline-flex;
    align-items: center;
    gap: 6px;
}

.expense-meta span+span::before {
    content: '';
    width: 4px;
    height: 4px;
    margin-right: 7px;
    border-radius: 999px;
    background: currentColor;
    opacity: 0.75;
}

.expense-icon {
    display: grid;
    place-items: center;
    flex: 0 0 auto;
    width: 76px;
    height: 76px;
    border-radius: 18px;
    background: rgba(var(--primary-color-rgb), 0.14);
    color: var(--primary-color);
    font-size: 29px;
}

.expense-description {
    margin: 7px 0 0;
    color: var(--text-muted) !important;
    line-height: 1.35;
    overflow-wrap: anywhere;
}

.expense-card>.amount {
    display: block;
    justify-self: end;
    font-size: 19px;
    line-height: 1.15;
    text-align: right;
    white-space: nowrap;
}

.status-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    justify-self: center;
    max-width: 100%;
    border-radius: 999px;
    padding: 9px 16px;
    font-size: 12px;
    line-height: 1;
    font-weight: 900;
    color: var(--text-strong);
    background: var(--surface-muted);
    white-space: nowrap;
}

.status-badge.PENDING {
    color: #f59e0b;
    background: rgba(245, 158, 11, 0.14);
}

.status-badge.APPROVED {
    color: #22c55e;
    background: rgba(34, 197, 94, 0.14);
}

.status-badge.REJECTED {
    color: #ef4444;
    background: rgba(239, 68, 68, 0.14);
}

.status-badge.CORRECTION_REQUESTED {
    color: #62a8ff;
    background: rgba(98, 168, 255, 0.16);
}

.review-note {
    border-radius: 12px;
    background: rgba(98, 168, 255, 0.12);
    color: var(--text-strong) !important;
    padding: 9px;
}

.photo-strip {
    display: flex;
    gap: 8px;
    margin-top: 12px;
    padding: 10px;
    overflow-x: auto;
    border-radius: 12px;
    background: var(--surface-muted);
}

.photo-strip button {
    flex: 0 0 auto;
    width: 66px;
    height: 66px;
    padding: 0;
    overflow: hidden;
    border: 1px solid var(--border-soft);
    border-radius: 10px;
    background: var(--surface-card);
    cursor: pointer;
}

.photo-strip img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
}

.expense-actions {
    justify-content: flex-end;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 0;
}

.expense-actions>* {
    flex: 0 0 auto;
    min-width: 118px;
}

.revenue-panel {
    padding: 24px;
}

.revenue-panel-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    padding-bottom: 22px;
    border-bottom: 1px solid var(--border-soft);
}

.revenue-panel-head h5,
.revenue-panel-head p {
    margin: 0;
}

.revenue-panel-head h5 {
    color: var(--text-strong);
    font-size: 22px;
    line-height: 1.15;
}

.revenue-panel-head p,
.revenue-total small {
    color: var(--text-muted);
}

.revenue-total {
    display: grid;
    gap: 6px;
    justify-items: end;
    text-align: right;
}

.revenue-total strong {
    color: #22c55e;
    font-size: 30px;
    line-height: 1.1;
}

.revenue-list {
    display: grid;
    gap: 12px;
    padding-top: 16px;
}

.revenue-card {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(140px, auto) auto;
    align-items: center;
    gap: 18px 22px;
    border: 1px solid var(--border-soft);
    border-radius: 18px;
    background: var(--surface-muted);
    padding: 18px 20px;
}

.revenue-title {
    display: flex;
    align-items: center;
    gap: 18px;
    min-width: 0;
}

.revenue-copy {
    min-width: 0;
}

.revenue-title strong {
    display: block;
    overflow: hidden;
    color: var(--text-strong);
    font-size: 18px;
    line-height: 1.16;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.revenue-meta {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 7px 14px;
    margin-top: 8px;
    color: var(--text-muted);
    font-size: 13px;
    line-height: 1.2;
}

.revenue-meta span {
    display: inline-flex;
    align-items: center;
    gap: 7px;
}

.revenue-meta span+span::before {
    content: '';
    width: 4px;
    height: 4px;
    margin-right: 7px;
    border-radius: 999px;
    background: currentColor;
    opacity: 0.75;
}

.revenue-icon {
    display: grid;
    place-items: center;
    flex: 0 0 auto;
    width: 72px;
    height: 72px;
    border: 1px solid rgba(var(--primary-color-rgb), 0.34);
    border-radius: 18px;
    background: rgba(var(--primary-color-rgb), 0.14);
    color: var(--primary-color);
    font-size: 28px;
}

.revenue-card>.amount {
    justify-self: end;
    font-size: 19px;
    line-height: 1.15;
    text-align: right;
    white-space: nowrap;
}

.revenue-actions {
    display: inline-flex;
    justify-content: flex-end;
    gap: 12px;
}

.revenue-actions button {
    display: grid;
    place-items: center;
    width: 54px;
    height: 54px;
    border: 1px solid var(--border-soft);
    border-radius: 16px;
    background: rgba(var(--primary-color-rgb), 0.14);
    color: var(--primary-color);
    font-size: 18px;
}

.revenue-actions button.danger-action {
    border-color: rgba(239, 68, 68, 0.22);
    background: rgba(239, 68, 68, 0.14);
    color: #ef4444;
}

.cashflow-panel {
    padding: 20px;
    border-color: rgba(var(--primary-color-rgb), 0.34);
}

.cashflow-head {
    margin-bottom: 14px;
}

.cashflow-head h5 {
    margin: 4px 0 0;
    color: var(--text-strong);
    font-size: 20px;
    line-height: 1.16;
}

.cashflow-metrics {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
    margin-bottom: 12px;
}

.cashflow-metric {
    display: flex;
    align-items: center;
    gap: 16px;
    min-width: 0;
    border: 1px solid var(--border-soft);
    border-radius: 16px;
    background: var(--surface-muted);
    padding: 16px;
}

.cashflow-metric-icon {
    display: grid;
    place-items: center;
    flex: 0 0 auto;
    width: 48px;
    height: 48px;
    border-radius: 14px;
    background: rgba(var(--primary-color-rgb), 0.14);
    color: var(--primary-color);
    font-size: 20px;
}

.cashflow-metric small,
.cashflow-metric p {
    color: var(--text-muted);
}

.cashflow-metric p {
    margin: 3px 0 0;
    line-height: 1.2;
}

.cashflow-metric strong {
    display: block;
    color: var(--text-strong);
    font-size: 21px;
    line-height: 1.12;
}

.cashflow-metric.IN strong,
.cashflow-row.IN .cashflow-amount,
.cashflow-row.IN .cashflow-type-chip {
    color: #22c55e;
}

.cashflow-metric.IN .cashflow-metric-icon,
.cashflow-row.IN .cashflow-type-chip {
    background: rgba(34, 197, 94, 0.14);
}

.cashflow-metric.OUT strong,
.cashflow-row.OUT .cashflow-amount,
.cashflow-row.OUT .cashflow-type-chip {
    color: #ef4444;
}

.cashflow-metric.OUT .cashflow-metric-icon,
.cashflow-row.OUT .cashflow-type-chip {
    background: rgba(239, 68, 68, 0.14);
}

.cashflow-metric.BALANCE strong {
    color: #93c5fd;
}

.cashflow-table {
    display: grid;
    overflow-x: auto;
}

.cashflow-table-head,
.cashflow-row {
    display: grid;
    grid-template-columns: 150px minmax(220px, 1.3fr) 150px minmax(220px, 1fr) 150px 170px;
    align-items: center;
    gap: 14px;
    min-width: 1020px;
}

.cashflow-table-head {
    border-radius: 12px;
    background: rgba(148, 163, 184, 0.08);
    color: var(--text-muted);
    padding: 12px 14px;
    font-size: 13px;
    font-weight: 800;
}

.cashflow-row {
    border-bottom: 1px solid var(--border-soft);
    padding: 9px 14px;
    color: var(--text-muted);
}

.cashflow-row strong:first-of-type {
    overflow: hidden;
    color: var(--text-strong);
    text-overflow: ellipsis;
    white-space: nowrap;
}

.cashflow-type-chip,
.cashflow-balance {
    display: inline-flex;
    align-items: center;
    width: fit-content;
    border: 1px solid var(--border-soft);
    border-radius: 10px;
    padding: 7px 12px;
    font-weight: 900;
    white-space: nowrap;
}

.cashflow-type-chip {
    gap: 8px;
}

.cashflow-balance {
    justify-self: end;
    color: #bfdbfe;
    background: rgba(148, 163, 184, 0.1);
}

.cashflow-amount {
    justify-self: end;
    white-space: nowrap;
}

.category-list,
.panel-grid,
.fund-grid {
    display: grid;
    gap: 10px;
}

.category-row,
.list-row,
.cash-row,
.vehicle-dre-row,
.dre-line,
.fund-card,
.insight-row {
    border-radius: 14px;
    background: var(--surface-muted);
    padding: 11px;
}

.category-row span,
.list-row span,
.cash-row span,
.vehicle-dre-row span {
    font-weight: 900;
    white-space: nowrap;
}

.row-value-actions {
    display: flex;
    align-items: center;
    gap: 10px;
}

.row-actions {
    display: inline-flex;
    gap: 6px;
}

.row-actions button {
    width: 34px;
    height: 34px;
    border: 0;
    border-radius: 11px;
    background: rgba(var(--primary-color-rgb), 0.14);
    color: var(--primary-color);
}

.row-actions button.danger-action {
    background: rgba(239, 68, 68, 0.14);
    color: #ef4444;
}

.cash-row.IN span {
    color: #22c55e;
}

.cash-row.OUT span {
    color: #ef4444;
}

.dre-line.total {
    border: 1px solid rgba(var(--primary-color-rgb), 0.28);
}

.fund-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
}

.fund-card span {
    display: block;
    color: var(--text-strong);
    font-size: 18px;
    font-weight: 900;
    margin-top: 6px;
}

.progress-line {
    height: 7px;
    border-radius: 999px;
    background: rgba(148, 163, 184, 0.2);
    overflow: hidden;
    margin-top: 9px;
}

.progress-line i {
    display: block;
    height: 100%;
    background: var(--primary-color);
}

.fund-actions {
    display: flex;
    gap: 8px;
    margin-top: 10px;
}

.fund-actions button {
    border: 0;
    border-radius: 11px;
    background: rgba(var(--primary-color-rgb), 0.14);
    color: var(--primary-color);
    padding: 8px 10px;
    font-size: 12px;
    font-weight: 800;
}

.insight-row {
    display: grid;
    grid-template-columns: auto 1fr;
    justify-content: start;
}

.empty-state {
    border-radius: 20px;
    padding: 28px 18px;
    text-align: center;
    border-style: dashed;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
}

.empty-state.compact {
    min-height: 110px;
    justify-content: center;
}

.empty-icon,
.modal-icon {
    width: 46px;
    height: 46px;
    border-radius: 15px;
    background: var(--primary-soft);
    color: var(--primary-color);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;
}

.empty-icon.small {
    width: 38px;
    height: 38px;
}

.modal-head {
    justify-content: flex-start;
    align-items: center;
    margin-bottom: 14px;
}

.positive-bg {
    color: #22c55e;
    background: rgba(34, 197, 94, 0.14);
}

.mini-empty {
    display: flex;
    gap: 10px;
    border-radius: 14px;
    background: var(--surface-muted);
    padding: 12px;
}

.lightbox {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.86);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
}

.lightbox-image {
    max-width: 90vw;
    max-height: 90vh;
    object-fit: contain;
    border-radius: 12px;
}

.lightbox-close {
    position: absolute;
    top: 16px;
    right: 16px;
    background: rgba(255, 255, 255, 0.12);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: white;
    border-radius: 999px;
    width: 42px;
    height: 42px;
}

@media (min-width: 900px) {
    .finance-layout {
        grid-template-columns: minmax(0, 1fr) 320px;
        align-items: start;
    }

    .finance-side {
        position: sticky;
        top: 18px;
    }

    .panel-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .finance-panel.wide {
        grid-column: 1 / -1;
    }
}

@media (max-width: 700px) {
    .finance-page .container {
        padding-right: 10px;
        padding-left: 10px;
    }

    .finance-hero,
    .hero-actions,
    .filter-card,
    .section-title {
        flex-direction: column;
        align-items: stretch;
    }

    .expense-card {
        grid-template-columns: 1fr;
        width: 100%;
        min-width: 0;
        padding: 12px;
        border-radius: 16px;
    }

    .expense-title {
        width: 100%;
        align-items: flex-start;
        gap: 10px;
    }

    .expense-title strong {
        white-space: normal;
        overflow-wrap: anywhere;
    }

    .expense-meta {
        gap: 5px 10px;
        font-size: 11px;
    }

    .expense-icon {
        width: 52px;
        height: 52px;
        border-radius: 14px;
        font-size: 20px;
    }

    .expense-card>.status-badge {
        justify-self: start;
    }

    .expense-card>.amount {
        justify-self: start;
        font-size: 16px;
        text-align: left;
    }

    .expense-actions {
        width: 100%;
        justify-content: stretch;
    }

    .expense-actions>* {
        flex: 1 1 120px;
        min-width: 0;
    }

    .status-badge {
        padding: 7px 10px;
        font-size: 10px;
    }

    .expense-description {
        margin-top: 8px;
        font-size: 13px;
    }

    .photo-strip {
        gap: 6px;
        margin-top: 10px;
        padding: 8px;
    }

    .photo-strip button {
        width: 54px;
        height: 54px;
        border-radius: 9px;
    }

    .revenue-panel {
        padding: 16px;
    }

    .revenue-panel-head {
        flex-direction: column;
        align-items: stretch;
        padding-bottom: 16px;
    }

    .revenue-total {
        justify-items: start;
        text-align: left;
    }

    .revenue-total strong {
        font-size: 24px;
    }

    .revenue-card {
        grid-template-columns: 1fr;
        padding: 12px;
        border-radius: 16px;
    }

    .revenue-title {
        align-items: flex-start;
        gap: 10px;
    }

    .revenue-title strong {
        white-space: normal;
        overflow-wrap: anywhere;
    }

    .revenue-meta {
        gap: 5px 10px;
        font-size: 11px;
    }

    .revenue-icon {
        width: 52px;
        height: 52px;
        border-radius: 14px;
        font-size: 20px;
    }

    .revenue-card>.amount {
        justify-self: start;
        font-size: 16px;
        text-align: left;
    }

    .revenue-actions {
        width: 100%;
        justify-content: stretch;
    }

    .revenue-actions button {
        flex: 1;
        width: auto;
        height: 46px;
        border-radius: 14px;
    }

    .cashflow-panel {
        padding: 14px;
    }

    .cashflow-metrics {
        grid-template-columns: 1fr;
    }

    .cashflow-metric {
        padding: 12px;
    }

    .cashflow-table-head {
        display: none;
    }

    .cashflow-table {
        overflow-x: visible;
        gap: 10px;
    }

    .cashflow-row {
        grid-template-columns: 1fr;
        min-width: 0;
        gap: 7px;
        border: 1px solid var(--border-soft);
        border-radius: 14px;
        background: var(--surface-muted);
        padding: 12px;
    }

    .cashflow-amount,
    .cashflow-balance {
        justify-self: start;
    }

    .summary-grid,
    .fund-grid {
        grid-template-columns: 1fr;
    }

    .filter-card select {
        max-width: none;
    }
}
</style>
