import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { useRouter } from 'expo-router'; 

export default function RelaxGameScreen() {
  const progress = useRef(new Animated.Value(0)).current;
  const [isRunning, setIsRunning] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [targetStart, setTargetStart] = useState(0.4);
  const [targetEnd, setTargetEnd] = useState(0.6);
  const router = useRouter(); 

  const startGame = () => {
    setScore(null);
    setIsRunning(true);
    progress.setValue(0);
    const randomStart = Math.random() * 0.5 + 0.2;
    setTargetStart(randomStart);
    setTargetEnd(randomStart + 0.1);

    Animated.timing(progress, {
      toValue: 1,
      duration: 2500,
      useNativeDriver: false,
    }).start(() => {
      setIsRunning(false);
    });
  };

  const stopGame = () => {
    progress.stopAnimation(value => {
      setIsRunning(false);
      const inTarget = value >= targetStart && value <= targetEnd;
      setScore(inTarget ? 100 : 0);
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🎯 Bấm đúng thời điểm!</Text>

      <View style={styles.progressBar}>
        <Animated.View
          style={[
            styles.progressFill,
            {
              width: progress.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
        <View
          style={[
            styles.targetZone,
            {
              left: `${targetStart * 100}%`,
              width: `${(targetEnd - targetStart) * 100}%`,
            },
          ]}
        />
      </View>

      {score !== null && (
        <Text style={styles.resultText}>
          {score === 100 ? '🎉 Tuyệt vời!' : '❌ Trượt rồi!'} Điểm: {score}
        </Text>
      )}

      <TouchableOpacity style={styles.button} onPress={isRunning ? stopGame : startGame}>
        <Text style={styles.buttonText}>{isRunning ? 'Dừng lại' : 'Bắt đầu'}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/(tabs)/explore')}>
        <Text style={styles.backButtonText}>⬅️ Quay lại menu</Text>
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
    fontSize: 24,
    color: '#fff',
    marginBottom: 40,
  },
  progressBar: {
    height: 30,
    width: '100%',
    backgroundColor: '#4A5568',
    borderRadius: 15,
    overflow: 'hidden',
    marginBottom: 30,
    position: 'relative',
  },
  progressFill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: '#FF6F00',
  },
  targetZone: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: '#38A169AA',
  },
  resultText: {
    fontSize: 20,
    color: '#fff',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#FF6F00',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 30,
    marginBottom: 15,
  },
  buttonText: {
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
