import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { increment, ref, update } from 'firebase/database';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as ReactNative from 'react-native';
import { Alert, ImageBackground, Text, TouchableOpacity, View, Modal, Button, FlatList, Image, Switch } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { recordStats } from '../../components/statsHelpers';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebaseConfig';
import { styles } from './pomodoro.styles';

const POMODORO_MODE_DURATION_DEFAULT_SECONDS = 25 * 60;
const SHORT_BREAK_DURATION_SECONDS = 5 * 60;
const LONG_BREAK_DURATION_SECONDS = 15 * 60;

type TimerMode = 'pomodoro' | 'shortBreak' | 'longBreak';

const DEFAULT_BACKGROUND_IMAGE_URI = 'https://images.unsplash.com/photo-1472552944129-b035e9ea3744';
const PREDEFINED_BACKGROUNDS = [
  { id: 'default', name: 'Mặc định', uri: DEFAULT_BACKGROUND_IMAGE_URI },
  { id: 'forest', name: 'Rừng cây', uri: 'https://images.unsplash.com/photo-1425913397330-cf8af2ff40a1' },
  { id: 'mountain', name: 'Núi non', uri: 'https://images.unsplash.com/photo-1454496522488-7a8e488e8606' },
];

const AVAILABLE_BREAK_MUSIC: Record<string, { name: string, source: any }> = {
  'no_sound': { name: 'Không phát nhạc', source: null },
  'default_relax': { name: 'Nhạc thư giãn mặc định', source: require('@/assets/sounds/relax_default.mp3') },
  'ocean_waves': { name: 'Sóng biển', source: require('@/assets/sounds/ocean_waves.mp3') },
};
const DEFAULT_BREAK_MUSIC_KEY = 'default_relax';

type AppStateStatus = ReactNative.AppStateStatus;

export default function PomodoroScreen() {
  const { user } = useAuth();
  const params = useLocalSearchParams<{ taskId?: string; taskTitle?: string; taskPomodoroDuration?: string }>();
  const router = useRouter();

  const initialTaskPomodoroDurationSecondsRef = useRef<number>(
    params.taskPomodoroDuration
      ? parseInt(params.taskPomodoroDuration, 10) * 60
      : POMODORO_MODE_DURATION_DEFAULT_SECONDS
  );

  const [timeLeft, setTimeLeft] = useState(initialTaskPomodoroDurationSecondsRef.current);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<TimerMode>('pomodoro');
  const [pomodoroCount, setPomodoroCount] = useState(0);

  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [currentTaskTitle, setCurrentTaskTitle] = useState<string | null>('Tập trung');

  const intervalRef = useRef<number | null>(null);
  const appState = useRef(ReactNative.AppState.currentState);
  const backgroundTimeRef = useRef<number | null>(null);

  const [currentBackgroundImageUri, setCurrentBackgroundImageUri] = useState<string>(DEFAULT_BACKGROUND_IMAGE_URI);
  const [isBgModalVisible, setIsBgModalVisible] = useState(false);

  const endSoundRef = useRef<Audio.Sound | null>(null);

  const [breakMusicSound, setBreakMusicSound] = useState<Audio.Sound | null>(null);
  const [selectedBreakMusicKey, setSelectedBreakMusicKey] = useState<string>(DEFAULT_BREAK_MUSIC_KEY);
  const [isBreakMusicPlaying, setIsBreakMusicPlaying] = useState(false);
  const [isMusicModalVisible, setIsMusicModalVisible] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadAppSettings = async () => {
      try {
        const savedBgUri = await AsyncStorage.getItem('pomodoroBackgroundUri');
        if (isMounted && savedBgUri) setCurrentBackgroundImageUri(savedBgUri);

        const savedMusicKey = await AsyncStorage.getItem('pomodoroBreakMusicKey');
        if (isMounted && savedMusicKey && AVAILABLE_BREAK_MUSIC[savedMusicKey]) {
          setSelectedBreakMusicKey(savedMusicKey);
        }
      } catch (e) {
        console.error("Lỗi tải cài đặt:", e);
      }
    };

    const loadEndSound = async () => {
      try {
        const { sound } = await Audio.Sound.createAsync(
           require('@/assets/sounds/timer_finish.mp3')
        );
        if (isMounted) {
          endSoundRef.current = sound;
        } else {
          await sound.unloadAsync();
        }
      } catch (error) {
        console.error("Không thể tải âm thanh báo hết giờ: ", error);
      }
    };

    loadAppSettings();
    loadEndSound();

    return () => {
      isMounted = false;
      endSoundRef.current?.unloadAsync();
      breakMusicSound?.unloadAsync();
    };
  }, []);

  const playEndSound = useCallback(async () => {
    try {
      await endSoundRef.current?.stopAsync();
      await endSoundRef.current?.replayAsync();
    } catch (error) {
      console.error("Không thể phát âm thanh báo hết giờ: ", error);
    }
  }, []);

  const playBreakMusic = useCallback(async () => {
    if (selectedBreakMusicKey === 'no_sound' || !AVAILABLE_BREAK_MUSIC[selectedBreakMusicKey]?.source) {
      await stopBreakMusic();
      return;
    }

    if (breakMusicSound) {
      await breakMusicSound.unloadAsync();
      setBreakMusicSound(null);
    }

    try {
      const { sound } = await Audio.Sound.createAsync(
        AVAILABLE_BREAK_MUSIC[selectedBreakMusicKey].source,
        { shouldPlay: true, isLooping: true }
      );
      setBreakMusicSound(sound);
      setIsBreakMusicPlaying(true);
    } catch (error) {
      console.error("Lỗi phát nhạc nghỉ:", error);
      setIsBreakMusicPlaying(false);
    }
  }, [selectedBreakMusicKey, breakMusicSound]);

  const stopBreakMusic = useCallback(async () => {
    if (breakMusicSound) {
      try {
        await breakMusicSound.stopAsync();
        await breakMusicSound.unloadAsync();
        setBreakMusicSound(null);
      } catch (e) {
        console.error("Lỗi dừng nhạc nghỉ:", e);
      }
    }
    setIsBreakMusicPlaying(false);
  }, [breakMusicSound]);

  const pauseBreakMusic = useCallback(async () => {
    if (breakMusicSound && isBreakMusicPlaying) {
      try {
        await breakMusicSound.pauseAsync();
        setIsBreakMusicPlaying(false);
      } catch (e) {
        console.error("Lỗi tạm dừng nhạc nghỉ:", e);
      }
    }
  }, [breakMusicSound, isBreakMusicPlaying]);

  const resumeBreakMusic = useCallback(async () => {
    if (breakMusicSound && !isBreakMusicPlaying && (mode === 'shortBreak' || mode === 'longBreak')) {
      try {
        await breakMusicSound.playAsync();
        setIsBreakMusicPlaying(true);
      } catch (e) {
        console.error("Lỗi tiếp tục nhạc nghỉ:", e);
      }
    }
  }, [breakMusicSound, isBreakMusicPlaying, mode]);

  const getInitialTimeForMode = useCallback((currentMode: TimerMode) => {
    if (currentMode === 'pomodoro') {
      return initialTaskPomodoroDurationSecondsRef.current;
    }
    if (currentMode === 'shortBreak') return SHORT_BREAK_DURATION_SECONDS;
    if (currentMode === 'longBreak') return LONG_BREAK_DURATION_SECONDS;
    return initialTaskPomodoroDurationSecondsRef.current;
  }, []);

  useEffect(() => {
    const newDurationSeconds = params.taskPomodoroDuration
      ? parseInt(params.taskPomodoroDuration, 10) * 60
      : POMODORO_MODE_DURATION_DEFAULT_SECONDS;

    initialTaskPomodoroDurationSecondsRef.current = newDurationSeconds;

    setCurrentTaskId(params.taskId || null);
    setCurrentTaskTitle(params.taskTitle || 'Tập trung');

    if (mode === 'pomodoro' && (!isActive || timeLeft !== newDurationSeconds)) {
      setTimeLeft(newDurationSeconds);
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      setIsActive(false);
      stopBreakMusic();
    }
  }, [params.taskId, params.taskTitle, params.taskPomodoroDuration, mode, isActive, stopBreakMusic]);

  const resetTimer = useCallback((newModeParam?: TimerMode) => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsActive(false);

    const targetMode = newModeParam || mode;
    const previousMode = mode;
    setMode(targetMode);
    setTimeLeft(getInitialTimeForMode(targetMode));

    if (targetMode === 'pomodoro' && (previousMode === 'shortBreak' || previousMode === 'longBreak')) {
      stopBreakMusic();
    }
  }, [mode, getInitialTimeForMode, stopBreakMusic]);

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
  }, [isActive, isBreakMusicPlaying, mode]);

  const handleTimerEnd = useCallback(async () => {
    setIsActive(false);
    playEndSound();
    await stopBreakMusic();

    let nextMode: TimerMode = 'pomodoro';
    let nextDuration = getInitialTimeForMode('pomodoro');

    if (mode === 'pomodoro') {
      const newPomodoroCount = pomodoroCount + 1;
      setPomodoroCount(newPomodoroCount);

      if (currentTaskId && user) {
        const taskRefDb = ref(db, `users/${user.uid}/tasks/${currentTaskId}`);
        try {
          const pomodoroJustCompletedDurationMinutes = getInitialTimeForMode('pomodoro') / 60;
          await update(taskRefDb, {
            timeSpent: increment(pomodoroJustCompletedDurationMinutes),
            completedPomodoros: increment(1),
          });
          await recordStats(user.uid, pomodoroJustCompletedDurationMinutes);
        } catch (error) {
          console.error("Lỗi cập nhật công việc trên Firebase: ", error);
        }
      }
      nextMode = (newPomodoroCount % 4 === 0) ? 'longBreak' : 'shortBreak';
      nextDuration = getInitialTimeForMode(nextMode);
    } else {
      nextMode = 'pomodoro';
    }
    setMode(nextMode);
    setTimeLeft(nextDuration);
  }, [mode, pomodoroCount, currentTaskId, playEndSound, getInitialTimeForMode, user, stopBreakMusic, playBreakMusic]);

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => prev <= 1 ? 0 : prev - 1);
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isActive, timeLeft]);

  useEffect(() => {
    if (timeLeft === 0 && isActive) {
        handleTimerEnd();
    }
  }, [timeLeft, isActive, handleTimerEnd]);

  const toggleTimer = () => {
    const initialDurationForCurrentMode = getInitialTimeForMode(mode);

    if (!isActive) {
      if (timeLeft === 0 || timeLeft === initialDurationForCurrentMode) {
        setTimeLeft(initialDurationForCurrentMode);
      }
      if (mode === 'shortBreak' || mode === 'longBreak') {
        playBreakMusic();
      } else {
        stopBreakMusic();
      }
    } else {
      if (mode === 'shortBreak' || mode === 'longBreak') {
        pauseBreakMusic();
      }
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

  const handleSelectBackground = async (uri: string) => {
    setCurrentBackgroundImageUri(uri);
    await AsyncStorage.setItem('pomodoroBackgroundUri', uri);
    setIsBgModalVisible(false);
  };

  const handleSelectMusic = async (key: string) => {
    await stopBreakMusic();
    setSelectedBreakMusicKey(key);
    await AsyncStorage.setItem('pomodoroBreakMusicKey', key);
    setIsMusicModalVisible(false);
  };

  return (
    <ImageBackground
      source={currentBackgroundImageUri ? { uri: currentBackgroundImageUri } : require('@/assets/images/default_pomodoro_bg.jpg')}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
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
          <TouchableOpacity style={styles.toolbarActionButton} onPress={() => setIsBgModalVisible(true)}>
            <Ionicons name="image-outline" size={24} color="white" />
            <Text style={styles.toolbarActionText}>Nền</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolbarActionButton} onPress={() => setIsMusicModalVisible(true)}>
            <Ionicons name="musical-notes-outline" size={24} color="white" />
            <Text style={styles.toolbarActionText}>Nhạc nghỉ</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolbarActionButton} onPress={() => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            handleTimerEnd();
          }}>
            <Ionicons name="play-skip-forward-outline" size={24} color="white" />
            <Text style={styles.toolbarActionText}>Bỏ qua</Text>
          </TouchableOpacity>
           <TouchableOpacity style={styles.toolbarActionButton} onPress={() => router.push('/(tabs)')}>
            <Ionicons name="list-outline" size={24} color="white" />
            <Text style={styles.toolbarActionText}>Công việc</Text>
          </TouchableOpacity>
        </View>

        <Modal
          animationType="slide"
          transparent={true}
          visible={isBgModalVisible}
          onRequestClose={() => setIsBgModalVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalContent}>
              <Text style={styles.modalFormTitle}>Chọn Hình Nền</Text>
              <FlatList
                data={PREDEFINED_BACKGROUNDS}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={modalSettingStyles.settingItem}
                    onPress={() => handleSelectBackground(item.uri)}
                  >
                    <Image source={{ uri: item.uri }} style={modalSettingStyles.settingImagePreview} />
                    <Text style={modalSettingStyles.settingItemText}>{item.name}</Text>
                    {currentBackgroundImageUri === item.uri && <Ionicons name="checkmark-circle" size={24} color="green" />}
                  </TouchableOpacity>
                )}
              />
              <Button title="Đóng" onPress={() => setIsBgModalVisible(false)} color="#FF6F00" />
            </View>
          </View>
        </Modal>

        <Modal
          animationType="slide"
          transparent={true}
          visible={isMusicModalVisible}
          onRequestClose={() => setIsMusicModalVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalContent}>
              <Text style={styles.modalFormTitle}>Chọn Nhạc Nghỉ</Text>
              <FlatList
                data={Object.keys(AVAILABLE_BREAK_MUSIC)}
                keyExtractor={(item) => item}
                renderItem={({ item: musicKey }) => (
                  <TouchableOpacity
                    style={modalSettingStyles.settingItem}
                    onPress={() => handleSelectMusic(musicKey)}
                  >
                    <Text style={modalSettingStyles.settingItemText}>{AVAILABLE_BREAK_MUSIC[musicKey].name}</Text>
                    {selectedBreakMusicKey === musicKey && <Ionicons name="checkmark-circle" size={24} color="green" />}
                  </TouchableOpacity>
                )}
              />
              <Button title="Đóng" onPress={() => setIsMusicModalVisible(false)} color="#FF6F00"/>
            </View>
          </View>
        </Modal>

      </View>
    </ImageBackground>
  );
}

const modalSettingStyles = ReactNative.StyleSheet.create({
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#3a3a3a',
  },
  settingItemText: {
    color: 'white',
    fontSize: 16,
    flex: 1,
  },
  settingImagePreview: {
    width: 50,
    height: 50,
    borderRadius: 5,
    marginRight: 15,
  },
});
