// app/(tabs)/pomodoro.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, ImageBackground, Alert } from 'react-native';
import * as ReactNative from 'react-native'; // Sử dụng namespace import cho AppState
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Audio } from 'expo-av';
import { db } from '../../firebaseConfig'; // Đảm bảo đường dẫn này đúng
import { ref, update, increment } from 'firebase/database';
import { styles } from './pomodoro.styles';
import { useAuth } from '../../context/AuthContext';

// Thời lượng mặc định (tính bằng giây)
const POMODORO_MODE_DURATION_DEFAULT_SECONDS = 25 * 60;
const SHORT_BREAK_DURATION_SECONDS = 5 * 60; // Đã là _SECONDS
const LONG_BREAK_DURATION_SECONDS = 15 * 60;

type TimerMode = 'pomodoro' | 'shortBreak' | 'longBreak';

const backgroundImageUri = 'https://images.unsplash.com/photo-1472552944129-b035e9ea3744';

type AppStateStatus = ReactNative.AppStateStatus;

export default function PomodoroScreen() {
  const { user } = useAuth();
  const params = useLocalSearchParams<{ taskId?: string; taskTitle?: string; taskPomodoroDuration?: string }>(); // <--- THÊM taskPomodoroDuration
  const router = useRouter();

  const initialTaskPomodoroDurationSecondsRef = useRef<number>(
    params.taskPomodoroDuration
      ? parseInt(params.taskPomodoroDuration, 10) * 60 // Chuyển phút sang giây
      : POMODORO_MODE_DURATION_DEFAULT_SECONDS
  );

  const [timeLeft, setTimeLeft] = useState(initialTaskPomodoroDurationSecondsRef.current);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<TimerMode>('pomodoro');
  const [pomodoroCount, setPomodoroCount] = useState(0);

  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [currentTaskTitle, setCurrentTaskTitle] = useState<string | null>('Tập trung');

  // Đổi kiểu của intervalRef thành number | null
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
           require('@/assets/sounds/timer_finish.mp3')
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
      await soundRef.current?.replayAsync();
    } catch (error) {
      console.error("Không thể phát âm thanh: ", error);
    }
  }, []);

  const getInitialTimeForMode = useCallback((currentMode: TimerMode) => {
  if (currentMode === 'pomodoro') {
    return initialTaskPomodoroDurationSecondsRef.current; // Lấy từ ref
  }
  if (currentMode === 'shortBreak') return SHORT_BREAK_DURATION_SECONDS; // Đảm bảo hằng số này cũng là giây
  if (currentMode === 'longBreak') return LONG_BREAK_DURATION_SECONDS; // Đảm bảo hằng số này cũng là giây
  return initialTaskPomodoroDurationSecondsRef.current;
}, []);

  useEffect(() => {
    const newDurationSeconds = params.taskPomodoroDuration
      ? parseInt(params.taskPomodoroDuration, 10) * 60
      : POMODORO_MODE_DURATION_DEFAULT_SECONDS;

    initialTaskPomodoroDurationSecondsRef.current = newDurationSeconds; // Cập nhật ref

    setCurrentTaskId(params.taskId || null);
    setCurrentTaskTitle(params.taskTitle || 'Tập trung');

    // Chỉ reset timeLeft nếu đang ở chế độ pomodoro và timer không active hoặc đã thay đổi duration
    if (mode === 'pomodoro' && (!isActive || timeLeft !== newDurationSeconds)) {
      setTimeLeft(newDurationSeconds);
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      setIsActive(false); // Đảm bảo timer dừng khi chuyển task
    }
  }, [params.taskId, params.taskTitle, params.taskPomodoroDuration]);


  const resetTimer = useCallback((newModeParam?: TimerMode) => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsActive(false); // Luôn dừng timer khi reset

    const targetMode = newModeParam || mode; // Nếu không truyền mode mới, giữ mode hiện tại
    setMode(targetMode);
    setTimeLeft(getInitialTimeForMode(targetMode)); // QUAN TRỌNG: Đặt thời gian dựa trên mode mới
  }, [mode, getInitialTimeForMode]);


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

  const handleTimerEnd = useCallback(async () => {
    setIsActive(false);
    playSound();

    let nextMode: TimerMode = 'pomodoro';
    let nextDuration = getInitialTimeForMode('pomodoro'); // Lấy thời lượng cho pomodoro tiếp theo

    if (mode === 'pomodoro') {
      const newPomodoroCount = pomodoroCount + 1;
      setPomodoroCount(newPomodoroCount);

      if (currentTaskId && user) {
        const taskRefDb = ref(db, `users/<span class="math-inline">\{user\.uid\}/tasks/</span>{currentTaskId}`);
        try {
          // Cộng thời gian đã bỏ ra bằng thời lượng của phiên pomodoro VỪA KẾT THÚC
          const pomodoroJustCompletedDurationMinutes = getInitialTimeForMode('pomodoro') / 60; // Thời gian này là của phiên vừa xong
          await update(taskRefDb, {
            timeSpent: increment(pomodoroJustCompletedDurationMinutes),
            completedPomodoros: increment(1)
          });
        } catch (error) {
          console.error("Lỗi cập nhật công việc trên Firebase: ", error);
        }
      }
      nextMode = (newPomodoroCount % 4 === 0) ? 'longBreak' : 'shortBreak';
      nextDuration = getInitialTimeForMode(nextMode);
    } else { // Kết thúc break
      nextMode = 'pomodoro';
      // nextDuration đã được đặt ở trên là getInitialTimeForMode('pomodoro')
    }

    setMode(nextMode);
    setTimeLeft(nextDuration);
  }, [mode, pomodoroCount, currentTaskId, playSound, getInitialTimeForMode, db, user]);

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      // setInterval trả về một number trong React Native/môi trường trình duyệt
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isActive, timeLeft]);

 useEffect(() => {
    if (timeLeft === 0 && isActive) {
        handleTimerEnd();
    }
  }, [timeLeft, isActive, handleTimerEnd]);

  const toggleTimer = () => {
    const initialDurationForCurrentMode = getInitialTimeForMode(mode);
    if (!isActive && (timeLeft === 0 || timeLeft === initialDurationForCurrentMode)) {
      setTimeLeft(initialDurationForCurrentMode);
    }
    setIsActive(prev => !prev);
  };

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
            {isActive ? getModeUserFriendlyText() : (timeLeft === getInitialTimeForMode(mode) || timeLeft === 0 ? getModeUserFriendlyText() : `Tiếp tục: ${getModeUserFriendlyText()}` )}
          </Text>
          <View style={{width: 32}} />
        </View>

        <View style={styles.timerDisplayContainer}>
          <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
        </View>

        <TouchableOpacity style={styles.mainActionButton} onPress={toggleTimer}>
          <Ionicons name={isActive ? "pause" : "play"} size={32} color="#1C1C2E" style={{marginRight: 10}} />
          <Text style={styles.mainActionButtonText}>
            {isActive ? 'Tạm dừng' : (timeLeft === 0 || timeLeft === getInitialTimeForMode(mode) ? (mode === 'pomodoro' ? 'Bắt đầu Tập trung' : 'Bắt đầu Nghỉ') : 'Tiếp tục')}
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