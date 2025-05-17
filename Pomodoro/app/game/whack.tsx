import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router'; // <- thêm router

const TOTAL_HOLES = 9;
const GAME_DURATION = 30; // giây
const MOLE_APPEAR_INTERVAL = 800; // ms

export default function WhackMoleGame() {
  const [moleIndex, setMoleIndex] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [isRunning, setIsRunning] = useState(false);
  const router = useRouter(); // <- thêm router

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (isRunning && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(t => t - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsRunning(false);
      setMoleIndex(null);
    }
    return () => clearInterval(timer);
  }, [isRunning, timeLeft]);

  useEffect(() => {
    let moleTimer: ReturnType<typeof setInterval>;
    if (isRunning) {
      moleTimer = setInterval(() => {
        setMoleIndex(Math.floor(Math.random() * TOTAL_HOLES));
      }, MOLE_APPEAR_INTERVAL);
    }
    return () => clearInterval(moleTimer);
  }, [isRunning]);

  const handleHit = (index: number) => {
    if (index === moleIndex) {
      setScore(score + 1);
      setMoleIndex(null); // chuột biến mất
    }
  };

  const startGame = () => {
    setScore(0);
    setTimeLeft(GAME_DURATION);
    setIsRunning(true);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🐹 Game Đập Chuột</Text>
      <Text style={styles.info}>⏱ {timeLeft}s | 🧮 {score} điểm</Text>

      <View style={styles.grid}>
        {Array.from({ length: TOTAL_HOLES }).map((_, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.hole, moleIndex === index && styles.mole]}
            onPress={() => handleHit(index)}
            disabled={!isRunning}
          >
            {moleIndex === index && <Text style={styles.moleText}>👊</Text>}
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.startButton} onPress={startGame}>
        <Text style={styles.startText}>{isRunning ? 'Đang chơi...' : 'Bắt đầu lại'}</Text>
      </TouchableOpacity>

      {/* Nút quay lại menu */}
      <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/(tabs)/explore')}>
        <Text style={styles.backButtonText}>⬅️ Quay lại menu</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#171923',
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 26,
    color: '#fff',
    marginBottom: 20,
  },
  info: {
    fontSize: 16,
    color: '#ccc',
    marginBottom: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 240,
    justifyContent: 'center',
    marginBottom: 30,
  },
  hole: {
    width: 70,
    height: 70,
    backgroundColor: '#4A5568',
    margin: 5,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mole: {
    backgroundColor: '#FF6F00',
  },
  moleText: {
    fontSize: 28,
  },
  startButton: {
    backgroundColor: '#38A169',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    marginBottom: 15,
  },
  startText: {
    color: '#fff',
    fontSize: 18,
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
