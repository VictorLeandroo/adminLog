<template>
    <div class="routes-page min-vh-100">
        <div class="container py-2">
            <div class="row">
                <div class="col-12">
                    <div class="card">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-center mb-1">
                                <h5 class="mb-0">Minhas Rotas</h5>
                                <ButtonComp btn-class="button-primary" :click-action="() => showNewRouteModal = true"
                                    :disabled="routes.filter(item => item.status == 'Em andamento').length" v-if="profileType == 'driver' || profileType == 'admin'">
                                    + Nova Rota
                                </ButtonComp>
                            </div>
                            <input type="text" v-model="searchTerm" class="form-control"
                                placeholder="Buscar por cidade, nota ou data..." />

                        </div>
                    </div>
                </div>
            </div>

            <div>
                <div class="table-responsive d-none d-md-block">
                    <table class="table table-hover align-middle bg-white shadow-sm">
                        <thead class="table-light">
                            <tr>
                                <th>Data</th>
                                <th>Cidades</th>
                                <th>Notas</th>
                                <th>KM Inicial</th>
                                <th>KM Final</th>
                                <th>KM Percorrido</th>
                                <th>Status</th>
                                <th class="text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="route in filteredRoutes" :key="route.id">
                                <td>
                                    <div class="fw-bold">{{ formatDate(route.data) }}</div>
                                    <small class="text-muted">{{ formatDay(route.data) }}</small>
                                </td>
                                <td>{{ route.cidades.join(', ') }}</td>
                                <td>
                                    <span v-for="nota in route.notas" :key="nota" class="badge bg-secondary me-1">
                                        {{ nota }}
                                    </span>
                                </td>
                                <td>{{ route.kmInicial }}</td>
                                <td>{{ route.kmFinal }}</td>
                                <td class="fw-bold text-primary">{{ calcPercorrido(route.kmInicial, route.kmFinal) }} km
                                </td>
                                <td>
                                    <span class="badge px-2 py-1" :class="classBadge(route.status)">
                                        {{ route.status }}
                                    </span>

                                    <div v-if="route.deleteRequested" class="text-danger small mt-25">
                                        <i class="fa-solid fa-triangle-exclamation me-1"></i>
                                        Exclusão solicitada
                                    </div>
                                </td>

                                <td class="text-center">
                                    <button class="btn btn-sm btn-outline-primary me-2" @click="editRoute(route)"
                                        v-if="profileType != 'driver' || profileType == 'driver' && route.status == 'Em andamento'">
                                        Editar
                                    </button>
                                    <button class="btn btn-sm btn-outline-danger" @click="deleteRoute(route.id)"
                                        v-if="profileType != 'driver' || profileType == 'driver' && route.status == 'Em andamento'">
                                        Excluir
                                    </button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div class="d-md-none">
                    <transition-group name="list" tag="div" class="position-relative">
                        <div v-for="route in filteredRoutes" :key="route.id" class="card mb-3 w-100">
                            <div class="card-body">
                                <div class="d-flex justify-content-between align-items-start mb-2">
                                    <div>
                                        <h6 class="fw-bold mb-0">{{ formatDate(route.data) }}</h6>
                                        <small class="text-muted d-block">{{ formatDay(route.data) }}</small>

                                    </div>
                                    <div class="d-flex flex-column align-items-end">
                                        <span v-if="route.deleteRequested" class="badge bg-danger mb-50">
                                            Exclusão solicitada
                                        </span>
                                        <span v-else :class="[
                                            'badge mb-50',
                                            classBadge(route.status)
                                        ]">
                                            {{ route.status }}
                                        </span>
                                        <small class="text-muted">
                                            <i class="fa-solid fa-user me-1"></i>
                                            Motorista: {{ route.driver }}
                                        </small>
                                    </div>


                                </div>


                                <p class="mb-2">
                                    <small class="text-muted">Cidades:</small><br />
                                    <strong>{{ route.cidades.join(', ') }}</strong>
                                </p>

                                <p class="mb-2">
                                    <small class="text-muted">Notas fiscais:</small><br />
                                    <span v-for="nota in route.notas" :key="nota" class="badge bg-secondary me-1">
                                        {{ nota }}
                                    </span>
                                </p>

                                <div class="border-top pt-2 mt-2">
                                    <p class="mb-1"><small class="text-muted">KM Inicial:</small> <strong>{{
                                        route.kmInicial
                                            }}</strong></p>
                                    <p class="mb-1"><small class="text-muted">KM Final:</small> <strong>{{ route.kmFinal
                                    }}</strong></p>
                                    <p class="mb-2 text-primary">
                                        <small class="text-muted">Total Percorrido:</small>
                                        <strong>{{ calcPercorrido(route.kmInicial, route.kmFinal) }} km</strong>
                                    </p>
                                </div>


                                <div class="d-flex justify-content-end">
                                    <ButtonComp btn-class="button-secundary-red button-big w-50" class="mr-50"
                                        :click-action="() => { showConfirmDeleteModal = true; routeSelected = route }"
                                        :is-disabled="profileType == 'driver' && route.deleteRequested"
                                        v-if="profileType != 'driver' || route.status != 'Concluída'">
                                        <span v-if="profileType != 'driver'">
                                            Excluir
                                        </span>

                                        <span v-else-if="route.deleteRequested">
                                            Exclusão solicitada
                                        </span>

                                        <span v-else>
                                            Solicitar exclusão
                                        </span>
                                    </ButtonComp>
                                    <ButtonComp btn-class="button-primary button-big w-50"
                                        :disabled="profileType == 'driver' && route.status != 'Em andamento'"
                                        :click-action="() => editRoute(route)">
                                        Editar
                                    </ButtonComp>
                                </div>
                            </div>
                        </div>
                        <div v-if="!filteredRoutes.length" class="text-center py-5 text-muted">
                            <i class="fa-solid fa-route fa-2x mb-2"></i>
                            <p class="mb-0">Nenhuma rota encontrada</p>
                        </div>
                    </transition-group>
                </div>
            </div>

        </div>

        <ModalDelete :isLoading="isModalLoading" icon="fa-solid fa-trash"
            :title="profileType != 'driver' ? `Excluir Rota` : 'Solicitar exclusão?'"
            :isVisible="showConfirmDeleteModal" @update:isVisible="showConfirmDeleteModal = $event"
            @confirm="() => deleteRoute()" max-width="300px" />

        <ModalDefault :isLoading="isModalLoading" :is-visible="showNewRouteModal" max-width="300px" min-width="300px"
            @update:isVisible="cancelEdit">
            <div class="mb-2">
                <label class="form-label">Data da Rota</label>
                <input type="date" v-model="form.data" class="w-100" />
            </div>
            <div class="mb-3">
                <label class="form-label">KM Inicial</label>
                <div class="position-relative">
                    <input type="number" v-model="form.kmInicial" class="w-100" />
                    <!-- <i class="fa-solid fa-camera icon-right-input"></i> -->
                </div>
            </div>
            <ButtonComp :click-action="() => startRoute()" btn-class="button-primary button-big w-100">Iniciar
            </ButtonComp>
        </ModalDefault>

        <ModalDefault :isLoading="isModalLoading" :is-visible="showEditRouteModal" max-width="400px" min-width="400px"
            @update:isVisible="cancelEditRoute" @confirm="saveRouteEdit">

            <div class="modal-scroll-content">
                <div class="mb-2">
                    <label class="form-label">KM Inicial</label>
                    <input type="number" v-model.number="editForm.kmInicial" class="w-100" />
                </div>

                <div class="mb-2">
                    <label class="form-label">KM Final</label>
                    <input type="number" v-model.number="editForm.kmFinal" class="w-100"
                        :class="{ 'input-error': kmFinalInvalid }" />

                    <small v-if="kmFinalInvalid" class="text-danger">
                        O KM final não pode ser menor que o KM inicial
                    </small>
                </div>



                <div class="mb-2">
                    <label class="form-label">Notas Fiscais</label>
                    <div v-if="routeSelected.photos.length" class="preview-list"
                        :class="{ 'mb-2': routeSelected.photos.length }">
                        <div class="d-flex gap-2 mt-50 mb-50" :class="{ 'mb-2': routeSelected.photos.length }">
                            <img v-for="(photo, index) in routeSelected.photos" :key="index" :src="photo.url"
                                class="route-photo" @click="openLightbox(photo.url)" />
                        </div>
                    </div>
                    <PhotoUploadComp v-model="photos" />
                </div>

                <div class="mb-2" v-if="profileType != 'driver'">
                    <label class="form-label">Cidades</label>
                    <input type="text" v-model="editForm.cidadesStr" class="w-100" placeholder="Separe por vírgula" />
                    <small class="text-muted">Ex: São Paulo, Itu, Campinas</small>
                </div>

                <div class="mb-2" v-if="profileType != 'driver'">
                    <label class="form-label">Notas Fiscais</label>
                    <input type="text" v-model="editForm.notasStr" class="w-100" placeholder="Separe por vírgula" />
                    <small class="text-muted">Ex: 5674, 5675, 5676</small>
                </div>

                <div class="mb-2" v-if="profileType != 'driver'">
                    <label class="form-label">Status</label>
                    <select v-model="editForm.status" class="form-select w-100">
                        <option value="Em andamento">Em andamento</option>
                        <option value="Pendente">Pendente</option>
                        <option value="Concluída">Concluída</option>
                    </select>
                </div>

            </div>
            <ButtonComp :click-action="() => saveRouteEdit()" :is-disabled="!canSaveRoute"
                btn-class="button-primary button-big w-100" v-if="profileType == 'driver'">
                Finalizar Rota
            </ButtonComp>
            <ButtonComp :click-action="() => saveRouteEdit()" :is-disabled="!canSaveRoute"
                btn-class="button-primary button-big w-100" v-else>
                Salvar
            </ButtonComp>
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
import ButtonComp from '@/components/ButtonComp.vue';
import ModalDefault from '@/components/modals/ModalDefault.vue';
import ModalDelete from '@/components/modals/ModalDelete.vue';
import PhotoUploadComp from '@/components/PhotoUploadComp.vue';

export default {
    name: 'RoutesView',
    data() {
        return {
            profileType: 'driver',
            routes: [
                {
                    id: 3,
                    data: '2025-10-29',
                    cidades: [],
                    notas: [],
                    kmInicial: 10380,
                    kmFinal: null,
                    photos: [],
                    status: 'Em andamento',
                    createdAt: '2025-10-29T08:10:00',
                    finishedAt: null,
                    driver: 'Estevão',
                    deleteRequested: false,
                },
                {
                    id: 2,
                    data: '2025-12-29',
                    cidades: ['Sorocaba', 'Ilhabela'],
                    notas: [5680],
                    kmInicial: 10380,
                    kmFinal: 10440,
                    photos: [
                        {
                            name: 'nota-5680.jpg',
                            url: 'https://clicknotas.com.br/wp-content/uploads/2025/06/Modelo-basico-de-Nota-Fiscal-NFS-e.webp'
                        }
                    ],
                    status: 'Pendente conferência',
                    createdAt: '2025-12-29T07:50:00',
                    finishedAt: '2025-12-29T18:20:00',
                    driver: 'Estevão',
                    deleteRequested: false,
                },
                {
                    id: 1,
                    data: '2025-10-28',
                    cidades: ['São Paulo', 'Itu', 'Campinas', 'Boituva'],
                    notas: [5674, 5675, 5676],
                    kmInicial: 10230,
                    kmFinal: 10380,
                    photos: [
                        {
                            name: 'nota-5674.jpg',
                            url: 'https://clicknotas.com.br/wp-content/uploads/2025/06/Modelo-basico-de-Nota-Fiscal-NFS-e.webp'
                        },
                        {
                            name: 'nota-5675.jpg',
                            url: 'https://clicknotas.com.br/wp-content/uploads/2025/06/Modelo-basico-de-Nota-Fiscal-NFS-e.webp'
                        },
                        {
                            name: 'nota-5675.jpg',
                            url: 'https://clicknotas.com.br/wp-content/uploads/2025/06/Modelo-basico-de-Nota-Fiscal-NFS-e.webp'
                        },
                        {
                            name: 'nota-5675.jpg',
                            url: 'https://clicknotas.com.br/wp-content/uploads/2025/06/Modelo-basico-de-Nota-Fiscal-NFS-e.webp'
                        },
                        {
                            name: 'nota-5675.jpg',
                            url: 'https://clicknotas.com.br/wp-content/uploads/2025/06/Modelo-basico-de-Nota-Fiscal-NFS-e.webp'
                        },
                        {
                            name: 'nota-5675.jpg',
                            url: 'https://clicknotas.com.br/wp-content/uploads/2025/06/Modelo-basico-de-Nota-Fiscal-NFS-e.webp'
                        },
                        {
                            name: 'nota-5675.jpg',
                            url: 'https://clicknotas.com.br/wp-content/uploads/2025/06/Modelo-basico-de-Nota-Fiscal-NFS-e.webp'
                        },
                    ],
                    status: 'Concluída',
                    createdAt: '2025-10-28T07:40:00',
                    finishedAt: '2025-10-28T17:30:00',
                    driver: 'Estevão',
                    deleteRequested: false,
                }
            ],

            form: {
                data: '',
                kmInicial: ''
            },

            modalInstance: null,
            isModalLoading: false,
            showConfirmDeleteModal: false,
            showNewRouteModal: false,
            showEditRouteModal: false,

            routeSelected: null,
            editForm: {
                data: '',
                kmInicial: '',
                kmFinal: '',
                cidadesStr: '',
                notasStr: '',
                status: 'Pendente'
            },

            searchTerm: '',
            photos: [],
            lightboxPhoto: null

        }
    },
    components: {
        ButtonComp,
        ModalDelete,
        ModalDefault,
        PhotoUploadComp
    },
    computed: {
        filteredRoutes() {
            if (!this.searchTerm) return this.routes
            const term = this.searchTerm.toLowerCase()

            return this.routes.filter(r =>
                r.cidades.some(c => c.toLowerCase().includes(term)) ||
                r.notas.some(n => String(n).includes(term)) ||
                this.formatDate(r.data).toLowerCase().includes(term) ||
                this.formatDay(r.data).toLowerCase().includes(term)
            )
        },

        kmFinalInvalid() {
            if (!this.editForm.kmFinal) return false
            return Number(this.editForm.kmFinal) < Number(this.editForm.kmInicial)
        },

        canSaveRoute() {
            if (!this.editForm.kmFinal) return false
            if (this.kmFinalInvalid) return false
            return true
        }
    },
    methods: {
        goBack() {
            this.$router.push('/dashboard')
        },

        editRoute(route) {
            this.routeSelected = route
            this.editForm = {
                data: route.data,
                kmInicial: route.kmInicial,
                kmFinal: route.kmFinal || '',
                cidadesStr: route.cidades.join(', '),
                notasStr: route.notas.join(', '),
                status: route.status
            }
            this.showEditRouteModal = true
        },

        cancelEditRoute() {
            this.showEditRouteModal = false
            this.editForm = {
                data: '',
                kmInicial: '',
                kmFinal: '',
                cidadesStr: '',
                notasStr: '',
                status: 'Pendente'
            }
            this.routeSelected = null
        },

        saveRouteEdit() {
            if (this.editForm.kmFinal && this.editForm.kmFinal < this.editForm.kmInicial) {
                return
            }
            const index = this.routes.findIndex(r => r.id === this.routeSelected.id)
            if (index !== -1) {
                this.routes[index] = {
                    ...this.routes[index],
                    data: this.editForm.data,
                    kmInicial: parseFloat(this.editForm.kmInicial),
                    kmFinal: parseFloat(this.editForm.kmFinal),
                    cidades: this.editForm.cidadesStr.split(',').map(c => c.trim()),
                    notas: this.editForm.notasStr.split(',').map(n => parseInt(n)),
                    status: this.editForm.status
                }
            }
            this.cancelEditRoute()
        },

        deleteRoute(id) {
            const routeId = id ?? this.routeSelected?.id
            const route = this.routes.find(r => r.id === routeId)

            if (!route) return

            if (this.profileType === 'driver') {
                route.deleteRequested = true
                this.showConfirmDeleteModal = false
                return
            }

            this.routes = this.routes.filter(r => r.id !== routeId)
            this.showConfirmDeleteModal = false
        },

        openLightbox(url) {
            this.lightboxPhoto = url
        },
        closeLightbox() {
            this.lightboxPhoto = null
        },

        formatDate(dateStr) {
            const date = new Date(dateStr)
            return date.toLocaleDateString('pt-BR')
        },
        formatDay(dateStr) {
            return new Date(dateStr).toLocaleDateString('pt-BR', { weekday: 'long' })
        },
        calcPercorrido(inicial, final) {
            if (!final) return 0
            const diff = final - inicial
            return diff > 0 ? diff.toFixed(1) : 0
        },
        cancelEdit() {
            this.showNewRouteModal = false
            this.form = { data: '', kmInicial: '' }
        },

        startRoute() {
            const newId = this.routes.length ? Math.max(...this.routes.map(r => r.id)) + 1 : 1

            this.routes.push({
                id: newId,
                data: this.form.data,
                kmInicial: parseFloat(this.form.kmInicial),
                kmFinal: null,
                percorrido: 0,
                cidades: [],
                notas: [],
                status: 'Em Andamento'
            })

            this.cancelEdit()
        },

        classBadge(status) {
            switch (status) {
                case 'Pendente conferência':
                    return 'badge-orange';
                case 'Concluída':
                    return 'badge-green';
                case 'Em andamento':
                    return 'badge-primary';
            }
        }

    }
}
</script>

<style scoped>
.routes-page {
    background-color: #f8f9fa;
}

.table {
    border-radius: 0.5rem;
    overflow: hidden;
}

.modal-content {
    border-radius: 1rem;
}

.route-photo {
    width: 80px;
    height: 80px;
    object-fit: cover;
    border-radius: 8px;
    cursor: pointer;
    border: 1px solid rgba(0, 0, 0, 0.08);
    transition: transform 0.15s ease;
}

.route-photo:hover {
    transform: scale(1.05);
}

.lightbox {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.85);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
}

.lightbox-image {
    max-width: 90vw;
    max-height: 90vh;
    object-fit: contain;
    border-radius: 8px;
}

.lightbox-close {
    position: absolute;
    top: 16px;
    right: 16px;
    background: none;
    border: none;
    color: white;
    font-size: 24px;
    cursor: pointer;
}

.preview-list {
    display: flex;
    gap: 10px;
    overflow-x: auto;
    padding-bottom: 4px;
    max-height: 120px;
}

.modal-scroll-content {
    max-height: 80vh;
    overflow-y: auto;
    padding-right: 10px;
    margin-right: -10px;
}

.modal-scroll-content::-webkit-scrollbar {
    width: 6px;
}

.modal-scroll-content::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.15);
    border-radius: 4px;
}
</style>
