<template>
    <div class="vehicle-page">
        <div class="container py-2">

            <!-- CARD TOPO -->
            <div class="vehicle-header mb-3">
                <div class="vehicle-top">
                    <div>
                        <h5 class="vehicle-title">Fiat Fiorino</h5>
                        <small class="vehicle-subtitle">
                            <i class="fa-solid fa-car me-1"></i>
                            ABC-1234 • 2021
                        </small>
                    </div>

                    <span class="vehicle-status success">
                        <i class="fa-solid fa-check-circle me-1"></i>
                        Em dia
                    </span>
                </div>

                <div class="vehicle-metrics">
                    <div class="metric">
                        <small>KM atual</small>
                        <strong>42.380</strong>
                    </div>

                    <div class="metric warning">
                        <small>Próx. manutenção</small>
                        <strong>2.500 km</strong>
                    </div>

                    <div class="metric danger">
                        <small>Gasto no mês</small>
                        <strong>R$ 1.240</strong>
                    </div>
                </div>
            </div>

            <!-- SECTION: INFORMAÇÕES -->
            <div class="card mb-2">
                <div class="section-header" @click="toggleSection('info')">
                    <strong>Informações do veículo</strong>
                    <i class="fa-solid" :class="openSections.info ? 'fa-chevron-up' : 'fa-chevron-down'"></i>
                </div>

                <transition name="collapse" @enter="enter" @leave="leave">
                    <div v-show="openSections.info">
                        <div class="section-body">
                            <div class="info-row">
                                <span>Modelo</span>
                                <strong>Fiat Fiorino</strong>
                            </div>
                            <div class="info-row">
                                <span>Ano</span>
                                <strong>2021</strong>
                            </div>
                            <div class="info-row">
                                <span>Placa</span>
                                <strong>ABC-1234</strong>
                            </div>
                            <div class="info-row">
                                <span>KM atual</span>
                                <strong>42.380 km</strong>
                            </div>

                            <ButtonComp btn-class="button-primary w-100"
                                :click-action="() => { showEditVehicleModal = true }">
                                Editar informações
                            </ButtonComp>
                        </div>
                    </div>
                </transition>
            </div>

            <!-- SECTION: MANUTENÇÕES -->
            <div class="card mb-2">
                <div class="section-header" @click="toggleSection('maintenance')">
                    <strong>Manutenções</strong>
                    <i class="fa-solid" :class="openSections.maintenance ? 'fa-chevron-up' : 'fa-chevron-down'"></i>
                </div>

                <transition name="collapse" @enter="enter" @leave="leave">
                    <div v-show="openSections.maintenance">
                        <div class="section-body">

                            <div v-for="item in maintenances" :key="item.id" class="maintenance-card">
                                <div class="d-flex justify-content-between">
                                    <div>
                                        <strong>{{ item.type }}</strong>
                                        <p class="text-muted mb-0">{{ formatDate(item.date) }} • {{ item.km }} km</p>
                                    </div>
                                    <span class="badge h-100"
                                        :class="item.status === 'Concluída' ? 'badge-green' : 'badge-orange'">
                                        {{ item.status }}
                                    </span>
                                </div>

                                <div class="d-flex justify-content-between border-top mt-1 pt-1">
                                    <span class="text-muted">Valor</span>
                                    <strong class="text-danger">{{ formatMoney(item.amount) }}</strong>
                                </div>
                            </div>

                            <ButtonComp class="button-primary w-100"
                                :click-action="() => { showMaintenanceModal = true }">
                                + Nova manutenção
                            </ButtonComp>
                        </div>
                    </div>
                </transition>
            </div>

            <!-- SECTION: CUSTOS -->
            <div class="card mb-2">
                <div class="section-header" @click="toggleSection('costs')">
                    <strong>Custos do veículo</strong>
                    <i class="fa-solid" :class="openSections.costs ? 'fa-chevron-up' : 'fa-chevron-down'"></i>
                </div>

                <transition name="collapse" @enter="enter" @leave="leave">
                    <div v-show="openSections.costs">
                        <div class="section-body">
                            <div class="info-row">
                                <span>Total no mês</span>
                                <strong class="text-danger">{{ formatMoney(1240) }}</strong>
                            </div>
                            <div class="info-row">
                                <span>Total no ano</span>
                                <strong class="text-danger">{{ formatMoney(8420) }}</strong>
                            </div>
                            <div class="info-row">
                                <span>Custo por KM</span>
                                <strong>{{ formatMoney(0.38) }}</strong>
                            </div>
                        </div>
                    </div>
                </transition>
            </div>

        </div>

        <ModalDefault :is-visible="showEditVehicleModal" max-width="400px" min-width="400px"
            @update:isVisible="showEditVehicleModal = false">
            <h6 class="fw-bold mb-2">Editar veículo</h6>

            <div class="mb-2">
                <label class="form-label">Modelo</label>
                <input type="text" v-model="vehicleForm.model" class="w-100" />
            </div>

            <div class="mb-2">
                <label class="form-label">Ano</label>
                <input type="number" v-model.number="vehicleForm.year" class="w-100" />
            </div>

            <div class="mb-2">
                <label class="form-label">Placa</label>
                <input type="text" v-model="vehicleForm.plate" class="w-100" />
            </div>

            <div class="mb-3">
                <label class="form-label">KM atual</label>
                <input type="number" v-model.number="vehicleForm.currentKm" class="w-100" />
                <small class="text-muted">
                    Use o KM atual do painel
                </small>
            </div>

            <ButtonComp btn-class="button-primary button-big w-100" :click-action="saveVehicleInfo">
                Salvar alterações
            </ButtonComp>
        </ModalDefault>

        <ModalDefault :is-visible="showMaintenanceModal" max-width="420px"
            @update:isVisible="showMaintenanceModal = false">
            <h6 class="fw-bold mb-2">Nova manutenção</h6>

            <div class="mb-2">
                <label class="form-label">Tipo</label>
                <select v-model="maintenanceForm.type" class="form-select w-100">
                    <option>Troca de óleo</option>
                    <option>Freios</option>
                    <option>Suspensão</option>
                    <option>Pneus</option>
                    <option>Outros</option>
                </select>
            </div>

            <div class="mb-2">
                <label class="form-label">Data</label>
                <input type="date" v-model="maintenanceForm.date" class="w-100" />
            </div>

            <div class="mb-2">
                <label class="form-label">KM do veículo</label>
                <input type="number" v-model.number="maintenanceForm.km" class="w-100" />
            </div>

            <div class="mb-2">
                <label class="form-label">Valor</label>
                <input type="number" v-model.number="maintenanceForm.amount" class="w-100" />
            </div>

            <div class="mb-3">
                <label class="form-label">Status</label>
                <select v-model="maintenanceForm.status" class="form-select w-100">
                    <option>Concluída</option>
                    <option>Programada</option>
                </select>
            </div>

            <ButtonComp btn-class="button-primary button-big w-100"
                :is-disabled="!maintenanceForm.type || !maintenanceForm.amount" :click-action="addMaintenance">
                Salvar manutenção
            </ButtonComp>
        </ModalDefault>

    </div>
</template>

<script>
import ButtonComp from '@/components/ButtonComp.vue';
import ModalDefault from '@/components/modals/ModalDefault.vue';

export default {
    name: 'VehicleView',
    data() {
        return {
            openSections: {
                info: true,
                maintenance: false,
                costs: false
            },
            maintenances: [
                {
                    id: 1,
                    type: 'Troca de óleo',
                    date: '2025-10-10',
                    km: 39800,
                    amount: 320,
                    status: 'Concluída'
                },
                {
                    id: 2,
                    type: 'Pastilhas de freio',
                    date: '2025-11-05',
                    km: 42300,
                    amount: 580,
                    status: 'Programada'
                }
            ],

            showEditVehicleModal: false,
            vehicleForm: {
                model: 'Fiat Fiorino',
                year: 2021,
                plate: 'ABC-1234',
                currentKm: 42380
            },

            showMaintenanceModal: false,
            maintenanceForm: {
                type: '',
                date: '',
                km: '',
                amount: '',
                status: 'Concluída'
            }
        }
    },

    components: {
        ButtonComp,
        ModalDefault
    },

    methods: {
        toggleSection(section) {
            this.openSections[section] = !this.openSections[section]
        },
        formatDate(date) {
            return new Date(date).toLocaleDateString('pt-BR')
        },
        formatMoney(value) {
            return value.toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL'
            })
        },

        enter(el) {
            el.style.height = '0'
            el.style.opacity = '0'
            requestAnimationFrame(() => {
                el.style.transition = 'height 280ms ease, opacity 200ms ease'
                el.style.height = el.scrollHeight + 'px'
                el.style.opacity = '1'
            })
        },
        leave(el) {
            el.style.height = el.scrollHeight + 'px'
            requestAnimationFrame(() => {
                el.style.transition = 'height 240ms ease, opacity 180ms ease'
                el.style.height = '0'
                el.style.opacity = '0'
            })
        },

        saveVehicleInfo() {
            this.showEditVehicleModal = false
        },

        addMaintenance() {
            this.maintenances.push({
                id: Date.now(),
                ...this.maintenanceForm
            })

            this.maintenanceForm = {
                type: '',
                date: '',
                km: '',
                amount: '',
                status: 'Concluída'
            }

            this.showMaintenanceModal = false
        }


    }
}
</script>

<style scoped>
.vehicle-header {
    border-radius: 18px;
    padding: 16px;
    background: linear-gradient(135deg, #f9fafb, #eef2f7);
    color: #111827;
    box-shadow: 0 8px 20px rgba(17, 24, 39, 0.08);
}

.vehicle-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
}

.vehicle-title {
    margin: 0;
    font-weight: 700;
    letter-spacing: 0.3px;
}

.vehicle-subtitle {
    font-size: 0.85rem;
    color: #6b7280;
}

.vehicle-status {
    font-size: 0.75rem;
    padding: 6px 10px;
    border-radius: 999px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 4px;
}

.vehicle-status.success {
    background: rgba(34, 197, 94, 0.12);
    color: #16a34a;
}

.vehicle-metrics {
    display: flex;
    margin-top: 16px;
    gap: 12px;
}

.metric {
    flex: 1;
    background: #ffffff;
    border-radius: 14px;
    padding: 10px;
    text-align: center;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.04);
}

.metric small {
    display: block;
    font-size: 0.75rem;
    color: #6b7280;
    margin-bottom: 2px;
}

.metric strong {
    font-size: 1rem;
    font-weight: 700;
    color: #111827;
}

.metric.warning strong {
    color: #d97706;
}

.metric.danger strong {
    color: #dc2626;
}



.section-header {
    padding: 12px 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
    border-bottom: 1px solid #f1f1f1;
}

.section-body {
    padding: 12px 16px;
    padding-top: 0;
    overflow: hidden;
}

.info-row {
    display: flex;
    justify-content: space-between;
    padding: 6px;
}

.maintenance-card {
    background: #f8f9fa;
    border-radius: 8px;
    padding: 10px;
    margin-bottom: 8px;
}

.collapse-enter-active,
.collapse-leave-active {
    transition: height 0.3s ease, opacity 0.2s ease;
}
</style>
