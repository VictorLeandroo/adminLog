<template>
    <div class="routes-page premium-page min-vh-100">
        <div class="container py-1">
            <section class="route-hero">
                <div>
                    <span class="eyebrow">{{ isDriver ? 'Área do motorista' : 'Administração de rotas' }}</span>
                    <h4>{{ heroTitle }}</h4>
                    <p>{{ heroSubtitle }}</p>
                </div>

                <div class="hero-route-actions">
                    <ButtonComp
                        v-if="!isDriver"
                        btn-class="button-primary button-big"
                        :click-action="openCreateRouteModal">
                        <i class="fa-solid fa-plus"></i>
                        Nova rota
                    </ButtonComp>

                    <button class="role-chip" @click="toggleProfile">
                        <i class="fa-solid" :class="isDriver ? 'fa-truck-fast' : 'fa-user-shield'"></i>
                        {{ isDriver ? 'Motorista' : 'Admin' }}
                    </button>
                </div>
            </section>

            <section class="active-route-panel" :class="{ empty: !activeRoute, blocked: driverVehicleMissing }">
                <div class="panel-top">
                    <div>
                        <span class="eyebrow">Rota atual</span>
                        <h5>{{ routePanelTitle }}</h5>
                    </div>
                    <span class="status-pill" :class="routePanelStatusClass">
                        {{ routePanelStatus }}
                    </span>
                </div>

                <div v-if="activeRoute" class="active-grid">
                    <div>
                        <small>KM inicial</small>
                        <strong>{{ formatKm(activeRoute.kmInicial) }}</strong>
                    </div>
                    <div>
                        <small>Início</small>
                        <strong>{{ formatTime(activeRoute.createdAt) }}</strong>
                    </div>
                    <div>
                        <small>Motorista</small>
                        <strong>{{ activeRoute.driver }}</strong>
                    </div>
                </div>

                <p v-else class="empty-copy">
                    {{ routePanelMessage }}
                </p>

                <div v-if="driverVehicleMissing" class="route-warning">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                    <span>Seu usuário ainda não possui veículo vinculado. Peça para a administração cadastrar ou vincular um veículo antes de iniciar uma rota.</span>
                </div>

                <div class="panel-actions" v-if="isDriver">
                    <ButtonComp
                        v-if="!activeRoute"
                        btn-class="button-primary button-big w-100"
                        :is-disabled="!canOpenStartRoute"
                        :click-action="openStartModal">
                        <i class="fa-solid fa-play"></i>
                        Iniciar rota
                    </ButtonComp>

                    <ButtonComp
                        v-else
                        btn-class="button-primary button-big w-100"
                        :click-action="() => openFinishModal(activeRoute)">
                        <i class="fa-solid fa-flag-checkered"></i>
                        Finalizar rota
                    </ButtonComp>
                </div>
            </section>

            <section class="route-toolbar">
                <div class="search-box">
                    <i class="fa-solid fa-magnifying-glass"></i>
                    <input type="text" v-model="searchTerm" placeholder="Buscar por cidade, nota, motorista ou data" />
                </div>
                <select v-model="statusFilter" class="form-select">
                    <option value="all">Todos</option>
                    <option value="Em andamento">Em andamento</option>
                    <option value="Pendente de analise">Pendente de análise</option>
                    <option value="Concluida">Concluída</option>
                </select>
            </section>

            <div v-if="isLoading" class="page-loading-state">
                <span class="loader"></span>
                <strong>Carregando rotas</strong>
                <p>Buscando rotas, veiculo ativo e dados de apoio.</p>
            </div>

            <section v-else class="route-list">
                <article v-for="route in filteredRoutes" :key="route.id" class="route-card" :class="route.statusClass">
                    <div class="route-card-head">
                        <div class="route-title-block">
                            <strong>{{ formatDate(route.data) }}</strong>
                            <div class="route-meta">
                                <span>{{ formatDay(route.data) }}</span>
                                <span>
                                    <i class="fa-solid fa-user"></i>
                                    {{ route.driver }}
                                </span>
                            </div>
                        </div>
                        <span class="status-pill" :class="route.statusClass">{{ route.status }}</span>
                    </div>

                    <div class="route-metrics">
                        <div>
                            <small>Inicial</small>
                            <strong>{{ formatKm(route.kmInicial) }}</strong>
                        </div>
                        <div>
                            <small>Final</small>
                            <strong>{{ route.kmFinal ? formatKm(route.kmFinal) : '-' }}</strong>
                        </div>
                        <div>
                            <small>Total</small>
                            <strong>{{ calcPercorrido(route.kmInicial, route.kmFinal) }} km</strong>
                        </div>
                    </div>

                    <div class="route-details">
                        <div>
                            <small>Cidades</small>
                            <p>{{ route.cidades.length ? route.cidades.join(', ') : 'Aguardando cadastro' }}</p>
                        </div>
                        <div>
                            <small>Notas</small>
                            <p>{{ route.notas.length ? route.notas.join(', ') : 'Aguardando cadastro' }}</p>
                        </div>
                    </div>

                    <div class="photo-strip" v-if="route.photos.length">
                        <img v-for="(photo, index) in route.photos" :key="index" :src="photo.url || photo.preview" @click="openLightbox(photo.url || photo.preview)" />
                    </div>

                    <div class="correction-card" v-if="route.correctionRequested">
                        <i class="fa-solid fa-triangle-exclamation"></i>
                        <div>
                            <strong>Erro relatado pelo motorista</strong>
                            <p>{{ route.correctionNote }}</p>
                        </div>
                    </div>

                    <div class="route-actions">
                        <ButtonComp
                            v-if="isDriver && route.status === 'Em andamento'"
                            btn-class="button-primary w-100"
                            :click-action="() => openFinishModal(route)">
                            Finalizar
                        </ButtonComp>

                        <ButtonComp
                            v-if="isDriver && route.status !== 'Em andamento'"
                            btn-class="button-secundary w-100"
                            :click-action="() => openCorrectionModal(route)">
                            <i class="fa-solid fa-circle-exclamation"></i>
                            {{ route.correctionRequested ? 'Atualizar relato' : 'Relatar erro' }}
                        </ButtonComp>

                        <ButtonComp
                            v-if="!isDriver"
                            btn-class="button-secundary w-100"
                            :click-action="() => openAdminModal(route)">
                            Revisar dados
                        </ButtonComp>

                        <ButtonComp
                            v-if="!isDriver"
                            btn-class="button-secundary-red w-100"
                            :click-action="() => { showConfirmDeleteModal = true; routeSelected = route }">
                            Excluir
                        </ButtonComp>
                    </div>
                </article>

                <div v-if="!filteredRoutes.length" class="empty-state">
                    <i class="fa-solid fa-route"></i>
                    <strong>Nenhuma rota encontrada</strong>
                    <p>Ajuste a busca ou o filtro para ver outros registros.</p>
                </div>
            </section>
        </div>

        <ModalDefault :isLoading="isModalLoading" :is-visible="showStartModal" max-width="420px" min-width="320px"
            @update:isVisible="cancelStart">
            <div class="route-modal-head">
                <span class="modal-icon"><i class="fa-solid fa-gauge-high"></i></span>
                <div>
                    <h6>Iniciar rota</h6>
                    <p>Digite o KM atual que aparece no painel da Fiorino.</p>
                </div>
            </div>

            <label class="form-label">KM inicial</label>
            <input type="number" v-model.number="startForm.kmInicial" class="w-100 mb-2" placeholder="Ex: 42380" :disabled="!myVehicle" />

            <ButtonComp :click-action="startRoute" :is-disabled="!canStartRoute" btn-class="button-primary button-big w-100">
                Iniciar rota
            </ButtonComp>
        </ModalDefault>

        <ModalDefault :isLoading="isModalLoading" :is-visible="showCreateRouteModal" max-width="520px" min-width="320px"
            @update:isVisible="cancelCreateRoute">
            <div class="route-modal-head">
                <span class="modal-icon"><i class="fa-solid fa-route"></i></span>
                <div>
                    <h6>Nova rota</h6>
                    <p>Registre uma rota manualmente para um veículo com motorista vinculado.</p>
                </div>
            </div>

            <div class="modal-scroll-content">
                <label class="form-label">Veículo</label>
                <select v-model="createRouteForm.vehicleId" class="form-select w-100 mb-2" @change="syncCreateVehicleKm">
                    <option value="">Selecione um veículo</option>
                    <option v-for="vehicle in adminVehiclesWithDriver" :key="vehicle.id" :value="vehicle.id">
                        {{ vehicle.plate }} - {{ vehicle.model }} / {{ vehicle.driver }}
                    </option>
                </select>

                <label class="form-label">Data</label>
                <input type="date" v-model="createRouteForm.date" class="w-100 mb-2" />

                <div class="form-grid">
                    <div>
                        <label class="form-label">KM inicial</label>
                        <input type="number" v-model.number="createRouteForm.kmInicial" class="w-100 mb-2" />
                    </div>
                    <div>
                        <label class="form-label">KM final</label>
                        <input type="number" v-model.number="createRouteForm.kmFinal" class="w-100 mb-2" />
                    </div>
                </div>

                <label class="form-label">Cidades</label>
                <input type="text" v-model="createRouteForm.cidadesStr" class="w-100 mb-2" placeholder="Ex: São Paulo, Itu, Campinas" />

                <label class="form-label">Notas fiscais</label>
                <input type="text" v-model="createRouteForm.notasStr" class="w-100 mb-2" placeholder="Ex: 5674, 5675, 5676" />

                <label class="form-label">Status</label>
                <select v-model="createRouteForm.status" class="form-select w-100 mb-2">
                    <option value="Em andamento">Em andamento</option>
                    <option value="Pendente de analise">Pendente de análise</option>
                    <option value="Concluida">Concluída</option>
                </select>
            </div>

            <ButtonComp :click-action="createAdminRoute" :is-disabled="!canCreateAdminRoute" btn-class="button-primary button-big w-100">
                Criar rota
            </ButtonComp>
        </ModalDefault>

        <ModalDefault :isLoading="isModalLoading" :is-visible="showFinishModal" max-width="460px" min-width="320px"
            @update:isVisible="cancelFinish">
            <div class="route-modal-head">
                <span class="modal-icon"><i class="fa-solid fa-flag-checkered"></i></span>
                <div>
                    <h6>Finalizar rota</h6>
                    <p>O KM final é obrigatório. Notas e cidades podem ficar para a administração revisar.</p>
                </div>
            </div>

            <div class="modal-scroll-content">
                <label class="form-label">KM final</label>
                <input type="number" v-model.number="finishForm.kmFinal" class="w-100 mb-1" :class="{ 'input-error': kmFinalInvalid }" />
                <small v-if="kmFinalInvalid" class="text-danger d-block mb-2">O KM final não pode ser menor que o KM inicial.</small>

                <label class="form-label">Fotos das notas</label>
                <PhotoUploadComp v-model="photos" />

                <label class="form-label mt-2">Cidades entregues</label>
                <input type="text" v-model="finishForm.cidadesStr" class="w-100" placeholder="Ex: São Paulo, Itu, Campinas" />

                <label class="form-label mt-2">Números das notas</label>
                <input type="text" v-model="finishForm.notasStr" class="w-100 mb-2" placeholder="Ex: 5674, 5675, 5676" />
            </div>

            <div class="analysis-note" v-if="willNeedAnalysis">
                <i class="fa-solid fa-circle-info"></i>
                Sem cidades ou notas preenchidas, a rota será finalizada como pendente de análise.
            </div>

            <ButtonComp :click-action="finishRoute" :is-disabled="!canFinishRoute" btn-class="button-primary button-big w-100">
                Finalizar rota
            </ButtonComp>
        </ModalDefault>

        <ModalDefault :isLoading="isModalLoading" :is-visible="showAdminModal" max-width="500px" min-width="320px"
            @update:isVisible="cancelAdminEdit">
            <div class="route-modal-head">
                <span class="modal-icon"><i class="fa-solid fa-clipboard-check"></i></span>
                <div>
                    <h6>Revisar rota</h6>
                    <p>Complete notas e cidades para liberar a rota como concluida.</p>
                </div>
            </div>

            <div class="modal-scroll-content">
                <label class="form-label">KM inicial</label>
                <input type="number" v-model.number="adminForm.kmInicial" class="w-100 mb-2" />

                <label class="form-label">KM final</label>
                <input type="number" v-model.number="adminForm.kmFinal" class="w-100 mb-2" />

                <label class="form-label">Cidades</label>
                <input type="text" v-model="adminForm.cidadesStr" class="w-100 mb-2" />

                <label class="form-label">Notas fiscais</label>
                <input type="text" v-model="adminForm.notasStr" class="w-100 mb-2" />

                <label class="form-label">Status</label>
                <select v-model="adminForm.status" class="form-select w-100 mb-2">
                    <option value="Em andamento">Em andamento</option>
                    <option value="Pendente de analise">Pendente de análise</option>
                    <option value="Concluida">Concluída</option>
                </select>

                <div class="correction-card mb-2" v-if="adminForm.correctionRequested">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                    <div>
                        <strong>Relato do motorista</strong>
                        <p>{{ adminForm.correctionNote }}</p>
                    </div>
                </div>
            </div>

            <ButtonComp :click-action="saveAdminRoute" :is-disabled="!adminForm.kmFinal" btn-class="button-primary button-big w-100">
                Salvar revisão
            </ButtonComp>
        </ModalDefault>

        <ModalDefault :isLoading="isModalLoading" :is-visible="showCorrectionModal" max-width="460px" min-width="320px"
            @update:isVisible="cancelCorrection">
            <div class="route-modal-head">
                <span class="modal-icon"><i class="fa-solid fa-circle-exclamation"></i></span>
                <div>
                    <h6>Relatar erro</h6>
                    <p>Explique o que ficou errado para a administração corrigir a rota.</p>
                </div>
            </div>

            <label class="form-label">O que precisa ser corrigido?</label>
            <textarea v-model="correctionForm.note" class="w-100 correction-textarea"
                placeholder="Ex: Esqueci a nota 5682, a cidade correta era Itu, ou informei o KM final errado."></textarea>

            <ButtonComp :click-action="saveCorrectionReport" :is-disabled="!correctionForm.note.trim()" btn-class="button-primary button-big w-100 mt-2">
                Enviar relato
            </ButtonComp>
        </ModalDefault>

        <ModalDelete :isVisible="showConfirmDeleteModal" title="Excluir rota" icon="fa-solid fa-trash"
            :isLoading="isModalLoading" @update:isVisible="showConfirmDeleteModal = $event" @confirm="deleteRoute" />

        <div v-if="lightboxPhoto" class="lightbox" @click.self="closeLightbox">
            <button class="lightbox-close" @click="closeLightbox">
                <i class="fa-solid fa-xmark"></i>
            </button>
            <img :src="lightboxPhoto" class="lightbox-image" />
        </div>
    </div>
</template>

<script>
import ButtonComp from '@/components/ButtonComp.vue';
import ModalDefault from '@/components/modals/ModalDefault.vue';
import ModalDelete from '@/components/modals/ModalDelete.vue';
import PhotoUploadComp from '@/components/PhotoUploadComp.vue';
import { notifyError, notifySuccess } from '@/services/notificationService';
import {
    createRouteApi,
    finishRouteApi,
    formatLocalDate,
    getMyVehicle,
    parseLocalDate,
    listVehicles,
    listRoutes,
    removeRouteApi,
    reportRouteErrorApi,
    reviewRouteApi,
    startRouteApi
} from '@/services/backendService';

export default {
    name: 'RoutesView',

    components: {
        ButtonComp,
        ModalDelete,
        ModalDefault,
        PhotoUploadComp
    },

    data() {
        return {
            profileType: localStorage.getItem('profileType') || 'driver',
            routes: [],
            myVehicle: null,
            myVehicleLoaded: false,
            isLoading: false,
            isVehicleLoading: false,
            searchTerm: '',
            statusFilter: 'all',
            adminVehicles: [],
            showStartModal: false,
            showCreateRouteModal: false,
            showFinishModal: false,
            showAdminModal: false,
            showCorrectionModal: false,
            showConfirmDeleteModal: false,
            isModalLoading: false,
            routeSelected: null,
            startForm: {
                kmInicial: ''
            },
            createRouteForm: {
                vehicleId: '',
                date: new Date().toISOString().slice(0, 10),
                kmInicial: '',
                kmFinal: '',
                cidadesStr: '',
                notasStr: '',
                status: 'Concluida'
            },
            finishForm: {
                kmFinal: '',
                cidadesStr: '',
                notasStr: ''
            },
            adminForm: {
                kmInicial: '',
                kmFinal: '',
                cidadesStr: '',
                notasStr: '',
                status: 'Pendente de analise',
                correctionRequested: false,
                correctionNote: ''
            },
            correctionForm: {
                note: ''
            },
            photos: [],
            lightboxPhoto: null
        }
    },

    computed: {
        isDriver() {
            return this.profileType === 'driver'
        },

        activeRoute() {
            return this.routes.find(route => route.status === 'Em andamento')
        },

        driverVehicleMissing() {
            return this.isDriver && this.myVehicleLoaded && !this.myVehicle
        },

        hasStartKm() {
            return this.startForm.kmInicial !== '' && this.startForm.kmInicial !== null && this.startForm.kmInicial !== undefined
        },

        canOpenStartRoute() {
            return Boolean(this.isDriver && !this.activeRoute && this.myVehicle && !this.isVehicleLoading)
        },

        canStartRoute() {
            return Boolean(this.canOpenStartRoute && this.hasStartKm)
        },

        routePanelTitle() {
            if (this.activeRoute) return this.formatDate(this.activeRoute.data)
            if (this.driverVehicleMissing) return 'Nenhum veículo vinculado'
            return 'Nenhuma rota ativa'
        },

        routePanelStatus() {
            if (this.activeRoute) return 'Em andamento'
            if (this.driverVehicleMissing) return 'Sem veículo'
            if (this.isVehicleLoading) return 'Carregando'
            return 'Pronto'
        },

        routePanelStatusClass() {
            if (this.activeRoute) return 'running'
            if (this.driverVehicleMissing) return 'warning'
            return 'idle'
        },

        routePanelMessage() {
            if (this.driverVehicleMissing) {
                return 'Não é possível iniciar uma rota enquanto não houver um veículo vinculado ao seu usuário.'
            }

            if (this.isVehicleLoading) {
                return 'Carregando o veículo vinculado ao motorista.'
            }

            return 'Informe o KM atual do painel para abrir a viagem. Enquanto ela estiver ativa, uma nova rota fica bloqueada.'
        },

        heroTitle() {
            if (this.isDriver) return this.activeRoute ? 'Voce esta em rota' : 'Pronto para sair'
            return 'Rotas para revisar'
        },

        heroSubtitle() {
            if (this.isDriver) {
                return this.activeRoute
                    ? 'Finalize quando terminar o percurso. Se faltar nota ou cidade, a administracao completa depois.'
                    : 'Comece pelo KM atual do carro. O app bloqueia uma segunda rota ate essa ser finalizada.'
            }

            return 'Acompanhe rotas em aberto, complete dados pendentes e mantenha o historico confiavel.'
        },

        filteredRoutes() {
            const term = this.searchTerm.trim().toLowerCase()

            return this.decoratedRoutes.filter(route => {
                const matchesStatus = this.statusFilter === 'all' || route.status === this.statusFilter
                const haystack = [
                    route.data,
                    route.driver,
                    route.status,
                    ...route.cidades,
                    ...route.notas.map(String)
                ].join(' ').toLowerCase()

                return matchesStatus && (!term || haystack.includes(term) || this.formatDate(route.data).toLowerCase().includes(term))
            })
        },

        adminVehiclesWithDriver() {
            return this.adminVehicles.filter(vehicle => vehicle.driver && vehicle.driver !== 'Sem motorista')
        },

        decoratedRoutes() {
            return [...this.routes]
                .sort((a, b) => parseLocalDate(b.createdAt || b.data) - parseLocalDate(a.createdAt || a.data))
                .map(route => ({
                    ...route,
                    statusClass: this.statusClass(route.status)
                }))
        },

        kmFinalInvalid() {
            if (!this.finishForm.kmFinal || !this.routeSelected) return false
            return Number(this.finishForm.kmFinal) < Number(this.routeSelected.kmInicial)
        },

        canFinishRoute() {
            return Boolean(this.finishForm.kmFinal) && !this.kmFinalInvalid
        },

        willNeedAnalysis() {
            return !this.finishForm.cidadesStr.trim() || !this.finishForm.notasStr.trim()
        },

        canCreateAdminRoute() {
            return Boolean(
                this.createRouteForm.vehicleId &&
                this.createRouteForm.date &&
                this.createRouteForm.kmInicial &&
                (this.createRouteForm.status === 'Em andamento' || this.createRouteForm.kmFinal)
            )
        }
    },

    mounted() {
        window.addEventListener('profile-updated', this.syncProfile)
        this.fetchRoutes()
        this.fetchMyVehicle()
        this.fetchAdminVehicles()
    },

    beforeUnmount() {
        window.removeEventListener('profile-updated', this.syncProfile)
    },

    methods: {
        async fetchRoutes() {
            this.isLoading = true
            try {
                this.routes = await listRoutes()
            } catch (error) {
                console.error(error)
                notifyError(error, 'Não foi possível carregar as rotas.')
            } finally {
                this.isLoading = false
            }
        },

        async fetchMyVehicle() {
            if (!this.isDriver) {
                this.myVehicle = null
                this.myVehicleLoaded = false
                return
            }

            this.isVehicleLoading = true
            try {
                const [vehicle] = await getMyVehicle()
                this.myVehicle = vehicle
                if (!this.startForm.kmInicial) this.startForm.kmInicial = vehicle.currentKm
            } catch (error) {
                console.error(error)
                this.myVehicle = null
                if (error.response?.status !== 404) {
                    notifyError(error, 'Não foi possível carregar o veículo vinculado.')
                }
            } finally {
                this.myVehicleLoaded = true
                this.isVehicleLoading = false
            }
        },

        syncProfile(event) {
            this.profileType = event.detail || localStorage.getItem('profileType') || 'driver'
            this.fetchRoutes()
            this.fetchMyVehicle()
            this.fetchAdminVehicles()
        },

        toggleProfile() {
            const profile = this.isDriver ? 'admin' : 'driver'
            this.profileType = profile
            localStorage.setItem('profileType', profile)
            window.dispatchEvent(new CustomEvent('profile-updated', { detail: profile }))
        },

        openStartModal() {
            if (this.activeRoute || !this.myVehicle) return
            this.showStartModal = true
        },

        openCreateRouteModal() {
            this.createRouteForm = this.emptyCreateRouteForm()
            this.syncCreateVehicleKm()
            this.showCreateRouteModal = true
        },

        openFinishModal(route) {
            this.routeSelected = route
            this.finishForm = {
                kmFinal: route.kmFinal || '',
                cidadesStr: route.cidades.join(', '),
                notasStr: route.notas.join(', ')
            }
            this.photos = []
            this.showFinishModal = true
        },

        openAdminModal(route) {
            this.routeSelected = route
            this.adminForm = {
                kmInicial: route.kmInicial,
                kmFinal: route.kmFinal || '',
                cidadesStr: route.cidades.join(', '),
                notasStr: route.notas.join(', '),
                status: route.status,
                correctionRequested: Boolean(route.correctionRequested),
                correctionNote: route.correctionNote || ''
            }
            this.showAdminModal = true
        },

        openCorrectionModal(route) {
            this.routeSelected = route
            this.correctionForm = {
                note: route.correctionNote || ''
            }
            this.showCorrectionModal = true
        },

        async startRoute() {
            if (!this.canStartRoute) return

            this.isModalLoading = true

            try {
                await startRouteApi({
                    vehicleId: this.myVehicle.id,
                    kmInicial: this.startForm.kmInicial
                })
                await this.fetchRoutes()
                this.cancelStart()
                notifySuccess('Rota iniciada com sucesso.')
            } catch (error) {
                console.error(error)
                notifyError(error, 'Não foi possível iniciar a rota.')
            } finally {
                this.isModalLoading = false
            }
        },

        async fetchAdminVehicles() {
            if (this.isDriver) {
                this.adminVehicles = []
                return
            }

            try {
                this.adminVehicles = await listVehicles()
            } catch (error) {
                console.error(error)
                this.adminVehicles = []
                notifyError(error, 'Não foi possível carregar os veículos.')
            }
        },

        async createAdminRoute() {
            if (!this.canCreateAdminRoute) return

            this.isModalLoading = true

            try {
                await createRouteApi({
                    vehicleId: this.createRouteForm.vehicleId,
                    date: this.createRouteForm.date,
                    kmInicial: this.createRouteForm.kmInicial,
                    kmFinal: this.createRouteForm.status === 'Em andamento' ? null : this.createRouteForm.kmFinal,
                    cidades: this.toList(this.createRouteForm.cidadesStr),
                    notas: this.toList(this.createRouteForm.notasStr),
                    status: this.createRouteForm.status
                })
                await this.fetchRoutes()
                this.cancelCreateRoute()
                notifySuccess('Rota criada com sucesso.')
            } catch (error) {
                console.error(error)
                notifyError(error, 'Não foi possível criar a rota.')
            } finally {
                this.isModalLoading = false
            }
        },

        async finishRoute() {
            if (!this.canFinishRoute || !this.routeSelected) return

            const cidades = this.toList(this.finishForm.cidadesStr)
            const notas = this.toList(this.finishForm.notasStr)
            const newPhotos = this.photos.map((photo, index) => ({
                file: photo.file,
                name: photo.file?.name || `foto-${Date.now()}-${index}`,
                url: photo.preview || photo.url
            }))

            this.isModalLoading = true

            try {
                await finishRouteApi(this.routeSelected.id, {
                    kmFinal: this.finishForm.kmFinal,
                    cidades,
                    notas,
                    photos: newPhotos
                })
                await this.fetchRoutes()
                this.cancelFinish()
                notifySuccess('Rota finalizada com sucesso.')
            } catch (error) {
                console.error(error)
                notifyError(error, 'Não foi possível finalizar a rota.')
            } finally {
                this.isModalLoading = false
            }
        },

        async saveCorrectionReport() {
            if (!this.routeSelected || !this.correctionForm.note.trim()) return

            this.isModalLoading = true

            try {
                await reportRouteErrorApi(this.routeSelected.id, this.correctionForm.note.trim())
                await this.fetchRoutes()
                this.cancelCorrection()
                notifySuccess('Relato enviado para revisão.')
            } catch (error) {
                console.error(error)
                notifyError(error, 'Não foi possível enviar o relato.')
            } finally {
                this.isModalLoading = false
            }
        },

        async saveAdminRoute() {
            if (!this.routeSelected) return

            this.isModalLoading = true

            try {
                await reviewRouteApi(this.routeSelected.id, {
                    kmInicial: this.adminForm.kmInicial,
                    kmFinal: this.adminForm.kmFinal,
                    cidades: this.toList(this.adminForm.cidadesStr),
                    notas: this.toList(this.adminForm.notasStr),
                    status: this.adminForm.status
                })
                await this.fetchRoutes()
                this.cancelAdminEdit()
                notifySuccess('Rota atualizada com sucesso.')
            } catch (error) {
                console.error(error)
                notifyError(error, 'Não foi possível atualizar a rota.')
            } finally {
                this.isModalLoading = false
            }
        },

        async deleteRoute() {
            if (!this.routeSelected) return

            this.isModalLoading = true

            try {
                await removeRouteApi(this.routeSelected.id)
                this.routes = this.routes.filter(route => route.id !== this.routeSelected.id)
                this.routeSelected = null
                this.showConfirmDeleteModal = false
                notifySuccess('Rota excluída com sucesso.')
            } catch (error) {
                console.error(error)
                notifyError(error, 'Não foi possível excluir a rota.')
            } finally {
                this.isModalLoading = false
            }
        },

        cancelStart() {
            this.showStartModal = false
            this.startForm = { kmInicial: '' }
        },

        cancelCreateRoute() {
            this.showCreateRouteModal = false
            this.createRouteForm = this.emptyCreateRouteForm()
        },

        cancelFinish() {
            this.showFinishModal = false
            this.routeSelected = null
            this.finishForm = { kmFinal: '', cidadesStr: '', notasStr: '' }
            this.photos = []
        },

        cancelAdminEdit() {
            this.showAdminModal = false
            this.routeSelected = null
        },

        cancelCorrection() {
            this.showCorrectionModal = false
            this.routeSelected = null
            this.correctionForm = { note: '' }
        },

        toList(value) {
            return String(value || '')
                .split(',')
                .map(item => item.trim())
                .filter(Boolean)
        },

        emptyCreateRouteForm() {
            return {
                vehicleId: '',
                date: new Date().toISOString().slice(0, 10),
                kmInicial: '',
                kmFinal: '',
                cidadesStr: '',
                notasStr: '',
                status: 'Concluida'
            }
        },

        syncCreateVehicleKm() {
            const vehicle = this.adminVehicles.find(item => item.id === this.createRouteForm.vehicleId)
            if (vehicle && !this.createRouteForm.kmInicial) {
                this.createRouteForm.kmInicial = vehicle.currentKm
            }
        },

        statusClass(status) {
            switch (status) {
                case 'Em andamento':
                    return 'running'
                case 'Pendente de analise':
                    return 'pending'
                case 'Concluida':
                    return 'done'
                default:
                    return 'idle'
            }
        },

        openLightbox(url) {
            this.lightboxPhoto = url
        },

        closeLightbox() {
            this.lightboxPhoto = null
        },

        formatDate(dateStr) {
            return formatLocalDate(dateStr)
        },

        formatDay(dateStr) {
            return formatLocalDate(dateStr, { weekday: 'long' })
        },

        formatTime(dateStr) {
            return new Date(dateStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        },

        formatKm(value) {
            return Number(value || 0).toLocaleString('pt-BR')
        },

        calcPercorrido(inicial, final) {
            if (!final) return 0
            const diff = Number(final) - Number(inicial)
            return diff > 0 ? diff.toLocaleString('pt-BR') : 0
        }
    }
}
</script>

<style scoped>
.routes-page {
    color: var(--text-strong);
}

.route-hero,
.active-route-panel,
.route-toolbar,
.route-card,
.empty-state {
    border: 1px solid var(--border-soft);
    background: var(--surface-card);
    box-shadow: var(--shadow-soft);
}

.route-hero {
    border-radius: 22px;
    padding: 18px;
    display: flex;
    justify-content: space-between;
    gap: 14px;
    align-items: flex-start;
    background:
        radial-gradient(circle at top left, rgba(var(--primary-color-rgb), 0.18), transparent 35%),
        var(--surface-card);
}

.hero-route-actions {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    justify-content: flex-end;
}

.eyebrow {
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--primary-color);
    font-size: 11px;
    font-weight: 800;
}

.route-hero h4,
.route-hero p,
.active-route-panel h5 {
    margin: 0;
}

.route-hero p,
.empty-copy,
.route-details p,
.route-card small,
.route-modal-head p,
.empty-state p {
    color: var(--text-muted);
}

.role-chip,
.status-pill {
    border: 1px solid var(--border-soft);
    border-radius: 999px;
    padding: 8px 10px;
    background: var(--surface-muted);
    color: var(--text-strong);
    font-weight: 800;
    white-space: nowrap;
}

.active-route-panel {
    border-radius: 22px;
    padding: 16px;
    margin-top: 12px;
}

.active-route-panel.blocked {
    border-color: rgba(217, 119, 6, 0.35);
}

.panel-top,
.route-card-head,
.route-actions,
.route-toolbar,
.route-modal-head {
    display: flex;
    gap: 12px;
}

.panel-top,
.route-card-head,
.route-toolbar {
    justify-content: space-between;
    align-items: center;
}

.active-grid,
.route-metrics {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    margin: 14px 0;
}

.active-grid div,
.route-metrics div {
    background: var(--surface-muted);
    border-radius: 14px;
    padding: 10px;
}

.active-grid small,
.route-metrics small,
.route-details small {
    color: var(--text-muted);
    display: block;
    font-size: 11px;
}

.active-grid strong,
.route-metrics strong {
    color: var(--text-strong);
}

.status-pill.running {
    color: #2563eb;
    background: rgba(37, 99, 235, 0.12);
}

.status-pill.pending {
    color: #d97706;
    background: rgba(217, 119, 6, 0.14);
}

.status-pill.done {
    color: #16a34a;
    background: rgba(22, 163, 74, 0.14);
}

.status-pill.idle {
    color: var(--text-muted);
}

.status-pill.warning {
    color: #d97706;
    background: rgba(217, 119, 6, 0.14);
}

.route-warning {
    display: flex;
    gap: 10px;
    align-items: flex-start;
    margin-top: 12px;
    padding: 12px;
    border-radius: 14px;
    color: #92400e;
    background: rgba(217, 119, 6, 0.12);
    font-size: 13px;
    line-height: 1.35;
}

.route-warning i {
    margin-top: 2px;
    flex: 0 0 auto;
}

.route-card-head {
    align-items: flex-start;
}

.route-title-block {
    min-width: 0;
}

.route-title-block strong {
    display: block;
    color: var(--text-strong);
    font-size: 16px;
    line-height: 1.15;
}

.route-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 5px 10px;
    margin-top: 5px;
    color: var(--text-muted);
    font-size: 12px;
    line-height: 1.2;
}

.route-meta span {
    display: inline-flex;
    align-items: center;
    gap: 5px;
}

.route-card .status-pill {
    flex: 0 0 auto;
    padding: 5px 8px;
    max-width: 120px;
    border-radius: 10px;
    font-size: 10px;
    line-height: 1.1;
    text-align: center;
    white-space: normal;
}

.route-toolbar {
    margin: 12px 0;
    border-radius: 18px;
    padding: 10px;
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

.route-toolbar select {
    max-width: 160px;
}

.route-list {
    display: grid;
    gap: 12px;
}

.route-card {
    border-radius: 20px;
    padding: 14px;
}

.route-card.pending {
    border-color: rgba(217, 119, 6, 0.3);
}

.route-details {
    display: grid;
    gap: 8px;
    margin-top: 10px;
}

.route-details p {
    margin: 0;
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

.route-actions {
    margin-top: 12px;
}

.route-modal-head {
    align-items: center;
    margin-bottom: 14px;
}

.route-modal-head h6 {
    margin: 0;
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

.analysis-note {
    display: flex;
    gap: 8px;
    padding: 10px;
    border-radius: 12px;
    background: rgba(217, 119, 6, 0.12);
    color: #d97706;
    margin: 10px 0;
    font-size: 13px;
}

.correction-card {
    display: flex;
    gap: 10px;
    margin-top: 12px;
    padding: 12px;
    border: 1px solid rgba(217, 119, 6, 0.28);
    border-radius: 14px;
    background: rgba(217, 119, 6, 0.11);
    color: #d97706;
}

.correction-card i {
    margin-top: 2px;
}

.correction-card strong {
    display: block;
    color: #d97706;
    line-height: 1.2;
}

.correction-card p {
    margin: 3px 0 0;
    color: var(--text-strong);
    line-height: 1.35;
}

.correction-textarea {
    min-height: 130px;
    overflow: auto !important;
}

.modal-scroll-content {
    max-height: 65vh;
    overflow-y: auto;
    padding-right: 4px;
}

.form-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
}

.input-error {
    border-color: #ef4444 !important;
}

.empty-state {
    border-radius: 20px;
    padding: 28px 18px;
    text-align: center;
}

.empty-state i {
    color: var(--primary-color);
    font-size: 28px;
    margin-bottom: 8px;
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

@media (min-width: 768px) {
    .route-list {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .route-hero,
    .active-route-panel {
        padding: 22px;
    }
}

@media (max-width: 520px) {
    .route-toolbar {
        flex-direction: column;
        align-items: stretch;
    }

    .hero-route-actions {
        width: 100%;
        justify-content: stretch;
    }

    .hero-route-actions > * {
        flex: 1;
    }

    .route-toolbar select {
        max-width: none;
    }

    .route-actions,
    .form-grid {
        flex-direction: column;
        grid-template-columns: 1fr;
    }
}
</style>
