<template>
    <div class="finance-page premium-page min-vh-100">
        <div class="container py-1">
            <section class="finance-hero">
                <div>
                    <span class="eyebrow">{{ isDriver ? 'Lançamentos do motorista' : 'Administração financeira' }}</span>
                    <h4>Financeiro</h4>
                    <p>{{ isDriver ? 'Registre gastos de campo com comprovante opcional.' : 'Controle receitas, despesas e solicite extratos de fretes.' }}</p>
                </div>

                <div class="hero-actions">
                    <ButtonComp v-if="!isDriver" btn-class="button-secundary button-big" :click-action="openRevenueModal">
                        <i class="fa-solid fa-circle-dollar-to-slot"></i>
                        Nova receita
                    </ButtonComp>
                    <ButtonComp btn-class="button-primary button-big" :click-action="openExpenseModal">
                        <i class="fa-solid fa-plus"></i>
                        Nova despesa
                    </ButtonComp>
                </div>
            </section>

            <section class="summary-grid">
                <article v-for="card in summaryCards" :key="card.label" class="summary-card" :class="card.tone">
                    <small>{{ card.label }}</small>
                    <strong>{{ formatMoney(card.value) }}</strong>
                    <span>{{ card.hint }}</span>
                </article>
            </section>

            <section class="filter-card">
                <div class="search-box">
                    <i class="fa-solid fa-magnifying-glass"></i>
                    <input v-model="searchTerm" type="text" placeholder="Buscar por categoria, descrição ou data" />
                </div>
                <select v-model.number="selectedMonth" class="form-select">
                    <option v-for="month in months" :key="month.value" :value="month.value">{{ month.label }}</option>
                </select>
                <select v-model.number="selectedYear" class="form-select">
                    <option v-for="year in years" :key="year" :value="year">{{ year }}</option>
                </select>
            </section>

            <section class="finance-layout">
                <div class="finance-column">
                    <div class="section-title">
                        <div>
                            <span class="eyebrow">Despesas</span>
                            <h5>Gastos registrados</h5>
                        </div>
                        <strong>{{ formatMoney(totalExpenses) }}</strong>
                    </div>

                    <article v-for="expense in filteredExpenses" :key="expense.id" class="expense-card">
                        <div class="expense-head">
                            <div>
                                <strong>{{ expense.category }}</strong>
                                <small>{{ formatDate(expense.date) }} • {{ expense.quinzenna }} quinzena</small>
                            </div>
                            <span class="amount danger">{{ formatMoney(expense.amount) }}</span>
                        </div>

                        <p>{{ expense.description || 'Sem descrição' }}</p>

                        <div class="photo-strip" v-if="expense.photos?.length">
                            <img v-for="(photo, index) in expense.photos" :key="index" :src="photo.url || photo.preview" @click="openLightbox(photo.url || photo.preview)" />
                        </div>

                        <div class="expense-actions" v-if="!isDriver">
                            <ButtonComp btn-class="button-secundary w-100" :click-action="() => openExpenseModal(expense)">
                                Editar
                            </ButtonComp>
                            <ButtonComp btn-class="button-secundary-red w-100" :click-action="() => deleteExpense(expense.id)">
                                Excluir
                            </ButtonComp>
                        </div>
                    </article>

                    <div v-if="!filteredExpenses.length" class="empty-state">
                        <span class="empty-icon">
                            <i class="fa-solid fa-receipt"></i>
                        </span>
                        <strong>Nenhuma despesa encontrada</strong>
                        <p>Crie uma despesa ou ajuste os filtros do período.</p>
                    </div>
                </div>

                <aside class="finance-side">
                    <div class="section-title">
                        <div>
                            <span class="eyebrow">Entradas</span>
                            <h5>Recebimentos</h5>
                        </div>
                        <strong>{{ formatMoney(totalRevenue) }}</strong>
                    </div>

                    <div class="revenue-row" v-for="revenue in filteredRevenues" :key="revenue.id">
                        <div>
                            <strong>{{ revenue.description }}</strong>
                            <small>{{ revenue.quinzenna }} quinzena • {{ formatDate(revenue.date) }}</small>
                        </div>
                        <span>{{ formatMoney(revenue.amount) }}</span>
                    </div>

                    <div v-if="!filteredRevenues.length" class="mini-empty">
                        <span class="empty-icon small">
                            <i class="fa-solid fa-wallet"></i>
                        </span>
                        <div>
                            <strong>Nenhuma receita</strong>
                            <p>Nenhum recebimento encontrado neste período.</p>
                        </div>
                        Nenhuma receita no período.
                    </div>

                    <div class="revenue-admin-list" v-if="!isDriver && filteredRevenues.length">
                        <ButtonComp
                            v-for="revenue in filteredRevenues"
                            :key="`edit-${revenue.id}`"
                            btn-class="button-secundary w-100"
                            :click-action="() => openRevenueModal(revenue)">
                            Editar {{ formatDate(revenue.date) }}
                        </ButtonComp>
                    </div>

                    <div class="admin-panel" v-if="!isDriver">
                        <div class="section-title compact">
                            <div>
                                <span class="eyebrow">Fretes</span>
                                <h5>Pedido de extrato</h5>
                            </div>
                        </div>

                        <label class="form-label">Data inicial</label>
                        <input v-model="statementForm.startDate" type="date" class="w-100 mb-2" />

                        <label class="form-label">Data final</label>
                        <input v-model="statementForm.endDate" type="date" class="w-100 mb-2" />

                        <label class="form-label">Empresa</label>
                        <input v-model="statementForm.company" type="text" class="w-100 mb-2" placeholder="Ex: Empresa contratante" />

                        <label class="form-label">Observação</label>
                        <textarea v-model="statementForm.note" class="w-100 statement-note" placeholder="Ex: gerar planilha por frete, data, nota e valor"></textarea>

                        <ButtonComp btn-class="button-primary button-big w-100 mt-2" :is-disabled="!canRequestStatement" :click-action="requestStatement">
                            Solicitar extrato
                        </ButtonComp>

                        <div class="request-list" v-if="finance.statementRequests.length">
                            <div v-for="request in finance.statementRequests" :key="request.id" class="request-row">
                                <div>
                                    <strong>{{ request.company }}</strong>
                                    <small>{{ formatDate(request.startDate) }} - {{ formatDate(request.endDate) }}</small>
                                </div>
                                <span>{{ request.status }}</span>
                            </div>
                        </div>
                    </div>
                </aside>
            </section>
        </div>

        <ModalDefault :isLoading="false" :is-visible="showExpenseModal" max-width="460px" min-width="320px"
            @update:isVisible="cancelExpense">
            <div class="modal-head">
                <span class="modal-icon"><i class="fa-solid fa-receipt"></i></span>
                <div>
                    <h6>{{ expenseForm.id ? 'Editar despesa' : 'Nova despesa' }}</h6>
                    <p>Foto do comprovante é opcional.</p>
                </div>
            </div>

            <label class="form-label">Data</label>
            <input type="date" v-model="expenseForm.date" class="w-100 mb-2" />

            <label class="form-label">Categoria</label>
            <select v-model="expenseForm.category" class="form-select w-100 mb-2">
                <option value="Gasolina e pedagio">Gasolina e pedagio</option>
                <option value="Manutencao do carro">Manutencao do carro</option>
                <option value="Pneus">Pneus</option>
                <option value="Seguro">Seguro</option>
                <option value="Multa">Multa</option>
                <option value="Outros">Outros</option>
            </select>

            <label class="form-label">Descricao</label>
            <input type="text" v-model="expenseForm.description" class="w-100 mb-2" placeholder="Ex: troca de pneu dianteiro" />

            <label class="form-label">Valor</label>
            <input type="number" v-model.number="expenseForm.amount" class="w-100 mb-2" placeholder="0,00" />

            <label class="form-label">Comprovante</label>
            <PhotoUploadComp v-model="photos" />

            <ButtonComp btn-class="button-primary button-big w-100 mt-2" :is-disabled="!canSaveExpense" :click-action="saveExpense">
                Salvar despesa
            </ButtonComp>
        </ModalDefault>

        <ModalDefault :isLoading="false" :is-visible="showRevenueModal" max-width="460px" min-width="320px"
            @update:isVisible="cancelRevenue">
            <div class="modal-head">
                <span class="modal-icon"><i class="fa-solid fa-circle-dollar-to-slot"></i></span>
                <div>
                    <h6>{{ revenueForm.id ? 'Editar receita' : 'Nova receita' }}</h6>
                    <p>Registre recebimentos de fretes ou pagamentos da empresa.</p>
                </div>
            </div>

            <label class="form-label">Data</label>
            <input type="date" v-model="revenueForm.date" class="w-100 mb-2" />

            <label class="form-label">Descricao</label>
            <input type="text" v-model="revenueForm.description" class="w-100 mb-2" placeholder="Ex: Recebimento Empresa" />

            <label class="form-label">Empresa</label>
            <input type="text" v-model="revenueForm.company" class="w-100 mb-2" placeholder="Ex: Empresa contratante" />

            <label class="form-label">Valor</label>
            <input type="number" v-model.number="revenueForm.amount" class="w-100 mb-2" placeholder="0,00" />

            <div class="modal-actions">
                <ButtonComp
                    v-if="revenueForm.id"
                    btn-class="button-secundary-red w-100"
                    :click-action="() => deleteRevenue(revenueForm.id)">
                    Excluir
                </ButtonComp>
                <ButtonComp btn-class="button-primary button-big w-100" :is-disabled="!canSaveRevenue" :click-action="saveRevenue">
                    Salvar receita
                </ButtonComp>
            </div>
        </ModalDefault>

        <div v-if="lightboxPhoto" class="lightbox" @click.self="closeLightbox">
            <button class="lightbox-close" @click="closeLightbox">
                <i class="fa-solid fa-xmark"></i>
            </button>
            <img :src="lightboxPhoto" class="lightbox-image" />
        </div>
    </div>
</template>

<script>
import ButtonComp from '@/components/ButtonComp.vue'
import ModalDefault from '@/components/modals/ModalDefault.vue'
import PhotoUploadComp from '@/components/PhotoUploadComp.vue'
import { getFinanceData, getQuinzenna, money } from '@/services/financeStore'
import {
    createStatementRequestApi,
    formatLocalDate,
    listExpenses,
    listRevenues,
    listStatementRequests,
    parseLocalDate,
    removeExpenseApi,
    removeRevenueApi,
    saveRevenueApi,
    saveExpenseApi
} from '@/services/backendService'

export default {
    name: 'FinanceView',

    components: {
        ButtonComp,
        ModalDefault,
        PhotoUploadComp
    },

    data() {
        return {
            finance: getFinanceData(),
            profileType: localStorage.getItem('profileType') || 'driver',
            selectedMonth: new Date().getMonth() + 1,
            selectedYear: new Date().getFullYear(),
            searchTerm: '',
            showExpenseModal: false,
            showRevenueModal: false,
            expenseForm: this.emptyExpenseForm(),
            revenueForm: this.emptyRevenueForm(),
            photos: [],
            lightboxPhoto: null,
            statementForm: {
                startDate: '',
                endDate: '',
                company: '',
                note: ''
            },
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
            years: [2024, 2025, 2026, 2027]
        }
    },

    computed: {
        isDriver() {
            return this.profileType === 'driver'
        },

        filteredRevenues() {
            return this.finance.revenues.filter(item => this.matchesPeriod(item.date))
        },

        filteredExpenses() {
            const term = this.searchTerm.trim().toLowerCase()

            return this.finance.expenses
                .filter(item => this.matchesPeriod(item.date))
                .filter(item => {
                    const haystack = [item.category, item.description, item.date].join(' ').toLowerCase()
                    return !term || haystack.includes(term)
                })
                .sort((a, b) => parseLocalDate(b.date) - parseLocalDate(a.date))
        },

        totalRevenue() {
            return this.filteredRevenues.reduce((sum, item) => sum + Number(item.amount || 0), 0)
        },

        totalExpenses() {
            return this.filteredExpenses.reduce((sum, item) => sum + Number(item.amount || 0), 0)
        },

        finalBalance() {
            return this.totalRevenue - this.totalExpenses
        },

        summaryCards() {
            return [
                { label: 'Entradas', value: this.totalRevenue, hint: 'Recebimentos no período', tone: 'income' },
                { label: 'Despesas', value: this.totalExpenses, hint: 'Gastos lancados', tone: 'expense' },
                { label: 'Saldo', value: this.finalBalance, hint: 'Antes das distribuicoes', tone: this.finalBalance < 0 ? 'danger' : 'done' }
            ]
        },

        canSaveExpense() {
            return Boolean(this.expenseForm.date && this.expenseForm.category && this.expenseForm.amount)
        },

        canRequestStatement() {
            return Boolean(this.statementForm.startDate && this.statementForm.endDate && this.statementForm.company)
        },

        canSaveRevenue() {
            return Boolean(this.revenueForm.date && this.revenueForm.description && this.revenueForm.amount)
        }
    },

    mounted() {
        window.addEventListener('profile-updated', this.syncProfile)
        this.fetchFinance()
    },

    beforeUnmount() {
        window.removeEventListener('profile-updated', this.syncProfile)
    },

    methods: {
        async fetchFinance() {
            try {
                this.finance.revenues = await listRevenues()
                this.finance.expenses = await listExpenses()
                if (!this.isDriver) this.finance.statementRequests = await listStatementRequests()
            } catch (error) {
                console.error(error)
            }
        },

        emptyExpenseForm() {
            return {
                id: null,
                date: new Date().toISOString().slice(0, 10),
                category: 'Gasolina e pedagio',
                description: '',
                amount: null
            }
        },

        emptyRevenueForm() {
            return {
                id: null,
                date: new Date().toISOString().slice(0, 10),
                description: '',
                company: '',
                amount: null,
                paid: true
            }
        },

        syncProfile(event) {
            this.profileType = event.detail || localStorage.getItem('profileType') || 'driver'
            this.fetchFinance()
        },

        openExpenseModal(expense = null) {
            if (expense) {
                this.expenseForm = { ...expense }
                this.photos = expense.photos || []
            } else {
                this.expenseForm = this.emptyExpenseForm()
                this.photos = []
            }

            this.showExpenseModal = true
        },

        openRevenueModal(revenue = null) {
            this.revenueForm = revenue ? { ...revenue } : this.emptyRevenueForm()
            this.showRevenueModal = true
        },

        async saveRevenue() {
            if (!this.canSaveRevenue) return

            try {
                await saveRevenueApi(this.revenueForm)
                await this.fetchFinance()
                this.cancelRevenue()
            } catch (error) {
                console.error(error)
            }
        },

        async deleteRevenue(id) {
            try {
                await removeRevenueApi(id)
                await this.fetchFinance()
                this.cancelRevenue()
            } catch (error) {
                console.error(error)
            }
        },

        async saveExpense() {
            if (!this.canSaveExpense) return

            const payload = {
                ...this.expenseForm,
                amount: Number(this.expenseForm.amount),
                quinzenna: getQuinzenna(this.expenseForm.date),
                paid: true,
                photos: this.photos.map((photo, index) => ({
                    file: photo.file,
                    name: photo.file?.name || photo.name || `comprovante-${Date.now()}-${index}`,
                    url: photo.preview || photo.url
                }))
            }

            try {
                await saveExpenseApi(payload)
                await this.fetchFinance()
                this.cancelExpense()
            } catch (error) {
                console.error(error)
            }
        },

        async deleteExpense(id) {
            try {
                await removeExpenseApi(id)
                this.finance.expenses = this.finance.expenses.filter(expense => expense.id !== id)
            } catch (error) {
                console.error(error)
            }
        },

        cancelExpense() {
            this.showExpenseModal = false
            this.expenseForm = this.emptyExpenseForm()
            this.photos = []
        },

        cancelRevenue() {
            this.showRevenueModal = false
            this.revenueForm = this.emptyRevenueForm()
        },

        async requestStatement() {
            if (!this.canRequestStatement) return

            try {
                const request = await createStatementRequestApi(this.statementForm)
                this.finance.statementRequests.unshift(request)

                this.statementForm = {
                    startDate: '',
                    endDate: '',
                    company: '',
                    note: ''
                }
            } catch (error) {
                console.error(error)
            }
        },

        matchesPeriod(date) {
            const parsed = parseLocalDate(date)
            return parsed.getMonth() + 1 === this.selectedMonth && parsed.getFullYear() === this.selectedYear
        },

        formatMoney(value) {
            return money(value)
        },

        formatDate(date) {
            return formatLocalDate(date)
        },

        openLightbox(url) {
            this.lightboxPhoto = url
        },

        closeLightbox() {
            this.lightboxPhoto = null
        }
    }
}
</script>

<style scoped>
.finance-hero,
.summary-card,
.filter-card,
.expense-card,
.finance-side,
.empty-state {
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

.hero-actions,
.modal-actions,
.revenue-admin-list {
    display: flex;
    gap: 10px;
}

.hero-actions {
    align-items: center;
    flex-wrap: wrap;
    justify-content: flex-end;
}

.modal-actions,
.revenue-admin-list {
    margin-top: 10px;
}

.mini-empty {
    color: var(--text-muted);
    background: var(--surface-muted);
    border: 1px dashed var(--border-soft);
    border-radius: 16px;
    padding: 14px;
    font-size: 0;
    display: flex;
    gap: 10px;
    align-items: center;
}

.mini-empty strong {
    display: block;
    color: var(--text-strong);
    font-size: 13px;
}

.mini-empty p {
    margin-top: 2px;
    color: var(--text-muted);
    font-size: 13px;
    line-height: 1.35;
}

.revenue-admin-list {
    flex-direction: column;
}

.eyebrow {
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--primary-color);
    font-size: 11px;
    font-weight: 800;
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
.revenue-row small,
.modal-head p,
.empty-state p {
    color: var(--text-muted);
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
    font-size: 20px;
    line-height: 1.15;
    margin: 4px 0;
}

.summary-card.income strong,
.revenue-row span {
    color: #16a34a;
}

.summary-card.expense strong,
.summary-card.danger strong,
.amount.danger {
    color: #ef4444;
}

.summary-card.done strong {
    color: var(--primary-color);
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
    max-width: 120px;
}

.finance-layout {
    display: grid;
    gap: 12px;
}

.finance-column {
    display: grid;
    gap: 12px;
}

.finance-side {
    border-radius: 22px;
    padding: 14px;
    height: fit-content;
}

.section-title,
.expense-head,
.expense-actions,
.revenue-row,
.request-row,
.modal-head {
    display: flex;
    gap: 12px;
}

.section-title,
.expense-head,
.revenue-row,
.request-row {
    justify-content: space-between;
    align-items: flex-start;
}

.section-title {
    margin-bottom: 10px;
}

.section-title.compact {
    margin-top: 18px;
}

.expense-card {
    border-radius: 20px;
    padding: 14px;
}

.expense-head strong,
.revenue-row strong,
.request-row strong {
    display: block;
    color: var(--text-strong);
}

.expense-head small,
.revenue-row small,
.request-row small {
    display: block;
    font-size: 12px;
}

.amount {
    font-weight: 900;
    white-space: nowrap;
}

.expense-card p {
    margin: 10px 0 0;
}

.photo-strip {
    display: flex;
    gap: 8px;
    margin-top: 12px;
    overflow-x: auto;
}

.photo-strip img {
    width: 64px;
    height: 64px;
    border-radius: 12px;
    object-fit: cover;
    cursor: pointer;
}

.expense-actions {
    margin-top: 12px;
}

.revenue-row,
.request-row {
    padding: 10px 0;
    border-bottom: 1px solid var(--border-soft);
}

.revenue-row:last-child,
.request-row:last-child {
    border-bottom: 0;
}

.admin-panel {
    margin-top: 16px;
    padding-top: 6px;
}

.statement-note {
    min-height: 90px;
    overflow: auto !important;
}

.request-list {
    margin-top: 12px;
}

.request-row span {
    color: var(--primary-color);
    font-weight: 800;
    font-size: 12px;
}

.modal-head {
    align-items: center;
    margin-bottom: 14px;
}

.modal-icon {
    width: 42px;
    height: 42px;
    border-radius: 14px;
    background: var(--primary-soft);
    color: var(--primary-color);
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;
}

.empty-state {
    border-radius: 20px;
    padding: 30px 18px;
    text-align: center;
    border-style: dashed;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
}

.empty-icon {
    width: 48px;
    height: 48px;
    border-radius: 16px;
    background: var(--primary-soft);
    color: var(--primary-color);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 21px;
}

.empty-icon.small {
    width: 38px;
    height: 38px;
    border-radius: 13px;
    font-size: 16px;
    flex: 0 0 auto;
}

.empty-state strong {
    color: var(--text-strong);
    font-size: 16px;
}

.empty-state p {
    max-width: 360px;
    line-height: 1.35;
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
        grid-template-columns: minmax(0, 1fr) 360px;
    }
}

@media (max-width: 620px) {
    .finance-hero,
    .hero-actions,
    .modal-actions,
    .filter-card {
        flex-direction: column;
        align-items: stretch;
    }

    .summary-grid {
        grid-template-columns: 1fr;
    }

    .filter-card select {
        max-width: none;
    }

    .expense-actions {
        flex-direction: column;
    }
}
</style>
