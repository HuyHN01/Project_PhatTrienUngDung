// app/(tabs)/pomodoro.tsx
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, AppState, Platform, ImageBackground } from 'react-native'; // Thêm ImageBackground
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Audio } from 'expo-av';
import { db } from '../../firebaseConfig';
import { ref, update, increment } from 'firebase/database';

const POMODORO_DURATION_DEFAULT = 25 * 60;
const SHORT_BREAK_DURATION_DEFAULT = 5 * 60;
const LONG_BREAK_DURATION_DEFAULT = 15 * 60;

type TimerMode = 'pomodoro' | 'shortBreak' | 'longBreak';

// Đường dẫn đến ảnh nền của bạn - THAY THẾ BẰNG ĐƯỜNG DẪN THỰC TẾ HOẶC URL
// Ví dụ sử dụng ảnh từ assets:
// const backgroundImage = require('@/assets/images/pomodoro_background.jpg');
// Hoặc URL (hãy chắc chắn rằng bạn có quyền truy cập và nó ổn định):
const backgroundImageUri = 'https://images.unsplash.com/photo-1472552944129-b035e9ea3744'; // URL ảnh giữ chỗ

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
  const appState = useRef(AppState.currentState);
  const backgroundTimeRef = useRef<number | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    const loadSound = async () => {
      try {
        const { sound } = await Audio.Sound.createAsync(
          require('@/assets/sounds/timer_finish.mp3') // Đảm bảo file này tồn tại
        );
        soundRef.current = sound;
      } catch (error) {
        console.error("Không thể tải âm thanh: ", error);
      }
    };
    loadSound();
    return () => {
      soundRef.current?.unloadAsync();
    };
  }, []);

  const playSound = async () => {
    try {
      await soundRef.current?.replayAsync();
    } catch (error) {
      console.error("Không thể phát âm thanh: ", error);
    }
  };

  useEffect(() => {
    if (params.taskId) {
      setCurrentTaskId(params.taskId);
      setCurrentTaskTitle(params.taskTitle || 'Nhiệm vụ được chọn');
      resetTimer('pomodoro', POMODORO_DURATION_DEFAULT);
    } else {
      setCurrentTaskTitle('Tập trung');
      resetTimer('pomodoro', POMODORO_DURATION_DEFAULT);
    }
  }, [params]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        if (backgroundTimeRef.current && isActive) {
          const timePassedInBackground = Math.floor((Date.now() - backgroundTimeRef.current) / 1000);
          setTimeLeft(prevTime => Math.max(0, prevTime - timePassedInBackground));
        }
        backgroundTimeRef.current = null;
      } else if (nextAppState.match(/inactive|background/)) { // Sửa: Chỉ kiểm tra nextAppState
        if (isActive) {
          backgroundTimeRef.current = Date.now();
        }
      }
      appState.current = nextAppState;
    });
    return () => {
      subscription.remove();
    };
  }, [isActive]); // Chỉ phụ thuộc vào isActive

useEffect(() => {
    let intervalId: number | null = null;

    if (isActive && timeLeft > 0) {
      intervalId = setInterval(() => {
        setTimeLeft(prevTime => {
          if (prevTime <= 1) {
            if (intervalId) clearInterval(intervalId); // Xóa interval này
            // setIsActive(false); // Sẽ được xử lý bởi handleTimerEnd
            handleTimerEnd(); // Gọi handleTimerEnd khi hết giờ
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
      intervalRef.current = intervalId; // Lưu ID interval hiện tại
    } else if (!isActive && intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    } else if (timeLeft === 0 && isActive) { // Trường hợp timer chạy hết khi đang active
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = null;
        handleTimerEnd();
    }


    return () => { // Hàm cleanup của useEffect
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive, timeLeft]); // Phụ thuộc vào isActive và timeLeft


  const handleTimerEnd = async () => {
    // Quan trọng: Đảm bảo setIsActive(false) được gọi ở đây để dừng logic trong useEffect
    setIsActive(false);
    if (intervalRef.current) { // Xóa interval một lần nữa để chắc chắn
        clearInterval(intervalRef.current);
        intervalRef.current = null;
    }

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
          console.log('Thời gian và số Pomodoro của công việc đã được cập nhật');
        } catch (error) {
          console.error("Lỗi cập nhật công việc: ", error);
        }
      }
      if (newPomodoroCount % 4 === 0) {
        nextMode = 'longBreak';
        nextDuration = LONG_BREAK_DURATION_DEFAULT;
      } else {
        nextMode = 'shortBreak';
        nextDuration = SHORT_BREAK_DURATION_DEFAULT;
      }
    } else {
      nextMode = 'pomodoro';
      nextDuration = POMODORO_DURATION_DEFAULT;
    }
    setMode(nextMode);
    setTimeLeft(nextDuration);
    // Không tự động bắt đầu timer mới, người dùng sẽ nhấn nút
  };

  const toggleTimer = () => {
    if (timeLeft === 0 && !isActive) { // Nếu timer đã kết thúc và đang không active
      // Reset timer về thời gian ban đầu của mode hiện tại trước khi bắt đầu
      let initialDuration = POMODORO_DURATION_DEFAULT;
      if (mode === 'shortBreak') initialDuration = SHORT_BREAK_DURATION_DEFAULT;
      else if (mode === 'longBreak') initialDuration = LONG_BREAK_DURATION_DEFAULT;
      setTimeLeft(initialDuration); // Đặt lại thời gian
      setIsActive(true); // Sau đó mới kích hoạt
    } else {
      setIsActive(!isActive); // Chuyển đổi trạng thái active
    }
  };

  const resetTimer = (newMode?: TimerMode, duration?: number) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null; // Quan trọng: reset intervalRef
    setIsActive(false);
    const targetMode = newMode || mode;
    setMode(targetMode);

    let newTimeLeft = duration;
    if (newTimeLeft === undefined) {
        switch (targetMode) {
        case 'pomodoro': newTimeLeft = POMODORO_DURATION_DEFAULT; break;
        case 'shortBreak': newTimeLeft = SHORT_BREAK_DURATION_DEFAULT; break;
        case 'longBreak': newTimeLeft = LONG_BREAK_DURATION_DEFAULT; break;
        default: newTimeLeft = POMODORO_DURATION_DEFAULT;
        }
    }
    setTimeLeft(newTimeLeft);
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
  }

  const getInitialTimeForMode = (currentMode: TimerMode) => {
    if (currentMode === 'pomodoro') return POMODORO_DURATION_DEFAULT;
    if (currentMode === 'shortBreak') return SHORT_BREAK_DURATION_DEFAULT;
    return LONG_BREAK_DURATION_DEFAULT;
  }

  return (
    <ImageBackground
      source={{ uri: backgroundImageUri }} // Hoặc source={backgroundImage} nếu dùng ảnh local
      style={styles.backgroundImage}
      resizeMode="cover" // Hoặc "stretch", "contain" tùy theo ý muốn
    >
      <View style={styles.overlay}> {/* Thêm một lớp phủ mờ nếu cần để chữ dễ đọc hơn */}
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
            {isActive ? 'Tạm dừng' : (timeLeft === getInitialTimeForMode(mode) ? (mode === 'pomodoro' ? 'Bắt đầu Tập trung' : 'Bắt đầu Nghỉ') : 'Tiếp tục')}
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

const styles = StyleSheet.create({
  backgroundImage: { // Style cho ImageBackground
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: { // Style cho lớp phủ (tùy chọn)
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)', // Màu đen mờ, điều chỉnh alpha (0.3) để thay đổi độ mờ
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? 25 : 50,
    // Không cần backgroundColor: '#1C1C2E' ở đây nữa nếu dùng ảnh nền
  },
  container: { // Style này không còn dùng cho View chính nữa, nhưng giữ lại nếu có các View con cần
    flex: 1,
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? 25 : 50,
  },
  headerBar: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 40,
    // backgroundColor: 'transparent', // Đảm bảo header trong suốt trên nền
  },
  headerText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.75)', // Thêm đổ bóng cho chữ nếu cần
    textShadowOffset: {width: -1, height: 1},
    textShadowRadius: 5
  },
  timerDisplayContainer: {
    width: 290,
    height: 290,
    borderRadius: 145,
    // Bỏ borderWidth và borderColor nếu không muốn vòng tròn này nữa,
    // hoặc điều chỉnh màu sắc để nổi bật trên nền
    // borderWidth: 10,
    // borderColor: 'rgba(255, 255, 255, 0.25)',
    backgroundColor: 'rgba(0,0,0,0.2)', // Nền mờ nhẹ cho khu vực timer
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 50,
  },
  timerText: {
    fontSize: 84,
    color: 'white',
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.75)', // Đổ bóng cho chữ
    textShadowOffset: {width: -1, height: 1},
    textShadowRadius: 10
  },
  mainActionButton: {
    backgroundColor: 'white', // Giữ lại màu nút hoặc đổi cho phù hợp
    paddingVertical: 18,
    paddingHorizontal: 65,
    borderRadius: 35,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 40,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  mainActionButtonText: {
    fontSize: 20,
    color: '#1C1C2E', // Màu chữ của nút
    fontWeight: 'bold',
  },
  modeSelectorContainer: {
    flexDirection: 'row',
    marginBottom: 50,
    // backgroundColor: 'rgba(0,0,0,0.1)', // Nền mờ nhẹ cho các nút chọn mode nếu cần
    // padding: 5,
    // borderRadius: 30,
  },
  modeButton: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 25,
    marginHorizontal: 6,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  activeMode: {
    backgroundColor: '#FFFFFF',
  },
  modeButtonText: {
    color: '#E0E0E0',
    fontSize: 15,
  },
  activeModeText: {
    color: '#1C1C2E',
    fontWeight: 'bold',
  },
  bottomActionToolbar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(0,0,0,0.5)', // Tăng độ đậm của nền thanh công cụ
    paddingTop: 15,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
    // borderTopWidth: 1, // Có thể bỏ nếu không muốn đường kẻ
    // borderTopColor: 'rgba(255,255,255,0.1)',
  },
  toolbarActionButton: {
    alignItems: 'center',
  },
  toolbarActionText: {
    color: 'white',
    fontSize: 11,
    marginTop: 5,
    textShadowColor: 'rgba(0, 0, 0, 0.5)', // Đổ bóng nhẹ cho chữ
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 2
  },
});
