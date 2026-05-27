<template>
    <div class="vehicle-page premium-page min-vh-100">
        <div class="container py-1">
            <section class="vehicle-hero">
                <div>
                    <span class="eyebrow">{{ isDriver ? 'Meu veículo' : 'Administração da frota' }}</span>
                    <h4>{{ isDriver ? currentVehicle.model : 'Veiculos' }}</h4>
                    <p>{{ isDriver ? `${currentVehicle.plate} • ${currentVehicle.year} • ${currentVehicle.driver}` : 'Cadastre, vincule motoristas e acompanhe documentos da frota.' }}</p>
                </div>

                <ButtonComp v-if="!isDriver" btn-class="button-primary button-big" :click-action="() => openVehicleModal()">
                    <i class="fa-solid fa-plus"></i>
                    Novo veículo
                </ButtonComp>
            </section>

            <div v-if="isLoading" class="page-loading-state">
                <span class="loader"></span>
                <strong>Carregando veiculos</strong>
                <p>Consultando frota, motorista vinculado e historico.</p>
            </div>

            <section v-else-if="isDriver && !hasVehicle" class="driver-empty-state">
                <i class="fa-solid fa-van-shuttle"></i>
                <strong>Nenhum veículo vinculado</strong>
                <p>Peça para a administração vincular um veículo ao seu usuário motorista.</p>
            </section>

            <template v-else-if="isDriver && hasVehicle">
                <section class="vehicle-status-card">
                    <div class="vehicle-photo large">
                        <img v-if="currentVehicle.photoUrl" :src="currentVehicle.photoUrl" :alt="currentVehicle.model" />
                        <i v-else class="fa-solid fa-van-shuttle"></i>
                    </div>
                    <div>
                        <span class="status-pill" :class="currentVehicle.status === 'Em dia' ? 'done' : 'pending'">
                            {{ currentVehicle.status }}
                        </span>
                        <h5>{{ formatKm(currentVehicle.currentKm) }} km</h5>
                        <p>Proxima manutencao em {{ formatKm(nextMaintenanceKm) }} km</p>
                    </div>
                    <ButtonComp btn-class="button-secundary" :click-action="() => openVehicleDetails(currentVehicle)">
                        Detalhes
                    </ButtonComp>
                </section>

                <section class="driver-grid">
                    <article class="info-card">
                        <small>Renavam</small>
                        <strong>{{ currentVehicle.renavam }}</strong>
                    </article>
                    <article class="info-card">
                        <small>Chassi</small>
                        <strong>{{ currentVehicle.chassis }}</strong>
                    </article>
                    <article class="info-card">
                        <small>Seguro</small>
                        <strong>{{ currentVehicle.insuranceValidUntil ? formatDate(currentVehicle.insuranceValidUntil) : 'Não informado' }}</strong>
                    </article>
                    <article class="info-card">
                        <small>Licenciamento</small>
                        <strong>{{ formatDate(currentVehicle.licenseValidUntil) }}</strong>
                    </article>
                </section>

                <section class="document-card">
                    <div class="section-head">
                        <div>
                            <span class="eyebrow">Documentos</span>
                            <h5>Documento do veículo</h5>
                        </div>
                    </div>

                    <div v-for="document in currentVehicle.documents" :key="document.id" class="document-row">
                        <div>
                            <strong>{{ document.name }}</strong>
                            <small>{{ document.type }} • atualizado em {{ formatDate(document.updatedAt) }}</small>
                        </div>
                        <a class="doc-action" :href="document.url" target="_blank" rel="noreferrer">
                            <i class="fa-solid fa-file-pdf"></i>
                            Abrir
                        </a>
                    </div>
                </section>

                <section class="document-card">
                    <div class="section-head">
                        <div>
                            <span class="eyebrow">Manutencao</span>
                            <h5>Histórico recente</h5>
                        </div>
                        <ButtonComp btn-class="button-secundary" :click-action="() => openVehicleDetails(currentVehicle)">
                            Ver todas
                        </ButtonComp>
                    </div>

                    <div v-for="item in recentMaintenances(currentVehicle)" :key="item.id" class="maintenance-row">
                        <div>
                            <strong>{{ item.type }}</strong>
                            <small>{{ formatDate(item.date) }} • {{ formatKm(item.km) }} km</small>
                        </div>
                        <span>{{ formatMoney(item.amount) }}</span>
                    </div>

                    <div v-if="!currentVehicle.maintenances?.length" class="review-empty">
                        <i class="fa-solid fa-screwdriver-wrench"></i>
                        <span>Nenhuma revisao registrada</span>
                    </div>
                </section>
            </template>

            <template v-else>
                <section class="fleet-summary">
                    <article class="fleet-stat total">
                        <span class="stat-icon"><i class="fa-solid fa-van-shuttle"></i></span>
                        <div>
                            <strong>{{ vehicles.length }}</strong>
                            <small>Total da frota</small>
                        </div>
                    </article>
                    <article class="fleet-stat ok">
                        <span class="stat-icon"><i class="fa-solid fa-circle-check"></i></span>
                        <div>
                            <strong>{{ vehiclesOk }}</strong>
                            <small>Em dia</small>
                        </div>
                    </article>
                    <article class="fleet-stat alert">
                        <span class="stat-icon"><i class="fa-solid fa-triangle-exclamation"></i></span>
                        <div>
                            <strong>{{ vehiclesWithAlert }}</strong>
                            <small>Alertas</small>
                        </div>
                    </article>
                </section>

                <section class="fleet-list">
                    <article v-for="vehicle in vehicles" :key="vehicle.id" class="fleet-card">
                        <div class="fleet-head">
                            <div class="vehicle-photo">
                                <img v-if="vehicle.photoUrl" :src="vehicle.photoUrl" :alt="vehicle.model" />
                                <i v-else class="fa-solid fa-van-shuttle"></i>
                            </div>
                            <div>
                                <strong>{{ vehicle.model }}</strong>
                                <small>{{ vehicle.plate }} • {{ vehicle.year }} • {{ vehicle.driver }}</small>
                            </div>
                            <span class="status-pill" :class="vehicle.status === 'Em dia' ? 'done' : 'pending'">
                                {{ vehicle.status }}
                            </span>
                        </div>

                        <div class="fleet-metrics">
                            <div>
                                <small>KM atual</small>
                                <strong>{{ formatKm(vehicle.currentKm) }}</strong>
                            </div>
                            <div>
                                <small>Renavam</small>
                                <strong>{{ vehicle.renavam }}</strong>
                            </div>
                            <div>
                                <small>Licenciamento</small>
                                <strong>{{ formatDate(vehicle.licenseValidUntil) }}</strong>
                            </div>
                        </div>

                        <div class="fleet-actions">
                            <ButtonComp btn-class="button-primary w-100" :click-action="() => openVehicleDetails(vehicle)">
                                Detalhes
                            </ButtonComp>
                            <ButtonComp btn-class="button-secundary w-100" :click-action="() => openVehicleModal(vehicle)">
                                Editar
                            </ButtonComp>
                            <ButtonComp btn-class="button-secundary-red w-100" :click-action="() => removeVehicle(vehicle.id)">
                                Remover
                            </ButtonComp>
                        </div>

                        <div class="fleet-review-summary">
                            <span>{{ vehicle.maintenances?.length || 0 }} revisao(oes)</span>
                            <ButtonComp btn-class="button-secundary" :click-action="() => openMaintenanceModal(vehicle)">
                                <i class="fa-solid fa-plus"></i>
                                Revisao
                            </ButtonComp>
                        </div>

                        <div class="admin-review-panel hidden-review-panel">
                            <div class="review-panel-head">
                                <div>
                                    <span class="eyebrow">Revisoes</span>
                                    <h6>Histórico completo</h6>
                                </div>
                                <ButtonComp btn-class="button-primary" :click-action="() => openMaintenanceModal(vehicle)">
                                    <i class="fa-solid fa-plus"></i>
                                    Revisao
                                </ButtonComp>
                            </div>

                            <div v-if="vehicle.maintenances?.length" class="review-timeline">
                                <div v-for="item in vehicle.maintenances" :key="item.id" class="review-item">
                                    <div class="review-dot"></div>
                                    <div class="review-content">
                                        <div class="review-title">
                                            <strong>{{ item.type }}</strong>
                                            <span>{{ formatMoney(item.amount) }}</span>
                                        </div>
                                        <small>
                                            {{ formatDate(item.date) }} • {{ formatKm(item.km) }} km
                                            <template v-if="item.workshop"> • {{ item.workshop }}</template>
                                        </small>
                                        <p v-if="item.note">{{ item.note }}</p>
                                    </div>
                                </div>
                            </div>

                            <div v-else class="review-empty">
                                <i class="fa-solid fa-screwdriver-wrench"></i>
                                <span>Nenhuma revisão registrada</span>
                            </div>
                        </div>
                    </article>
                </section>
            </template>
        </div>

        <ModalDefault :is-visible="showVehicleModal" :isLoading="isLoading" max-width="520px" min-width="320px"
            @update:isVisible="cancelVehicleModal">
            <div class="modal-head">
                <span class="modal-icon"><i class="fa-solid fa-van-shuttle"></i></span>
                <div>
                    <h6>{{ vehicleForm.id ? 'Editar veículo' : 'Novo veículo' }}</h6>
                    <p>Complete os dados principais, documento e motorista vinculado.</p>
                </div>
            </div>

            <div class="modal-scroll">
                <label class="form-label">Foto do veiculo</label>
                <div class="vehicle-photo-upload mb-2">
                    <div class="vehicle-photo preview">
                        <img v-if="vehiclePhotoPreview" :src="vehiclePhotoPreview" :alt="vehicleForm.model || 'Foto do veiculo'" />
                        <i v-else class="fa-solid fa-camera"></i>
                    </div>
                    <div>
                        <input type="file" accept="image/*" class="w-100 mb-1" @change="handleVehiclePhoto" />
                        <small class="text-muted d-block">Use uma foto frontal ou lateral para identificar rapido na frota.</small>
                    </div>
                </div>

                <label class="form-label">Modelo</label>
                <input v-model="vehicleForm.model" type="text" class="w-100 mb-2" />

                <div class="form-grid">
                    <div>
                        <label class="form-label">Ano</label>
                        <input v-model.number="vehicleForm.year" type="number" class="w-100 mb-2" />
                    </div>
                    <div>
                        <label class="form-label">Placa</label>
                        <input v-model="vehicleForm.plate" type="text" class="w-100 mb-2" />
                    </div>
                </div>

                <label class="form-label">Motorista vinculado</label>
                <select v-model="vehicleForm.driverId" class="form-select w-100 mb-2">
                    <option :value="null">Sem motorista</option>
                    <option v-for="driver in drivers" :key="driver.id" :value="driver.id">
                        {{ driver.name }} - {{ driver.email }}
                    </option>
                </select>

                <div class="form-grid">
                    <div>
                        <label class="form-label">KM atual</label>
                        <input v-model.number="vehicleForm.currentKm" type="number" class="w-100 mb-2" />
                    </div>
                    <div>
                        <label class="form-label">Próxima manutenção</label>
                        <input v-model.number="vehicleForm.nextMaintenanceAt" type="number" class="w-100 mb-2" />
                    </div>
                </div>

                <label class="form-label">Renavam</label>
                <input v-model="vehicleForm.renavam" type="text" class="w-100 mb-2" />

                <label class="form-label">Chassi</label>
                <input v-model="vehicleForm.chassis" type="text" class="w-100 mb-2" />

                <div class="form-grid">
                    <div>
                        <label class="form-label">Licenciamento válido até</label>
                        <input v-model="vehicleForm.licenseValidUntil" type="date" class="w-100 mb-2" />
                    </div>
                    <div>
                        <label class="form-label">Seguro válido até</label>
                        <input v-model="vehicleForm.insuranceValidUntil" type="date" class="w-100 mb-2" />
                    </div>
                </div>

                <label class="form-label">Status</label>
                <select v-model="vehicleForm.status" class="form-select w-100 mb-2">
                    <option>Em dia</option>
                    <option>Atencao</option>
                    <option>Manutencao</option>
                </select>

                <label class="form-label">Documento PDF</label>
                <input type="file" accept="application/pdf" class="w-100 mb-1" @change="handleDocumentFile" />
                <small class="text-muted d-block mb-2">Mock local: salva o nome e gera um link temporario para abrir.</small>
            </div>

            <ButtonComp btn-class="button-primary button-big w-100" :is-disabled="!canSaveVehicle" :click-action="saveVehicle">
                Salvar veículo
            </ButtonComp>
        </ModalDefault>

        <ModalDefault :is-visible="showMaintenanceModal" :isLoading="isLoading" max-width="480px" min-width="320px"
            @update:isVisible="cancelMaintenanceModal">
            <div class="modal-head">
                <span class="modal-icon"><i class="fa-solid fa-screwdriver-wrench"></i></span>
                <div>
                    <h6>Registrar revisão</h6>
                    <p>{{ selectedVehicle?.plate }} • {{ selectedVehicle?.model }}</p>
                </div>
            </div>

            <label class="form-label">Tipo de revisão</label>
            <select v-model="maintenanceForm.type" class="form-select w-100 mb-2">
                <option>Revisão preventiva</option>
                <option>Troca de óleo</option>
                <option>Freios</option>
                <option>Pneus</option>
                <option>Suspensão</option>
                <option>Corretiva</option>
                <option>Outros</option>
            </select>

            <div class="form-grid">
                <div>
                    <label class="form-label">Data</label>
                    <input v-model="maintenanceForm.date" type="date" class="w-100 mb-2" />
                </div>
                <div>
                    <label class="form-label">KM</label>
                    <input v-model.number="maintenanceForm.km" type="number" class="w-100 mb-2" />
                </div>
            </div>

            <label class="form-label">Oficina / fornecedor</label>
            <input v-model="maintenanceForm.workshop" type="text" class="w-100 mb-2" placeholder="Ex: Auto Center São Pedro" />

            <div class="form-grid">
                <div>
                    <label class="form-label">Valor</label>
                    <input v-model.number="maintenanceForm.amount" type="number" class="w-100 mb-2" />
                </div>
                <div>
                    <label class="form-label">Próxima revisão em KM</label>
                    <input v-model.number="maintenanceForm.nextDueKm" type="number" class="w-100 mb-2" />
                </div>
            </div>

            <label class="form-label">Observação</label>
            <textarea v-model="maintenanceForm.note" class="w-100 maintenance-note" placeholder="Itens trocados, recomendações, pendências..."></textarea>

            <ButtonComp btn-class="button-primary button-big w-100 mt-2" :is-disabled="!canSaveMaintenance" :click-action="saveMaintenance">
                Salvar revisão
            </ButtonComp>
        </ModalDefault>

        <ModalDefault :is-visible="showDetailsModal" :isLoading="false" max-width="760px" min-width="320px"
            @update:isVisible="cancelDetailsModal">
            <div v-if="selectedDetailVehicle" class="vehicle-detail">
                <div class="detail-hero">
                    <div class="vehicle-photo detail">
                        <img v-if="selectedDetailVehicle.photoUrl" :src="selectedDetailVehicle.photoUrl" :alt="selectedDetailVehicle.model" />
                        <i v-else class="fa-solid fa-van-shuttle"></i>
                    </div>
                    <div>
                        <span class="eyebrow">Detalhes do veiculo</span>
                        <h6>{{ selectedDetailVehicle.model }}</h6>
                        <p>{{ selectedDetailVehicle.plate }} - {{ selectedDetailVehicle.year }} - {{ selectedDetailVehicle.driver }}</p>
                    </div>
                </div>

                <div class="detail-metrics">
                    <div>
                        <small>KM atual</small>
                        <strong>{{ formatKm(selectedDetailVehicle.currentKm) }}</strong>
                    </div>
                    <div>
                        <small>Proxima manutencao</small>
                        <strong>{{ formatKm(selectedDetailVehicle.nextMaintenanceAt) }}</strong>
                    </div>
                    <div>
                        <small>Status</small>
                        <strong>{{ selectedDetailVehicle.status }}</strong>
                    </div>
                </div>

                <div class="detail-actions" v-if="!isDriver">
                    <ButtonComp btn-class="button-primary" :click-action="() => openMaintenanceModal(selectedDetailVehicle)">
                        <i class="fa-solid fa-plus"></i>
                        Nova revisao
                    </ButtonComp>
                    <ButtonComp btn-class="button-secundary" :click-action="() => openVehicleModal(selectedDetailVehicle)">
                        Editar veiculo
                    </ButtonComp>
                </div>

                <div class="detail-section">
                    <div class="section-head">
                        <div>
                            <span class="eyebrow">Documentos</span>
                            <h5>Arquivos do veiculo</h5>
                        </div>
                    </div>
                    <div v-if="selectedDetailVehicle.documents?.length">
                        <div v-for="document in selectedDetailVehicle.documents" :key="document.id" class="document-row">
                            <div>
                                <strong>{{ document.name }}</strong>
                                <small>{{ document.type }} - atualizado em {{ formatDate(document.updatedAt) }}</small>
                            </div>
                            <a class="doc-action" :href="document.url" target="_blank" rel="noreferrer">
                                <i class="fa-solid fa-file-pdf"></i>
                                Abrir
                            </a>
                        </div>
                    </div>
                    <div v-else class="review-empty">
                        <i class="fa-solid fa-file-circle-xmark"></i>
                        <span>Nenhum documento cadastrado</span>
                    </div>
                </div>

                <div class="detail-section">
                    <div class="section-head">
                        <div>
                            <span class="eyebrow">Revisoes</span>
                            <h5>Historico completo</h5>
                        </div>
                        <span>{{ selectedDetailVehicle.maintenances?.length || 0 }} registro(s)</span>
                    </div>

                    <div v-if="selectedDetailVehicle.maintenances?.length" class="review-timeline detail-list">
                        <div v-for="item in selectedDetailVehicle.maintenances" :key="item.id" class="review-item">
                            <div class="review-dot"></div>
                            <div class="review-content">
                                <div class="review-title">
                                    <strong>{{ item.type }}</strong>
                                    <span>{{ formatMoney(item.amount) }}</span>
                                </div>
                                <small>
                                    {{ formatDate(item.date) }} - {{ formatKm(item.km) }} km
                                    <template v-if="item.workshop"> - {{ item.workshop }}</template>
                                </small>
                                <p v-if="item.note">{{ item.note }}</p>
                            </div>
                        </div>
                    </div>
                    <div v-else class="review-empty">
                        <i class="fa-solid fa-screwdriver-wrench"></i>
                        <span>Nenhuma revisao registrada</span>
                    </div>
                </div>
            </div>
        </ModalDefault>
    </div>
</template>

<script>
import ButtonComp from '@/components/ButtonComp.vue';
import ModalDefault from '@/components/modals/ModalDefault.vue';
import {
    createDocumentApi,
    createMaintenanceApi,
    formatLocalDate,
    getMyVehicle,
    listDrivers,
    listVehicles,
    removeVehicleApi,
    saveVehicleApi
} from '@/services/backendService';

export default {
    name: 'VehicleView',

    components: {
        ButtonComp,
        ModalDefault
    },

    data() {
        return {
            profileType: localStorage.getItem('profileType') || 'driver',
            vehicles: [],
            drivers: [],
            isLoading: false,
            errorMessage: '',
            showVehicleModal: false,
            showMaintenanceModal: false,
            showDetailsModal: false,
            vehicleForm: this.emptyVehicleForm(),
            maintenanceForm: this.emptyMaintenanceForm(),
            selectedVehicle: null,
            selectedDetailVehicle: null
        }
    },

    computed: {
        isDriver() {
            return this.profileType === 'driver'
        },

        currentVehicle() {
            return this.vehicles[0] || this.emptyVehicleForm()
        },

        hasVehicle() {
            return Boolean(this.vehicles.length)
        },

        nextMaintenanceKm() {
            return Math.max(0, Number(this.currentVehicle.nextMaintenanceAt) - Number(this.currentVehicle.currentKm))
        },

        vehiclesOk() {
            return this.vehicles.filter(vehicle => vehicle.status === 'Em dia').length
        },

        vehiclesWithAlert() {
            return this.vehicles.filter(vehicle => vehicle.status !== 'Em dia').length
        },

        canSaveVehicle() {
            return Boolean(this.vehicleForm.model && this.vehicleForm.plate)
        },

        canSaveMaintenance() {
            return Boolean(this.selectedVehicle && this.maintenanceForm.type && this.maintenanceForm.date && this.maintenanceForm.km)
        },

        vehiclePhotoPreview() {
            return this.vehicleForm.photo?.preview || this.vehicleForm.photoUrl
        }
    },

    mounted() {
        window.addEventListener('profile-updated', this.syncProfile)
        this.fetchVehicles()
        this.fetchDrivers()
    },

    beforeUnmount() {
        window.removeEventListener('profile-updated', this.syncProfile)
    },

    methods: {
        async fetchVehicles() {
            this.isLoading = true
            this.errorMessage = ''

            try {
                this.vehicles = this.isDriver ? await getMyVehicle() : await listVehicles()
            } catch (error) {
                console.error(error)
                if ([403, 404].includes(error.response?.status) && this.isDriver) {
                    this.vehicles = []
                    return
                }
                this.errorMessage = error.response?.data?.message || 'Não foi possível carregar os veículos.'
            } finally {
                this.isLoading = false
            }
        },

        async fetchDrivers() {
            if (this.isDriver) {
                this.drivers = []
                return
            }

            try {
                this.drivers = await listDrivers()
            } catch (error) {
                console.error(error)
                this.errorMessage = error.response?.data?.message || 'Não foi possível carregar os motoristas.'
            }
        },

        emptyVehicleForm() {
            return {
                id: null,
                model: '',
                year: new Date().getFullYear(),
                plate: '',
                driver: '',
                driverId: null,
                currentKm: '',
                nextMaintenanceAt: '',
                renavam: '',
                chassis: '',
                photo: null,
                photoUrl: '',
                photoName: '',
                licenseValidUntil: '',
                insuranceValidUntil: '',
                status: 'Em dia',
                documents: [],
                maintenances: []
            }
        },

        emptyMaintenanceForm() {
            return {
                type: 'Revisao preventiva',
                date: new Date().toISOString().slice(0, 10),
                km: '',
                workshop: '',
                amount: '',
                nextDueKm: '',
                note: ''
            }
        },

        syncProfile(event) {
            this.profileType = event.detail || localStorage.getItem('profileType') || 'driver'
            this.fetchVehicles()
            this.fetchDrivers()
        },

        openVehicleModal(vehicle = null) {
            this.vehicleForm = vehicle
                ? { ...JSON.parse(JSON.stringify(vehicle)), photo: null }
                : this.emptyVehicleForm()
            this.showVehicleModal = true
        },

        cancelVehicleModal() {
            this.showVehicleModal = false
            this.vehicleForm = this.emptyVehicleForm()
        },

        async saveVehicle() {
            if (!this.canSaveVehicle) return

            this.isLoading = true

            try {
                const documents = this.vehicleForm.documents || []
                const savedVehicle = await saveVehicleApi(this.vehicleForm)
                const pendingDocuments = documents.filter(document => !document.fileUrl && String(document.id).startsWith('local-'))

                await Promise.all(pendingDocuments.map(document => createDocumentApi(savedVehicle.id, document)))
                await this.fetchVehicles()
                this.cancelVehicleModal()
            } catch (error) {
                console.error(error)
                this.errorMessage = error.response?.data?.message || 'Não foi possível salvar o veículo.'
            } finally {
                this.isLoading = false
            }
        },

        async removeVehicle(id) {
            this.isLoading = true
            try {
                await removeVehicleApi(id)
                this.vehicles = this.vehicles.filter(vehicle => vehicle.id !== id)
            } catch (error) {
                console.error(error)
                this.errorMessage = error.response?.data?.message || 'Não foi possível remover o veículo.'
            } finally {
                this.isLoading = false
            }
        },

        openMaintenanceModal(vehicle) {
            this.selectedVehicle = vehicle
            this.maintenanceForm = {
                ...this.emptyMaintenanceForm(),
                km: vehicle.currentKm,
                nextDueKm: vehicle.nextMaintenanceAt
            }
            this.showMaintenanceModal = true
        },

        cancelMaintenanceModal() {
            this.showMaintenanceModal = false
            this.selectedVehicle = null
            this.maintenanceForm = this.emptyMaintenanceForm()
        },

        openVehicleDetails(vehicle) {
            this.selectedDetailVehicle = vehicle
            this.showDetailsModal = true
        },

        cancelDetailsModal() {
            this.showDetailsModal = false
            this.selectedDetailVehicle = null
        },

        async saveMaintenance() {
            if (!this.canSaveMaintenance) return

            this.isLoading = true
            try {
                await createMaintenanceApi(this.selectedVehicle.id, this.maintenanceForm)
                await this.fetchVehicles()
                this.cancelMaintenanceModal()
            } catch (error) {
                console.error(error)
                this.errorMessage = error.response?.data?.message || 'Não foi possível salvar a revisão.'
            } finally {
                this.isLoading = false
            }
        },

        handleDocumentFile(event) {
            const file = event.target.files?.[0]
            if (!file) return

            this.vehicleForm.documents = [
                ...(this.vehicleForm.documents || []),
                {
                    id: `local-${Date.now()}`,
                    name: file.name,
                    type: 'PDF',
                    file,
                    updatedAt: new Date().toISOString().slice(0, 10),
                    url: URL.createObjectURL(file)
                }
            ]
            event.target.value = ''
        },

        handleVehiclePhoto(event) {
            const file = event.target.files?.[0]
            if (!file) return

            this.vehicleForm.photo = {
                file,
                name: file.name,
                preview: URL.createObjectURL(file)
            }
            event.target.value = ''
        },

        recentMaintenances(vehicle) {
            return (vehicle.maintenances || []).slice(0, 3)
        },

        formatDate(date) {
            if (!date) return 'Não informado'
            return formatLocalDate(date)
        },

        formatKm(value) {
            return Number(value || 0).toLocaleString('pt-BR')
        },

        formatMoney(value) {
            return Number(value || 0).toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL'
            })
        }
    }
}
</script>

<style scoped>
.vehicle-hero,
.vehicle-status-card,
.info-card,
.document-card,
.driver-empty-state,
.fleet-card {
    border: 1px solid var(--border-soft);
    background: var(--surface-card);
    box-shadow: var(--shadow-soft);
}

.vehicle-hero {
    border-radius: 24px;
    padding: 18px;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 14px;
}

.eyebrow {
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--primary-color);
    font-size: 11px;
    font-weight: 800;
}

.vehicle-hero h4,
.vehicle-hero p,
.section-head h5,
.modal-head h6 {
    margin: 0;
}

.vehicle-hero p,
.vehicle-status-card p,
.info-card small,
.document-row small,
.maintenance-row small,
.fleet-card small,
.modal-head p {
    color: var(--text-muted);
}

.vehicle-status-card {
    border-radius: 24px;
    margin: 12px 0;
    padding: 18px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background:
        radial-gradient(circle at top right, rgba(var(--primary-color-rgb), 0.18), transparent 40%),
        var(--surface-card);
    gap: 14px;
}

.vehicle-status-card h5 {
    margin: 10px 0 2px;
    color: var(--text-strong);
    font-size: 32px;
}

.vehicle-status-card > i {
    color: var(--primary-color);
    font-size: 44px;
}

.vehicle-photo {
    width: 64px;
    height: 64px;
    border-radius: 16px;
    background: var(--primary-soft);
    color: var(--primary-color);
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;
    overflow: hidden;
    font-size: 24px;
}

.vehicle-photo.large {
    width: 92px;
    height: 92px;
    border-radius: 22px;
}

.vehicle-photo.preview {
    width: 86px;
    height: 64px;
    border-radius: 14px;
}

.vehicle-photo.detail {
    width: 120px;
    height: 92px;
    border-radius: 20px;
}

.vehicle-photo img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.vehicle-photo-upload,
.detail-hero,
.detail-actions,
.fleet-review-summary {
    display: flex;
    gap: 12px;
}

.vehicle-photo-upload {
    align-items: center;
    border: 1px dashed var(--border-soft);
    border-radius: 16px;
    padding: 10px;
    background: var(--surface-muted);
}

.driver-empty-state {
    border-radius: 22px;
    padding: 34px 18px;
    margin-top: 12px;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 8px;
}

.driver-empty-state i {
    width: 54px;
    height: 54px;
    border-radius: 16px;
    background: var(--primary-soft);
    color: var(--primary-color);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
}

.driver-empty-state strong {
    color: var(--text-strong);
    font-size: 18px;
}

.driver-empty-state p {
    color: var(--text-muted);
    max-width: 420px;
}

.status-pill {
    border-radius: 999px;
    padding: 6px 9px;
    font-size: 11px;
    font-weight: 900;
}

.status-pill.done {
    color: #16a34a;
    background: rgba(22, 163, 74, 0.14);
}

.status-pill.pending {
    color: #d97706;
    background: rgba(217, 119, 6, 0.14);
}

.driver-grid,
.fleet-summary {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
    margin-bottom: 12px;
}

.info-card,
.fleet-summary article {
    border-radius: 18px;
    padding: 14px;
}

.info-card strong,
.fleet-summary strong {
    display: block;
    color: var(--text-strong);
    font-size: 16px;
    margin-top: 4px;
    overflow-wrap: anywhere;
}

.document-card {
    border-radius: 22px;
    padding: 16px;
    margin-bottom: 12px;
}

.section-head {
    margin-bottom: 10px;
}

.document-row,
.maintenance-row,
.fleet-head,
.fleet-actions,
.modal-head {
    display: flex;
    gap: 12px;
}

.document-row,
.maintenance-row,
.fleet-head {
    justify-content: space-between;
    align-items: flex-start;
    padding: 12px 0;
    border-bottom: 1px solid var(--border-soft);
}

.fleet-head > div:nth-child(2) {
    flex: 1;
    min-width: 0;
}

.document-row:last-child,
.maintenance-row:last-child {
    border-bottom: 0;
}

.document-row strong,
.maintenance-row strong,
.fleet-head strong {
    display: block;
    color: var(--text-strong);
}

.maintenance-row span {
    color: #ef4444;
    font-weight: 900;
    white-space: nowrap;
}

.doc-action {
    border-radius: 12px;
    padding: 8px 10px;
    color: var(--primary-color) !important;
    background: var(--primary-soft);
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-weight: 900;
}

.fleet-summary {
    margin: 12px 0;
    grid-template-columns: repeat(3, minmax(0, 1fr));
}

.fleet-stat {
    background:
        radial-gradient(circle at top right, rgba(var(--primary-color-rgb), 0.12), transparent 58%),
        var(--surface-card);
    border: 1px solid var(--border-soft);
    border-radius: 20px;
    padding: 13px;
    display: flex;
    align-items: center;
    gap: 11px;
    min-width: 0;
}

.fleet-stat .stat-icon {
    width: 38px;
    height: 38px;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;
    background: var(--primary-soft);
    color: var(--primary-color);
}

.fleet-stat strong {
    display: block;
    color: var(--text-strong);
    font-size: 24px;
    line-height: 1;
    margin: 0 0 3px;
}

.fleet-stat small {
    display: block;
    color: var(--text-muted);
    font-size: 12px;
    line-height: 1.15;
    white-space: nowrap;
}

.fleet-stat.ok .stat-icon {
    background: rgba(22, 163, 74, 0.14);
    color: #16a34a;
}

.fleet-stat.alert .stat-icon {
    background: rgba(217, 119, 6, 0.15);
    color: #d97706;
}

.fleet-list {
    display: grid;
    gap: 12px;
}

.fleet-card {
    border-radius: 24px;
    padding: 16px;
    overflow: hidden;
    position: relative;
}

.fleet-card::before {
    content: "";
    position: absolute;
    inset: 0 0 auto;
    height: 4px;
    background: linear-gradient(90deg, var(--primary-color), rgba(var(--primary-color-rgb), 0.15));
}

.fleet-metrics {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
    margin: 12px 0;
}

.fleet-metrics div {
    border-radius: 14px;
    padding: 10px;
    background: var(--surface-muted);
    min-width: 0;
}

.fleet-metrics strong {
    display: block;
    color: var(--text-strong);
    overflow-wrap: anywhere;
}

.fleet-actions {
    margin-top: 10px;
}

.admin-review-panel {
    margin-top: 14px;
    border-radius: 18px;
    background: var(--surface-muted);
    padding: 12px;
}

.hidden-review-panel {
    display: none;
}

.fleet-review-summary {
    margin-top: 12px;
    align-items: center;
    justify-content: space-between;
    border-radius: 16px;
    padding: 10px;
    background: var(--surface-muted);
    color: var(--text-muted);
    font-weight: 800;
}

.fleet-review-summary .button-comp {
    min-height: 34px;
    padding: 4px 10px;
}

.review-panel-head {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    align-items: center;
    margin-bottom: 10px;
}

.review-panel-head h6 {
    margin: 0;
    color: var(--text-strong);
}

.review-panel-head .button-comp {
    min-height: 34px;
    padding: 4px 10px;
    white-space: nowrap;
}

.review-timeline {
    display: grid;
    gap: 10px;
}

.review-item {
    display: grid;
    grid-template-columns: 18px minmax(0, 1fr);
    gap: 8px;
    position: relative;
}

.review-item::before {
    content: "";
    position: absolute;
    left: 6px;
    top: 18px;
    bottom: -10px;
    width: 2px;
    background: var(--border-soft);
}

.review-item:last-child::before {
    display: none;
}

.review-dot {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    margin-top: 4px;
    background: var(--primary-color);
    box-shadow: 0 0 0 4px var(--primary-soft);
    z-index: 1;
}

.review-content {
    background: var(--surface-card);
    border: 1px solid var(--border-soft);
    border-radius: 14px;
    padding: 10px;
}

.review-title {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    align-items: flex-start;
}

.review-title strong {
    color: var(--text-strong);
}

.review-title span {
    color: #ef4444;
    font-weight: 900;
    white-space: nowrap;
}

.review-content small {
    display: block;
    color: var(--text-muted);
    font-size: 12px;
    margin-top: 2px;
}

.review-content p {
    margin: 8px 0 0;
    color: var(--text-muted);
    line-height: 1.35;
}

.review-empty {
    border: 1px dashed var(--border-soft);
    color: var(--text-muted);
    border-radius: 14px;
    padding: 14px;
    display: flex;
    gap: 8px;
    align-items: center;
    justify-content: center;
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

.modal-scroll {
    max-height: 65vh;
    overflow-y: auto;
    padding-right: 4px;
}

.maintenance-note {
    min-height: 110px;
    overflow: auto !important;
}

.form-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
}

.vehicle-detail {
    display: grid;
    gap: 14px;
}

.detail-hero {
    align-items: center;
}

.detail-hero h6 {
    margin: 4px 0;
    color: var(--text-strong);
    font-size: 22px;
}

.detail-hero p {
    color: var(--text-muted);
}

.detail-metrics {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
}

.detail-metrics div,
.detail-section {
    border-radius: 16px;
    background: var(--surface-muted);
    border: 1px solid var(--border-soft);
}

.detail-metrics div {
    padding: 12px;
}

.detail-metrics small {
    display: block;
    color: var(--text-muted);
    font-size: 12px;
}

.detail-metrics strong {
    display: block;
    color: var(--text-strong);
    margin-top: 4px;
    overflow-wrap: anywhere;
}

.detail-actions {
    justify-content: flex-end;
    flex-wrap: wrap;
}

.detail-section {
    padding: 14px;
}

.detail-list {
    max-height: 360px;
    overflow-y: auto;
    padding-right: 4px;
}

@media (min-width: 820px) {
    .driver-grid,
    .fleet-summary {
        grid-template-columns: repeat(4, minmax(0, 1fr));
    }

    .fleet-list {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
}

@media (max-width: 560px) {
    .vehicle-hero,
    .fleet-actions,
    .vehicle-status-card,
    .vehicle-photo-upload,
    .detail-hero,
    .detail-actions {
        flex-direction: column;
        align-items: stretch;
    }

    .fleet-metrics,
    .form-grid,
    .detail-metrics {
        grid-template-columns: 1fr;
    }

    .fleet-summary {
        grid-template-columns: 1fr;
    }
}
</style>
