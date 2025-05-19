// app/(tabs)/pomodoro.tsx

import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { increment, ref, update } from 'firebase/database';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as ReactNative from 'react-native';
import { Alert, ImageBackground, Text, TouchableOpacity, View, Modal, Button, FlatList, Image } from 'react-native'; // Switch không cần ở đây nữa
import AsyncStorage from '@react-native-async-storage/async-storage';
import { recordStats } from '../../components/statsHelpers'; // Điều chỉnh đường dẫn nếu cần
import { useAuth } from '../../context/AuthContext';       // Điều chỉnh đường dẫn nếu cần
import { db } from '../../firebaseConfig';               // Điều chỉnh đường dẫn nếu cần
import { styles } from './pomodoro.styles';
import * as DocumentPicker from 'expo-document-picker'; 

// --- KEYS CHO ASYNCSTORAGE (Nên định nghĩa ở một file constants chung) ---
const POMODORO_DURATION_KEY = 'pomodoroDuration';
const SHORT_BREAK_DURATION_KEY = 'shortBreakDuration';
const LONG_BREAK_DURATION_KEY = 'longBreakDuration';
const END_SOUND_URI_KEY = 'endSoundUri';
const BREAK_MUSIC_URI_KEY = 'breakMusicUri';
const POMODORO_BACKGROUND_URI_KEY = 'pomodoroBackgroundUri';
// Thêm các key khác nếu cần

// Giá trị mặc định ban đầu (phút)
const DEFAULT_POMODORO_MINUTES = 25;
const DEFAULT_SHORT_BREAK_MINUTES = 5;
const DEFAULT_LONG_BREAK_MINUTES = 15;

type TimerMode = 'pomodoro' | 'shortBreak' | 'longBreak';

const DEFAULT_BACKGROUND_IMAGE_URI = 'https://images.unsplash.com/photo-1472552944129-b035e9ea3744';
const PREDEFINED_BACKGROUNDS = [
  { id: 'default', name: 'Mặc định', uri: DEFAULT_BACKGROUND_IMAGE_URI },
  { id: 'forest', name: 'Rừng cây', uri: 'https://images.unsplash.com/photo-1425913397330-cf8af2ff40a1' },
  { id: 'mountain', name: 'Núi non', uri: 'https://images.unsplash.com/photo-1454496522488-7a8e488e8606' },
];

// Không cần AVAILABLE_BREAK_MUSIC ở đây nữa nếu URI được lưu trực tiếp
const DEFAULT_BREAK_MUSIC_KEY_PLACEHOLDER = 'default_relax_sound_placeholder'; // Chỉ là placeholder, URI sẽ được tải

type AppStateStatus = ReactNative.AppStateStatus;

export default function PomodoroScreen() {
  const { user } = useAuth();
  const params = useLocalSearchParams<{ taskId?: string; taskTitle?: string; taskPomodoroDuration?: string }>();
  const router = useRouter();

  // States cho thời lượng từ cài đặt (tính bằng giây)
  const [pomodoroDurationSetting, setPomodoroDurationSetting] = useState(DEFAULT_POMODORO_MINUTES * 60);
  const [shortBreakDurationSetting, setShortBreakDurationSetting] = useState(DEFAULT_SHORT_BREAK_MINUTES * 60);
  const [longBreakDurationSetting, setLongBreakDurationSetting] = useState(DEFAULT_LONG_BREAK_MINUTES * 60);

  const initialTaskPomodoroDurationSecondsRef = useRef<number>(
    params.taskPomodoroDuration
      ? parseInt(params.taskPomodoroDuration, 10) * 60
      : pomodoroDurationSetting // Sử dụng cài đặt nếu không có params
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
  const [endSoundUri, setEndSoundUri] = useState<string | null>(null);

  const breakMusicSoundRef = useRef<Audio.Sound | null>(null); // Đổi tên để phân biệt với state
  const [breakMusicUri, setBreakMusicUri] = useState<string | null>(null);
  const [isBreakMusicPlaying, setIsBreakMusicPlaying] = useState(false);
  const [isMusicModalVisible, setIsMusicModalVisible] = useState(false);


  useEffect(() => {
    let isMounted = true;
    const loadAllSettingsAndSounds = async () => {
      try {
        // Load durations
        const storedPomoDur = await AsyncStorage.getItem(POMODORO_DURATION_KEY);
        if (isMounted && storedPomoDur) setPomodoroDurationSetting(JSON.parse(storedPomoDur) * 60);

        const storedShortBreakDur = await AsyncStorage.getItem(SHORT_BREAK_DURATION_KEY);
        if (isMounted && storedShortBreakDur) setShortBreakDurationSetting(JSON.parse(storedShortBreakDur) * 60);

        const storedLongBreakDur = await AsyncStorage.getItem(LONG_BREAK_DURATION_KEY);
        if (isMounted && storedLongBreakDur) setLongBreakDurationSetting(JSON.parse(storedLongBreakDur) * 60);

        // Load background
        const savedBgUri = await AsyncStorage.getItem(POMODORO_BACKGROUND_URI_KEY);
        if (isMounted && savedBgUri) setCurrentBackgroundImageUri(savedBgUri);

        // Load sound URIs
        const savedEndSoundUri = await AsyncStorage.getItem(END_SOUND_URI_KEY);
        if (isMounted && savedEndSoundUri) setEndSoundUri(JSON.parse(savedEndSoundUri));

        const savedBreakMusicUri = await AsyncStorage.getItem(BREAK_MUSIC_URI_KEY);
        if (isMounted && savedBreakMusicUri) setBreakMusicUri(JSON.parse(savedBreakMusicUri));

      } catch (e) {
        console.error("Lỗi tải cài đặt:", e);
      }
    };

    loadAllSettingsAndSounds();

    return () => {
      isMounted = false;
      endSoundRef.current?.unloadAsync();
      breakMusicSoundRef.current?.unloadAsync();
    };
  }, []);

  // useEffect để cập nhật initialTaskPomodoroDurationSecondsRef khi pomodoroDurationSetting thay đổi VÀ không có params
  useEffect(() => {
    if (!params.taskPomodoroDuration) { // Chỉ cập nhật nếu không có duration từ params
        initialTaskPomodoroDurationSecondsRef.current = pomodoroDurationSetting;
        if (mode === 'pomodoro' && !isActive) { // Reset timer nếu đang ở pomodoro và không active
            setTimeLeft(pomodoroDurationSetting);
        }
    }
  }, [pomodoroDurationSetting, params.taskPomodoroDuration, mode, isActive]);


  const loadAndPlaySound = useCallback(async (soundObjectRef: React.MutableRefObject<Audio.Sound | null>, uri: string | null, options: Record<string, any> = {}) => {
    if (!uri) {
      console.log("Không có URI âm thanh để phát.");
      return;
    }
    try {
      if (soundObjectRef.current) {
        await soundObjectRef.current.unloadAsync();
      }
      console.log(`Đang tải âm thanh từ URI: ${uri}`);
      const { sound } = await Audio.Sound.createAsync({ uri }, options);
      soundObjectRef.current = sound;
      await soundObjectRef.current.playAsync();
      return sound; // Trả về đối tượng sound để có thể quản lý thêm nếu cần
    } catch (error) {
      console.error(`Lỗi tải hoặc phát âm thanh từ URI ${uri}:`, error);
      Alert.alert("Lỗi Âm thanh", `Không thể phát âm thanh: ${uri.split('/').pop()}`);
      return null;
    }
  }, []);


  const playEndSound = useCallback(async () => {
    await loadAndPlaySound(endSoundRef, endSoundUri, { shouldPlay: true });
  }, [endSoundUri, loadAndPlaySound]);

  const playBreakMusic = useCallback(async () => {
    if (!breakMusicUri) {
      await stopBreakMusic();
      return;
    }
    const sound = await loadAndPlaySound(breakMusicSoundRef, breakMusicUri, { shouldPlay: true, isLooping: true });
    if (sound) setIsBreakMusicPlaying(true);

  }, [breakMusicUri, loadAndPlaySound]);

  const stopBreakMusic = useCallback(async () => {
    if (breakMusicSoundRef.current) {
      try {
        await breakMusicSoundRef.current.stopAsync();
        await breakMusicSoundRef.current.unloadAsync(); // Quan trọng để giải phóng
        breakMusicSoundRef.current = null;
      } catch (e) {
        console.error("Lỗi dừng nhạc nghỉ:", e);
      }
    }
    setIsBreakMusicPlaying(false);
  }, []);

  const pauseBreakMusic = useCallback(async () => {
    if (breakMusicSoundRef.current && isBreakMusicPlaying) {
      try {
        await breakMusicSoundRef.current.pauseAsync();
        setIsBreakMusicPlaying(false);
      } catch (e) {
        console.error("Lỗi tạm dừng nhạc nghỉ:", e);
      }
    }
  }, [isBreakMusicPlaying]);

  const resumeBreakMusic = useCallback(async () => {
     // Chỉ resume nếu có sound object, không đang phát, và đang trong break mode
    if (breakMusicSoundRef.current && !isBreakMusicPlaying && (mode === 'shortBreak' || mode === 'longBreak')) {
      try {
        await breakMusicSoundRef.current.playAsync(); // Giả định isLooping đã được set khi load
        setIsBreakMusicPlaying(true);
      } catch (e) {
        console.error("Lỗi tiếp tục nhạc nghỉ:", e);
      }
    } else if (!breakMusicSoundRef.current && breakMusicUri && !isBreakMusicPlaying && (mode === 'shortBreak' || mode === 'longBreak')){
        // Nếu chưa có sound object (ví dụ sau khi app vào background rồi active lại), thì load và phát
        playBreakMusic();
    }
  }, [isBreakMusicPlaying, mode, breakMusicUri, playBreakMusic]);


  const getInitialTimeForMode = useCallback((currentMode: TimerMode) => {
    if (currentMode === 'pomodoro') {
      // Ưu tiên duration từ params (task-specific), sau đó là setting, cuối cùng là default
      return params.taskPomodoroDuration ? parseInt(params.taskPomodoroDuration, 10) * 60 : pomodoroDurationSetting;
    }
    if (currentMode === 'shortBreak') return shortBreakDurationSetting;
    if (currentMode === 'longBreak') return longBreakDurationSetting;
    return pomodoroDurationSetting;
  }, [params.taskPomodoroDuration, pomodoroDurationSetting, shortBreakDurationSetting, longBreakDurationSetting]);

  // Effect để cập nhật timer khi params hoặc mode thay đổi (giữ nguyên phần lớn)
  useEffect(() => {
    const taskSpecificDuration = params.taskPomodoroDuration ? parseInt(params.taskPomodoroDuration, 10) * 60 : null;
    const newDurationSeconds = taskSpecificDuration ?? pomodoroDurationSetting;

    // Cập nhật ref nếu là pomodoro mode hoặc không có duration từ task
    if (mode === 'pomodoro' || !taskSpecificDuration) {
        initialTaskPomodoroDurationSecondsRef.current = newDurationSeconds;
    }


    setCurrentTaskId(params.taskId || null);
    setCurrentTaskTitle(params.taskTitle || 'Tập trung');

    // Reset timer nếu mode là pomodoro và có sự thay đổi task hoặc timer không active
    if (mode === 'pomodoro') {
      if (!isActive || (params.taskId && params.taskId !== currentTaskId) || timeLeft !== newDurationSeconds) {
        setTimeLeft(newDurationSeconds);
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = null;
        setIsActive(false);
        stopBreakMusic();
      }
    }
  }, [params.taskId, params.taskTitle, params.taskPomodoroDuration, mode, pomodoroDurationSetting, isActive, currentTaskId, stopBreakMusic]);


  const resetTimer = useCallback((newModeParam?: TimerMode) => {
    // ... (Giữ nguyên logic resetTimer, nó đã sử dụng getInitialTimeForMode)
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

  // ... (Các useEffect và hàm khác giữ nguyên: handleAppStateChange, handleTimerEnd, toggleTimer, formatTime, getModeUserFriendlyText, handleSelectBackground)

  const handleTimerEnd = useCallback(async () => {
    setIsActive(false);
    playEndSound(); // Phát âm thanh báo hết phiên (endSoundUri)
    await stopBreakMusic();

    let nextMode: TimerMode = 'pomodoro';
    // Thời gian cho phiên tiếp theo sẽ được lấy từ getInitialTimeForMode(nextMode)

    if (mode === 'pomodoro') {
      const newPomodoroCount = pomodoroCount + 1;
      setPomodoroCount(newPomodoroCount);

      if (currentTaskId && user) {
        const taskRefDb = ref(db, `users/${user.uid}/tasks/${currentTaskId}`);
        try {
          // Thời lượng của phiên pomodoro vừa hoàn thành
          const pomodoroJustCompletedDurationMinutes = (params.taskPomodoroDuration ? parseInt(params.taskPomodoroDuration, 10) : (pomodoroDurationSetting / 60));

          await update(taskRefDb, {
            timeSpent: increment(pomodoroJustCompletedDurationMinutes),
            completedPomodoros: increment(1),
          });
          await recordStats(user.uid, pomodoroJustCompletedDurationMinutes);
        } catch (error) {
          console.error("Lỗi cập nhật công việc trên Firebase: ", error);
        }
      }
      // Logic chọn long break/short break dựa trên pomodoroCount
      // Giả sử cài đặt longBreakInterval được lấy từ AsyncStorage và lưu vào state
      // const longBreakIntervalSetting = await AsyncStorage.getItem(LONG_BREAK_INTERVAL_KEY) || 4;
      // Hiện tại chưa có state cho longBreakIntervalSetting trong PomodoroScreen, cần thêm nếu muốn tùy chỉnh
      nextMode = (newPomodoroCount % 4 === 0) ? 'longBreak' : 'shortBreak'; // Tạm dùng 4
    } else {
      nextMode = 'pomodoro';
    }

    setMode(nextMode);
    setTimeLeft(getInitialTimeForMode(nextMode)); // Set thời gian cho mode tiếp theo

    // Nếu có cài đặt tự động bắt đầu và là break, thì phát nhạc
    // const autoStartBreaks = JSON.parse(await AsyncStorage.getItem(AUTO_START_BREAK_KEY) || 'false');
    // if ((nextMode === 'shortBreak' || nextMode === 'longBreak') && autoStartBreaks) {
    // setIsActive(true); // Tự động bắt đầu timer
    // playBreakMusic(); // Tự động phát nhạc
    // }
    // Tương tự cho autoStartPomodoro
  }, [mode, pomodoroCount, currentTaskId, playEndSound, getInitialTimeForMode, user, stopBreakMusic, params.taskPomodoroDuration, pomodoroDurationSetting]);


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

        if (!isActive) { // Khi nhấn nút Start/Resume
        if (timeLeft === 0 || timeLeft === initialDurationForCurrentMode) {
            setTimeLeft(initialDurationForCurrentMode);
        }
        if (mode === 'shortBreak' || mode === 'longBreak') {
            playBreakMusic();
        } else {
            stopBreakMusic();
        }
        } else { // Khi nhấn nút Pause
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
        await AsyncStorage.setItem(POMODORO_BACKGROUND_URI_KEY, uri);
        setIsBgModalVisible(false);
    };


  const handleSelectMusicFromModal = async (uri: string | null, name: string) => {
    await stopBreakMusic(); // Dừng nhạc hiện tại
    if (uri) {
      setBreakMusicUri(uri); // Cập nhật state để loadAndPlaySound sử dụng
      await AsyncStorage.setItem(BREAK_MUSIC_URI_KEY, JSON.stringify(uri));
      // Tên nhạc có thể lưu riêng nếu cần hiển thị trong settings
      // await AsyncStorage.setItem('breakMusicName', name);
    } else { // Trường hợp chọn "Không phát nhạc"
      setBreakMusicUri(null);
      await AsyncStorage.removeItem(BREAK_MUSIC_URI_KEY);
    }
    setIsMusicModalVisible(false);

    // Nếu đang trong break và timer đang chạy, phát nhạc mới (hoặc không phát gì)
    if (isActive && (mode === 'shortBreak' || mode === 'longBreak')) {
      if (uri) {
        // Cần gọi playBreakMusic ở đây nhưng đảm bảo nó dùng `uri` mới
        // Do playBreakMusic dùng state breakMusicUri, cần đảm bảo state đã cập nhật
        // Hoặc truyền trực tiếp uri vào một hàm phát nhạc.
        // Tạm thời để đơn giản, người dùng sẽ cần start/resume break để nhạc mới phát nếu thay đổi
        // Hoặc:
        loadAndPlaySound(breakMusicSoundRef, uri, { shouldPlay: true, isLooping: true })
            .then(sound => { if(sound) setIsBreakMusicPlaying(true); });

      }
    }
  };


  // Danh sách âm thanh cho Modal (bao gồm tùy chọn import)
  const soundOptions = [
    { id: 'no_sound', name: 'Không phát nhạc', uri: null },
    // Ví dụ âm thanh từ assets (bạn cần có các file này)
    { id: 'default_relax', name: 'Nhạc thư giãn (Mặc định)', uri: require('@/assets/sounds/relax_default.mp3') },
    { id: 'ocean_waves', name: 'Sóng biển', uri: require('@/assets/sounds/ocean_waves.mp3') },
    // Thêm các âm thanh mặc định khác
    { id: 'import_sound', name: 'Chọn tệp MP3 khác...', uri: 'import' }, // Dấu hiệu để mở DocumentPicker
  ];


  const handlePickSoundForModal = async (type: 'endSound' | 'breakMusic') => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'audio/mpeg', copyToCacheDirectory: true });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const fileUri = asset.uri;
        const fileName = asset.name || 'Âm thanh đã chọn';

        if (type === 'endSound') {
          setEndSoundUri(fileUri);
          await AsyncStorage.setItem(END_SOUND_URI_KEY, JSON.stringify(fileUri));
          // Cập nhật tên hiển thị trong SettingsScreen (nếu SettingsScreen đọc trực tiếp từ AsyncStorage)
        } else { // breakMusic
          // Gọi handleSelectMusicFromModal để xử lý việc phát và lưu
          handleSelectMusicFromModal(fileUri, fileName);
        }
        Alert.alert('Thành công', `Đã chọn: ${fileName}`);
      }
    } catch (err) {
      console.error('Lỗi chọn tệp âm thanh:', err);
      Alert.alert('Lỗi', 'Không thể chọn tệp.');
    }
    // Đóng modal chọn nhạc nếu đang mở từ PomodoroScreen
    if (type === 'breakMusic') setIsMusicModalVisible(false);

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

        {/* Modal Chọn Background (giữ nguyên) */}
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

        {/* Modal Chọn Nhạc Nghỉ (Cập nhật để dùng soundOptions) */}
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
                data={soundOptions} // Sử dụng soundOptions mới
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={modalSettingStyles.settingItem}
                    onPress={() => {
                      if (item.uri === 'import') {
                        handlePickSoundForModal('breakMusic');
                      } else {
                        handleSelectMusicFromModal(item.uri, item.name);
                      }
                    }}
                  >
                    <Text style={modalSettingStyles.settingItemText}>{item.name}</Text>
                    {/* So sánh URI để đánh dấu mục đang chọn. Cần cẩn thận nếu URI là require() */}
                    {/* Đối với file require, so sánh có thể không trực tiếp hoạt động.
                        Cân nhắc lưu key hoặc tên file thay vì URI đầy đủ nếu phức tạp.
                        Hiện tại, tạm so sánh với breakMusicUri (là string).
                    */}
                    {(breakMusicUri && item.uri && typeof item.uri === 'object' && item.uri.uri === breakMusicUri) || // Cho trường hợp URI đã được DocumentPicker trả về
                     (breakMusicUri === item.uri) || // Cho trường hợp URI là string (link online)
                     (!breakMusicUri && item.uri === null) // Cho "Không phát nhạc"
                     ? <Ionicons name="checkmark-circle" size={24} color="green" /> : null}

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