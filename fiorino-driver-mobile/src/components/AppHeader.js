import React from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { FontAwesome6, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { colors, shadow } from '../theme/fiorinoTheme';

export default function AppHeader({ active = 'Rotas' }) {
  const { user, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const userName = user?.name || 'Usuario';
  const initials = userName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  const links = [
    { label: 'Inicio', icon: <FontAwesome6 name="chart-line" size={14} /> },
    { label: 'Rotas', icon: <FontAwesome6 name="route" size={14} /> },
    { label: 'Financeiro', icon: <FontAwesome6 name="wallet" size={14} /> },
    { label: 'Veiculo', icon: <FontAwesome6 name="van-shuttle" size={14} /> },
    { label: 'Perfil', icon: <FontAwesome6 name="user" size={14} /> },
  ];

  return (
    <View style={[styles.header, { paddingTop: insets.top }]}>
      <View style={styles.primary}>
        <View style={styles.brandMark}>
          <Image source={require('../assets/img/logo.png')} style={styles.logo} resizeMode="contain" />
          <View style={styles.brandCopy}>
            <Text style={styles.brandTitle}>Fiorino Tracker</Text>
            <Text style={styles.brandSub}>Operacao em campo</Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.iconAction}>
            <Ionicons name="moon" size={16} color={colors.textStrong} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.userInfo} onPress={signOut}>
            <View style={styles.userCopy}>
              <Text style={styles.userName} numberOfLines={1}>{userName}</Text>
              <Text style={styles.userRole}>Motorista</Text>
            </View>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials || 'U'}</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sub}>
        {links.map((link) => {
          const selected = link.label === active;
          return (
            <TouchableOpacity key={link.label} style={[styles.link, selected && styles.linkSelected]}>
              {React.cloneElement(link.icon, { color: selected ? colors.primary : colors.textMuted })}
              <Text style={[styles.linkText, selected && styles.linkTextSelected]}>{link.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.surfaceStrong,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
    ...shadow.soft,
  },
  primary: {
    minHeight: 58,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandMark: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minWidth: 0,
    flex: 1,
  },
  logo: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.surfaceMuted,
  },
  brandCopy: {
    minWidth: 0,
    display: 'none',
  },
  brandTitle: {
    color: colors.textStrong,
    fontWeight: '800',
    lineHeight: 17,
  },
  brandSub: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconAction: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 16,
    paddingLeft: 10,
    paddingRight: 5,
    paddingVertical: 4,
  },
  userCopy: {
    display: 'none',
  },
  userName: {
    color: colors.textStrong,
    fontWeight: '800',
    textAlign: 'right',
    maxWidth: 116,
  },
  userRole: {
    color: colors.textMuted,
    fontSize: 11,
    textAlign: 'right',
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    borderColor: colors.borderSoft,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.primary,
    fontWeight: '900',
    fontSize: 12,
  },
  sub: {
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingBottom: 10,
  },
  link: {
    height: 48,
    minWidth: 68,
    paddingHorizontal: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  linkSelected: {
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: 'rgba(143, 183, 230, 0.12)',
  },
  linkText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },
  linkTextSelected: {
    color: colors.primary,
  },
});
