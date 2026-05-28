import React from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/fiorinoTheme';

export default function PhotoPickerField({ photos, onChange }) {
  async function pickFromGallery() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permissão necessária', 'Libere acesso à galeria para enviar fotos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.75
    });
    if (result.canceled) return;
    addAsset(result.assets[0]);
  }

  async function takePhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permissão necessária', 'Libere acesso à câmera para registrar a entrega.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.75
    });
    if (result.canceled) return;
    addAsset(result.assets[0]);
  }

  function addAsset(asset) {
    onChange([...(photos || []), { uri: asset.uri, name: asset.fileName || `foto-${Date.now()}.jpg` }]);
  }

  function removePhoto(indexToRemove) {
    onChange((photos || []).filter((_, index) => index !== indexToRemove));
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.actions}>
        <TouchableOpacity style={[styles.button, styles.primaryButton]} onPress={takePhoto}>
          <Ionicons name="camera" size={16} color="#fff" />
          <Text style={[styles.buttonText, styles.primaryText]}>Câmera</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={pickFromGallery}>
          <Ionicons name="images-outline" size={16} color="#d9e3ee" />
          <Text style={styles.buttonText}>Galeria</Text>
        </TouchableOpacity>
      </View>

      {(photos || []).length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.previewRow}>
          {(photos || []).map((photo, index) => (
            <View key={`${photo.uri}-${index}`} style={styles.previewItem}>
              <Image source={{ uri: photo.uri }} style={styles.image} />
              <TouchableOpacity style={styles.removeBtn} onPress={() => removePhoto(index)}>
                <Ionicons name="close" size={13} color="#fff" />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      ) : (
        <View style={styles.emptyBox}>
          <Ionicons name="image-outline" size={20} color={colors.textMuted} />
          <Text style={styles.emptyText}>Nenhuma foto selecionada</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 9 },
  actions: { flexDirection: 'row', gap: 8 },
  button: { flex: 1, minHeight: 40, backgroundColor: '#1c2836', borderWidth: 1, borderColor: 'rgba(143,183,230,0.22)', borderRadius: 10, paddingVertical: 10, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7 },
  primaryButton: { backgroundColor: '#2b5f97', borderColor: 'rgba(143,183,230,0.24)' },
  buttonText: { color: '#d9e3ee', fontWeight: '800' },
  primaryText: { color: '#fff' },
  previewRow: { gap: 8, paddingVertical: 1 },
  previewItem: { position: 'relative' },
  image: { width: 66, height: 66, borderRadius: 8 },
  removeBtn: { position: 'absolute', top: -5, right: -5, width: 22, height: 22, borderRadius: 999, backgroundColor: 'rgba(239,68,68,0.92)', alignItems: 'center', justifyContent: 'center' },
  emptyBox: { minHeight: 66, borderWidth: 1, borderColor: colors.borderSoft, borderRadius: 12, borderStyle: 'dashed', backgroundColor: 'rgba(25,35,49,0.48)', alignItems: 'center', justifyContent: 'center', gap: 5 },
  emptyText: { color: colors.textMuted, fontSize: 12, fontWeight: '700' }
});
