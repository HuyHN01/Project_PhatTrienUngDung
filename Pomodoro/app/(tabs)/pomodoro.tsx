// app/(tabs)/pomodoro.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, ImageBackground, Alert } from 'react-native';
import * as ReactNative from 'react-native'; // Sử dụng namespace import cho AppState
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
// KIỂM TRA LẠI DÒNG IMPORT NÀY: Có thể bạn muốn dùng 'expo-av'
import { Audio } from 'expo-av'; // GIẢ SỬ SỬA THÀNH 'expo-av'
import { db } from '../../firebaseConfig'; // Đảm bảo đường dẫn này đúng
import { ref, update, increment } from 'firebase/database';
import { styles } from './pomodoro.styles';

const POMODORO_DURATION_DEFAULT = 25 * 60; // 25 phút
const SHORT_BREAK_DURATION_DEFAULT = 5 * 60; // 5 phút
const LONG_BREAK_DURATION_DEFAULT = 15 * 60; // 15 phút

type TimerMode = 'pomodoro' | 'shortBreak' | 'longBreak';

const backgroundImageUri = 'https://images.unsplash.com/photo-1472552944129-b035e9ea3744';

type AppStateStatus = ReactNative.AppStateStatus;

export default function PomodoroScreen() {
  const params = useLocalSearchParams<{ taskId?: string; taskTitle?: string }>();
  const router = useRouter();

  const [timeLeft, setTimeLeft] = useState(POMODORO_DURATION_DEFAULT);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<TimerMode>('pomodoro');
  const [pomodoroCount, setPomodoroCount] = useState(0);

  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [currentTaskTitle, setCurrentTaskTitle] = useState<string | null>('Tập trung');

  const intervalRef = useRef<number | null>(null);
  const appState = useRef(ReactNative.AppState.currentState);
  const backgroundTimeRef = useRef<number | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  // --- Tải và giải phóng âm thanh ---
  useEffect(() => {
    let isMounted = true;
    const loadSound = async () => {
      try {
        const { sound } = await Audio.Sound.createAsync(
           require('@/assets/sounds/timer_finish.mp3') // Đảm bảo file này tồn tại
        );
        if (isMounted) {
          soundRef.current = sound;
        } else {
          await sound.unloadAsync();
        }
      } catch (error) {
        console.error("Không thể tải âm thanh: ", error);
        Alert.alert("Lỗi âm thanh", "Không thể tải tệp âm thanh cho thông báo.");
      }
    };
    loadSound();
    return () => {
      isMounted = false;
      soundRef.current?.unloadAsync();
    };
  }, []);

  const playSound = useCallback(async () => {
    try {
      await soundRef.current?.stopAsync();
      await soundRef.current?.playAsync();
    } catch (error) {
      console.error("Không thể phát âm thanh: ", error);
    }
  }, []);

  // --- Hàm reset timer ---
  const resetTimer = useCallback((newModeParam?: TimerMode, duration?: number) => {
  if (intervalRef.current) {
    clearInterval(intervalRef.current);
    intervalRef.current = null;
  }
  // Chỉ set isActive về false nếu nó đang true, để tránh xung đột không cần thiết
  setIsActive(currentIsActive => {
    if (currentIsActive) {
      console.log('[resetTimer] Setting isActive to false.');
      return false;
    }
    return false; // Hoặc return currentIsActive nếu bạn không muốn thay đổi nếu nó đã là false
  });

  const targetMode = newModeParam || 'pomodoro';
  setMode(targetMode);

  // ... (phần còn lại)
}, []); // Thêm setIsActive, setMode, setTimeLeft vào dependencies nếu ESLint yêu cầu, dù chúng ổn định

  // --- Xử lý params từ navigation ---
  useEffect(() => {
  if (params.taskId) {
    setCurrentTaskId(params.taskId);
    setCurrentTaskTitle(params.taskTitle || 'Nhiệm vụ được chọn');

    if (timeLeft === POMODORO_DURATION_DEFAULT && !isActive) {
      resetTimer('pomodoro', POMODORO_DURATION_DEFAULT);
    }
  } else {
    setCurrentTaskTitle('Tập trung');
    if (timeLeft === POMODORO_DURATION_DEFAULT && !isActive) {
      resetTimer('pomodoro', POMODORO_DURATION_DEFAULT);
    }
  }
}, [params, resetTimer, timeLeft, isActive]);


  // --- Xử lý AppState (active/background) ---
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        if (backgroundTimeRef.current && isActive) {
          const timePassedInBackground = Math.floor((Date.now() - backgroundTimeRef.current) / 1000);
          setTimeLeft(prevTime => Math.max(0, prevTime - timePassedInBackground));
        }
        backgroundTimeRef.current = null;
      } else if (appState.current === 'active' && nextAppState.match(/inactive|background/)) {
        if (isActive) {
          backgroundTimeRef.current = Date.now();
        }
      }
      appState.current = nextAppState;
    };
    const subscription = ReactNative.AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, [isActive]);

  // --- Hàm xử lý khi timer kết thúc ---
  const handleTimerEnd = useCallback(async () => {
    setIsActive(false); // Dừng timer

    playSound();

    let nextMode: TimerMode = 'pomodoro';
    let nextDuration = POMODORO_DURATION_DEFAULT;

    if (mode === 'pomodoro') {
      const newPomodoroCount = pomodoroCount + 1;
      setPomodoroCount(newPomodoroCount);
      if (currentTaskId) {
        const taskRef = ref(db, `tasks/${currentTaskId}`);
        try {
          await update(taskRef, {
            timeSpent: increment(POMODORO_DURATION_DEFAULT / 60),
            completedPomodoros: increment(1)
          });
        } catch (error) {
          console.error("Lỗi cập nhật công việc trên Firebase: ", error);
        }
      }
      nextMode = (newPomodoroCount % 4 === 0) ? 'longBreak' : 'shortBreak';
      nextDuration = (nextMode === 'longBreak') ? LONG_BREAK_DURATION_DEFAULT : SHORT_BREAK_DURATION_DEFAULT;
    } else { // Kết thúc break
      nextMode = 'pomodoro';
      nextDuration = POMODORO_DURATION_DEFAULT;
    }

    setMode(nextMode);
    setTimeLeft(nextDuration);
  }, [mode, pomodoroCount, currentTaskId, playSound]); // Dependencies của handleTimerEnd

  // --- Logic chính của Timer: Tạo và hủy interval ---
  useEffect(() => {
  if (isActive && timeLeft > 0) {
    const intervalId = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) return 0;
        return prev - 1;
      });
    }, 1000);
    intervalRef.current = intervalId as unknown as number;
  }

  return () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };
}, [isActive, timeLeft]); // ✅ thêm timeLeft


  // --- Xử lý khi timeLeft thực sự đạt 0 (và timer đang active) ---
 useEffect(() => {
  if (timeLeft === 0 && isActive) {
    handleTimerEnd();
  }
}, [timeLeft, isActive, handleTimerEnd]);


  // --- Hàm bật/tắt timer ---
const toggleTimer = () => {
  const initialDuration = getInitialTimeForMode(mode);
  if (timeLeft === 0 || timeLeft === initialDuration) {
    setTimeLeft(initialDuration);
    setIsActive(true);
  } else {
    setIsActive(prev => !prev);
  }
};
  // --- Các hàm tiện ích hiển thị ---
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes < 10 ? '0' : ''}${minutes}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const getModeUserFriendlyText = () => {
    switch(mode) {
      case 'pomodoro': return currentTaskTitle && currentTaskTitle !== 'Tập trung' ? `Tập trung: ${currentTaskTitle}` : 'Thời gian tập trung';
      case 'shortBreak': return 'Nghỉ ngắn';
      case 'longBreak': return 'Nghỉ dài';
      default: return 'Pomodoro';
    }
  };

  const getInitialTimeForMode = (currentMode: TimerMode) => {
    if (currentMode === 'pomodoro') return POMODORO_DURATION_DEFAULT;
    if (currentMode === 'shortBreak') return SHORT_BREAK_DURATION_DEFAULT;
    return LONG_BREAK_DURATION_DEFAULT;
  };

  // --- JSX ---
  return (
    <ImageBackground
      source={{ uri: backgroundImageUri }}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('../(tabs)/index')}>
            <Ionicons name="chevron-back" size={32} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerText} numberOfLines={1} ellipsizeMode="tail">
            {isActive ? getModeUserFriendlyText() : (timeLeft === getInitialTimeForMode(mode) ? getModeUserFriendlyText() : `Tiếp tục: ${getModeUserFriendlyText()}` )}
          </Text>
          <View style={{width: 32}} />
        </View>

        <View style={styles.timerDisplayContainer}>
          <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
        </View>

        <TouchableOpacity style={styles.mainActionButton} onPress={toggleTimer}>
          <Ionicons name={isActive ? "pause" : "play"} size={32} color="#1C1C2E" style={{marginRight: 10}} />
          <Text style={styles.mainActionButtonText}>
            {isActive ? 'Tạm dừng' : (timeLeft === 0 ? 'Bắt đầu' : (timeLeft === getInitialTimeForMode(mode) ? (mode === 'pomodoro' ? 'Bắt đầu Tập trung' : 'Bắt đầu Nghỉ') : 'Tiếp tục'))}
          </Text>
        </TouchableOpacity>

        <View style={styles.modeSelectorContainer}>
          <TouchableOpacity
              style={[styles.modeButton, mode === 'pomodoro' && styles.activeMode]}
              onPress={() => resetTimer('pomodoro')}>
              <Text style={[styles.modeButtonText, mode === 'pomodoro' && styles.activeModeText]}>Tập trung</Text>
          </TouchableOpacity>
          <TouchableOpacity
              style={[styles.modeButton, mode === 'shortBreak' && styles.activeMode]}
              onPress={() => resetTimer('shortBreak')}>
              <Text style={[styles.modeButtonText, mode === 'shortBreak' && styles.activeModeText]}>Nghỉ ngắn</Text>
          </TouchableOpacity>
          <TouchableOpacity
              style={[styles.modeButton, mode === 'longBreak' && styles.activeMode]}
              onPress={() => resetTimer('longBreak')}>
              <Text style={[styles.modeButtonText, mode === 'longBreak' && styles.activeModeText]}>Nghỉ dài</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomActionToolbar}>
          <TouchableOpacity style={styles.toolbarActionButton}>
            <Ionicons name="shield-checkmark-outline" size={24} color="white" />
            <Text style={styles.toolbarActionText}>Nghiêm ngặt</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolbarActionButton}>
            <Ionicons name="hourglass-outline" size={24} color="white" />
            <Text style={styles.toolbarActionText}>Hẹn giờ</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolbarActionButton}>
            <Ionicons name="scan-outline" size={24} color="white" />
            <Text style={styles.toolbarActionText}>Toàn màn hình</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolbarActionButton}>
            <Ionicons name="musical-notes-outline" size={24} color="white" />
            <Text style={styles.toolbarActionText}>Tiếng động</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ImageBackground>
  );
}
