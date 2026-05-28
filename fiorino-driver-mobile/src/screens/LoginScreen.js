import React, { useState } from 'react';
import { ActivityIndicator, Image, ImageBackground, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome6, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { colors, radius, shadow } from '../theme/fiorinoTheme';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin() {
    setLoading(true);
    setError('');
    try {
      await signIn(email.trim(), password);
    } catch (e) {
      setError(e?.response?.data?.message || e.message || 'Erro no login');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <LinearGradient colors={['rgba(225,236,252,0.96)', 'rgba(248,251,255,0.86)', 'rgba(215,228,249,0.9)']} style={styles.page}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: Math.max(insets.top + 10, 18), paddingBottom: Math.max(insets.bottom + 16, 20) }
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.loginShell}>
            <ImageBackground source={require('../assets/img/background-log.png')} resizeMode="cover" style={styles.brandPanel}>
              <LinearGradient colors={['rgba(233,242,255,0.92)', 'rgba(233,242,255,0.18)', 'rgba(226,238,251,0.28)']} style={styles.brandOverlay}>
                <View style={styles.brandTop}>
                  <View style={styles.logoBox}>
                    <Image source={require('../assets/img/logo.png')} style={styles.logoImage} resizeMode="contain" />
                  </View>
                  <View>
                    <Text style={styles.brandTitle}>Fiorino Tracker</Text>
                    <Text style={styles.brandSubtitle}>Operação, frota e financeiro</Text>
                  </View>
                </View>
              </LinearGradient>
            </ImageBackground>

            <View style={styles.loginSide}>
              <View style={styles.card}>
                <View style={styles.cardHead}>
                  <View style={styles.lockBadge}>
                    <Ionicons name="lock-closed" size={19} color={colors.loginPrimary} />
                  </View>
                  <View>
                    <Text style={styles.cardEyebrow}>Acesso seguro</Text>
                    <Text style={styles.cardTitle}>Entrar na conta</Text>
                  </View>
                </View>

                <Text style={styles.label}>E-mail</Text>
                <View style={styles.inputShell}>
                  <Ionicons name="mail" size={18} color="#6f7f9d" style={styles.inputIcon} />
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="seuemail@email.com"
                    placeholderTextColor="#6c7890"
                    style={styles.input}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                </View>

                <Text style={[styles.label, { marginTop: 10 }]}>Senha</Text>
                <View style={styles.inputShell}>
                  <Ionicons name="lock-closed" size={18} color="#6f7f9d" style={styles.inputIcon} />
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Digite sua senha"
                    placeholderTextColor="#6c7890"
                    style={styles.input}
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity onPress={() => setShowPassword((v) => !v)} style={styles.eyeButton}>
                    <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#697892" />
                  </TouchableOpacity>
                </View>

                <View style={styles.formOptions}>
                  <TouchableOpacity style={styles.rememberWrap} onPress={() => setRememberMe((v) => !v)}>
                    <View style={[styles.checkbox, rememberMe && styles.checkboxOn]}>
                      {rememberMe ? <Ionicons name="checkmark" size={13} color="#fff" /> : null}
                    </View>
                    <Text style={styles.rememberText}>Lembrar de mim</Text>
                  </TouchableOpacity>
                  <Text style={styles.forgot}>Esqueceu sua senha?</Text>
                </View>

                {!!error && (
                  <View style={styles.errorBox}>
                    <Ionicons name="alert-circle" size={16} color={colors.red} />
                    <Text style={styles.error}>{error}</Text>
                  </View>
                )}

                <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading || !email || !password}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Entrar</Text>}
                </TouchableOpacity>

              </View>
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

function Metric({ icon, value, label }) {
  return (
    <View style={styles.brandMetric}>
      <View style={styles.metricIcon}>{icon}</View>
      <View>
        <Text style={styles.metricValue}>{value}</Text>
        <Text style={styles.metricLabel}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  scrollContent: { paddingHorizontal: 14, justifyContent: 'center', flexGrow: 1 },
  loginShell: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.9)', borderRadius: 20, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.54)', ...shadow.loginShell },
  brandPanel: { minHeight: 100 },
  brandOverlay: { flex: 1, padding: 18, justifyContent: 'space-between' },
  brandTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoBox: { width: 58, height: 58, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.86)', alignItems: 'center', justifyContent: 'center', ...shadow.loginCard },
  logoImage: { width: 42, height: 42 },
  brandTitle: { color: colors.loginText, fontSize: 19, fontWeight: '800' },
  brandSubtitle: { color: colors.loginMuted, marginTop: 4, fontSize: 14 },
  heroCopy: { marginTop: 34 },
  eyebrow: { color: '#1d58e8', textTransform: 'uppercase', fontWeight: '900', fontSize: 12, letterSpacing: 0 },
  headline: { color: colors.loginText, fontSize: 34, lineHeight: 36, fontWeight: '900', marginTop: 14 },
  headlineAccent: { color: '#2f6df3' },
  copy: { color: colors.loginMuted, marginTop: 16, lineHeight: 22, fontSize: 16 },
  metricsBar: { padding: 14, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.78)', gap: 12, ...shadow.loginCard },
  brandMetric: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  metricIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#eef4ff', alignItems: 'center', justifyContent: 'center' },
  metricValue: { color: colors.loginText, fontSize: 20, lineHeight: 20, fontWeight: '900' },
  metricLabel: { color: colors.loginMuted, fontSize: 12, marginTop: 1 },
  loginSide: { padding: 22, backgroundColor: 'rgba(246,250,255,0.74)' },
  card: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.92)',
    borderRadius: radius.shell,
    backgroundColor: colors.loginCard,
    padding: 18,
    minHeight: 300,
    ...shadow.loginCard
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 22 },
  lockBadge: { width: 54, height: 54, borderRadius: 18, backgroundColor: '#eef4ff', alignItems: 'center', justifyContent: 'center' },
  cardEyebrow: { color: '#1d58e8', textTransform: 'uppercase', fontWeight: '900', fontSize: 12 },
  cardTitle: { color: colors.loginText, fontWeight: '900', fontSize: 21, marginTop: 5 },
  label: { color: '#172142', fontWeight: '600', marginBottom: 10 },
  inputShell: {
    minHeight: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.loginInputBorder,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15
  },
  inputIcon: { marginRight: 14 },
  input: { color: '#111d3c', flex: 1, minHeight: 48, fontWeight: '600', fontSize: 16 },
  eyeButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  formOptions: { marginTop: 16, marginBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 14 },
  rememberWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkbox: { width: 20, height: 20, borderRadius: 5, borderWidth: 1, borderColor: '#b7c2d3', alignItems: 'center', justifyContent: 'center' },
  checkboxOn: { backgroundColor: '#2e69ec', borderColor: '#2e69ec' },
  rememberText: { color: '#172142', fontSize: 14, fontWeight: '600' },
  forgot: { color: '#1556f0', fontWeight: '700', fontSize: 14 },
  errorBox: {
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.24)',
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderRadius: 14,
    padding: 10,
    marginBottom: 12,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start'
  },
  button: {
    minHeight: 50,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#174ed7',
    shadowColor: '#235de4',
    shadowOpacity: 0.28,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6
  },
  buttonText: { color: '#fff', fontWeight: '800' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 16, marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.loginDivider },
  dividerText: { color: colors.loginMuted, fontWeight: '800' },
  verificationButton: { minHeight: 50, borderRadius: 10, borderWidth: 1, borderColor: '#b9cff8', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 12 },
  verificationText: { color: '#164fcb', fontWeight: '800' },
  error: { color: colors.red, flex: 1 }
});
