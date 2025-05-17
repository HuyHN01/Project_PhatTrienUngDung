import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

export default function ReactionTest() {
  const [waiting, setWaiting] = useState(true);
  const [message, setMessage] = useState('Chuẩn bị...');
  const [startTime, setStartTime] = useState(0);
  const [reactionTime, setReactionTime] = useState<number | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const router = useRouter();
  useEffect(() => {
    if (waiting) {
      const delay = Math.random() * 3000 + 2000;
      setMessage('Chờ đợi...');
      timeoutRef.current = setTimeout(() => {
        setMessage('Bấm ngay!');
        setWaiting(false);
        setStartTime(Date.now());
      }, delay);
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [waiting]);

  const handlePress = () => {
    if (!waiting) {
      const time = Date.now() - startTime;
      setReactionTime(time);
      setMessage(`Thời gian phản xạ: ${time} ms`);
      setWaiting(true);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: waiting ? '#2D3748' : '#38A169' }]}
      onPress={handlePress}
      activeOpacity={1}
    >
      <Text style={styles.text}>{message}</Text>
      {reactionTime !== null && (
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => {
            setReactionTime(null);
            setWaiting(true);
            setMessage('Chuẩn bị...');
          }}
        >
          <Text style={styles.retryText}>Chơi lại</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/(tabs)/explore')}>
              <Text style={styles.backButtonText}>⬅️ Quay lại menu</Text>
            </TouchableOpacity>
    </TouchableOpacity>
    
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 28,
    color: '#fff',
  },
  retryButton: {
    marginTop: 30,
    backgroundColor: '#FF6F00',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 20,
  },
  retryText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
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
