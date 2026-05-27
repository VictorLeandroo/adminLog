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
                    <ButtonComp v-if="!isDriver" btn-class="button-primary button-big"
                        :click-action="openCreateRouteModal">
                        <i class="fa-solid fa-plus"></i>
                        Nova rota
                    </ButtonComp>

                    <ButtonComp v-if="!isDriver" btn-class="button-secundary button-big"
                        :click-action="openFreightModal">
                        <i class="fa-solid fa-file-pdf"></i>
                        Frete PDF
                    </ButtonComp>

                    <ButtonComp v-if="!isDriver" btn-class="button-secundary button-big"
                        :click-action="openFreightSettingsModal">
                        <i class="fa-solid fa-sliders"></i>
                        Configurar frete
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
                    <span>Seu usuário ainda não possui veículo vinculado. Peça para a administração cadastrar ou
                        vincular um veículo antes de iniciar uma rota.</span>
                </div>

                <div class="panel-actions" v-if="isDriver">
                    <ButtonComp v-if="!activeRoute" btn-class="button-primary button-big w-100"
                        :is-disabled="!canOpenStartRoute" :click-action="openStartModal">
                        <i class="fa-solid fa-play"></i>
                        Iniciar rota
                    </ButtonComp>

                    <ButtonComp v-else btn-class="button-primary button-big w-100"
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
                <div class="date-filter-group">
                    <label>
                        <span>De</span>
                        <input type="date" v-model="dateFilterStart" />
                    </label>
                    <label>
                        <span>Ate</span>
                        <input type="date" v-model="dateFilterEnd" />
                    </label>
                </div>
                <div class="date-shortcuts">
                    <button type="button" @click="setDateShortcut('today')">Hoje</button>
                    <button type="button" @click="setDateShortcut('week')">7 dias</button>
                    <button type="button" @click="setDateShortcut('month')">Mes</button>
                    <button type="button" @click="setDateShortcut('clear')">Limpar</button>
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
                        <div v-if="!isDriver">
                            <small>Frete</small>
                            <strong>{{ formatMoney(routeFreightAmount(route)) }}</strong>
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
                        <img v-for="(photo, index) in route.photos" :key="index" :src="photo.url || photo.preview"
                            @click="openPhotoPreview(route, index)" />
                    </div>

                    <div class="correction-card" v-if="route.correctionRequested">
                        <i class="fa-solid fa-triangle-exclamation"></i>
                        <div>
                            <strong>Erro relatado pelo motorista</strong>
                            <p>{{ route.correctionNote }}</p>
                        </div>
                    </div>

                    <div class="route-actions">
                        <ButtonComp v-if="isDriver && route.status === 'Em andamento'" btn-class="button-primary w-100"
                            :click-action="() => openFinishModal(route)">
                            Finalizar
                        </ButtonComp>

                        <ButtonComp v-if="isDriver && route.status !== 'Em andamento'"
                            btn-class="button-secundary w-100" :click-action="() => openCorrectionModal(route)">
                            <i class="fa-solid fa-circle-exclamation"></i>
                            {{ route.correctionRequested ? 'Atualizar relato' : 'Relatar erro' }}
                        </ButtonComp>

                        <ButtonComp v-if="!isDriver" btn-class="button-secundary w-100"
                            :click-action="() => openAdminModal(route)">
                            Revisar dados
                        </ButtonComp>

                        <ButtonComp v-if="!isDriver" btn-class="button-secundary-red w-100"
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
            <input type="number" v-model.number="startForm.kmInicial" class="w-100 mb-2" placeholder="Ex: 42380"
                :disabled="!myVehicle" />

            <ButtonComp :click-action="startRoute" :is-disabled="!canStartRoute"
                btn-class="button-primary button-big w-100">
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
                <select v-model="createRouteForm.vehicleId" class="form-select w-100 mb-2"
                    @change="syncCreateVehicleKm">
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
                <input type="text" v-model="createRouteForm.cidadesStr" class="w-100 mb-2"
                    placeholder="Ex: São Paulo, Itu, Campinas" />

                <label class="form-label">Notas fiscais</label>
                <input type="text" v-model="createRouteForm.notasStr" class="w-100 mb-2"
                    placeholder="Ex: 5674, 5675, 5676" />

                <div class="freight-summary mb-2">
                    <div>
                        <small>Frete calculado</small>
                        <strong>{{ formatMoney(createRouteFreightAmount) }}</strong>
                    </div>
                    <span>{{ freightSettings.includedKm }} km inclusos</span>
                </div>

                <label class="form-label">Status</label>
                <select v-model="createRouteForm.status" class="form-select w-100 mb-2">
                    <option value="Em andamento">Em andamento</option>
                    <option value="Pendente de analise">Pendente de análise</option>
                    <option value="Concluida">Concluída</option>
                </select>
            </div>

            <ButtonComp :click-action="createAdminRoute" :is-disabled="!canCreateAdminRoute"
                btn-class="button-primary button-big w-100">
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
                <input type="number" v-model.number="finishForm.kmFinal" class="w-100 mb-1"
                    :class="{ 'input-error': kmFinalInvalid }" />
                <small v-if="kmFinalInvalid" class="text-danger d-block mb-2">O KM final não pode ser menor que o KM
                    inicial.</small>

                <label class="form-label">Fotos das notas</label>
                <PhotoUploadComp v-model="photos" />

                <label class="form-label mt-2">Cidades entregues</label>
                <input type="text" v-model="finishForm.cidadesStr" class="w-100"
                    placeholder="Ex: São Paulo, Itu, Campinas" />

                <label class="form-label mt-2">Números das notas</label>
                <input type="text" v-model="finishForm.notasStr" class="w-100 mb-2"
                    placeholder="Ex: 5674, 5675, 5676" />
            </div>

            <div class="analysis-note" v-if="willNeedAnalysis">
                <i class="fa-solid fa-circle-info"></i>
                Sem cidades ou notas preenchidas, a rota será finalizada como pendente de análise.
            </div>

            <ButtonComp :click-action="finishRoute" :is-disabled="!canFinishRoute"
                btn-class="button-primary button-big w-100">
                Finalizar rota
            </ButtonComp>
        </ModalDefault>

        <ModalDefault :isLoading="isModalLoading" :is-visible="showAdminModal" max-width="1180px" min-width="320px"
            @update:isVisible="cancelAdminEdit">
            <div class="route-modal-head">
                <span class="modal-icon"><i class="fa-solid fa-clipboard-check"></i></span>
                <div>
                    <h6>Revisar rota</h6>
                    <p>Complete notas e cidades com as fotos abertas ao lado.</p>
                </div>
            </div>

            <div class="admin-review-shell">
                <section class="admin-photo-workspace">
                    <div class="photo-workspace-head">
                        <div>
                            <span class="eyebrow">Fotos da rota</span>
                            <strong>{{ adminPhotos.length ? `${adminPhotoIndex + 1} de ${adminPhotos.length}` : 'Sem fotos' }}</strong>
                        </div>
                        <div class="photo-tool-group" v-if="adminPhotos.length">
                            <button type="button" title="Diminuir zoom" @click="zoomAdminPhoto(-0.2)">
                                <i class="fa-solid fa-magnifying-glass-minus"></i>
                            </button>
                            <button type="button" title="Aumentar zoom" @click="zoomAdminPhoto(0.2)">
                                <i class="fa-solid fa-magnifying-glass-plus"></i>
                            </button>
                            <button type="button" title="Girar foto" @click="rotateAdminPhoto">
                                <i class="fa-solid fa-rotate-right"></i>
                            </button>
                            <button type="button" title="Resetar imagem" @click="resetAdminPhotoView">
                                <i class="fa-solid fa-arrows-rotate"></i>
                            </button>
                        </div>
                    </div>

                    <div class="photo-stage" :class="{ empty: !adminPhotos.length, panning: isAdminPhotoDragging }"
                        @wheel.prevent="handleAdminPhotoWheel">
                        <button v-if="adminPhotos.length > 1" type="button" class="photo-nav prev"
                            @click="selectAdjacentAdminPhoto(-1)">
                            <i class="fa-solid fa-chevron-left"></i>
                        </button>

                        <img v-if="adminCurrentPhoto" :src="adminCurrentPhoto" class="admin-review-photo"
                            :class="{ zoomed: adminPhotoZoom > 1 }" :style="adminPhotoStyle"
                            @mousedown.prevent="startAdminPhotoPan" @mousemove.prevent="moveAdminPhotoPan"
                            @mouseup="stopAdminPhotoPan" @mouseleave="stopAdminPhotoPan"
                            @touchstart.prevent="startAdminPhotoPan" @touchmove.prevent="moveAdminPhotoPan"
                            @touchend="stopAdminPhotoPan" @touchcancel="stopAdminPhotoPan" />

                        <div v-else class="photo-empty-state">
                            <i class="fa-regular fa-image"></i>
                            <strong>Nenhuma foto enviada</strong>
                            <span>Revise os dados informados pelo motorista.</span>
                        </div>

                        <button v-if="adminPhotos.length > 1" type="button" class="photo-nav next"
                            @click="selectAdjacentAdminPhoto(1)">
                            <i class="fa-solid fa-chevron-right"></i>
                        </button>
                    </div>

                    <div class="admin-photo-strip" v-if="adminPhotos.length > 1">
                        <button v-for="(photo, index) in adminPhotos" :key="index" type="button"
                            :class="{ active: index === adminPhotoIndex }" @click="selectAdminPhoto(index)">
                            <img :src="photo.url || photo.preview" />
                        </button>
                    </div>
                </section>

                <section class="admin-form-workspace">
                    <div class="admin-route-summary" v-if="routeSelected">
                        <div>
                            <small>Data</small>
                            <strong>{{ formatDate(routeSelected.data) }}</strong>
                        </div>
                        <div>
                            <small>Motorista</small>
                            <strong>{{ routeSelected.driver }}</strong>
                        </div>
                        <div>
                            <small>Total</small>
                            <strong>{{ calcPercorrido(adminForm.kmInicial, adminForm.kmFinal) }} km</strong>
                        </div>
                    </div>

                    <div class="modal-scroll-content admin-review-form">
                        <div class="form-grid">
                            <div>
                                <label class="form-label">KM inicial</label>
                                <input type="number" v-model.number="adminForm.kmInicial" class="w-100 mb-2" />
                            </div>
                            <div>
                                <label class="form-label">KM final</label>
                                <input type="number" v-model.number="adminForm.kmFinal" class="w-100 mb-2" />
                            </div>
                        </div>

                        <label class="form-label">Cidades</label>
                        <textarea v-model="adminForm.cidadesStr" class="w-100 admin-textarea mb-2"></textarea>

                        <label class="form-label">Notas fiscais</label>
                        <textarea v-model="adminForm.notasStr" class="w-100 admin-textarea notes mb-2"></textarea>

                        <label class="form-label">Fotos das notas</label>
                        <PhotoUploadComp v-model="adminRoutePhotos" />

                        <div class="freight-review-box">
                            <div>
                                <small>Frete calculado</small>
                                <strong>{{ formatMoney(adminCalculatedFreightAmount) }}</strong>
                                <span>{{ freightSettings.includedKm }} km inclusos + {{ formatMoney(freightSettings.excessKmAmount) }} por km excedente</span>
                            </div>
                            <label class="freight-manual-toggle">
                                <input type="checkbox" v-model="adminForm.useManualFreightAmount" />
                                <span>Usar valor manual de frete</span>
                            </label>
                            <input v-if="adminForm.useManualFreightAmount" type="number"
                                v-model.number="adminForm.freightAmount" class="w-100" placeholder="0,00" />
                        </div>

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

                    <ButtonComp :click-action="saveAdminRoute" :is-disabled="!adminForm.kmFinal"
                        btn-class="button-primary button-big w-100">
                        Salvar revisão
                    </ButtonComp>
                </section>
            </div>
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

            <ButtonComp :click-action="saveCorrectionReport" :is-disabled="!correctionForm.note.trim()"
                btn-class="button-primary button-big w-100 mt-2">
                Enviar relato
            </ButtonComp>
        </ModalDefault>

        <ModalDefault :isLoading="isModalLoading" :is-visible="showFreightModal" max-width="480px" min-width="320px"
            @update:isVisible="cancelFreightModal">
            <div class="route-modal-head">
                <span class="modal-icon"><i class="fa-solid fa-file-pdf"></i></span>
                <div>
                    <h6>Gerar PDF de frete</h6>
                    <p>O periodo quinzenal ja vem preenchido, mas voce pode ajustar as datas.</p>
                </div>
            </div>

            <label class="form-label">Periodo</label>
            <select v-model="freightForm.periodType" class="form-select w-100 mb-2" @change="syncFreightPeriod">
                <option value="first-half">1 quinzena</option>
                <option value="second-half">2 quinzena</option>
                <option value="month">Mes inteiro</option>
                <option value="custom">Personalizado</option>
            </select>

            <div class="form-grid">
                <div>
                    <label class="form-label">Data inicial</label>
                    <input type="date" v-model="freightForm.startDate" class="w-100 mb-2" />
                </div>
                <div>
                    <label class="form-label">Data final</label>
                    <input type="date" v-model="freightForm.endDate" class="w-100 mb-2" />
                </div>
            </div>

            <label class="form-label">Titulo</label>
            <input type="text" v-model="freightForm.title" class="w-100 mb-2" />

            <ButtonComp :click-action="generateFreightPdf" :is-disabled="!canGenerateFreightPdf"
                btn-class="button-primary button-big w-100">
                Gerar PDF
            </ButtonComp>
        </ModalDefault>

        <ModalDefault :isLoading="isModalLoading" :is-visible="showFreightSettingsModal" max-width="460px"
            min-width="320px" @update:isVisible="cancelFreightSettingsModal">
            <div class="route-modal-head">
                <span class="modal-icon"><i class="fa-solid fa-sliders"></i></span>
                <div>
                    <h6>Configurações de frete</h6>
                    <p>Defina o padrão usado para calcular rotas sem valor manual.</p>
                </div>
            </div>

            <label class="form-label">Valor base</label>
            <input type="number" v-model.number="freightSettingsForm.baseAmount" class="w-100 mb-2"
                placeholder="400,00" />

            <label class="form-label">KM incluso</label>
            <input type="number" v-model.number="freightSettingsForm.includedKm" class="w-100 mb-2"
                placeholder="120" />

            <label class="form-label">Valor por KM excedente</label>
            <input type="number" v-model.number="freightSettingsForm.excessKmAmount" class="w-100 mb-2"
                placeholder="1,50" />

            <ButtonComp :click-action="saveFreightSettings" :is-disabled="!canSaveFreightSettings"
                btn-class="button-primary button-big w-100">
                Salvar configurações
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
    getFreightSettingsApi,
    getFreightReportHtml,
    getMyVehicle,
    parseLocalDate,
    listVehicles,
    listRoutes,
    removeRouteApi,
    reportRouteErrorApi,
    reviewRouteApi,
    startRouteApi,
    updateFreightSettingsApi,
    money
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
            dateFilterStart: '',
            dateFilterEnd: '',
            adminVehicles: [],
            showStartModal: false,
            showCreateRouteModal: false,
            showFinishModal: false,
            showAdminModal: false,
            showCorrectionModal: false,
            showFreightModal: false,
            showFreightSettingsModal: false,
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
                freightAmount: null,
                useManualFreightAmount: false,
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
                freightAmount: null,
                useManualFreightAmount: false,
                status: 'Pendente de analise',
                correctionRequested: false,
                correctionNote: ''
            },
            correctionForm: {
                note: ''
            },
            freightForm: this.defaultFreightForm(),
            freightSettings: this.defaultFreightSettings(),
            freightSettingsForm: this.defaultFreightSettings(),
            photos: [],
            adminRoutePhotos: [],
            lightboxPhoto: null,
            adminPhotoIndex: 0,
            adminPhotoZoom: 1,
            adminPhotoRotation: 0,
            adminPhotoPanX: 0,
            adminPhotoPanY: 0,
            isAdminPhotoDragging: false,
            adminPhotoDragStart: {
                x: 0,
                y: 0,
                panX: 0,
                panY: 0
            }
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
                const routeDate = this.routeInputDate(route)
                const matchesStart = !this.dateFilterStart || routeDate >= this.dateFilterStart
                const matchesEnd = !this.dateFilterEnd || routeDate <= this.dateFilterEnd
                const haystack = [
                    route.data,
                    route.driver,
                    route.status,
                    ...route.cidades,
                    ...route.notas.map(String)
                ].join(' ').toLowerCase()

                return matchesStatus &&
                    matchesStart &&
                    matchesEnd &&
                    (!term || haystack.includes(term) || this.formatDate(route.data).toLowerCase().includes(term))
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
        },

        canGenerateFreightPdf() {
            return Boolean(this.freightForm.startDate && this.freightForm.endDate && this.freightForm.title)
        },

        canSaveFreightSettings() {
            return Boolean(
                Number(this.freightSettingsForm.baseAmount) >= 0 &&
                Number(this.freightSettingsForm.includedKm) >= 0 &&
                Number(this.freightSettingsForm.excessKmAmount) >= 0
            )
        },

        createRouteFreightAmount() {
            return this.calculateFreightAmount(this.createRouteForm.kmInicial, this.createRouteForm.kmFinal)
        },

        adminCalculatedFreightAmount() {
            return this.calculateFreightAmount(this.adminForm.kmInicial, this.adminForm.kmFinal)
        },

        adminPhotos() {
            return this.adminRoutePhotos || []
        },

        adminCurrentPhoto() {
            const photo = this.adminPhotos[this.adminPhotoIndex]
            return photo?.url || photo?.preview || ''
        },

        adminPhotoStyle() {
            return {
                transform: `translate(${this.adminPhotoPanX}px, ${this.adminPhotoPanY}px) scale(${this.adminPhotoZoom}) rotate(${this.adminPhotoRotation}deg)`
            }
        }
    },

    mounted() {
        window.addEventListener('profile-updated', this.syncProfile)
        this.fetchRoutes()
        this.fetchMyVehicle()
        this.fetchAdminVehicles()
        this.fetchFreightSettings()
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
            this.fetchFreightSettings()
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
            this.adminPhotoIndex = 0
            this.adminRoutePhotos = [...(route.photos || [])]
            this.resetAdminPhotoView()
            this.adminForm = {
                kmInicial: route.kmInicial,
                kmFinal: route.kmFinal || '',
                cidadesStr: route.cidades.join(', '),
                notasStr: route.notas.join(', '),
                freightAmount: route.freightAmount ?? null,
                useManualFreightAmount: Boolean(route.hasManualFreightAmount),
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

        openFreightModal() {
            this.freightForm = this.defaultFreightForm()
            this.showFreightModal = true
        },

        openFreightSettingsModal() {
            this.freightSettingsForm = { ...this.freightSettings }
            this.showFreightSettingsModal = true
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

        async fetchFreightSettings() {
            if (this.isDriver) return

            try {
                const settings = await getFreightSettingsApi()
                this.freightSettings = this.normalizeFreightSettings(settings)
                this.freightSettingsForm = { ...this.freightSettings }
            } catch (error) {
                console.error(error)
                notifyError(error, 'Não foi possível carregar as configurações de frete.')
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
                    freightAmount: this.createRouteForm.freightAmount,
                    useManualFreightAmount: this.createRouteForm.useManualFreightAmount,
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
                const routePhotos = this.adminRoutePhotos.map((photo, index) => ({
                    file: photo.file,
                    name: photo.file?.name || photo.name || photo.fileName || `foto-${Date.now()}-${index}`,
                    fileUrl: photo.fileUrl || photo.preview || photo.url,
                    url: photo.preview || photo.url || photo.fileUrl
                }))

                await reviewRouteApi(this.routeSelected.id, {
                    kmInicial: this.adminForm.kmInicial,
                    kmFinal: this.adminForm.kmFinal,
                    cidades: this.toList(this.adminForm.cidadesStr),
                    notas: this.toList(this.adminForm.notasStr),
                    freightAmount: this.adminForm.freightAmount,
                    useManualFreightAmount: this.adminForm.useManualFreightAmount,
                    status: this.adminForm.status,
                    photos: routePhotos
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
            this.adminPhotoIndex = 0
            this.adminRoutePhotos = []
            this.resetAdminPhotoView()
        },

        cancelCorrection() {
            this.showCorrectionModal = false
            this.routeSelected = null
            this.correctionForm = { note: '' }
        },

        cancelFreightModal() {
            this.showFreightModal = false
        },

        cancelFreightSettingsModal() {
            this.showFreightSettingsModal = false
            this.freightSettingsForm = { ...this.freightSettings }
        },

        defaultFreightSettings() {
            return {
                baseAmount: 400,
                includedKm: 120,
                excessKmAmount: 1.5
            }
        },

        normalizeFreightSettings(settings = {}) {
            return {
                baseAmount: Number(settings.baseAmount ?? 400),
                includedKm: Number(settings.includedKm ?? 120),
                excessKmAmount: Number(settings.excessKmAmount ?? 1.5)
            }
        },

        async saveFreightSettings() {
            if (!this.canSaveFreightSettings) return

            this.isModalLoading = true

            try {
                const settings = await updateFreightSettingsApi(this.freightSettingsForm)
                this.freightSettings = this.normalizeFreightSettings(settings)
                this.freightSettingsForm = { ...this.freightSettings }
                this.showFreightSettingsModal = false
                notifySuccess('Configurações de frete salvas com sucesso.')
            } catch (error) {
                console.error(error)
                notifyError(error, 'Não foi possível salvar as configurações de frete.')
            } finally {
                this.isModalLoading = false
            }
        },

        defaultFreightForm() {
            const today = new Date()
            const periodType = today.getDate() <= 15 ? 'first-half' : 'second-half'
            return this.freightPeriodForm(periodType, today, "JOSE ESTEVAO DE ALMEIDA ELEUTERIO")
        },

        freightPeriodForm(periodType, date = new Date(), driverName = '') {
            const year = date.getFullYear()
            const month = date.getMonth()

            const start = periodType === 'second-half'
                ? new Date(year, month, 16)
                : new Date(year, month, 1)

            const end = periodType === 'first-half'
                ? new Date(year, month, 15)
                : new Date(year, month + 1, 0)

            if (periodType === 'month') {
                start.setDate(1)
                end.setDate(new Date(year, month + 1, 0).getDate())
            }

            const formatBR = (date) => {
                const day = String(date.getDate()).padStart(2, '0')
                const month = String(date.getMonth() + 1).padStart(2, '0')
                return `${day}/${month}`
            }

            return {
                periodType,
                startDate: this.toInputDate(start),
                endDate: this.toInputDate(end),
                title: `FRETE ${formatBR(start)} - ${formatBR(end)} - ${driverName.toUpperCase()}`
            }
        },

        syncFreightPeriod() {
            if (this.freightForm.periodType === 'custom') return
            this.freightForm = this.freightPeriodForm(this.freightForm.periodType)
        },

        async generateFreightPdf() {
            if (!this.canGenerateFreightPdf) return

            const reportWindow = window.open('', '_blank')
            if (!reportWindow) {
                notifyError(new Error('Pop-up bloqueado'), 'Permita pop-ups para abrir o relatório de frete.')
                return
            }

            reportWindow.document.write('<p style="font-family: Arial, sans-serif; padding: 24px;">Gerando relatório...</p>')
            this.isModalLoading = true
            try {
                const html = await getFreightReportHtml({
                    startDate: this.freightForm.startDate,
                    endDate: this.freightForm.endDate,
                    title: this.freightForm.title
                })
                reportWindow.document.open()
                reportWindow.document.write(html)
                reportWindow.document.close()
                this.cancelFreightModal()
                notifySuccess('Relatorio de frete aberto para salvar como PDF.')
            } catch (error) {
                reportWindow.close()
                console.error(error)
                notifyError(error, 'Nao foi possivel gerar o relatorio de frete.')
            } finally {
                this.isModalLoading = false
            }
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
                freightAmount: null,
                useManualFreightAmount: false,
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

        setDateShortcut(type) {
            const today = new Date()

            if (type === 'clear') {
                this.dateFilterStart = ''
                this.dateFilterEnd = ''
                return
            }

            const end = new Date(today)
            const start = new Date(today)

            if (type === 'week') {
                start.setDate(today.getDate() - 6)
            }

            if (type === 'month') {
                start.setDate(1)
            }

            this.dateFilterStart = this.toInputDate(start)
            this.dateFilterEnd = this.toInputDate(end)
        },

        openPhotoPreview(route, index = 0) {
            if (!this.isDriver) {
                this.openAdminModal(route)
                this.selectAdminPhoto(index)
                return
            }

            const photo = route.photos[index]
            this.openLightbox(photo?.url || photo?.preview)
        },

        selectAdminPhoto(index) {
            if (!this.adminPhotos.length) return

            this.adminPhotoIndex = Math.min(Math.max(index, 0), this.adminPhotos.length - 1)
            this.isAdminPhotoDragging = false
        },

        selectAdjacentAdminPhoto(direction) {
            if (!this.adminPhotos.length) return

            const nextIndex = (this.adminPhotoIndex + direction + this.adminPhotos.length) % this.adminPhotos.length
            this.selectAdminPhoto(nextIndex)
        },

        zoomAdminPhoto(step) {
            const nextZoom = this.adminPhotoZoom + step
            this.adminPhotoZoom = Math.min(Math.max(nextZoom, 0.6), 3)

            if (this.adminPhotoZoom <= 1) {
                this.adminPhotoPanX = 0
                this.adminPhotoPanY = 0
            }
        },

        handleAdminPhotoWheel(event) {
            if (!this.adminCurrentPhoto) return

            const step = event.deltaY < 0 ? 0.16 : -0.16
            this.zoomAdminPhoto(step)
        },

        rotateAdminPhoto() {
            this.adminPhotoRotation = (this.adminPhotoRotation + 90) % 360
        },

        resetAdminPhotoView() {
            this.adminPhotoZoom = 1
            this.adminPhotoRotation = 0
            this.resetAdminPhotoPan()
        },

        resetAdminPhotoPan() {
            this.adminPhotoPanX = 0
            this.adminPhotoPanY = 0
            this.isAdminPhotoDragging = false
        },

        getPointerPosition(event) {
            const pointer = event.touches?.[0] || event.changedTouches?.[0] || event
            return {
                x: pointer.clientX,
                y: pointer.clientY
            }
        },

        startAdminPhotoPan(event) {
            if (this.adminPhotoZoom <= 1) return

            const pointer = this.getPointerPosition(event)
            this.isAdminPhotoDragging = true
            this.adminPhotoDragStart = {
                x: pointer.x,
                y: pointer.y,
                panX: this.adminPhotoPanX,
                panY: this.adminPhotoPanY
            }
        },

        moveAdminPhotoPan(event) {
            if (!this.isAdminPhotoDragging) return

            const pointer = this.getPointerPosition(event)
            this.adminPhotoPanX = this.adminPhotoDragStart.panX + pointer.x - this.adminPhotoDragStart.x
            this.adminPhotoPanY = this.adminPhotoDragStart.panY + pointer.y - this.adminPhotoDragStart.y
        },

        stopAdminPhotoPan() {
            this.isAdminPhotoDragging = false
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

        formatMoney(value) {
            return money(value)
        },

        calculateFreightAmount(initialKm, finalKm) {
            if (!initialKm || !finalKm) return Number(this.freightSettings.baseAmount || 0)

            const routeKm = Math.max(0, Number(finalKm) - Number(initialKm))
            const excessKm = Math.max(0, routeKm - Number(this.freightSettings.includedKm || 0))

            return Number(this.freightSettings.baseAmount || 0) +
                (excessKm * Number(this.freightSettings.excessKmAmount || 0))
        },

        routeFreightAmount(route) {
            return route.hasManualFreightAmount
                ? route.freightAmount
                : this.calculateFreightAmount(route.kmInicial, route.kmFinal)
        },

        toInputDate(date) {
            const year = date.getFullYear()
            const month = String(date.getMonth() + 1).padStart(2, '0')
            const day = String(date.getDate()).padStart(2, '0')
            return `${year}-${month}-${day}`
        },

        routeInputDate(route) {
            const value = route?.data || route?.createdAt

            if (!value) return ''

            if (/^\d{4}-\d{2}-\d{2}/.test(String(value))) {
                return String(value).slice(0, 10)
            }

            const parsed = parseLocalDate(value)
            return Number.isNaN(parsed.getTime()) ? '' : this.toInputDate(parsed)
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
    gap: 8px;
    margin: 14px 0;
}

.active-grid {
    grid-template-columns: repeat(3, 1fr);
}

.route-metrics {
    grid-template-columns: repeat(auto-fit, minmax(96px, 1fr));
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
    flex-wrap: wrap;
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

.date-filter-group,
.date-shortcuts {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
}

.date-filter-group label {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 8px;
    border-radius: 12px;
    background: var(--surface-muted);
    color: var(--text-muted);
    font-size: 11px;
    font-weight: 800;
    text-transform: uppercase;
}

.date-filter-group input {
    min-height: 32px;
    width: 132px;
    border: 0 !important;
    background: transparent !important;
    padding: 0 !important;
}

.date-shortcuts button,
.photo-tool-group button,
.photo-nav,
.admin-photo-strip button {
    border: 1px solid var(--border-soft);
    background: var(--surface-card);
    color: var(--text-strong);
}

.date-shortcuts button {
    min-height: 34px;
    border-radius: 10px;
    padding: 0 10px;
    font-size: 12px;
    font-weight: 800;
}

.route-list {
    display: grid;
    gap: 14px;
}

.route-card {
    display: flex;
    flex-direction: column;
    min-height: 100%;
    border-radius: 16px;
    padding: 16px;
    transition: border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
}

.route-card:hover {
    border-color: rgba(var(--primary-color-rgb), 0.28);
    box-shadow: 0 16px 36px rgba(15, 23, 42, 0.08);
    transform: translateY(-1px);
}

.route-card.pending {
    border-color: rgba(217, 119, 6, 0.3);
}

.route-details {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
    margin-top: 10px;
}

.route-details div {
    min-width: 0;
    padding: 10px;
    border-radius: 12px;
    background: var(--surface-muted);
}

.route-details p {
    margin: 0;
    display: -webkit-box;
    min-height: 38px;
    overflow: hidden;
    line-height: 1.35;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
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
    width: 68px;
    height: 68px;
    border: 2px solid transparent;
    border-radius: 10px;
    object-fit: cover;
    cursor: pointer;
    transition: border-color 0.18s ease, transform 0.18s ease;
}

.photo-strip img:hover {
    border-color: var(--primary-color);
    transform: scale(1.03);
}

.admin-review-shell {
    display: grid;
    grid-template-columns: minmax(0, 1.35fr) minmax(360px, 0.85fr);
    gap: 16px;
    align-items: start;
}

.admin-photo-workspace,
.admin-form-workspace {
    min-width: 0;
}

.admin-photo-workspace {
    border: 1px solid var(--border-soft);
    border-radius: 18px;
    background: var(--surface-muted);
    padding: 12px;
}

.photo-workspace-head,
.photo-tool-group,
.admin-route-summary {
    display: flex;
    align-items: center;
}

.photo-workspace-head {
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 10px;
}

.photo-workspace-head strong {
    display: block;
    color: var(--text-strong);
    line-height: 1.2;
}

.photo-tool-group {
    gap: 6px;
    flex-wrap: wrap;
    justify-content: flex-end;
}

.photo-tool-group button {
    width: 34px;
    height: 34px;
    border-radius: 10px;
}

.photo-stage {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    aspect-ratio: 4 / 3;
    max-height: 64vh;
    overflow: hidden;
    border-radius: 14px;
    background: #101820;
}

.photo-stage.panning {
    cursor: grabbing;
}

.photo-stage.empty {
    background: var(--surface-card);
}

.admin-review-photo {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    user-select: none;
    -webkit-user-drag: none;
    transition: transform 0.18s ease;
    transform-origin: center;
}

.admin-review-photo.zoomed {
    cursor: grab;
}

.photo-stage.panning .admin-review-photo {
    cursor: grabbing;
    transition: none;
}

.photo-nav {
    position: absolute;
    top: 50%;
    z-index: 2;
    width: 38px;
    height: 46px;
    border-radius: 12px;
    transform: translateY(-50%);
    background: rgba(255, 255, 255, 0.9);
}

.photo-nav.prev {
    left: 10px;
}

.photo-nav.next {
    right: 10px;
}

.photo-empty-state {
    display: grid;
    place-items: center;
    gap: 5px;
    color: var(--text-muted);
    text-align: center;
}

.photo-empty-state i {
    color: var(--primary-color);
    font-size: 32px;
}

.photo-empty-state strong {
    color: var(--text-strong);
}

.admin-photo-strip {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(58px, 1fr));
    gap: 8px;
    margin-top: 10px;
    max-height: 116px;
    overflow-y: auto;
}

.admin-photo-strip button {
    aspect-ratio: 1;
    padding: 3px;
    border-radius: 10px;
    overflow: hidden;
    opacity: 0.68;
}

.admin-photo-strip button.active {
    border-color: var(--primary-color);
    opacity: 1;
    box-shadow: 0 0 0 2px var(--primary-soft);
}

.admin-photo-strip img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 7px;
}

.admin-route-summary {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
    margin-bottom: 10px;
}

.admin-route-summary div {
    padding: 10px;
    border-radius: 12px;
    background: var(--surface-muted);
}

.admin-route-summary small {
    display: block;
    color: var(--text-muted);
    font-size: 11px;
}

.admin-route-summary strong {
    display: block;
    overflow: hidden;
    color: var(--text-strong);
    text-overflow: ellipsis;
    white-space: nowrap;
}

.admin-review-form {
    max-height: 58vh;
}

.admin-textarea {
    min-height: 76px;
    resize: vertical;
}

.admin-textarea.notes {
    min-height: 96px;
}

.route-actions {
    margin-top: auto;
    padding-top: 12px;
    border-top: 1px solid var(--border-soft);
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

.freight-summary,
.freight-review-box {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    padding: 12px;
    border: 1px solid var(--border-soft);
    border-radius: 12px;
    background: var(--surface-muted);
}

.freight-summary small,
.freight-review-box small {
    display: block;
    color: var(--text-muted);
    font-size: 12px;
}

.freight-summary strong,
.freight-review-box strong {
    display: block;
    color: var(--text-strong);
    font-size: 18px;
    line-height: 1.2;
}

.freight-summary span,
.freight-review-box span {
    color: var(--text-muted);
    font-size: 12px;
}

.freight-review-box {
    flex-direction: column;
    margin: 12px 0;
}

.freight-manual-toggle {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0;
    color: var(--text-strong);
    font-weight: 600;
}

.freight-manual-toggle input {
    width: auto;
    margin: 0;
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

@media (min-width: 1180px) {
    .route-card {
        padding: 18px;
    }
}

@media (max-width: 980px) {
    .admin-review-shell {
        grid-template-columns: 1fr;
    }

    .admin-form-workspace {
        order: 2;
    }

    .admin-photo-workspace {
        order: 1;
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

    .hero-route-actions>* {
        flex: 1;
    }

    .route-toolbar select {
        max-width: none;
    }

    .date-filter-group,
    .date-shortcuts {
        width: 100%;
    }

    .date-filter-group label,
    .date-shortcuts button {
        flex: 1;
    }

    .date-filter-group input {
        width: 100%;
    }

    .route-actions,
    .route-details,
    .form-grid {
        flex-direction: column;
        grid-template-columns: 1fr;
    }

    .admin-route-summary {
        grid-template-columns: 1fr;
    }
}
</style>
