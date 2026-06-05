<template>
    <div class="finance-page premium-page min-vh-100">
        <div class="container py-1">
            <section class="finance-hero">
                <div>
                    <span class="eyebrow">{{ isDriverUser ? 'Financeiro do motorista' : 'Centro financeiro' }}</span>
                    <h4>{{ isDriverUser ? 'Meus gastos' : 'Financeiro' }}</h4>
                    <p>{{ isDriverUser ? 'Registre gastos do seu veiculo e acompanhe aprovacoes.' : 'Despesas, receitas, caixa, DRE, fundos e pagamentos em uma visao organizada.' }}</p>
                </div>
                <div class="hero-actions">
                    <ButtonComp btn-class="button-primary button-big" :click-action="openExpenseModal">
                        <i class="fa-solid fa-plus"></i>
                        Nova despesa
                    </ButtonComp>
                    <ButtonComp v-if="!isDriverUser" btn-class="button-secundary button-big" :click-action="openRevenueModal">
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
                    <button v-for="action in quickExpenseActions" :key="action.category" type="button" @click="openExpenseModal(null, action.category)">
                        <i class="fa-solid" :class="action.icon"></i>
                        <span>{{ action.label }}</span>
                    </button>
                </section>

                <nav class="finance-tabs" v-if="!isDriverUser">
                    <button v-for="tab in adminTabs" :key="tab.key" type="button" :class="{ active: activeTab === tab.key }" @click="activeTab = tab.key">
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
                        <option v-for="month in months" :key="month.value" :value="month.value">{{ month.label }}</option>
                    </select>
                    <select v-model.number="selectedYear" class="form-select" @change="fetchFinance">
                        <option v-for="year in years" :key="year" :value="year">{{ year }}</option>
                    </select>
                    <select v-if="!isDriverUser && activeTab === 'expenses'" v-model="filters.status" class="form-select">
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
                            <div class="expense-head">
                                <div>
                                    <strong>{{ expense.category }}</strong>
                                    <small>{{ formatDate(expense.date) }} - {{ expense.quinzenna }} quinzena</small>
                                </div>
                                <div class="amount-stack">
                                    <span class="status-badge" :class="expense.status">{{ statusLabel(expense.status) }}</span>
                                    <strong class="amount danger">{{ formatMoney(expense.amount) }}</strong>
                                </div>
                            </div>

                            <p>{{ expense.description || 'Sem descricao' }}</p>
                            <p v-if="expense.reviewNote" class="review-note">{{ expense.reviewNote }}</p>

                            <div class="photo-strip" v-if="expense.photos?.length">
                                <img v-for="(photo, index) in expense.photos" :key="index" :src="photo.url || photo.preview" @click="openLightbox(photo.url || photo.preview)" />
                            </div>

                            <div class="expense-actions" v-if="canManageExpenses && expense.editable">
                                <ButtonComp btn-class="button-secundary w-100" :click-action="() => openExpenseModal(expense)">Editar</ButtonComp>
                                <ButtonComp v-if="expense.status === 'PENDING'" btn-class="button-primary w-100" :click-action="() => reviewExpense(expense, 'APPROVED')">Aprovar</ButtonComp>
                                <ButtonComp v-if="expense.status === 'PENDING'" btn-class="button-secundary w-100" :click-action="() => askReview(expense, 'CORRECTION_REQUESTED')">Corrigir</ButtonComp>
                                <ButtonComp v-if="expense.status === 'PENDING'" btn-class="button-secundary-red w-100" :click-action="() => askReview(expense, 'REJECTED')">Recusar</ButtonComp>
                                <ButtonComp btn-class="button-secundary-red w-100" :click-action="() => deleteExpense(expense.id)">Excluir</ButtonComp>
                            </div>
                        </article>

                        <div v-if="!filteredExpenses.length" class="empty-state">
                            <span class="empty-icon"><i class="fa-solid fa-receipt"></i></span>
                            <strong>Nenhuma despesa encontrada</strong>
                            <p>{{ isDriverUser ? 'Use os botoes rapidos para registrar um gasto do veiculo.' : 'Crie uma despesa ou ajuste os filtros do periodo.' }}</p>
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
                            <div><strong>Sem categorias</strong><p>Nenhuma despesa encontrada.</p></div>
                        </div>
                    </aside>
                </section>

                <section v-if="!isDriverUser && activeTab === 'revenues'" class="panel-grid">
                    <article class="finance-panel wide">
                        <div class="section-title">
                            <div><span class="eyebrow">Receitas</span><h5>Entradas registradas</h5></div>
                            <strong class="positive">{{ formatMoney(totalRevenues) }}</strong>
                        </div>
                        <div v-for="revenue in filteredRevenues" :key="revenue.id" class="list-row revenue-row">
                            <div><strong>{{ revenue.description }}</strong><small>{{ formatDate(revenue.date) }} - {{ revenue.company || 'Sem cliente' }}</small></div>
                            <div class="row-value-actions">
                                <span class="positive">{{ formatMoney(revenue.amount) }}</span>
                                <div class="row-actions">
                                    <button type="button" @click="openRevenueModal(revenue)" title="Editar receita">
                                        <i class="fa-solid fa-pen"></i>
                                    </button>
                                    <button type="button" class="danger-action" @click="deleteRevenue(revenue.id)" title="Excluir receita">
                                        <i class="fa-solid fa-trash"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div v-if="!filteredRevenues.length" class="empty-state compact"><strong>Nenhuma receita no periodo</strong></div>
                    </article>
                </section>

                <section v-if="!isDriverUser && activeTab === 'cashflow'" class="finance-panel">
                    <div class="section-title"><div><span class="eyebrow">Fluxo de caixa</span><h5>Entradas, saidas e saldo acumulado</h5></div></div>
                    <div v-for="item in cashFlow" :key="item.id" class="cash-row" :class="item.type">
                        <div><strong>{{ item.description }}</strong><small>{{ formatDate(item.date) }} - {{ item.category }} - {{ item.related }}</small></div>
                        <div><span>{{ formatMoney(item.amount) }}</span><small>Saldo {{ formatMoney(item.balance) }}</small></div>
                    </div>
                </section>

                <section v-if="!isDriverUser && activeTab === 'dre'" class="panel-grid">
                    <article class="finance-panel">
                        <div class="section-title"><div><span class="eyebrow">DRE geral</span><h5>Resultado do mes</h5></div></div>
                        <div class="dre-line positive"><span>Receitas</span><strong>{{ formatMoney(dre.totalRevenue) }}</strong></div>
                        <div v-for="category in dre.categories" :key="category.category" class="dre-line"><span>{{ category.category }}</span><strong>{{ formatMoney(category.total) }}</strong></div>
                        <div class="dre-line total"><span>Lucro liquido</span><strong>{{ formatMoney(dre.netProfit) }}</strong></div>
                    </article>
                    <article class="finance-panel">
                        <div class="section-title"><div><span class="eyebrow">DRE por Fiorino</span><h5>Lucro real por veiculo</h5></div></div>
                        <div v-for="vehicle in vehicleDre" :key="vehicle.vehicleId" class="vehicle-dre-row">
                            <div><strong>{{ vehicle.plate }}</strong><small>{{ vehicle.driver }} - {{ formatKm(vehicle.km) }} km</small></div>
                            <div><span :class="{ positive: vehicle.netProfit >= 0, danger: vehicle.netProfit < 0 }">{{ formatMoney(vehicle.netProfit) }}</span><small>{{ formatPercent(vehicle.margin) }}</small></div>
                        </div>
                    </article>
                </section>

                <section v-if="!isDriverUser && activeTab === 'funds'" class="finance-panel">
                    <div class="section-title">
                        <div><span class="eyebrow">Fundos e reservas</span><h5>Caixinhas financeiras</h5></div>
                        <ButtonComp btn-class="button-primary" :click-action="openFundModal">
                            <i class="fa-solid fa-plus"></i>
                            Novo fundo
                        </ButtonComp>
                    </div>
                    <div class="fund-grid">
                        <div v-for="fund in funds.funds" :key="fund.key" class="fund-card">
                            <strong>{{ fund.label }}</strong>
                            <span>{{ formatMoney(fund.value) }}</span>
                            <small>Meta {{ formatMoney(fund.target) }}</small>
                            <div class="progress-line"><i :style="{ width: progressWidth(fund.progress) }"></i></div>
                            <div class="fund-actions">
                                <button type="button" @click="openFundModal(fund)">Editar meta</button>
                                <button type="button" @click="openFundMovementModal(fund)">Movimentar</button>
                            </div>
                        </div>
                    </div>
                </section>

                <section v-if="!isDriverUser && activeTab === 'salaries'" class="finance-panel">
                    <div class="section-title"><div><span class="eyebrow">Salarios</span><h5>Motoristas e pagamentos</h5></div></div>
                    <div v-for="salary in salaries" :key="salary.driverId" class="list-row">
                        <div><strong>{{ salary.driver }}</strong><small>{{ salary.vehicle }} - descontos {{ formatMoney(salary.discounts) }}</small></div>
                        <span>{{ formatMoney(salary.totalToPay) }}</span>
                    </div>
                </section>

                <section v-if="!isDriverUser && activeTab === 'insights'" class="finance-panel">
                    <div class="section-title"><div><span class="eyebrow">Insights</span><h5>Alertas financeiros</h5></div></div>
                    <div v-for="insight in insights" :key="`${insight.title}-${insight.text}`" class="insight-row" :class="insight.tone">
                        <i class="fa-solid fa-circle-info"></i>
                        <div><strong>{{ insight.title }}</strong><small>{{ insight.text }}</small></div>
                    </div>
                </section>
            </template>
        </div>

        <ModalDefault :isLoading="isLoading" :is-visible="showExpenseModal" max-width="460px" min-width="320px" @update:isVisible="cancelExpense">
            <div class="modal-head">
                <span class="modal-icon"><i class="fa-solid fa-receipt"></i></span>
                <div><h6>{{ expenseForm.id ? 'Editar despesa' : 'Nova despesa' }}</h6><p>Foto do comprovante e descricao ajudam na aprovacao.</p></div>
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
                    <option value="">{{ vehicleRequiredForExpense ? 'Selecione um veiculo' : 'Sem vinculo com veiculo' }}</option>
                    <option v-for="vehicle in vehicles" :key="vehicle.id" :value="vehicle.id">{{ vehicle.plate }} - {{ vehicle.model }}</option>
                </select>
            </template>
            <template v-if="expenseForm.category === expenseCategories.SALARY">
                <label class="form-label">Motorista</label>
                <select v-model="expenseForm.driverId" class="form-select w-100 mb-2">
                    <option value="">Selecione um motorista</option>
                    <option v-for="driver in drivers" :key="driver.id" :value="driver.id">{{ driver.name }} - {{ driver.email }}</option>
                </select>
            </template>
            <label class="form-label">Descricao</label>
            <input type="text" v-model="expenseForm.description" class="w-100 mb-2" placeholder="Ex: abastecimento, pedagio, troca de pneu" />
            <label class="form-label">Valor</label>
            <input type="number" v-model.number="expenseForm.amount" class="w-100 mb-2" placeholder="0,00" />
            <label class="form-label">Comprovante</label>
            <PhotoUploadComp v-model="photos" />
            <ButtonComp btn-class="button-primary button-big w-100 mt-2" :is-disabled="!canSaveExpense" :click-action="saveExpense">Salvar despesa</ButtonComp>
        </ModalDefault>

        <ModalDefault :isLoading="isLoading" :is-visible="showFundModal" max-width="460px" min-width="320px" @update:isVisible="cancelFund">
            <div class="modal-head">
                <span class="modal-icon"><i class="fa-solid fa-vault"></i></span>
                <div><h6>{{ fundForm.id ? 'Editar fundo' : 'Novo fundo' }}</h6><p>Defina a meta e o nome da caixinha.</p></div>
            </div>
            <label class="form-label">Nome</label>
            <input type="text" v-model="fundForm.name" class="w-100 mb-2" />
            <label class="form-label">Descricao</label>
            <input type="text" v-model="fundForm.description" class="w-100 mb-2" />
            <label class="form-label">Meta</label>
            <input type="number" v-model.number="fundForm.target" class="w-100 mb-2" />
            <ButtonComp btn-class="button-primary button-big w-100 mt-2" :is-disabled="!fundForm.name" :click-action="saveFund">Salvar fundo</ButtonComp>
        </ModalDefault>

        <ModalDefault :isLoading="isLoading" :is-visible="showFundMovementModal" max-width="460px" min-width="320px" @update:isVisible="cancelFundMovement">
            <div class="modal-head">
                <span class="modal-icon"><i class="fa-solid fa-money-bill-transfer"></i></span>
                <div><h6>Movimentar fundo</h6><p>{{ selectedFund?.label || selectedFund?.name }}</p></div>
            </div>
            <label class="form-label">Tipo</label>
            <select v-model="fundMovementForm.type" class="form-select w-100 mb-2">
                <option value="IN">Entrada</option>
                <option value="OUT">Saida</option>
            </select>
            <label class="form-label">Data</label>
            <input type="date" v-model="fundMovementForm.date" class="w-100 mb-2" />
            <label class="form-label">Valor</label>
            <input type="number" v-model.number="fundMovementForm.amount" class="w-100 mb-2" />
            <label class="form-label">Observacao</label>
            <input type="text" v-model="fundMovementForm.note" class="w-100 mb-2" />
            <ButtonComp btn-class="button-primary button-big w-100 mt-2" :is-disabled="!canSaveFundMovement" :click-action="saveFundMovement">Salvar movimento</ButtonComp>
        </ModalDefault>

        <ModalDefault :isLoading="isLoading" :is-visible="showRevenueModal" max-width="460px" min-width="320px" @update:isVisible="cancelRevenue">
            <div class="modal-head">
                <span class="modal-icon positive-bg"><i class="fa-solid fa-arrow-trend-up"></i></span>
                <div><h6>{{ revenueForm.id ? 'Editar receita' : 'Nova receita' }}</h6><p>Registre entradas por cliente/transportadora.</p></div>
            </div>
            <label class="form-label">Data</label>
            <input type="date" v-model="revenueForm.date" class="w-100 mb-2" />
            <label class="form-label">Descricao</label>
            <input type="text" v-model="revenueForm.description" class="w-100 mb-2" />
            <label class="form-label">Cliente/transportadora</label>
            <input type="text" v-model="revenueForm.company" class="w-100 mb-2" />
            <label class="form-label">Valor</label>
            <input type="number" v-model.number="revenueForm.amount" class="w-100 mb-2" />
            <ButtonComp btn-class="button-primary button-big w-100 mt-2" :is-disabled="!canSaveRevenue" :click-action="saveRevenue">Salvar receita</ButtonComp>
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
    getFinanceFunds,
    getFinanceInsights,
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
                { key: 'funds', label: 'Fundos', icon: 'fa-vault' },
                { key: 'salaries', label: 'Salarios', icon: 'fa-id-card' },
                { key: 'insights', label: 'Insights', icon: 'fa-lightbulb' }
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
        canSaveExpense() {
            const hasBase = Boolean(this.expenseForm.date && this.expenseForm.category && this.expenseForm.amount)
            if (!hasBase) return false
            if (this.expenseForm.category === this.expenseCategories.SALARY) return Boolean(this.expenseForm.driverId)
            return this.isDriverUser ? Boolean(this.myVehicleId) : (!this.vehicleRequiredForExpense || Boolean(this.expenseForm.vehicleId))
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
                    const [expenses, summary, insights] = await Promise.all([listExpenses(query), getFinanceSummary(query), getFinanceInsights(query)])
                    this.finance.expenses = expenses
                    this.summary = summary
                    this.insights = insights
                    return
                }
                const [expenses, revenues, summary, cashFlow, dre, vehicleDre, funds, salaries, insights] = await Promise.all([
                    listExpenses(query), listRevenues(query), getFinanceSummary(query), getCashFlow(query), getDre(query), getVehicleDre(query), getFinanceFunds(query), getSalarySettlements(query), getFinanceInsights(query)
                ])
                this.finance.expenses = expenses
                this.finance.revenues = revenues
                this.summary = summary
                this.cashFlow = cashFlow
                this.dre = dre
                this.vehicleDre = vehicleDre
                this.funds = funds
                this.salaries = salaries
                this.insights = insights
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
                vehicleId: this.isDriverUser ? this.myVehicleId : (this.expenseForm.vehicleId || null),
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
        progressWidth(value) {
            return `${Math.min(100, Math.max(0, Number(value || 0)))}%`
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
}

.finance-column {
    display: grid;
    gap: 12px;
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
    align-items: flex-start;
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
    border-radius: 18px;
    padding: 14px;
}

.amount-stack {
    text-align: right;
}

.status-badge {
    display: inline-block;
    border-radius: 999px;
    padding: 5px 8px;
    font-size: 11px;
    font-weight: 900;
    color: var(--text-strong);
    background: var(--surface-muted);
    margin-bottom: 5px;
}

.status-badge.PENDING { color: #f59e0b; background: rgba(245, 158, 11, 0.14); }
.status-badge.APPROVED { color: #22c55e; background: rgba(34, 197, 94, 0.14); }
.status-badge.REJECTED { color: #ef4444; background: rgba(239, 68, 68, 0.14); }
.status-badge.CORRECTION_REQUESTED { color: #62a8ff; background: rgba(98, 168, 255, 0.16); }

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
    padding: 8px;
    overflow-x: auto;
    border-radius: 12px;
    background: var(--surface-muted);
}

.photo-strip img {
    flex: 0 0 auto;
    width: 64px;
    height: 64px;
    border-radius: 10px;
    object-fit: cover;
    cursor: pointer;
}

.expense-actions {
    margin-top: 12px;
    flex-wrap: wrap;
}

.expense-actions > * {
    min-width: 110px;
    flex: 1;
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
    .finance-hero,
    .hero-actions,
    .filter-card,
    .section-title,
    .expense-head {
        flex-direction: column;
        align-items: stretch;
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
