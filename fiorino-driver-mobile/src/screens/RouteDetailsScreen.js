import React, { useMemo, useState } from 'react';
import { Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, shadow } from '../theme/fiorinoTheme';

export default function RouteDetailsScreen({ navigation, route }) {
  const data = route.params?.routeData;
  const [lightboxPhoto, setLightboxPhoto] = useState(null);
  const insets = useSafeAreaInsets();

  const summary = useMemo(() => {
    if (!data) return null;

    const kmFinal = data.kmFinal ? `${formatKm(data.kmFinal)}` : '-';
    const total = data.kmFinal ? `${Math.max(0, Number(data.kmFinal) - Number(data.kmInicial)).toLocaleString('pt-BR')} km` : '-';

    return [
      { label: 'Data', value: formatDateBR(data.data) },
      { label: 'Status', value: data.status },
      { label: 'Entregas', value: deliveryProgressLabel(data) },
      { label: 'KM', value: `${formatKm(data.kmInicial)} / ${kmFinal}` },
      { label: 'Total', value: total },
      { label: 'Motorista', value: data.driver || '-' }
    ];
  }, [data]);

  if (!data) return null;

  return (
    <View style={[styles.page, { paddingTop: Math.max(insets.top + 8, 10), paddingBottom: Math.max(insets.bottom + 8, 10) }]}>
      <View style={styles.sheet}>
        <View style={styles.modalHead}>
          <View style={styles.modalIcon}>
            <Ionicons name="list" size={20} color={colors.primary} />
          </View>
          <View style={styles.headText}>
            <Text style={styles.title}>Detalhes da rota</Text>
            <Text style={styles.subtitle}>Confira todas as fotos, cidades e notas registradas.</Text>
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={20} color={colors.textStrong} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.summaryGrid}>
            {summary.map(item => (
              <View key={item.label} style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>{item.label}</Text>
                <Text style={styles.summaryValue} numberOfLines={1}>{item.value}</Text>
              </View>
            ))}
          </View>

          <DetailSection
            icon={<Ionicons name="location" size={16} color={colors.primary} />}
            title="Cidades"
            count={data.cidades.length}
            empty="Nenhuma cidade cadastrada ainda."
          >
            <ChipList items={data.cidades} />
          </DetailSection>

          <DetailSection
            icon={<Ionicons name="clipboard-outline" size={16} color={colors.primary} />}
            title="Notas"
            count={data.notas.length}
            empty="Nenhuma nota cadastrada ainda."
          >
            <ChipList items={data.notas} />
          </DetailSection>

          <DetailSection
            icon={<Ionicons name="images-outline" size={16} color={colors.primary} />}
            title="Fotos"
            count={data.photos.length}
            empty="Nenhuma foto enviada ainda."
          >
            {data.photos.length ? (
              <View style={styles.photoGrid}>
                {data.photos.map((photo, index) => {
                  const uri = photo.url || photo.preview;
                  return (
                    <TouchableOpacity key={`${photo.id || uri}-${index}`} style={styles.photoCard} onPress={() => uri && setLightboxPhoto(uri)}>
                      <Image source={{ uri }} style={styles.photo} />
                      {photo.deliveryIndex ? (
                        <View style={styles.photoBadge}>
                          <Text style={styles.photoBadgeText}>Entrega {photo.deliveryIndex}</Text>
                        </View>
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : null}
          </DetailSection>
        </ScrollView>
      </View>

      <Modal visible={!!lightboxPhoto} transparent animationType="fade" onRequestClose={() => setLightboxPhoto(null)}>
        <View style={[styles.lightbox, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 }]}>
          <TouchableOpacity style={[styles.lightboxClose, { top: insets.top + 12 }]} onPress={() => setLightboxPhoto(null)}>
            <Ionicons name="close" size={22} color="#fff" />
          </TouchableOpacity>
          {lightboxPhoto ? <Image source={{ uri: lightboxPhoto }} style={styles.lightboxImage} resizeMode="contain" /> : null}
        </View>
      </Modal>
    </View>
  );
}

function DetailSection({ icon, title, count, empty, children }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionTitle}>
        <View style={styles.sectionIcon}>{icon}</View>
        <Text style={styles.sectionText}>{title}</Text>
        <View style={styles.countPill}>
          <Text style={styles.countText}>{count}</Text>
        </View>
      </View>
      {count ? children : <Text style={styles.emptyCopy}>{empty}</Text>}
    </View>
  );
}

function ChipList({ items }) {
  if (!items.length) return null;

  return (
    <View style={styles.chipList}>
      {items.map((item, index) => (
        <View key={`${item}-${index}`} style={styles.chip}>
          <Text style={styles.chipText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

function deliveryProgressLabel(route) {
  const count = (route.photos || []).filter(photo => photo.deliveredAt || photo.deliveryIndex).length || (route.photos || []).length;
  return route.plannedDeliveries ? `${count}/${route.plannedDeliveries}` : `${count} registradas`;
}

function formatKm(value) {
  return Number(value || 0).toLocaleString('pt-BR');
}

function formatDateBR(value) {
  if (!value) return '-';
  if (String(value).includes('/')) return value;
  const [year, month, day] = String(value).slice(0, 10).split('-');
  return day && month && year ? `${day}/${month}/${year}` : value;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.appBg, paddingHorizontal: 10, justifyContent: 'flex-end' },
  sheet: { flex: 1, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.surfaceCard, borderRadius: radius.pageCard, padding: 14, ...shadow.soft },
  modalHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  modalIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  headText: { flex: 1, minWidth: 0 },
  title: { color: colors.textStrong, fontSize: 18, fontWeight: '900' },
  subtitle: { color: colors.textMuted, fontSize: 12, lineHeight: 17, marginTop: 2 },
  closeBtn: { width: 38, height: 38, borderRadius: 13, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  content: { gap: 12, paddingBottom: 10 },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  summaryCard: { flexBasis: '48%', flexGrow: 1, borderWidth: 1, borderColor: colors.borderSoft, borderRadius: 14, backgroundColor: colors.surfaceMuted, padding: 10, minWidth: 0 },
  summaryLabel: { color: colors.textMuted, fontSize: 11 },
  summaryValue: { color: colors.textStrong, fontWeight: '900', marginTop: 3 },
  section: { borderWidth: 1, borderColor: colors.borderSoft, borderRadius: 14, backgroundColor: colors.surfaceMuted, padding: 12 },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionIcon: { width: 30, height: 30, borderRadius: 10, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  sectionText: { flex: 1, color: colors.textStrong, fontWeight: '900' },
  countPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: colors.surfaceCard },
  countText: { color: colors.textMuted, fontSize: 12, fontWeight: '900' },
  chipList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { maxWidth: '100%', borderWidth: 1, borderColor: colors.borderSoft, borderRadius: 999, backgroundColor: colors.surfaceCard, paddingHorizontal: 10, paddingVertical: 7 },
  chipText: { color: colors.textStrong, fontWeight: '700' },
  emptyCopy: { color: colors.textMuted, lineHeight: 19 },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  photoCard: { position: 'relative', width: '48%', aspectRatio: 1, borderWidth: 1, borderColor: colors.borderSoft, borderRadius: 12, backgroundColor: colors.surfaceCard, overflow: 'hidden' },
  photo: { width: '100%', height: '100%' },
  photoBadge: { position: 'absolute', left: 6, right: 6, bottom: 6, borderRadius: 8, paddingVertical: 4, paddingHorizontal: 6, backgroundColor: 'rgba(15, 23, 42, 0.78)' },
  photoBadgeText: { color: '#fff', fontSize: 11, fontWeight: '900', textAlign: 'center' },
  lightbox: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center', padding: 12 },
  lightboxClose: { position: 'absolute', top: 18, right: 18, zIndex: 2, width: 42, height: 42, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  lightboxImage: { width: '100%', height: '86%' }
});
