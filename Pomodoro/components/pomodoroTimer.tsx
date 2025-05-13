import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Giá trị mặc định
const defaultFocusMinutes = 25;
const defaultBreakMinutes = 5;

export default function App() {
  const [focusMinutes, setFocusMinutes] = useState(defaultFocusMinutes);
  const [breakMinutes, setBreakMinutes] = useState(defaultBreakMinutes);
  const [timerCount, setTimerCount] = useState<number>(focusMinutes * 60 * 1000);
  const [mode, setMode] = useState<"Focus Time" | "Break Time">("Focus Time");
  const [timerRunning, setTimerRunning] = useState<boolean>(false);
  const timerInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = () => {
    if (!timerRunning) {
      const id = setInterval(() => {
        setTimerCount(prev => prev - 1000);
      }, 1000);
      timerInterval.current = id;
      setTimerRunning(true);
    }
  };

  const stopTimer = () => {
    if (timerInterval.current !== null) {
      clearInterval(timerInterval.current);
      timerInterval.current = null;
    }
    setTimerRunning(false);
  };

  const switchMode = () => {
    stopTimer();
    if (mode === "Focus Time") {
      setMode("Break Time");
      setTimerCount(breakMinutes * 60 * 1000);
    } else {
      setMode("Focus Time");
      setTimerCount(focusMinutes * 60 * 1000);
    }
  };

  const skipToFocus = () => {
    stopTimer();
    setMode("Focus Time");
    setTimerCount(focusMinutes * 60 * 1000);
  };

  // Tự động chuyển mode và start lại khi timerCount = 0
  useEffect(() => {
    if (timerCount === 0) {
      switchMode();
    }
  }, [timerCount]);

  // Khi mode thay đổi, tự động start lại
  useEffect(() => {
    startTimer();
  }, [mode]);

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  };

  const adjustFocusMinutes = (delta: number) => {
    if (!timerRunning) {
      const newVal = Math.max(1, focusMinutes + delta);
      setFocusMinutes(newVal);
      if (mode === "Focus Time") setTimerCount(newVal * 60 * 1000);
    }
  };

  const adjustBreakMinutes = (delta: number) => {
    if (!timerRunning) {
      const newVal = Math.max(1, breakMinutes + delta);
      setBreakMinutes(newVal);
      if (mode === "Break Time") setTimerCount(newVal * 60 * 1000);
    }
  };

  return (
    <View style={mode === "Focus Time" ? styles.focusMode : styles.relaxMode}>
      <StatusBar style="light" />
      <Text style={styles.title}>POMODORO TIMER</Text>
      <Text style={styles.timerText}>{formatTime(timerCount)}</Text>
      <Text style={styles.modeStyle}>{mode}</Text>

      <TouchableOpacity
        onPress={timerRunning ? stopTimer : startTimer}
        style={styles.startStopBtn}
      >
        <Text style={styles.btnText}>{timerRunning ? 'Stop' : 'Start'}</Text>
      </TouchableOpacity>

      {/* Nút "Skip to Focus" chỉ hiển thị khi đang ở Break Time */}
      {mode === "Break Time" && (
        <TouchableOpacity
          onPress={skipToFocus}
          style={styles.skipBtn}
        >
          <Text style={styles.btnText}>Skip to Focus</Text>
        </TouchableOpacity>
      )}

      {/* Tùy chỉnh thời gian */}
      <View style={styles.configContainer}>
        <Text style={styles.configText}>Focus: {focusMinutes} min</Text>
        <View style={styles.configButtons}>
          <TouchableOpacity onPress={() => adjustFocusMinutes(-1)} style={styles.adjustBtn}>
            <Text style={styles.btnText}>-</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => adjustFocusMinutes(1)} style={styles.adjustBtn}>
            <Text style={styles.btnText}>+</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.configText}>Break: {breakMinutes} min</Text>
        <View style={styles.configButtons}>
          <TouchableOpacity onPress={() => adjustBreakMinutes(-1)} style={styles.adjustBtn}>
            <Text style={styles.btnText}>-</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => adjustBreakMinutes(1)} style={styles.adjustBtn}>
            <Text style={styles.btnText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  focusMode: {
    flex: 1,
    backgroundColor: 'tomato',
    alignItems: 'center',
    justifyContent: 'center',
  },
  relaxMode: {
    flex: 1,
    backgroundColor: '#167D7F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#fff',
  },
  timerText: {
    fontSize: 60,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  modeStyle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 30,
  },
  startStopBtn: {
    backgroundColor: '#000',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  skipBtn: {
    backgroundColor: '#444',
    padding: 15,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#fff',
    marginBottom: 30,
  },
  btnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  configContainer: {
    alignItems: 'center',
  },
  configText: {
    fontSize: 18,
    color: '#fff',
    marginTop: 10,
  },
  configButtons: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  adjustBtn: {
    backgroundColor: '#333',
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 5,
    marginHorizontal: 5,
  },
});
