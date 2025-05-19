// app/settings/pomodoro-interface.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  ImageBackground,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const DEFAULT_POMODORO_BACKGROUND_URI = 'https://images.unsplash.com/photo-1472552944129-b035e9ea3744';

const PREDEFINED_BACKGROUNDS = [
  { id: 'default', name: 'Mặc định (Biển)', uri: DEFAULT_POMODORO_BACKGROUND_URI },
  { id: 'forest', name: 'Rừng cây', uri: 'https://images.unsplash.com/photo-1448375240586-882707db8886' },
  { id: 'mountain_snow', name: 'Núi tuyết', uri: 'https://images.unsplash.com/photo-1483728642387-6c3bdd6c93e5' },
  { id: 'desert', name: 'Sa mạc', uri: 'https://images.unsplash.com/photo-1473580044384-7ba9967e16a0' },
  { id: 'dark_lake', name: 'Hồ đêm', uri: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470' },
  { id: 'autumn_forest', name: 'Rừng thu', uri: 'https://images.unsplash.com/photo-1475924156734-496f6cac6ec1' },
  // Thêm các ảnh bạn muốn
];

export default function PomodoroInterfaceScreen() {
  const router = useRouter();
  const [selectedBackgroundUri, setSelectedBackgroundUri] = useState(DEFAULT_POMODORO_BACKGROUND_URI);

  useEffect(() => {
    const loadCurrentBackground = async () => {
      try {
        const storedUri = await AsyncStorage.getItem('pomodoroBackgroundUri');
        if (storedUri) {
          setSelectedBackgroundUri(storedUri);
        }
      } catch (e) {
        console.error("Lỗi tải hình nền đã lưu:", e);
      }
    };
    loadCurrentBackground();
  }, []);

  const handleSelectBackground = async (uri: string) => {
    try {
      await AsyncStorage.setItem('pomodoroBackgroundUri', uri);
      setSelectedBackgroundUri(uri);
      Alert.alert('Thành công', 'Đã cập nhật hình nền Pomodoro.');
      // Có thể thêm router.back() nếu muốn tự động quay lại sau khi chọn
    } catch (e) {
      Alert.alert('Lỗi', 'Không thể lưu lựa chọn hình nền.');
    }
  };

  const renderBackgroundItem = ({ item }: { item: typeof PREDEFINED_BACKGROUNDS[0] }) => (
    <TouchableOpacity
      style={[styles.itemContainer, selectedBackgroundUri === item.uri && styles.selectedItem]}
      onPress={() => handleSelectBackground(item.uri)}
    >
      <ImageBackground source={{ uri: item.uri }} style={styles.imageBackground} imageStyle={styles.imageStyle}>
        <View style={styles.itemOverlay}>
          {/* Ví dụ hiển thị timer giả */}
          <View style={styles.mockTimerCircle}>
            <Text style={styles.mockTimerText}>20:23</Text>
          </View>
          <View style={styles.mockButton} />
        </View>
        {selectedBackgroundUri === item.uri && (
          <View style={styles.checkmarkContainer}>
            <Ionicons name="checkmark-circle" size={30} color="#FF6F00" />
          </View>
        )}
      </ImageBackground>
      {/* <Text style={styles.itemName}>{item.name}</Text> // Tên ảnh nếu cần */}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={PREDEFINED_BACKGROUNDS}
        renderItem={renderBackgroundItem}
        keyExtractor={(item) => item.id}
        numColumns={2} // Hiển thị 2 cột
        contentContainerStyle={styles.listContentContainer}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  listContentContainer: {
    padding: 8,
  },
  itemContainer: {
    flex: 1,
    margin: 8,
    borderRadius: 12,
    overflow: 'hidden',
    aspectRatio: 0.6, // Tỉ lệ cho item (chiều rộng / chiều cao)
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedItem: {
    borderColor: '#FF6F00', // Màu viền khi được chọn
  },
  imageBackground: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageStyle: {
    borderRadius: 10, // Bo góc cho ảnh nền bên trong
  },
  itemOverlay: { // Để mô phỏng giao diện trong ảnh
    flex: 1,
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  mockTimerCircle: {
    width: '80%',
    aspectRatio: 1,
    borderRadius: 100, // Lớn để đảm bảo tròn
    borderWidth: 5,
    borderColor: 'rgba(255,255,255,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: '15%',
  },
  mockTimerText: {
    color: 'white',
    fontSize: 28, // Điều chỉnh cho phù hợp
    fontWeight: 'bold',
    opacity: 0.8,
  },
  mockButton: {
    width: '60%',
    height: '12%',
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 25,
    opacity: 0.8,
  },
  checkmarkContainer: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 15,
    padding: 2,
  },
  itemName: {
    color: '#fff',
    textAlign: 'center',
    marginTop: 5,
    fontSize: 12,
  },
});