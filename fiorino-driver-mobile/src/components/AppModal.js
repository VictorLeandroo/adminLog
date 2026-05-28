import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, shadow } from '../theme/fiorinoTheme';

export default function AppModal({ visible, title, subtitle, icon = 'lock-closed-outline', onClose, children }) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.overlay, { paddingTop: Math.max(insets.top + 12, 16), paddingBottom: Math.max(insets.bottom + 12, 16) }]}>
        <View style={styles.card}>
          <View style={styles.head}>
            <View style={styles.titleRow}>
              <View style={styles.iconBox}>
                <Ionicons name={icon} size={19} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.title}>{title}</Text>
                {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
              </View>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.close}>Fechar</Text>
            </TouchableOpacity>
          </View>
          {children}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(8,15,24,0.82)', justifyContent: 'center', paddingHorizontal: 16 },
  card: { backgroundColor: colors.surfaceCard, borderRadius: radius.card, borderWidth: 1, borderColor: colors.borderSoft, padding: 14, ...shadow.soft },
  head: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginBottom: 14, alignItems: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  iconBox: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.textStrong, fontSize: 18, fontWeight: '800' },
  subtitle: { color: colors.textMuted, marginTop: 3 },
  close: { color: colors.primary, fontWeight: '800' }
});
