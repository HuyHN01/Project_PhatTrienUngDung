import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
export default function TapCounterGame() {
  const [count, setCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(10);
  const [running, setRunning] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let timer: number;
    if (running && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
    } else if (timeLeft === 0) {
      setRunning(false);
    }
    return () => clearInterval(timer);
  }, [running, timeLeft]);

  const startGame = () => {
    setCount(0);
    setTimeLeft(10);
    setRunning(true);
  };

  const handleTap = () => {
    if (running) setCount(c => c + 1);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bấm nhanh trong 10 giây</Text>
      <Text style={styles.timer}>Thời gian: {timeLeft}s</Text>
      <Text style={styles.score}>Số lần bấm: {count}</Text>

      <TouchableOpacity
        style={[styles.button, running ? styles.activeButton : styles.startButton]}
        onPress={running ? handleTap : startGame}
      >
        <Text style={styles.buttonText}>{running ? 'Bấm!' : 'Bắt đầu'}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/(tabs)/explore')}>
              <Text style={styles.backButtonText}>⬅️ Quay lại menu</Text>
            </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#171923', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 26, color: '#fff', marginBottom: 20 },
  timer: { fontSize: 22, color: '#ccc', marginBottom: 10 },
  score: { fontSize: 28, color: '#FF6F00', marginBottom: 40 },
  button: {
    paddingVertical: 15,
    paddingHorizontal: 60,
    borderRadius: 30,
  },
  startButton: {
    backgroundColor: '#38A169',
  },
  activeButton: {
    backgroundColor: '#FF6F00',
  },
  buttonText: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
  },
    backButton: {
    backgroundColor: '#4A5568',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
  },
});
