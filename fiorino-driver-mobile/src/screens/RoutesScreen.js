import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, FontAwesome6 } from '@expo/vector-icons';
import AppHeader from '../components/AppHeader';
import AppModal from '../components/AppModal';
import PhotoPickerField from '../components/PhotoPickerField';
import { addRouteDeliveryApi, finishRouteApi, getMyVehicle, listRoutes, reportRouteErrorApi, startRouteApi } from '../services/routesService';
import { colors, radius, shadow, typography } from '../theme/fiorinoTheme';

export default function RoutesScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submittingAction, setSubmittingAction] = useState('');
  const [routes, setRoutes] = useState([]);
  const [myVehicle, setMyVehicle] = useState(null);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [startOpen, setStartOpen] = useState(false);
  const [finishOpen, setFinishOpen] = useState(false);
  const [deliveryOpen, setDeliveryOpen] = useState(false);
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState(null);

  const [startForm, setStartForm] = useState({ kmInicial: '', plannedDeliveries: '' });
  const [finishForm, setFinishForm] = useState({ kmFinal: '', cidadesStr: '', notasStr: '', tollAmount: '' });
  const [deliveryForm, setDeliveryForm] = useState({ note: '' });
  const [correctionNote, setCorrectionNote] = useState('');
  const [finishPhotos, setFinishPhotos] = useState([]);
  const [deliveryPhotos, setDeliveryPhotos] = useState([]);

  React.useEffect(() => {
    loadAll();
  }, []);

  async function loadAll(pull = false) {
    if (pull) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const [vehicle, routesData] = await Promise.all([
        getMyVehicle().catch(() => null),
        listRoutes()
      ]);
      setMyVehicle(vehicle);
      setRoutes(routesData);
      if (vehicle && !startForm.kmInicial) setStartForm(prev => ({ ...prev, kmInicial: String(vehicle.currentKm || '') }));
    } catch (e) {
      setError(e?.response?.data?.message || 'Erro ao carregar rotas.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const activeRoute = useMemo(() => routes.find(r => r.status === 'Em andamento'), [routes]);
  const canStart = !!myVehicle && !activeRoute && !!startForm.kmInicial;
  const canFinish = !!selectedRoute && !!finishForm.kmFinal;

  const filteredRoutes = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return routes
      .filter(r => statusFilter === 'all' || r.status === statusFilter)
      .filter(r => {
        const hay = [r.data, r.driver, r.status, ...(r.cidades || []), ...(r.notas || [])].join(' ').toLowerCase();
        return !term || hay.includes(term);
      })
      .sort((a, b) => new Date(b.data) - new Date(a.data));
  }, [routes, searchTerm, statusFilter]);

  function toList(value) {
    return String(value || '').split(',').map(v => v.trim()).filter(Boolean);
  }

  function deliveryCount(route) {
    return deliveryPhotosForRoute(route).length;
  }

  function deliveryTotal(route) {
    return route?.plannedDeliveries || Math.max(deliveryPhotosForRoute(route).length, 1);
  }

  function deliveryPercent(route) {
    const total = deliveryTotal(route);
    if (!total) return 0;
    return Math.min(100, Math.round((deliveryCount(route) / total) * 100));
  }

  function timeline(route) {
    const total = deliveryTotal(route);
    const done = deliveryCount(route);
    return Array.from({ length: total }, (_, i) => ({ done: i < done, next: i === done, idx: i + 1 }));
  }

  function deliveryPhotosForRoute(route) {
    const photos = route?.photos || [];
    const deliveryPhotos = photos.filter(photo => photo.deliveredAt || photo.deliveryIndex);
    return deliveryPhotos.length ? deliveryPhotos : photos;
  }

  function deliveryProgressLabel(route) {
    const delivered = deliveryCount(route);
    const planned = Number(route?.plannedDeliveries || 0);
    return planned ? `${delivered}/${planned}` : `${delivered} registradas`;
  }

  function nextDeliveryIndex(route) {
    return deliveryCount(route) + 1;
  }

  function formatDateBR(value) {
    if (!value) return '-';
    const [year, month, day] = String(value).slice(0, 10).split('-');
    return `${day}/${month}/${year}`;
  }

  function formatDay(value) {
    const date = new Date(`${value}T00:00:00`);
    return date.toLocaleDateString('pt-BR', { weekday: 'long' });
  }

  async function submitStart() {
    if (submittingAction) return;
    setSubmittingAction('start');
    try {
      await startRouteApi({
        vehicleId: myVehicle.id,
        kmInicial: Number(startForm.kmInicial),
        plannedDeliveries: startForm.plannedDeliveries ? Number(startForm.plannedDeliveries) : null
      });
      setStartOpen(false);
      await loadAll();
    } finally {
      setSubmittingAction('');
    }
  }

  async function submitFinish() {
    if (submittingAction) return;
    setSubmittingAction('finish');
    try {
      await finishRouteApi(selectedRoute.id, {
        kmFinal: Number(finishForm.kmFinal),
        cidades: toList(finishForm.cidadesStr),
        notas: toList(finishForm.notasStr),
        tollAmount: finishForm.tollAmount || null,
        photos: finishPhotos
      });
      setFinishOpen(false);
      setFinishPhotos([]);
      await loadAll();
    } finally {
      setSubmittingAction('');
    }
  }

  async function submitDelivery() {
    if (submittingAction) return;
    setSubmittingAction('delivery');
    try {
      await addRouteDeliveryApi(selectedRoute.id, {
        note: deliveryForm.note,
        photos: deliveryPhotos
      });
      setDeliveryOpen(false);
      setDeliveryPhotos([]);
      await loadAll();
    } finally {
      setSubmittingAction('');
    }
  }

  async function submitCorrection() {
    if (!selectedRoute || !correctionNote.trim() || submittingAction) return;
    setSubmittingAction('correction');
    try {
      await reportRouteErrorApi(selectedRoute.id, correctionNote.trim());
      setCorrectionOpen(false);
      setSelectedRoute(null);
      setCorrectionNote('');
      await loadAll();
    } finally {
      setSubmittingAction('');
    }
  }

  function closeCorrection() {
    setCorrectionOpen(false);
    setSelectedRoute(null);
    setCorrectionNote('');
  }

  function openFinish(route) {
    setSelectedRoute(route);
    setFinishForm({
      kmFinal: route.kmFinal ? String(route.kmFinal) : '',
      cidadesStr: route.cidades.join(', '),
      notasStr: route.notas.join(', '),
      tollAmount: ''
    });
    setFinishOpen(true);
  }

  function openDelivery(route) {
    setSelectedRoute(route);
    setDeliveryForm({ note: '' });
    setDeliveryOpen(true);
  }

  function openCorrection(route) {
    setSelectedRoute(route);
    setCorrectionNote(route.correctionNote || '');
    setCorrectionOpen(true);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#8fb7e6" />
      </View>
    );
  }

  return (
    <View style={styles.page}>
      <AppHeader active="Rotas" />
      <LinearGradient colors={['rgba(143,183,230,0.08)', 'rgba(12,17,24,1)', 'rgba(12,17,24,1)']} style={styles.content}>
        <FlatList
          data={filteredRoutes}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadAll(true)} tintColor="#8fb7e6" />}
          ListHeaderComponent={
          <View style={styles.headerWrap}>
            <View style={styles.hero}>
              <View style={{ flex: 1 }}>
                <Text style={styles.eyebrow}>Área do motorista</Text>
                <Text style={styles.heroTitle}>{activeRoute ? 'Você está em rota' : 'Pronto para sair'}</Text>
                <Text style={styles.heroSubtitle}>
                  {activeRoute ? 'Finalize quando terminar o percurso.' : 'Comece pelo KM atual e registre as entregas por foto.'}
                </Text>
              </View>
              <View style={styles.roleChip}>
                <FontAwesome6 name="truck-fast" size={13} color={colors.textStrong} />
                <Text style={styles.roleChipText}>Motorista</Text>
              </View>
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <View style={styles.activePanel}>
              <View style={styles.activeTop}>
                <View>
                  <Text style={styles.eyebrow}>Rota atual</Text>
                  <Text style={styles.panelTitle}>{activeRoute ? formatDateBR(activeRoute.data) : 'Nenhuma rota ativa'}</Text>
                </View>
                <View style={[styles.statusPill, activeRoute ? styles.running : styles.idle]}>
                  <Text style={[styles.statusText, activeRoute ? styles.statusTextRunning : styles.statusTextIdle]}>{activeRoute ? 'Em andamento' : 'Pronto'}</Text>
                </View>
              </View>

              {activeRoute ? (
                <>
                  <View style={styles.activeGrid}>
                    <ActiveMetric label="KM inicial" value={`${activeRoute.kmInicial}`} />
                    <ActiveMetric label="Início" value={activeRoute.createdAt ? new Date(activeRoute.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '-'} />
                    <ActiveMetric label="Motorista" value={activeRoute.driver} />
                  </View>

                  <View style={styles.deliveryProgressCard}>
                    <View style={styles.deliveryProgressHead}>
                      <View style={styles.deliveryProgressText}>
                        <Text style={styles.deliveryLabel}>Entregas</Text>
                        <Text style={styles.deliveryValue}>{deliveryCount(activeRoute)} registradas</Text>
                        <Text style={styles.deliveryHint}>
                          {activeRoute.plannedDeliveries ? `${activeRoute.plannedDeliveries} previstas` : 'Sem total previsto'}
                        </Text>
                      </View>
                      <Action
                        compact
                        icon={<Ionicons name="camera" size={15} />}
                        text="Registrar entrega"
                        onPress={() => openDelivery(activeRoute)}
                      />
                    </View>

                    <View style={styles.timelineWrap}>
                      <View style={styles.timelineLineBg} />
                      <View style={[styles.timelineLineFill, { width: `${deliveryPercent(activeRoute)}%` }]} />
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.timelineRow}>
                        {timeline(activeRoute).map(step => (
                          <View key={step.idx} style={styles.stepWrap}>
                            <View style={[styles.stepDot, step.done && styles.stepDone, step.next && styles.stepNext]}>
                              <Ionicons name={step.done ? 'checkmark' : 'cube-outline'} size={13} color={step.done ? '#fff' : step.next ? colors.blue : '#9fb0c5'} />
                            </View>
                            <Text style={[styles.stepText, step.done && styles.stepDoneText]}>{step.done ? 'Entregue' : step.next ? 'Próxima' : 'Pendente'}</Text>
                          </View>
                        ))}
                      </ScrollView>
                    </View>
                  </View>

                  <View style={styles.panelActions}>
                    <Action full icon={<Ionicons name="list" size={15} />} text="Detalhes" onPress={() => navigation.navigate('RouteDetails', { routeData: activeRoute })} />
                    <Action full icon={<Ionicons name="flag" size={15} />} text="Finalizar rota" primary onPress={() => openFinish(activeRoute)} />
                  </View>
                </>
              ) : (
                <>
                <Text style={styles.emptyCopy}>Informe o KM atual do painel para abrir a viagem. Enquanto ela estiver ativa, uma nova rota fica bloqueada.</Text>
                  <Action icon={<Ionicons name="play" size={15} />} text="Iniciar rota" primary onPress={() => setStartOpen(true)} disabled={!canStart} />
                </>
              )}
            </View>

            <View style={styles.toolbar}>
              <View style={styles.searchBox}>
                <Ionicons name="search" size={15} color="#93a7bf" />
                <TextInput
                  value={searchTerm}
                  onChangeText={setSearchTerm}
                  placeholder="Buscar por cidade, nota ou data"
                  placeholderTextColor="#8699b1"
                  style={styles.searchInput}
                />
              </View>
              <View style={styles.filterRow}>
                <FilterChip label="Todos" active={statusFilter === 'all'} onPress={() => setStatusFilter('all')} />
                <FilterChip label="Em andamento" active={statusFilter === 'Em andamento'} onPress={() => setStatusFilter('Em andamento')} />
                <FilterChip label="Pendente" active={statusFilter === 'Pendente de analise'} onPress={() => setStatusFilter('Pendente de analise')} />
                <FilterChip label="Concluída" active={statusFilter === 'Concluida'} onPress={() => setStatusFilter('Concluida')} />
              </View>
            </View>
          </View>
          }
          renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHead}>
              <View style={[styles.routeCardIcon, item.status === 'Concluida' ? styles.routeCardIconDone : item.status === 'Pendente de analise' ? styles.routeCardIconPending : null]}>
                <FontAwesome6 name="truck-fast" size={17} color={item.status === 'Concluida' ? colors.green : item.status === 'Pendente de analise' ? colors.orange : colors.blue} />
              </View>
              <View style={styles.routeTitleBlock}>
                <Text style={styles.cardDate}>{formatDateBR(item.data)}</Text>
                <View style={styles.routeMeta}>
                  <Text style={styles.routeMetaText}>{formatDay(item.data)}</Text>
                  <Text style={styles.routeMetaText}>• {item.driver}</Text>
                </View>
              </View>
              <View style={[styles.statusPill, item.status === 'Concluida' ? styles.done : item.status === 'Pendente de analise' ? styles.pending : styles.running]}>
                <Text style={[styles.statusText, item.status === 'Concluida' ? styles.statusTextDone : item.status === 'Pendente de analise' ? styles.statusTextPending : styles.statusTextRunning]}>{item.status}</Text>
              </View>
            </View>

            <View style={styles.metricsRow}>
              <RouteMetric tone="initial" icon={<FontAwesome6 name="truck-ramp-box" size={13} color={colors.blue} />} label="Inicial" value={`${item.kmInicial}`} />
              <RouteMetric tone="final" icon={<Ionicons name="flag-outline" size={14} color="#64748b" />} label="Final" value={`${item.kmFinal || '-'}`} />
              <RouteMetric tone="total" icon={<Ionicons name="git-branch-outline" size={14} color="#9333ea" />} label="Total" value={`${item.kmFinal ? Math.max(0, item.kmFinal - item.kmInicial) : 0} km`} />
            </View>

            <View style={styles.detailsGrid}>
              <DetailBox tone="city" icon={<Ionicons name="location" size={14} color={colors.orange} />} label="Cidades" value={item.cidades.length ? item.cidades.join(', ') : 'Aguardando cadastro'} />
              <DetailBox tone="invoice" icon={<Ionicons name="clipboard-outline" size={14} color={colors.green} />} label="Notas" value={item.notas.length ? item.notas.join(', ') : 'Aguardando cadastro'} />
            </View>

            {!!item.photos?.length && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoStrip}>
                {item.photos.slice(0, 5).map((photo, idx) => (
                  <Image key={`${photo.url}-${idx}`} source={{ uri: photo.url || photo.preview }} style={styles.photoThumb} />
                ))}
                {item.photos.length > 5 ? (
                  <View style={styles.morePhotos}>
                    <Text style={styles.morePhotosText}>+{item.photos.length - 5}</Text>
                  </View>
                ) : null}
              </ScrollView>
            )}

            <View style={styles.actionsRow}>
              <Action icon={<Ionicons name="list" size={15} />} text="Detalhes" onPress={() => navigation.navigate('RouteDetails', { routeData: item })} />
              {item.status === 'Em andamento' ? <Action icon={<Ionicons name="camera" size={15} />} text="Entrega" onPress={() => openDelivery(item)} /> : null}
              {item.status === 'Em andamento' ? <Action icon={<Ionicons name="flag" size={15} />} text="Finalizar" primary onPress={() => openFinish(item)} /> : null}
              {item.status !== 'Em andamento' ? <Action icon={<Ionicons name="alert-circle" size={15} />} text="Relatar erro" onPress={() => openCorrection(item)} /> : null}
            </View>
          </View>
          )}
          ListEmptyComponent={<Text style={styles.emptyList}>Nenhuma rota encontrada.</Text>}
          contentContainerStyle={styles.listContent}
        />
      </LinearGradient>

      <AppModal visible={startOpen} onClose={() => setStartOpen(false)} title="Iniciar rota" subtitle="Digite o KM atual do painel" icon="speedometer-outline">
        <Input label="KM inicial" value={startForm.kmInicial} onChangeText={(v) => setStartForm({ ...startForm, kmInicial: v })} keyboardType="numeric" />
        <Input label="Quantidade de entregas (opcional)" value={startForm.plannedDeliveries} onChangeText={(v) => setStartForm({ ...startForm, plannedDeliveries: v })} keyboardType="numeric" />
        <Action icon={<Ionicons name="play" size={15} />} text="Iniciar rota" primary onPress={submitStart} disabled={!canStart || !!submittingAction} loading={submittingAction === 'start'} />
      </AppModal>

      <AppModal visible={finishOpen} onClose={() => setFinishOpen(false)} title="Finalizar rota" subtitle="KM final obrigatório" icon="flag-outline">
        <ScrollView>
          <Input label="KM final" value={finishForm.kmFinal} onChangeText={(v) => setFinishForm({ ...finishForm, kmFinal: v })} keyboardType="numeric" />
          <Input label="Cidades entregues" value={finishForm.cidadesStr} onChangeText={(v) => setFinishForm({ ...finishForm, cidadesStr: v })} />
          <Input label="Números das notas" value={finishForm.notasStr} onChangeText={(v) => setFinishForm({ ...finishForm, notasStr: v })} />
          <Input label="Pedágio (opcional)" value={finishForm.tollAmount} onChangeText={(v) => setFinishForm({ ...finishForm, tollAmount: v })} keyboardType="numeric" />
          <Text style={styles.modalLabel}>Fotos das notas</Text>
          <PhotoPickerField photos={finishPhotos} onChange={setFinishPhotos} />
          <View style={{ height: 10 }} />
          <Action icon={<Ionicons name="flag" size={15} />} text="Finalizar rota" primary onPress={submitFinish} disabled={!canFinish || !!submittingAction} loading={submittingAction === 'finish'} />
        </ScrollView>
      </AppModal>

      <AppModal visible={deliveryOpen} onClose={() => setDeliveryOpen(false)} title="Registrar entrega" subtitle="Envie a foto da nota ou comprovante." icon="camera-outline">
        {selectedRoute ? (
          <View style={styles.deliveryModalSummary}>
            <View>
              <Text style={styles.deliveryModalSmall}>Progresso</Text>
              <Text style={styles.deliveryModalValue}>{deliveryProgressLabel(selectedRoute)}</Text>
            </View>
            <View style={styles.nextDeliveryPill}>
              <Text style={styles.nextDeliveryText}>Próxima: {nextDeliveryIndex(selectedRoute)}</Text>
            </View>
          </View>
        ) : null}

        <Text style={styles.modalLabel}>Fotos da entrega</Text>
        <PhotoPickerField photos={deliveryPhotos} onChange={setDeliveryPhotos} />

        <Input label="Observação (opcional)" value={deliveryForm.note} onChangeText={(v) => setDeliveryForm({ ...deliveryForm, note: v })} placeholder="Ex: NF 5674 ou cliente Maria" />
        <View style={{ height: 10 }} />
        <Action full icon={<Ionicons name="camera" size={15} />} text="Salvar entrega" primary onPress={submitDelivery} disabled={!deliveryPhotos.length || !!submittingAction} loading={submittingAction === 'delivery'} />
      </AppModal>

      <AppModal visible={correctionOpen} onClose={closeCorrection} title="Relatar erro" subtitle="Explique o que precisa ser corrigido." icon="alert-circle-outline">
        {selectedRoute ? (
          <View style={styles.correctionSummary}>
            <View style={styles.correctionSummaryItem}>
              <Text style={styles.correctionSummaryLabel}>Data</Text>
              <Text style={styles.correctionSummaryValue}>{formatDateBR(selectedRoute.data)}</Text>
            </View>
            <View style={styles.correctionSummaryItem}>
              <Text style={styles.correctionSummaryLabel}>Status</Text>
              <Text style={styles.correctionSummaryValue} numberOfLines={1}>{selectedRoute.status}</Text>
            </View>
          </View>
        ) : null}

        <View style={styles.correctionInfo}>
          <Ionicons name="warning-outline" size={18} color={colors.orange} />
          <View style={styles.correctionInfoText}>
            <Text style={styles.correctionInfoTitle}>Envie para revisão</Text>
            <Text style={styles.correctionInfoCopy}>
              Informe cidade, nota, foto, KM ou qualquer detalhe que a administração precise corrigir.
            </Text>
          </View>
        </View>

        <Text style={styles.modalLabel}>O que precisa ser corrigido?</Text>
        <TextInput
          value={correctionNote}
          onChangeText={setCorrectionNote}
          multiline
          textAlignVertical="top"
          placeholder="Ex: Esqueci a nota 5682, a cidade correta era Itu, ou informei o KM final errado."
          placeholderTextColor="#90a1b7"
          style={[styles.modalInput, styles.correctionTextarea]}
        />
        <View style={{ height: 10 }} />
        <Action full icon={<Ionicons name="send" size={15} />} text="Enviar relato" primary onPress={submitCorrection} disabled={!correctionNote.trim() || !!submittingAction} loading={submittingAction === 'correction'} />
      </AppModal>
    </View>
  );
}

function Input({ label, ...props }) {
  return (
    <View style={{ marginBottom: 9 }}>
      <Text style={styles.modalLabel}>{label}</Text>
      <TextInput {...props} style={[styles.modalInput, props.multiline && { minHeight: 88 }]} placeholderTextColor="#90a1b7" />
    </View>
  );
}

function ActiveMetric({ label, value }) {
  return (
    <View style={styles.activeMetric}>
      <Text style={styles.activeMetricLabel}>{label}</Text>
      <Text style={styles.activeMetricValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function Action({ text, icon, onPress, disabled, primary, full, compact, loading }) {
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled || loading} style={[styles.actionBtn, full && styles.actionFull, compact && styles.actionCompact, primary && styles.actionPrimary, (disabled || loading) && styles.actionDisabled]}>
      {loading ? (
        <ActivityIndicator size="small" color={primary ? '#fff' : '#d9e3ee'} />
      ) : (
        icon ? React.cloneElement(icon, { color: primary ? '#fff' : '#d9e3ee' }) : null
      )}
      <Text style={[styles.actionText, compact && styles.actionTextCompact, primary && { color: '#fff' }]}>{loading ? 'Aguarde...' : text}</Text>
    </TouchableOpacity>
  );
}

function RouteMetric({ icon, label, value, tone }) {
  return (
    <View style={styles.routeMetricCard}>
      <View style={[styles.metricIconBox, tone === 'final' && styles.metricIconFinal, tone === 'total' && styles.metricIconTotal]}>
        {icon}
      </View>
      <View style={styles.metricTextBlock}>
        <Text style={styles.metricLabel}>{label}</Text>
        <Text style={styles.metricValue} numberOfLines={1}>{value}</Text>
      </View>
    </View>
  );
}

function DetailBox({ icon, label, value, tone }) {
  return (
    <View style={styles.detailBox}>
      <View style={[styles.detailIconBox, tone === 'city' && styles.detailCity, tone === 'invoice' && styles.detailInvoice]}>
        {icon}
      </View>
      <View style={styles.detailTextBlock}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue} numberOfLines={2}>{value}</Text>
      </View>
    </View>
  );
}

function FilterChip({ label, active, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.filterChip, active && styles.filterChipActive]}>
      <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: colors.appBg, justifyContent: 'center', alignItems: 'center' },
  page: { flex: 1, backgroundColor: colors.appBg },
  content: { flex: 1 },
  listContent: { paddingHorizontal: 10, paddingTop: 10, paddingBottom: 30 },
  headerWrap: { gap: 12, marginBottom: 8 },
  hero: { borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.surfaceCard, borderRadius: radius.pageCard, padding: 18, flexDirection: 'row', justifyContent: 'space-between', gap: 14, alignItems: 'flex-start', ...shadow.soft },
  eyebrow: { ...typography.eyebrow, color: colors.primary },
  heroTitle: { color: colors.textStrong, fontSize: 22, fontWeight: '800', marginTop: 6, lineHeight: 27 },
  heroSubtitle: { color: colors.textMuted, marginTop: 6, maxWidth: 230, lineHeight: 20 },
  roleChip: { minHeight: 36, paddingHorizontal: 13, borderRadius: 999, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.surfaceMuted, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  roleChipText: { color: colors.textStrong, fontWeight: '800', fontSize: 13 },
  error: { color: '#f87171' },

  activePanel: { borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.surfaceCard, borderRadius: radius.pageCard, padding: 16, ...shadow.soft },
  activeTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  panelTitle: { color: colors.textStrong, fontSize: 18, fontWeight: '800', marginTop: 2 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.surfaceMuted },
  running: { backgroundColor: 'rgba(37,99,235,0.12)', borderColor: 'rgba(37,99,235,0.22)' },
  idle: { backgroundColor: colors.surfaceMuted, borderColor: colors.borderSoft },
  pending: { backgroundColor: 'rgba(217,119,6,0.14)', borderColor: 'rgba(217,119,6,0.28)' },
  done: { backgroundColor: 'rgba(22,163,74,0.14)', borderColor: 'rgba(22,163,74,0.28)' },
  statusText: { color: colors.textStrong, fontWeight: '800', fontSize: 12 },
  statusTextRunning: { color: colors.blue },
  statusTextPending: { color: colors.orange },
  statusTextDone: { color: colors.green },
  statusTextIdle: { color: colors.textMuted },
  activeGrid: { flexDirection: 'row', gap: 8, marginTop: 12 },
  activeMetric: { flex: 1, backgroundColor: colors.surfaceMuted, borderRadius: 14, padding: 10 },
  activeMetricLabel: { color: colors.textMuted, fontSize: 11 },
  activeMetricValue: { color: colors.textStrong, fontWeight: '800', marginTop: 3 },

  deliveryProgressCard: { marginTop: 12, borderWidth: 1, borderColor: colors.borderSoft, borderRadius: 14, backgroundColor: colors.surfaceMuted, padding: 12 },
  deliveryProgressHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  deliveryProgressText: { flex: 1, minWidth: 0 },
  deliveryLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '600' },
  deliveryValue: { color: colors.textStrong, fontWeight: '900', fontSize: 15, marginTop: 2 },
  deliveryHint: { color: colors.textMuted, fontSize: 12, marginTop: 1 },
  timelineWrap: { position: 'relative', marginTop: 18, paddingTop: 12, minHeight: 58 },
  timelineLineBg: { position: 'absolute', left: 16, right: 16, top: 25, height: 3, borderRadius: 999, backgroundColor: colors.borderSoft },
  timelineLineFill: { position: 'absolute', left: 16, top: 25, height: 3, borderRadius: 999, backgroundColor: '#2563eb' },
  timelineRow: { flexGrow: 1, gap: 8, paddingHorizontal: 0, justifyContent: 'space-around', minWidth: '100%' },
  stepWrap: { minWidth: 76, flex: 1, alignItems: 'center', zIndex: 1 },
  stepDot: { width: 34, height: 34, borderRadius: 999, borderWidth: 2, borderColor: colors.borderSoft, backgroundColor: colors.surfaceCard, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  stepDone: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
  stepNext: { borderColor: 'rgba(37,99,235,0.6)' },
  stepText: { color: colors.textMuted, fontSize: 11, fontWeight: '800', textAlign: 'center' },
  stepDoneText: { color: colors.green },
  panelActions: { gap: 10, marginTop: 12 },
  emptyCopy: { color: '#a7b0bf', marginTop: 8, marginBottom: 10 },

  toolbar: { borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.surfaceCard, borderRadius: 18, padding: 10, gap: 10, ...shadow.soft },
  searchBox: { backgroundColor: colors.surfaceMuted, borderRadius: 12, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, minHeight: 42 },
  searchInput: { flex: 1, color: '#f8fafc', marginLeft: 8 },
  filterRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  filterChip: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', backgroundColor: '#1a2532', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  filterChipActive: { backgroundColor: 'rgba(143,183,230,0.16)', borderColor: 'rgba(143,183,230,0.4)' },
  filterChipText: { color: '#9fb0c5', fontSize: 12, fontWeight: '700' },
  filterChipTextActive: { color: '#dce8f7' },

  card: { borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.surfaceCard, borderRadius: 12, padding: 10, marginBottom: 10, overflow: 'hidden', ...shadow.soft },
  cardHead: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', minWidth: 0 },
  routeCardIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: 'rgba(37,99,235,0.12)', borderWidth: 1, borderColor: 'rgba(37,99,235,0.22)', alignItems: 'center', justifyContent: 'center' },
  routeCardIconPending: { backgroundColor: 'rgba(217,119,6,0.14)', borderColor: 'rgba(217,119,6,0.28)' },
  routeCardIconDone: { backgroundColor: 'rgba(22,163,74,0.14)', borderColor: 'rgba(22,163,74,0.28)' },
  routeTitleBlock: { flex: 1, minWidth: 0 },
  cardDate: { color: colors.textStrong, fontWeight: '800', fontSize: 14, lineHeight: 17 },
  routeMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 3 },
  routeMetaText: { color: colors.textMuted, fontSize: 10 },
  metricsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 8 },
  routeMetricCard: { flexBasis: '48%', flexGrow: 1, backgroundColor: colors.surfaceMuted, borderRadius: 10, padding: 7, flexDirection: 'row', alignItems: 'center', gap: 9, minWidth: 0 },
  metricIconBox: { width: 28, height: 28, borderRadius: 9, backgroundColor: 'rgba(37,99,235,0.12)', alignItems: 'center', justifyContent: 'center' },
  metricIconFinal: { backgroundColor: 'rgba(71,85,105,0.13)' },
  metricIconTotal: { backgroundColor: 'rgba(147,51,234,0.12)' },
  metricTextBlock: { flex: 1, minWidth: 0 },
  metricLabel: { color: colors.textMuted, fontSize: 10 },
  metricValue: { color: colors.textStrong, fontWeight: '800', marginTop: 2, fontSize: 13 },
  detailsGrid: { flexDirection: 'row', gap: 6, marginTop: 0 },
  detailBox: { flex: 1, backgroundColor: colors.surfaceMuted, borderRadius: 10, padding: 7, flexDirection: 'row', alignItems: 'center', gap: 9, minWidth: 0 },
  detailIconBox: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  detailCity: { backgroundColor: 'rgba(217,119,6,0.12)' },
  detailInvoice: { backgroundColor: 'rgba(22,163,74,0.12)' },
  detailTextBlock: { flex: 1, minWidth: 0 },
  detailLabel: { color: colors.textMuted, fontSize: 10, marginBottom: 2 },
  detailValue: { color: colors.textMuted, lineHeight: 15, fontSize: 11 },
  photoStrip: { marginTop: 8, padding: 6, borderRadius: 12, backgroundColor: colors.surfaceMuted },
  photoThumb: { width: 48, height: 48, borderRadius: 8, marginRight: 6 },
  morePhotos: { width: 48, height: 48, borderRadius: 8, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  morePhotosText: { color: colors.primary, fontWeight: '900' },
  actionsRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.borderSoft },
  emptyList: { color: '#a7b0bf', textAlign: 'center', marginTop: 18 },

  actionBtn: { minHeight: 40, borderRadius: 10, paddingHorizontal: 12, backgroundColor: '#1a2532', borderWidth: 1, borderColor: 'rgba(143,183,230,0.22)', justifyContent: 'center', alignItems: 'center', flexGrow: 1, flexBasis: 0, flexDirection: 'row', gap: 8 },
  actionFull: { width: '100%', flexBasis: 'auto' },
  actionCompact: { flexGrow: 0, flexBasis: 'auto', paddingHorizontal: 12, minHeight: 38 },
  actionPrimary: { backgroundColor: '#2b5f97', borderColor: 'rgba(143,183,230,0.24)' },
  actionText: { color: '#d9e3ee', fontWeight: '700' },
  actionTextCompact: { fontSize: 12 },
  actionDisabled: { opacity: 0.45 },

  modalLabel: { color: '#a8b8cc', marginBottom: 4, fontWeight: '700' },
  modalInput: { backgroundColor: '#192331', borderRadius: 10, color: '#f8fafc', paddingHorizontal: 10, minHeight: 42 },
  deliveryModalSummary: { borderWidth: 1, borderColor: colors.borderSoft, borderRadius: 14, backgroundColor: colors.surfaceMuted, padding: 10, marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  deliveryModalSmall: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  deliveryModalValue: { color: colors.textStrong, fontWeight: '900', marginTop: 2 },
  nextDeliveryPill: { borderRadius: 999, backgroundColor: colors.surfaceCard, paddingHorizontal: 10, paddingVertical: 7, borderWidth: 1, borderColor: colors.borderSoft },
  nextDeliveryText: { color: colors.textStrong, fontSize: 12, fontWeight: '900' },
  correctionSummary: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  correctionSummaryItem: { flex: 1, borderWidth: 1, borderColor: colors.borderSoft, borderRadius: 14, backgroundColor: colors.surfaceMuted, padding: 10, minWidth: 0 },
  correctionSummaryLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  correctionSummaryValue: { color: colors.textStrong, fontWeight: '900', marginTop: 2 },
  correctionInfo: { flexDirection: 'row', gap: 10, borderWidth: 1, borderColor: 'rgba(217,119,6,0.28)', borderRadius: 14, backgroundColor: 'rgba(217,119,6,0.11)', padding: 12, marginBottom: 12 },
  correctionInfoText: { flex: 1, minWidth: 0 },
  correctionInfoTitle: { color: colors.orange, fontWeight: '900' },
  correctionInfoCopy: { color: colors.textStrong, marginTop: 3, lineHeight: 18, fontSize: 12 },
  correctionTextarea: { minHeight: 130, paddingTop: 10, paddingBottom: 10, lineHeight: 20 }
});
