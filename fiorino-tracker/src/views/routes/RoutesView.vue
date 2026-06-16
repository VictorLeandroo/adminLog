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

                    <button v-if="canToggleProfile" class="role-chip" @click="toggleProfile">
                        <i class="fa-solid" :class="isDriver ? 'fa-truck-fast' : 'fa-user-shield'"></i>
                        {{ isDriver ? 'Motorista' : 'Admin' }}
                    </button>

                    <span v-else class="role-chip locked">
                        <i class="fa-solid fa-truck-fast"></i>
                        Motorista
                    </span>
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

                <div v-if="activeRoute" class="delivery-progress-card">
                    <div class="delivery-progress-head">
                        <div>
                            <small>Entregas</small>
                            <strong>{{ deliveryProgressLabel(activeRoute) }}</strong>
                            <span>{{ deliveryProgressHint(activeRoute) }}</span>
                        </div>
                        <ButtonComp btn-class="button-secundary" :click-action="() => openDeliveryModal(activeRoute)">
                            <i class="fa-solid fa-camera"></i>
                            Registrar entrega
                        </ButtonComp>
                    </div>

                    <div class="delivery-timeline-shell"
                        :style="{ '--delivery-progress': `${deliveryProgressPercent(activeRoute)}%` }">
                        <div class="delivery-timeline-line"></div>
                        <button v-for="step in deliveryTimelineSteps(activeRoute)" :key="step.index" type="button"
                            class="delivery-step" :class="{ done: step.done, next: step.next }"
                            :title="step.done ? `Entrega ${step.index} registrada` : `Entrega ${step.index} pendente`"
                            @click="step.photo ? openLightbox(step.photo.url || step.photo.preview) : null">
                            <span class="delivery-step-dot">
                                <i class="fa-solid" :class="step.done ? 'fa-check' : 'fa-box'"></i>
                            </span>
                            <span>{{ step.done ? 'Entregue' : step.next ? 'Próxima' : 'Pendente' }}</span>
                        </button>
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

                    <template v-else>
                        <ButtonComp btn-class="button-secundary button-big w-100"
                            :click-action="() => openDriverRouteDetails(activeRoute)">
                            <i class="fa-solid fa-list-check"></i>
                            Detalhes
                        </ButtonComp>

                        <ButtonComp btn-class="button-primary button-big w-100"
                            :click-action="() => openFinishModal(activeRoute)">
                            <i class="fa-solid fa-flag-checkered"></i>
                            Finalizar rota
                        </ButtonComp>
                    </template>
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
                        <span class="route-card-icon" :class="route.statusClass">
                            <i class="fa-solid fa-truck-fast"></i>
                        </span>
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

                    <div class="late-invoice-card" v-if="routeNeedsInvoiceReview(route)">
                        <i class="fa-solid fa-file-circle-exclamation"></i>
                        <div>
                            <strong>Nota pendente de revisão</strong>
                            <p>{{ route.correctionRequested ? 'Motorista enviou uma correção para validar.' :
                                'Rota finalizada sem nota fiscal cadastrada.' }}</p>
                        </div>
                    </div>

                    <div class="route-metrics">
                        <div>
                            <span class="metric-icon"><i class="fa-solid fa-truck-ramp-box"></i></span>
                            <span>
                                <small>Inicial</small>
                                <strong>{{ formatKm(route.kmInicial) }}</strong>
                            </span>
                        </div>
                        <div>
                            <span class="metric-icon final"><i class="fa-solid fa-flag-checkered"></i></span>
                            <span>
                                <small>Final</small>
                                <strong>{{ route.kmFinal ? formatKm(route.kmFinal) : '-' }}</strong>
                            </span>
                        </div>
                        <div>
                            <span class="metric-icon total"><i class="fa-solid fa-route"></i></span>
                            <span>
                                <small>Total</small>
                                <strong>{{ calcPercorrido(route.kmInicial, route.kmFinal) }} km</strong>
                            </span>
                        </div>
                        <div v-if="!isDriver">
                            <span class="metric-icon freight"><i class="fa-solid fa-file-invoice-dollar"></i></span>
                            <span>
                                <small>Frete</small>
                                <strong>{{ formatMoney(routeFreightAmount(route)) }}</strong>
                            </span>
                        </div>
                    </div>

                    <div class="route-details">
                        <div>
                            <span class="detail-icon city"><i class="fa-solid fa-location-dot"></i></span>
                            <span>
                                <small>Cidades</small>
                                <p>{{ route.cidades.length ? route.cidades.join(', ') : 'Aguardando cadastro' }}</p>
                            </span>
                        </div>
                        <div>
                            <span class="detail-icon invoice"><i class="fa-regular fa-clipboard"></i></span>
                            <span>
                                <small>Notas</small>
                                <p>{{ route.notas.length ? route.notas.join(', ') : 'Aguardando cadastro' }}</p>
                            </span>
                        </div>
                    </div>

                    <div class="photo-strip" v-if="route.photos.length">
                        <img v-for="(photo, index) in visibleRoutePhotos(route)"
                            :key="photo.id || photo.fileUrl || index" :src="photo.url || photo.preview"
                            @click="openPhotoPreview(route, index)" />
                        <button v-if="hiddenRoutePhotoCount(route)" type="button" class="photo-more"
                            @click="openPhotoPreview(route, visibleRoutePhotos(route).length)">
                            +{{ hiddenRoutePhotoCount(route) }}
                        </button>
                    </div>

                    <div class="correction-card" v-if="route.correctionRequested">
                        <i class="fa-solid fa-triangle-exclamation"></i>
                        <div>
                            <strong>Erro relatado pelo motorista</strong>
                            <p>{{ route.correctionNote }}</p>
                        </div>
                    </div>

                    <div class="route-actions">
                        <ButtonComp v-if="isDriver" btn-class="button-secundary w-100"
                            :click-action="() => openDriverRouteDetails(route)">
                            <i class="fa-solid fa-list-check"></i>
                            Detalhes
                        </ButtonComp>

                        <ButtonComp v-if="isDriver && route.status === 'Em andamento'"
                            btn-class="button-secundary w-100" :click-action="() => openDeliveryModal(route)">
                            <i class="fa-solid fa-camera"></i>
                            Entrega
                        </ButtonComp>

                        <ButtonComp v-if="isDriver && route.status === 'Em andamento'" btn-class="button-primary w-100"
                            :click-action="() => openFinishModal(route)">
                            Finalizar
                        </ButtonComp>

                        <ButtonComp v-if="isDriver && route.status !== 'Em andamento'" btn-class="button-primary w-100"
                            :click-action="() => openLateInvoiceModal(route)">
                            <i class="fa-solid fa-file-arrow-up"></i>
                            Enviar nota
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

            <label class="form-label">Quantidade de entregas <span class="optional-label">opcional</span></label>
            <input type="number" min="0" v-model.number="startForm.plannedDeliveries" class="w-100 mb-2"
                placeholder="Ex: 4" :disabled="!myVehicle" />

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

                <label class="form-label">Quantidade de entregas <span class="optional-label">opcional</span></label>
                <input type="number" min="0" v-model.number="createRouteForm.plannedDeliveries" class="w-100 mb-2"
                    placeholder="Ex: 4" />

                <label class="form-label">Descarga <span class="optional-label">opcional</span></label>
                <input type="number" min="0" step="0.01" v-model.number="createRouteForm.unloadingAmount"
                    class="w-100 mb-2" placeholder="Ex: 60,00" />

                <label class="form-label">Pedágios <span class="optional-label">opcional</span></label>
                <div class="toll-builder mb-2">
                    <div class="toll-input-row">
                        <input type="number" min="0" step="0.01" v-model.number="createRouteForm.tollInput"
                            class="w-100" placeholder="Ex: 25,90"
                            @keyup.enter.prevent="addTollAmount('createRouteForm')" />
                        <button type="button" @click="addTollAmount('createRouteForm')"
                            :disabled="!createRouteForm.tollInput">
                            <i class="fa-solid fa-plus"></i>
                        </button>
                    </div>
                    <div class="toll-chip-list" v-if="createRouteForm.tollAmounts.length">
                        <button v-for="(amount, index) in createRouteForm.tollAmounts" :key="`create-toll-${index}`"
                            type="button" @click="removeTollAmount('createRouteForm', index)">
                            {{ formatMoney(amount) }}
                            <i class="fa-solid fa-xmark"></i>
                        </button>
                    </div>
                    <div class="toll-total">
                        <span>Total de pedágio</span>
                        <strong>{{ formatMoney(tollTotal(createRouteForm)) }}</strong>
                    </div>
                </div>

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

        <ModalDefault :isLoading="isModalLoading" :is-visible="showDeliveryModal" max-width="460px" min-width="320px"
            @update:isVisible="cancelDelivery">
            <div class="route-modal-head">
                <span class="modal-icon"><i class="fa-solid fa-camera"></i></span>
                <div>
                    <h6>{{ deliveryModalTitle }}</h6>
                    <p>{{ deliveryModalSubtitle }}</p>
                </div>
            </div>

            <div class="delivery-modal-summary" v-if="routeSelected && !deliveryForm.isLateInvoice">
                <span>{{ deliveryProgressLabel(routeSelected) }}</span>
                <strong>Próxima: {{ deliveredCount(routeSelected) + 1 }}</strong>
            </div>

            <div class="analysis-note" v-if="deliveryForm.isLateInvoice">
                <i class="fa-solid fa-circle-info"></i>
                A nota ficará marcada para a administração revisar antes de fechar a pendência.
            </div>

            <label class="form-label">Fotos da entrega</label>
            <PhotoUploadComp v-model="deliveryPhotos" />

            <label class="form-label mt-2">Observação <span class="optional-label">opcional</span></label>
            <input type="text" v-model="deliveryForm.note" class="w-100 mb-2"
                :placeholder="deliveryForm.isLateInvoice ? 'Ex: NF 5674 enviada após finalizar' : 'Ex: NF 5674 ou cliente Maria'" />

            <ButtonComp :click-action="saveDeliveryProgress" :is-disabled="!canSaveDeliveryProgress"
                btn-class="button-primary button-big w-100">
                {{ deliveryForm.isLateInvoice ? 'Enviar nota para revisão' : 'Salvar entrega' }}
            </ButtonComp>
        </ModalDefault>

        <ModalDefault :isLoading="isModalLoading" :is-visible="showDriverDetailsModal" max-width="760px"
            min-width="320px" @update:isVisible="cancelDriverRouteDetails">
            <div class="route-modal-head">
                <span class="modal-icon"><i class="fa-solid fa-list-check"></i></span>
                <div>
                    <h6>Detalhes da rota</h6>
                    <p>Confira todas as fotos, cidades e notas registradas.</p>
                </div>
            </div>

            <div v-if="routeSelected" class="modal-scroll-content driver-details-content">
                <div class="driver-detail-summary">
                    <div>
                        <small>Data</small>
                        <strong>{{ formatDate(routeSelected.data) }}</strong>
                    </div>
                    <div>
                        <small>Status</small>
                        <strong>{{ routeSelected.status }}</strong>
                    </div>
                    <div>
                        <small>Entregas</small>
                        <strong>{{ deliveryProgressLabel(routeSelected) }}</strong>
                    </div>
                    <div>
                        <small>KM</small>
                        <strong>{{ formatKm(routeSelected.kmInicial) }} / {{ routeSelected.kmFinal ?
                            formatKm(routeSelected.kmFinal) : '-' }}</strong>
                    </div>
                </div>

                <section class="driver-detail-section">
                    <div class="driver-detail-title">
                        <i class="fa-solid fa-location-dot"></i>
                        <strong>Cidades</strong>
                        <span>{{ routeSelected.cidades.length }}</span>
                    </div>
                    <div v-if="routeSelected.cidades.length" class="detail-chip-list">
                        <span v-for="city in routeSelected.cidades" :key="city">{{ city }}</span>
                    </div>
                    <p v-else class="detail-empty-copy">Nenhuma cidade cadastrada ainda.</p>
                </section>

                <section class="driver-detail-section">
                    <div class="driver-detail-title">
                        <i class="fa-regular fa-clipboard"></i>
                        <strong>Notas</strong>
                        <span>{{ routeSelected.notas.length }}</span>
                    </div>
                    <div v-if="routeSelected.notas.length" class="detail-chip-list">
                        <span v-for="note in routeSelected.notas" :key="note">{{ note }}</span>
                    </div>
                    <p v-else class="detail-empty-copy">Nenhuma nota cadastrada ainda.</p>
                </section>

                <section class="driver-detail-section">
                    <div class="driver-detail-title">
                        <i class="fa-regular fa-images"></i>
                        <strong>Fotos</strong>
                        <span>{{ routeSelected.photos.length }}</span>
                    </div>
                    <div v-if="routeSelected.photos.length" class="driver-photo-grid">
                        <button v-for="(photo, index) in routeSelected.photos" :key="photo.id || photo.fileUrl || index"
                            type="button" @click="openLightbox(photo.url || photo.preview)">
                            <img :src="photo.url || photo.preview" />
                            <span v-if="photo.deliveryIndex">Entrega {{ photo.deliveryIndex }}</span>
                        </button>
                    </div>
                    <p v-else class="detail-empty-copy">Nenhuma foto enviada ainda.</p>
                </section>
            </div>
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

                <label class="form-label">Descarga <span class="optional-label">opcional</span></label>
                <input type="number" min="0" step="0.01" v-model.number="finishForm.unloadingAmount" class="w-100 mb-2"
                    placeholder="Ex: 50,00" />

                <label class="form-label">Pedágios <span class="optional-label">opcional</span></label>
                <div class="toll-builder mb-2">
                    <div class="toll-input-row">
                        <input type="number" min="0" step="0.01" v-model.number="finishForm.tollInput" class="w-100"
                            placeholder="Ex: 25,90" @keyup.enter.prevent="addTollAmount('finishForm')" />
                        <button type="button" @click="addTollAmount('finishForm')" :disabled="!finishForm.tollInput">
                            <i class="fa-solid fa-plus"></i>
                        </button>
                    </div>
                    <div class="toll-chip-list" v-if="finishForm.tollAmounts.length">
                        <button v-for="(amount, index) in finishForm.tollAmounts" :key="`finish-toll-${index}`"
                            type="button" @click="removeTollAmount('finishForm', index)">
                            {{ formatMoney(amount) }}
                            <i class="fa-solid fa-xmark"></i>
                        </button>
                    </div>
                    <div class="toll-total">
                        <span>Total de pedágio</span>
                        <strong>{{ formatMoney(tollTotal(finishForm)) }}</strong>
                    </div>
                </div>
            </div>

            <div class="analysis-note" v-if="willNeedAnalysis">
                <i class="fa-solid fa-circle-info"></i>
                Sem cidades ou notas preenchidas, a rota será finalizada como pendente de análise.
            </div>

            <div class="analysis-note warning" v-if="willFinishWithoutInvoice">
                <i class="fa-solid fa-triangle-exclamation"></i>
                Você está finalizando sem número de nota e sem foto. Se lembrar depois, use "Enviar nota" na rota
                finalizada.
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
                            <strong>{{ adminPhotos.length ? `${adminPhotoIndex + 1} de ${adminPhotos.length}` :
                                'Sem fotos' }}</strong>
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

                        <label class="form-label">Quantidade de entregas <span
                                class="optional-label">opcional</span></label>
                        <input type="number" min="0" v-model.number="adminForm.plannedDeliveries" class="w-100 mb-2"
                            placeholder="Ex: 4" />

                        <div class="admin-delivery-overview" v-if="routeSelected">
                            <div>
                                <small>Progresso</small>
                                <strong>{{ deliveryProgressLabel(adminPreviewRoute) }}</strong>
                            </div>
                            <div class="mini-delivery-timeline">
                                <span v-for="step in deliveryTimelineSteps(adminPreviewRoute)" :key="step.index"
                                    :class="{ done: step.done }"></span>
                            </div>
                        </div>

                        <label class="form-label">Fotos das notas</label>
                        <PhotoUploadComp v-model="adminRoutePhotos" />

                        <div class="freight-review-box">
                            <div>
                                <small>Frete calculado</small>
                                <strong>{{ formatMoney(adminCalculatedFreightAmount) }}</strong>
                                <span>{{ freightSettings.includedKm }} km inclusos + {{
                                    formatMoney(freightSettings.excessKmAmount) }} por km excedente</span>
                            </div>
                            <label class="freight-manual-toggle">
                                <input type="checkbox" v-model="adminForm.useManualFreightAmount" />
                                <span>Usar valor manual de frete</span>
                            </label>
                            <input v-if="adminForm.useManualFreightAmount" type="number"
                                v-model.number="adminForm.freightAmount" class="w-100" placeholder="0,00" />
                        </div>

                        <label class="form-label">Descarga <span class="optional-label">opcional</span></label>
                        <input type="number" min="0" step="0.01" v-model.number="adminForm.unloadingAmount"
                            class="w-100 mb-2" placeholder="Ex: 60,00" />

                        <label class="form-label">Pedágios <span class="optional-label">opcional</span></label>
                        <div class="toll-builder mb-2">
                            <div class="toll-input-row">
                                <input type="number" min="0" step="0.01" v-model.number="adminForm.tollInput"
                                    class="w-100" placeholder="Ex: 25,90"
                                    @keyup.enter.prevent="addTollAmount('adminForm')" />
                                <button type="button" @click="addTollAmount('adminForm')"
                                    :disabled="!adminForm.tollInput">
                                    <i class="fa-solid fa-plus"></i>
                                </button>
                            </div>
                            <div class="toll-chip-list" v-if="adminForm.tollAmounts.length">
                                <button v-for="(amount, index) in adminForm.tollAmounts" :key="`admin-toll-${index}`"
                                    type="button" @click="removeTollAmount('adminForm', index)">
                                    {{ formatMoney(amount) }}
                                    <i class="fa-solid fa-xmark"></i>
                                </button>
                            </div>
                            <div class="toll-total">
                                <span>Total de pedágio</span>
                                <strong>{{ formatMoney(tollTotal(adminForm)) }}</strong>
                            </div>
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
            <input type="number" v-model.number="freightSettingsForm.includedKm" class="w-100 mb-2" placeholder="120" />

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
    addRouteDeliveryApi,
    createRouteApi,
    downloadFreightPdf,
    finishRouteApi,
    formatLocalDate,
    getFreightSettingsApi,
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

function toInputDateValue(date) {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')

    return `${year}-${month}-${day}`
}

function currentMonthDateFilter() {
    const today = new Date()
    const start = new Date(today.getFullYear(), today.getMonth(), 1)

    return {
        startDate: toInputDateValue(start),
        endDate: toInputDateValue(today)
    }
}

export default {
    name: 'RoutesView',

    components: {
        ButtonComp,
        ModalDelete,
        ModalDefault,
        PhotoUploadComp
    },

    data() {
        const defaultDateFilter = currentMonthDateFilter()

        return {
            profileType: this.initialProfileType(),
            routes: [],
            myVehicle: null,
            myVehicleLoaded: false,
            isLoading: false,
            isVehicleLoading: false,
            searchTerm: '',
            statusFilter: 'all',
            dateFilterStart: defaultDateFilter.startDate,
            dateFilterEnd: defaultDateFilter.endDate,
            routeFetchTimer: null,
            adminVehicles: [],
            showStartModal: false,
            showCreateRouteModal: false,
            showDeliveryModal: false,
            showDriverDetailsModal: false,
            showFinishModal: false,
            showAdminModal: false,
            showCorrectionModal: false,
            showFreightModal: false,
            showFreightSettingsModal: false,
            showConfirmDeleteModal: false,
            isModalLoading: false,
            routeSelected: null,
            startForm: {
                kmInicial: '',
                plannedDeliveries: ''
            },
            createRouteForm: {
                vehicleId: '',
                date: new Date().toISOString().slice(0, 10),
                kmInicial: '',
                kmFinal: '',
                cidadesStr: '',
                notasStr: '',
                plannedDeliveries: '',
                freightAmount: null,
                tollInput: null,
                tollAmounts: [],
                loadingAmount: null,
                unloadingAmount: null,
                useManualFreightAmount: false,
                status: 'Concluida'
            },
            finishForm: {
                kmFinal: '',
                cidadesStr: '',
                notasStr: '',
                tollInput: null,
                tollAmounts: [],
                loadingAmount: null,
                unloadingAmount: null
            },
            deliveryForm: {
                note: '',
                isLateInvoice: false
            },
            adminForm: {
                kmInicial: '',
                kmFinal: '',
                cidadesStr: '',
                notasStr: '',
                plannedDeliveries: '',
                freightAmount: null,
                tollInput: null,
                tollAmounts: [],
                loadingAmount: null,
                unloadingAmount: null,
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
            deliveryPhotos: [],
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
        currentUser() {
            return this.getStoredUser()
        },

        isAdminUser() {
            return this.currentUser?.role === 'ADMIN'
        },

        canToggleProfile() {
            return this.isAdminUser
        },

        isDriver() {
            return !this.isAdminUser || this.profileType === 'driver'
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
                    ? 'Finalize quando terminar o percurso. Se faltar nota ou cidade, relate o erro.'
                    : 'Comece pelo KM atual do carro. O app bloqueia uma segunda rota até essa ser finalizada.'
            }

            return 'Acompanhe rotas em aberto, complete dados pendentes e mantenha o histórico confiável.'
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

                return matchesStatus &&
                    (!term || haystack.includes(term) || this.formatDate(route.data).toLowerCase().includes(term))
            })
        },

        adminVehiclesWithDriver() {
            return this.adminVehicles.filter(vehicle => vehicle.driver && vehicle.driver !== 'Sem motorista')
        },

        decoratedRoutes() {
            return [...this.routes]
                .sort((a, b) => {
                    const dateDiff = this.routeSortTimestamp(b) - this.routeSortTimestamp(a)
                    if (dateDiff) return dateDiff

                    const statusDiff = this.routeStatusSortOrder(a.status) - this.routeStatusSortOrder(b.status)
                    if (statusDiff) return statusDiff

                    return this.routeSortTimestamp(b, 'createdAt') - this.routeSortTimestamp(a, 'createdAt')
                })
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

        canSaveDeliveryProgress() {
            return Boolean(this.routeSelected && this.deliveryPhotos.length)
        },

        deliveryModalTitle() {
            return this.deliveryForm.isLateInvoice ? 'Enviar nota pendente' : 'Registrar entrega'
        },

        deliveryModalSubtitle() {
            return this.deliveryForm.isLateInvoice
                ? 'Envie a foto da nota fiscal esquecida. A administração receberá como pendência.'
                : 'Envie a foto da nota ou comprovante. Número da nota é opcional.'
        },

        willNeedAnalysis() {
            return !this.finishForm.cidadesStr.trim() || !this.finishForm.notasStr.trim()
        },

        willFinishWithoutInvoice() {
            return !this.finishForm.notasStr.trim() && !this.photos.length
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
            return this.calculateFreightAmount(this.createRouteForm.kmInicial, this.createRouteForm.kmFinal) +
                this.tollTotal(this.createRouteForm) +
                this.moneyNumber(this.createRouteForm.loadingAmount) +
                this.moneyNumber(this.createRouteForm.unloadingAmount)
        },

        adminCalculatedFreightAmount() {
            return this.calculateFreightAmount(this.adminForm.kmInicial, this.adminForm.kmFinal) +
                this.tollTotal(this.adminForm) +
                this.moneyNumber(this.adminForm.loadingAmount) +
                this.moneyNumber(this.adminForm.unloadingAmount)
        },

        adminPreviewRoute() {
            return {
                ...(this.routeSelected || {}),
                plannedDeliveries: this.adminForm.plannedDeliveries,
                photos: this.adminRoutePhotos
            }
        },

        adminReviewHasRequiredData() {
            const initialKm = Number(this.adminForm.kmInicial)
            const finalKm = Number(this.adminForm.kmFinal)

            return Boolean(
                this.hasNumberValue(this.adminForm.kmInicial) &&
                this.hasNumberValue(this.adminForm.kmFinal) &&
                finalKm >= initialKm &&
                this.toList(this.adminForm.cidadesStr).length &&
                this.toList(this.adminForm.notasStr).length
            )
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

    watch: {
        dateFilterStart: 'scheduleFetchRoutes',
        dateFilterEnd: 'scheduleFetchRoutes',
        'adminForm.kmInicial': 'syncAdminReviewStatus',
        'adminForm.kmFinal': 'syncAdminReviewStatus',
        'adminForm.cidadesStr': 'syncAdminReviewStatus',
        'adminForm.notasStr': 'syncAdminReviewStatus'
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
        if (this.routeFetchTimer) clearTimeout(this.routeFetchTimer)
    },

    methods: {
        getStoredUser() {
            try {
                return JSON.parse(localStorage.getItem('user') || 'null')
            } catch (_error) {
                return null
            }
        },

        initialProfileType() {
            const user = this.getStoredUser()

            if (user?.role !== 'ADMIN') {
                localStorage.setItem('profileType', 'driver')
                return 'driver'
            }

            return localStorage.getItem('profileType') || 'admin'
        },

        async fetchRoutes() {
            this.isLoading = true
            try {
                this.routes = await listRoutes(this.routeDateQuery())
            } catch (error) {
                console.error(error)
                notifyError(error, 'Não foi possível carregar as rotas.')
            } finally {
                this.isLoading = false
            }
        },

        scheduleFetchRoutes() {
            if (this.routeFetchTimer) clearTimeout(this.routeFetchTimer)

            this.routeFetchTimer = setTimeout(() => {
                this.fetchRoutes()
            }, 250)
        },

        routeDateQuery() {
            const query = {}

            if (this.dateFilterStart) query.startDate = this.dateFilterStart
            if (this.dateFilterEnd) query.endDate = this.dateFilterEnd

            return query
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
            this.profileType = this.isAdminUser
                ? event.detail || localStorage.getItem('profileType') || 'admin'
                : 'driver'
            this.fetchRoutes()
            this.fetchMyVehicle()
            this.fetchAdminVehicles()
            this.fetchFreightSettings()
        },

        toggleProfile() {
            if (!this.canToggleProfile) return

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
                notasStr: route.notas.join(', '),
                tollInput: null,
                tollAmounts: this.routeTollAmounts(route),
                loadingAmount: route.loadingAmount ?? null,
                unloadingAmount: route.unloadingAmount ?? null
            }
            this.photos = []
            this.showFinishModal = true
        },

        openDeliveryModal(route) {
            this.routeSelected = route
            this.deliveryForm = {
                note: '',
                isLateInvoice: false
            }
            this.deliveryPhotos = []
            this.showDeliveryModal = true
        },

        openLateInvoiceModal(route) {
            this.routeSelected = route
            this.deliveryForm = {
                note: '',
                isLateInvoice: true
            }
            this.deliveryPhotos = []
            this.showDeliveryModal = true
        },

        openDriverRouteDetails(route) {
            this.routeSelected = route
            this.showDriverDetailsModal = true
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
                plannedDeliveries: route.plannedDeliveries || '',
                freightAmount: route.freightAmount ?? null,
                tollInput: null,
                tollAmounts: this.routeTollAmounts(route),
                loadingAmount: route.loadingAmount ?? null,
                unloadingAmount: route.unloadingAmount ?? null,
                useManualFreightAmount: Boolean(route.hasManualFreightAmount),
                status: route.status,
                correctionRequested: Boolean(route.correctionRequested),
                correctionNote: route.correctionNote || ''
            }
            this.showAdminModal = true
            this.syncAdminReviewStatus()
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
                    kmInicial: this.startForm.kmInicial,
                    plannedDeliveries: this.startForm.plannedDeliveries
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
                    plannedDeliveries: this.createRouteForm.plannedDeliveries,
                    freightAmount: this.createRouteForm.freightAmount,
                    tollAmount: this.tollTotal(this.createRouteForm),
                    tollAmounts: this.createRouteForm.tollAmounts,
                    loadingAmount: this.createRouteForm.loadingAmount,
                    unloadingAmount: this.createRouteForm.unloadingAmount,
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

            if (!notas.length && !this.photos.length) {
                const shouldContinue = window.confirm('Esta rota não possui nota fiscal nem foto anexada. Deseja finalizar mesmo assim?')
                if (!shouldContinue) return
            }

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
                    tollAmount: this.tollTotal(this.finishForm),
                    tollAmounts: this.finishForm.tollAmounts,
                    loadingAmount: this.finishForm.loadingAmount,
                    unloadingAmount: this.finishForm.unloadingAmount,
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

        async saveDeliveryProgress() {
            if (!this.canSaveDeliveryProgress) return

            const isLateInvoice = this.deliveryForm.isLateInvoice
            const newPhotos = this.deliveryPhotos.map((photo, index) => ({
                file: photo.file,
                name: photo.file?.name || `entrega-${Date.now()}-${index}`,
                url: photo.preview || photo.url
            }))

            this.isModalLoading = true

            try {
                await addRouteDeliveryApi(this.routeSelected.id, {
                    note: this.deliveryForm.note,
                    lateInvoice: isLateInvoice,
                    photos: newPhotos
                })

                await this.fetchRoutes()
                this.cancelDelivery()
                notifySuccess(isLateInvoice ? 'Nota enviada para revisão.' : 'Entrega registrada com sucesso.')
            } catch (error) {
                console.error(error)
                notifyError(error, isLateInvoice ? 'Não foi possível enviar a nota.' : 'Não foi possível registrar a entrega.')
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
                    url: photo.preview || photo.url || photo.fileUrl,
                    deliveryIndex: photo.deliveryIndex,
                    deliveryNote: photo.deliveryNote,
                    deliveredAt: photo.deliveredAt
                }))

                await reviewRouteApi(this.routeSelected.id, {
                    kmInicial: this.adminForm.kmInicial,
                    kmFinal: this.adminForm.kmFinal,
                    cidades: this.toList(this.adminForm.cidadesStr),
                    notas: this.toList(this.adminForm.notasStr),
                    plannedDeliveries: this.adminForm.plannedDeliveries,
                    freightAmount: this.adminForm.freightAmount,
                    tollAmount: this.tollTotal(this.adminForm),
                    tollAmounts: this.adminForm.tollAmounts,
                    loadingAmount: this.adminForm.loadingAmount,
                    unloadingAmount: this.adminForm.unloadingAmount,
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
            this.startForm = { kmInicial: '', plannedDeliveries: '' }
        },

        cancelCreateRoute() {
            this.showCreateRouteModal = false
            this.createRouteForm = this.emptyCreateRouteForm()
        },

        cancelFinish() {
            this.showFinishModal = false
            this.routeSelected = null
            this.finishForm = {
                kmFinal: '',
                cidadesStr: '',
                notasStr: '',
                tollInput: null,
                tollAmounts: [],
                loadingAmount: null,
                unloadingAmount: null
            }
            this.photos = []
        },

        cancelDelivery() {
            this.showDeliveryModal = false
            this.routeSelected = null
            this.deliveryForm = { note: '', isLateInvoice: false }
            this.deliveryPhotos = []
        },

        cancelDriverRouteDetails() {
            this.showDriverDetailsModal = false
            this.routeSelected = null
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

            this.isModalLoading = true
            try {
                const { blob, filename } = await downloadFreightPdf({
                    startDate: this.freightForm.startDate,
                    endDate: this.freightForm.endDate,
                    title: this.freightForm.title
                })

                const url = URL.createObjectURL(blob)
                const link = document.createElement('a')
                link.href = url
                link.download = filename || 'frete.pdf'
                document.body.appendChild(link)
                link.click()
                document.body.removeChild(link)
                URL.revokeObjectURL(url)

                this.cancelFreightModal()
                notifySuccess('PDF de frete gerado com sucesso.')
            } catch (error) {
                console.error(error)
                notifyError(error, 'Nao foi possivel gerar o PDF de frete.')
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

        hasNumberValue(value) {
            return value !== '' && value !== null && value !== undefined && Number.isFinite(Number(value))
        },

        syncAdminReviewStatus() {
            if (!this.showAdminModal) return

            if (this.adminReviewHasRequiredData && this.adminForm.status !== 'Concluida') {
                this.adminForm.status = 'Concluida'
                return
            }

            if (!this.adminReviewHasRequiredData && this.adminForm.status === 'Concluida') {
                this.adminForm.status = 'Pendente de analise'
            }
        },

        emptyCreateRouteForm() {
            return {
                vehicleId: '',
                date: new Date().toISOString().slice(0, 10),
                kmInicial: '',
                kmFinal: '',
                cidadesStr: '',
                notasStr: '',
                plannedDeliveries: '',
                freightAmount: null,
                tollInput: null,
                tollAmounts: [],
                loadingAmount: null,
                unloadingAmount: null,
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

        routeNeedsInvoiceReview(route) {
            if (!route || route.status === 'Em andamento') return false

            const hasInvoices = Array.isArray(route.notas) && route.notas.length > 0
            const hasPhotos = Array.isArray(route.photos) && route.photos.length > 0

            return route.correctionRequested || (!hasInvoices && !hasPhotos)
        },

        routeStatusSortOrder(status) {
            const statusOrder = {
                'Pendente de analise': 1,
                'Em andamento': 2,
                Concluida: 3
            }

            return statusOrder[status] || 99
        },

        routeSortTimestamp(route, field = 'data') {
            const value = route?.[field] || route?.data || route?.createdAt
            const parsed = parseLocalDate(value)

            return parsed && !Number.isNaN(parsed.getTime()) ? parsed.getTime() : 0
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

        deliveryPhotosForRoute(route) {
            const photos = route?.photos || []
            const deliveryPhotos = photos.filter(photo => photo.deliveredAt || photo.deliveryIndex)

            return deliveryPhotos.length ? deliveryPhotos : photos
        },

        deliveredCount(route) {
            return this.deliveryPhotosForRoute(route).length
        },

        plannedDeliveryCount(route) {
            const planned = Number(route?.plannedDeliveries || 0)
            return Math.max(planned, this.deliveredCount(route), 1)
        },

        deliveryProgressLabel(route) {
            const delivered = this.deliveredCount(route)
            const planned = Number(route?.plannedDeliveries || 0)

            return planned ? `${delivered}/${planned}` : `${delivered} registradas`
        },

        deliveryProgressHint(route) {
            const planned = Number(route?.plannedDeliveries || 0)
            const delivered = this.deliveredCount(route)

            if (!planned) return 'Sem total previsto'
            if (delivered >= planned) return 'Todas as entregas previstas foram registradas'

            return `${planned - delivered} pendente${planned - delivered === 1 ? '' : 's'}`
        },

        deliveryProgressPercent(route) {
            const total = this.plannedDeliveryCount(route)
            if (!total) return 0

            return Math.min(100, Math.round((this.deliveredCount(route) / total) * 100))
        },

        deliveryTimelineSteps(route) {
            const photos = this.deliveryPhotosForRoute(route)
            const total = this.plannedDeliveryCount(route)

            return Array.from({ length: total }, (_, index) => ({
                index: index + 1,
                done: index < photos.length,
                next: index === photos.length,
                photo: photos[index]
            }))
        },

        visibleRoutePhotos(route, limit = 6) {
            return (route?.photos || []).slice(0, limit)
        },

        hiddenRoutePhotoCount(route, limit = 6) {
            return Math.max(0, (route?.photos || []).length - limit)
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

        moneyNumber(value) {
            const parsed = Number(value)
            return Number.isFinite(parsed) ? parsed : 0
        },

        routeTollAmounts(route) {
            const amounts = Array.isArray(route?.tollAmounts) ? route.tollAmounts : []
            if (amounts.length) return amounts.map(this.moneyNumber).filter(value => value > 0)
            return this.moneyNumber(route?.tollAmount) > 0 ? [this.moneyNumber(route.tollAmount)] : []
        },

        tollTotal(form) {
            return (form?.tollAmounts || []).reduce((sum, amount) => sum + this.moneyNumber(amount), 0)
        },

        addTollAmount(formKey) {
            const form = this[formKey]
            if (!form) return

            const amount = this.moneyNumber(form.tollInput)
            if (amount <= 0) return

            form.tollAmounts = [...(form.tollAmounts || []), amount]
            form.tollInput = null
        },

        removeTollAmount(formKey, index) {
            const form = this[formKey]
            if (!form) return

            form.tollAmounts = (form.tollAmounts || []).filter((_, itemIndex) => itemIndex !== index)
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
                : this.calculateFreightAmount(route.kmInicial, route.kmFinal) +
                this.moneyNumber(route.tollAmount) +
                this.moneyNumber(route.loadingAmount) +
                this.moneyNumber(route.unloadingAmount)
        },

        toInputDate(date) {
            return toInputDateValue(date)
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

.panel-actions {
    display: flex;
    gap: 10px;
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

.delivery-progress-card,
.route-delivery-summary,
.admin-delivery-overview,
.delivery-modal-summary {
    border: 1px solid var(--border-soft);
    border-radius: 14px;
    background: var(--surface-muted);
}

.delivery-progress-card {
    margin-top: 12px;
    padding: 12px;
}

.delivery-progress-head,
.route-delivery-summary,
.delivery-modal-summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
}

.delivery-progress-head small,
.route-delivery-summary small,
.admin-delivery-overview small {
    display: block;
    color: var(--text-muted);
    font-size: 11px;
}

.delivery-progress-head strong,
.route-delivery-summary strong,
.admin-delivery-overview strong,
.delivery-modal-summary strong {
    color: var(--text-strong);
}

.route-delivery-summary,
.admin-delivery-overview,
.delivery-modal-summary {
    margin-top: 10px;
    padding: 10px;
}

.delivery-progress-head span {
    display: block;
    color: var(--text-muted);
    font-size: 12px;
    line-height: 1.2;
}

.delivery-timeline-shell {
    position: relative;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(76px, 1fr));
    gap: 8px;
    margin-top: 18px;
    padding-top: 12px;
}

.delivery-timeline-line {
    position: absolute;
    top: 25px;
    right: 32px;
    left: 32px;
    height: 3px;
    overflow: hidden;
    border-radius: 999px;
    background: var(--border-soft);
}

.delivery-timeline-line::before {
    content: '';
    display: block;
    width: var(--delivery-progress);
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(90deg, #2563eb, #16a34a);
}

.delivery-step {
    position: relative;
    display: grid;
    place-items: center;
    gap: 6px;
    min-width: 0;
    border: 0;
    background: transparent;
    color: var(--text-muted);
    font-size: 11px;
    font-weight: 800;
    line-height: 1.1;
    text-align: center;
    z-index: 1;
}

.delivery-step-dot {
    display: grid;
    place-items: center;
    width: 34px;
    height: 34px;
    border: 2px solid var(--border-soft);
    border-radius: 999px;
    background: var(--surface-card);
    color: var(--text-muted);
    box-shadow: 0 0 0 5px var(--surface-muted);
}

.delivery-step.done {
    color: #16a34a;
}

.delivery-step.done .delivery-step-dot {
    border-color: rgba(22, 163, 74, 0.48);
    background: #16a34a;
    color: #fff;
}

.delivery-step.next .delivery-step-dot {
    border-color: rgba(37, 99, 235, 0.6);
    color: #2563eb;
}

.mini-delivery-timeline {
    display: flex;
    flex: 1;
    flex-wrap: wrap;
    justify-content: flex-end;
    margin-top: 0;
}

.mini-delivery-timeline span {
    width: 20px;
    height: 8px;
    border-radius: 999px;
    background: var(--border-soft);
}

.mini-delivery-timeline span.done {
    background: #16a34a;
}

.optional-label {
    color: var(--text-muted);
    font-size: 11px;
    font-weight: 600;
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

.route-card-icon {
    display: grid;
    place-items: center;
    flex: 0 0 auto;
    width: 42px;
    height: 42px;
    border: 1px solid rgba(37, 99, 235, 0.22);
    border-radius: 14px;
    background: rgba(37, 99, 235, 0.12);
    color: #2563eb;
}

.route-card-icon.pending {
    border-color: rgba(217, 119, 6, 0.28);
    background: rgba(217, 119, 6, 0.14);
    color: #d97706;
}

.route-card-icon.done {
    border-color: rgba(22, 163, 74, 0.28);
    background: rgba(22, 163, 74, 0.14);
    color: #16a34a;
}

.route-title-block {
    flex: 1;
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

.route-metrics div {
    display: flex;
    align-items: center;
    gap: 9px;
    min-width: 0;
}

.route-metrics div>span:last-child,
.route-details div>span:last-child {
    min-width: 0;
}

.metric-icon,
.detail-icon {
    display: grid;
    place-items: center;
    flex: 0 0 auto;
    width: 28px;
    height: 28px;
    border-radius: 9px;
    background: rgba(37, 99, 235, 0.12);
    color: #2563eb;
}

.metric-icon.final {
    background: rgba(71, 85, 105, 0.13);
    color: #64748b;
}

.metric-icon.total {
    background: rgba(147, 51, 234, 0.12);
    color: #9333ea;
}

.metric-icon.freight,
.detail-icon.invoice {
    background: rgba(22, 163, 74, 0.12);
    color: #16a34a;
}

.detail-icon.city {
    background: rgba(217, 119, 6, 0.12);
    color: #d97706;
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
    display: flex;
    align-items: center;
    gap: 9px;
    min-width: 0;
    padding: 10px;
    border-radius: 12px;
    background: var(--surface-muted);
}

.route-details p {
    margin: 0;
    display: -webkit-box;
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
    overflow: hidden;
    border-radius: 12px;
    background: var(--surface-muted);
}

.photo-strip img,
.photo-more {
    flex: 0 0 66px;
    width: 64px;
    height: 64px;
    border-radius: 10px;
}

.photo-strip img {
    border: 2px solid transparent;
    object-fit: cover;
    cursor: pointer;
    transition: border-color 0.18s ease, transform 0.18s ease;
}

.photo-strip img:hover {
    border-color: var(--primary-color);
    transform: scale(1.03);
}

.photo-more {
    border: 1px solid var(--border-soft);
    background: rgba(var(--primary-color-rgb), 0.12);
    color: var(--primary-color);
    font-size: 15px;
    font-weight: 900;
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

.driver-details-content {
    display: grid;
    gap: 12px;
}

.driver-detail-summary {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 8px;
}

.driver-detail-summary div,
.driver-detail-section {
    border: 1px solid var(--border-soft);
    border-radius: 14px;
    background: var(--surface-muted);
}

.driver-detail-summary div {
    padding: 10px;
}

.driver-detail-summary small {
    display: block;
    color: var(--text-muted);
    font-size: 11px;
}

.driver-detail-summary strong {
    display: block;
    overflow: hidden;
    color: var(--text-strong);
    text-overflow: ellipsis;
    white-space: nowrap;
}

.driver-detail-section {
    padding: 12px;
}

.driver-detail-title {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 10px;
}

.driver-detail-title i {
    display: grid;
    place-items: center;
    width: 30px;
    height: 30px;
    border-radius: 10px;
    background: rgba(var(--primary-color-rgb), 0.12);
    color: var(--primary-color);
}

.driver-detail-title strong {
    color: var(--text-strong);
}

.driver-detail-title span {
    margin-left: auto;
    padding: 4px 8px;
    border-radius: 999px;
    background: var(--surface-card);
    color: var(--text-muted);
    font-size: 12px;
    font-weight: 800;
}

.detail-chip-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}

.detail-chip-list span {
    max-width: 100%;
    padding: 7px 10px;
    border: 1px solid var(--border-soft);
    border-radius: 999px;
    background: var(--surface-card);
    color: var(--text-strong);
    overflow-wrap: anywhere;
    font-weight: 700;
}

.detail-empty-copy {
    margin: 0;
    color: var(--text-muted);
}

.driver-photo-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(108px, 1fr));
    gap: 10px;
}

.driver-photo-grid button {
    position: relative;
    min-width: 0;
    aspect-ratio: 1;
    padding: 0;
    overflow: hidden;
    border: 1px solid var(--border-soft);
    border-radius: 12px;
    background: var(--surface-card);
}

.driver-photo-grid img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.driver-photo-grid span {
    position: absolute;
    right: 6px;
    bottom: 6px;
    left: 6px;
    padding: 4px 6px;
    border-radius: 8px;
    background: rgba(15, 23, 42, 0.78);
    color: #fff;
    font-size: 11px;
    font-weight: 800;
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

.analysis-note.warning {
    color: #b45309;
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

.late-invoice-card {
    display: flex;
    gap: 10px;
    margin-top: 12px;
    padding: 12px;
    border: 1px solid rgba(217, 119, 6, 0.28);
    border-radius: 14px;
    background: rgba(217, 119, 6, 0.11);
    color: #d97706;
}

.late-invoice-card i {
    margin-top: 2px;
}

.late-invoice-card strong {
    display: block;
    color: #d97706;
    line-height: 1.2;
}

.late-invoice-card p {
    margin: 3px 0 0;
    color: var(--text-strong);
    line-height: 1.35;
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

.toll-builder {
    display: grid;
    gap: 8px;
    padding: 10px;
    border: 1px solid var(--border-soft);
    border-radius: 12px;
    background: var(--surface-muted);
}

.toll-input-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 40px;
    gap: 8px;
}

.toll-input-row button,
.toll-chip-list button {
    border: 1px solid var(--border-soft);
    background: var(--surface-card);
    color: var(--text-strong);
}

.toll-input-row button {
    display: grid;
    place-items: center;
    width: 40px;
    min-height: 40px;
    border-radius: 10px;
}

.toll-input-row button:disabled {
    opacity: 0.45;
}

.toll-chip-list {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
}

.toll-chip-list button {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 30px;
    padding: 5px 9px;
    border-radius: 999px;
    color: var(--primary-color);
    font-size: 12px;
    font-weight: 800;
}

.toll-total {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding-top: 6px;
    border-top: 1px solid var(--border-soft);
}

.toll-total span {
    color: var(--text-muted);
    font-size: 12px;
    font-weight: 800;
}

.toll-total strong {
    color: var(--text-strong);
    font-size: 15px;
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
    .routes-page .container {
        padding-right: 10px;
        padding-left: 10px;
    }

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

    .form-grid {
        flex-direction: column;
        grid-template-columns: 1fr;
    }

    .panel-actions,
    .driver-detail-summary {
        grid-template-columns: 1fr;
        flex-direction: column;
    }

    .route-list {
        gap: 10px;
        max-width: 100%;
        min-width: 0;
        overflow-x: clip;
    }

    .route-card {
        width: 100%;
        max-width: 100%;
        min-width: 0;
        overflow: hidden;
        border-radius: 12px;
        padding: 10px;
    }

    .route-card-head {
        gap: 8px;
        min-width: 0;
    }

    .route-title-block strong {
        font-size: 14px;
    }

    .route-meta {
        gap: 3px 8px;
        margin-top: 3px;
        font-size: 10px;
    }

    .route-meta span,
    .route-title-block {
        min-width: 0;
    }

    .route-meta span {
        max-width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .route-card .status-pill {
        max-width: 96px;
        padding: 4px 6px;
        font-size: 9px;
    }

    .route-metrics {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 6px;
        margin: 8px 0;
    }

    .route-metrics div,
    .route-details div {
        border-radius: 10px;
        padding: 7px;
    }

    .route-metrics small,
    .route-details small {
        font-size: 10px;
    }

    .route-metrics strong {
        font-size: 13px;
    }

    .route-details {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 6px;
        margin-top: 6px;
    }

    .route-details p {
        font-size: 11px;
        line-height: 1.25;
        -webkit-line-clamp: 2;
    }

    .photo-strip {
        gap: 6px;
        margin-top: 8px;
        padding: 6px;
    }

    .photo-strip img,
    .photo-more {
        flex-basis: 48px;
        width: 48px;
        height: 48px;
        border-radius: 8px;
    }

    .driver-photo-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .correction-card {
        margin-top: 8px;
        padding: 8px;
        font-size: 12px;
    }

    .route-actions {
        flex-wrap: wrap;
        gap: 6px;
        margin-top: 8px;
        padding-top: 8px;
    }

    .route-actions>* {
        flex: 1 1 0;
        min-width: 0;
    }

    .route-actions :deep(button) {
        width: 100%;
        max-width: 100%;
        white-space: normal;
        word-break: normal;
        overflow-wrap: anywhere;
        min-height: 34px;
        padding: 7px 8px;
        font-size: 11px;
        line-height: 1.1;
    }

    .route-actions :deep(.button-content) {
        min-width: 0;
        max-width: 100%;
        white-space: normal;
        flex-wrap: wrap;
    }

    .admin-route-summary {
        grid-template-columns: 1fr;
    }
}
</style>
