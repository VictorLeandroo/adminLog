<template>
    <div class="routes-page min-vh-100">
        <div class="container py-2">
            <div class="d-flex justify-content-between align-items-center mb-2">
                <h4 class="mb-0">Minhas Rotas</h4>
                <ButtonComp btn-class="button-primary button-big" :click-action="() => showNewRouteModal = true">
                    + Nova Rota
                </ButtonComp>
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
                            <tr v-for="route in routes" :key="route.id">
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
                                    <span :class="[
                                        'badge',
                                        route.status === 'Concluída' ? 'bg-success' : 'bg-warning text-dark'
                                    ]">
                                        {{ route.status }}
                                    </span>
                                </td>
                                <td class="text-center">
                                    <button class="btn btn-sm btn-outline-primary me-2" @click="editRoute(route)">
                                        Editar
                                    </button>
                                    <button class="btn btn-sm btn-outline-danger" @click="deleteRoute(route.id)">
                                        Excluir
                                    </button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div class="d-md-none">
                    <div v-for="route in routes" :key="route.id" class="card mb-3 shadow-sm border-0">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-center mb-2">
                                <div>
                                    <h6 class="fw-bold mb-0">{{ formatDate(route.data) }}</h6>
                                    <small class="text-muted">{{ formatDay(route.data) }}</small>
                                </div>
                                <span :class="[
                                    'badge',
                                    route.status === 'Concluída' ? 'badge-green' : 'badge-orange'
                                ]">
                                    {{ route.status }}
                                </span>
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
                                <p class="mb-1"><small class="text-muted">KM Inicial:</small> <strong>{{ route.kmInicial
                                }}</strong></p>
                                <p class="mb-1"><small class="text-muted">KM Final:</small> <strong>{{ route.kmFinal
                                }}</strong></p>
                                <p class="mb-2 text-primary">
                                    <small class="text-muted">Total Percorrido:</small>
                                    <strong>{{ calcPercorrido(route.kmInicial, route.kmFinal) }} km</strong>
                                </p>
                            </div>

                            <div class="d-flex justify-content-end">
                                <ButtonComp btn-class="button-secundary" class="mr-50"
                                    :click-action="() => editRoute(route)">
                                    Editar
                                </ButtonComp>
                                <ButtonComp btn-class="button-secundary-red" class=""
                                    :click-action="() => { showConfirmDeleteModal = true; routeSelected = item }">
                                    Excluir
                                </ButtonComp>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

        </div>

        <ModalDelete :isLoading="isModalLoading" icon="fa-solid fa-trash" title="Excluir Rota"
            :isVisible="showConfirmDeleteModal" @update:isVisible="showConfirmDeleteModal = $event"
            @confirm="() => deleteRoute()" max-width="300px" />

        <ModalDefault :is-visible="showNewRouteModal" :title="'Iniciar Rota'" max-width="300px" min-width="300px"
            :isDisabledConfirm="!form.data || !form.kmInicial" @update:isVisible="cancelEdit">
            <div class="mb-2">
                <label class="form-label">Data da Rota</label>
                <input type="date" v-model="form.data" class="w-100" />
            </div>
            <div class="mb-3">
                <label class="form-label">KM Inicial</label>
                <input type="number" v-model="form.kmInicial" class="w-100" />
            </div>
            <ButtonComp :click-action="() => startRoute()" btn-class="button-primary button-big w-100">Iniciar
            </ButtonComp>
        </ModalDefault>

        <ModalDefault :is-visible="showEditRouteModal" :title="'Editar Rota'" max-width="400px" min-width="300px"
            :isDisabledConfirm="!editForm.data || !editForm.kmInicial || !editForm.kmFinal"
            @update:isVisible="cancelEditRoute" @confirm="saveRouteEdit">
            <div class="mb-2">
                <label class="form-label">Data da Rota</label>
                <input type="date" v-model="editForm.data" class="w-100" />
            </div>

            <div class="mb-2">
                <label class="form-label">KM Inicial</label>
                <input type="text" v-currency="1" v-model="editForm.kmInicial" class="w-100" />
            </div>

            <div class="mb-2">
                <label class="form-label">KM Final</label>
                <input type="text" v-currency="1" v-model="editForm.kmFinal" class="w-100" />
            </div>

            <div class="mb-2">
                <label class="form-label">Cidades</label>
                <input type="text" v-model="editForm.cidadesStr" class="w-100"
                    placeholder="Separe por vírgula" />
                <small class="text-muted">Ex: São Paulo, Itu, Campinas</small>
            </div>

            <div class="mb-2">
                <label class="form-label">Notas Fiscais</label>
                <input type="text" v-model="editForm.notasStr" class="w-100" placeholder="Separe por vírgula" />
                <small class="text-muted">Ex: 5674, 5675, 5676</small>
            </div>

            <div class="mb-2">
                <label class="form-label">Status</label>
                <select v-model="editForm.status" class="form-select w-100">
                    <option value="Pendente">Pendente</option>
                    <option value="Concluída">Concluída</option>
                </select>
            </div>

            <ButtonComp :click-action="() => saveRouteEdit()" btn-class="button-primary button-big w-100">
                Salvar
            </ButtonComp>
        </ModalDefault>

    </div>
</template>

<script>
import ButtonComp from '@/components/ButtonComp.vue';
import ModalDefault from '@/components/modals/ModalDefault.vue';
import ModalDelete from '@/components/modals/ModalDelete.vue';

export default {
    name: 'RoutesView',
    data() {
        return {
            routes: [
                {
                    id: 2,
                    data: '2025-10-29',
                    cidades: ['Sorocaba', 'Tatuí'],
                    notas: [5680],
                    kmInicial: 10380,
                    kmFinal: 10440,
                    status: 'Pendente'
                },
                {
                    id: 1,
                    data: '2025-10-28',
                    cidades: ['São Paulo', 'Itu', 'Campinas', 'Boituva'],
                    notas: [5674, 5675, 5676],
                    kmInicial: 10230,
                    kmFinal: 10380,
                    status: 'Concluída'
                },
                
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

        }
    },
    components: {
        ButtonComp,
        ModalDelete,
        ModalDefault
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

        deleteRoute() {
            this.routes = this.routes.filter(r => r.id !== this.routeSelected.id)
        },
        saveRoute() {
            if (this.editingRoute) {
                const index = this.routes.findIndex(r => r.id === this.editingRoute)
                this.routes[index] = { id: this.editingRoute, ...this.form }
            } else {
                const newId = this.routes.length ? Math.max(...this.routes.map(r => r.id)) + 1 : 1
                this.routes.push({ id: newId, ...this.form })
            }
            this.modalInstance.hide()
            this.resetForm()
        },
        resetForm() {
            this.form = {
                origem: '',
                destino: '',
                data: '',
                km: '',
                status: 'Pendente'
            }
        },

        formatDate(dateStr) {
            const date = new Date(dateStr)
            return date.toLocaleDateString('pt-BR')
        },
        formatDay(dateStr) {
            return new Date(dateStr).toLocaleDateString('pt-BR', { weekday: 'long' })
        },
        calcPercorrido(inicial, final) {
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
                status: 'Pendente'
            })

            this.cancelEdit()
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
</style>
