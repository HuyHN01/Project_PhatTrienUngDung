import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';

function generateSequence(length: number): number[] {
  const arr = [];
  for (let i = 0; i < length; i++) {
    arr.push(Math.floor(Math.random() * 9) + 1);
  }
  return arr;
}

export default function MemoryGame() {
  const [sequence, setSequence] = useState<number[]>([]);
  const [userInput, setUserInput] = useState<number[]>([]);
  const [showSequence, setShowSequence] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const seq = generateSequence(5);
    setSequence(seq);
    setUserInput([]);
    setShowSequence(true);
    setCurrentIndex(0);

    const timer = setTimeout(() => setShowSequence(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  const handlePress = (num: number) => {
    if (showSequence) return; // không cho bấm khi đang xem sequence

    const expected = sequence[currentIndex];
    if (num === expected) {
      setUserInput([...userInput, num]);
      setCurrentIndex(currentIndex + 1);
      if (currentIndex + 1 === sequence.length) {
        Alert.alert('Chúc mừng!', 'Bạn đã nhớ đúng toàn bộ dãy số!');
        resetGame();
      }
    } else {
      Alert.alert('Sai rồi!', 'Bạn đã bấm sai số.');
      resetGame();
    }
  };

  const resetGame = () => {
    const seq = generateSequence(5);
    setSequence(seq);
    setUserInput([]);
    setShowSequence(true);
    setCurrentIndex(0);
    setTimeout(() => setShowSequence(false), 3000);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🎲 Game Nhớ Dãy Số</Text>
      {showSequence ? (
        <Text style={styles.sequence}>{sequence.join(' - ')}</Text>
      ) : (
        <Text style={styles.instruction}>Bấm số theo đúng thứ tự</Text>
      )}

      <View style={styles.buttonsContainer}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
          <TouchableOpacity key={num} style={styles.button} onPress={() => handlePress(num)}>
            <Text style={styles.buttonText}>{num}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/(tabs)/explore')}>
        <Text style={styles.backButtonText}>⬅️ Quay lại menu</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#171923', padding: 20, alignItems: 'center' },
  title: { fontSize: 26, color: '#fff', marginVertical: 20 },
  sequence: { fontSize: 28, color: '#FF6F00', marginVertical: 20 },
  instruction: { fontSize: 22, color: '#ccc', marginVertical: 20 },
  buttonsContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  button: {
    width: 60,
    height: 60,
    backgroundColor: '#4A5568',
    margin: 6,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: { fontSize: 22, color: '#fff' },
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
