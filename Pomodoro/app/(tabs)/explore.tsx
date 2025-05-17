import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

export default function GameMenuScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🎮 Chọn Trò Chơi</Text>

      <TouchableOpacity style={styles.button} onPress={() => router.push('/game/whack')}>
        <Text style={styles.buttonText}>🐹 Đập Chuột</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={() => router.push('/game/timing')}>
        <Text style={styles.buttonText}>⏱ Bấm Đúng Thời Điểm</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={() => router.push('/game/reaction')}>
        <Text style={styles.buttonText}>⚡ Đo Phản Xạ</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={() => router.push('/game/tapcount')}>
        <Text style={styles.buttonText}>👆 Bấm Nhanh</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={() => router.push('/game/memory')}>
        <Text style={styles.buttonText}>🎲 Nhớ Dãy Số</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A202C',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 26,
    color: '#fff',
    marginBottom: 40,
  },
  button: {
    backgroundColor: '#FF6F00',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 15,
    marginBottom: 20,
    width: '80%',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 18,
    color: '#fff',
  },
});
