// app/settings/index.tsx
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
  Modal,
  Button,
  TextInput,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';

// --- KEYS CHO ASYNCSTORAGE ---
const POMODORO_DURATION_KEY = 'pomodoroDuration';
const SHORT_BREAK_DURATION_KEY = 'shortBreakDuration';
const LONG_BREAK_DURATION_KEY = 'longBreakDuration';
const LONG_BREAK_INTERVAL_KEY = 'longBreakInterval';
const DISABLE_BREAK_KEY = 'disableBreak';
const AUTO_START_POMODORO_KEY = 'autoStartPomodoro';
const AUTO_START_BREAK_KEY = 'autoStartBreak';
const END_SOUND_URI_KEY = 'endSoundUri';
const BREAK_MUSIC_URI_KEY = 'breakMusicUri';

// Các giá trị mặc định (phút)
const DEFAULT_POMODORO_DURATION = 25;
const DEFAULT_SHORT_BREAK_DURATION = 5;
const DEFAULT_LONG_BREAK_DURATION = 15;
const DEFAULT_LONG_BREAK_INTERVAL = 4;


// --- Định nghĩa kiểu cho cấu hình một setting ---
type NumberSettingConfig = {
  key: string;
  type: 'number'; // Thêm 'type' để phân biệt
  setter: React.Dispatch<React.SetStateAction<number>>;
  defaultValue: number;
};

type BooleanSettingConfig = {
  key: string;
  type: 'boolean'; // Thêm 'type'
  setter: React.Dispatch<React.SetStateAction<boolean>>;
  defaultValue: boolean;
};

// Cho URI hoặc tên file âm thanh
// Setter có thể là setState trực tiếp hoặc một hàm tùy chỉnh
type StringNullableSettingConfig = {
  key: string;
  type: 'string_nullable_custom_setter'; // Hoặc 'string_nullable_state_setter'
  setter: (value: string | null) => void; // Hàm tùy chỉnh
  // setter: React.Dispatch<React.SetStateAction<string | null>>; // Nếu là setState trực tiếp
  defaultValue: string | null;
};

type SettingConfig = NumberSettingConfig | BooleanSettingConfig | StringNullableSettingConfig;


// --- Components con ---
interface SettingValueItemProps {
  label: string;
  value?: string | number;
  onPress?: () => void;
}

const SettingValueItem: React.FC<SettingValueItemProps> = ({ label, value, onPress }) => (
  <TouchableOpacity style={styles.settingItem} onPress={onPress} disabled={!onPress}>
    <Text style={styles.settingLabel}>{label}</Text>
    <View style={styles.valueContainer}>
      {value !== undefined && <Text style={styles.settingValue}>{value}</Text>}
      {onPress && <Ionicons name="chevron-forward" size={20} color="#555" />}
    </View>
  </TouchableOpacity>
);

interface SettingSwitchItemProps {
  label: string;
  value: boolean;
  onValueChange: (newValue: boolean) => void;
}

const SettingSwitchItem: React.FC<SettingSwitchItemProps> = ({ label, value, onValueChange }) => (
  <View style={[styles.settingItem, styles.switchItemContainer]}>
    <Text style={styles.settingLabel}>{label}</Text>
    <Switch
      trackColor={{ false: '#3e3e3e', true: '#FF6F00' }}
      thumbColor={value ? '#fff' : '#f4f3f4'}
      ios_backgroundColor="#3e3e3e"
      onValueChange={onValueChange}
      value={value}
    />
  </View>
);

// --- Component chính ---
export default function SettingsScreen() {
  const router = useRouter();

  const [pomodoroDuration, setPomodoroDuration] = useState(DEFAULT_POMODORO_DURATION);
  const [shortBreakDuration, setShortBreakDuration] = useState(DEFAULT_SHORT_BREAK_DURATION);
  const [longBreakDuration, setLongBreakDuration] = useState(DEFAULT_LONG_BREAK_DURATION);
  const [longBreakInterval, setLongBreakInterval] = useState(DEFAULT_LONG_BREAK_INTERVAL);

  const [disableBreak, setDisableBreak] = useState(false);
  const [autoStartPomodoro, setAutoStartPomodoro] = useState(false);
  const [autoStartBreak, setAutoStartBreak] = useState(false);

  const [endSoundName, setEndSoundName] = useState('Mặc định');
  const [breakMusicName, setBreakMusicName] = useState('Mặc định');

  const [isDurationModalVisible, setDurationModalVisible] = useState(false);
  const [currentEditingDurationKey, setCurrentEditingDurationKey] = useState<string | null>(null);
  const [currentDurationValue, setCurrentDurationValue] = useState('');

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settingsToLoad: SettingConfig[] = [
          { key: POMODORO_DURATION_KEY, type: 'number', setter: setPomodoroDuration, defaultValue: DEFAULT_POMODORO_DURATION },
          { key: SHORT_BREAK_DURATION_KEY, type: 'number', setter: setShortBreakDuration, defaultValue: DEFAULT_SHORT_BREAK_DURATION },
          { key: LONG_BREAK_DURATION_KEY, type: 'number', setter: setLongBreakDuration, defaultValue: DEFAULT_LONG_BREAK_DURATION },
          { key: LONG_BREAK_INTERVAL_KEY, type: 'number', setter: setLongBreakInterval, defaultValue: DEFAULT_LONG_BREAK_INTERVAL },
          { key: DISABLE_BREAK_KEY, type: 'boolean', setter: setDisableBreak, defaultValue: false },
          { key: AUTO_START_POMODORO_KEY, type: 'boolean', setter: setAutoStartPomodoro, defaultValue: false },
          { key: AUTO_START_BREAK_KEY, type: 'boolean', setter: setAutoStartBreak, defaultValue: false },
          { key: END_SOUND_URI_KEY, type: 'string_nullable_custom_setter', setter: (val: string | null) => setEndSoundName(val ? val.split('/').pop() || 'Mặc định' : 'Mặc định'), defaultValue: null },
          { key: BREAK_MUSIC_URI_KEY, type: 'string_nullable_custom_setter', setter: (val: string | null) => setBreakMusicName(val ? val.split('/').pop() || 'Mặc định' : 'Mặc định'), defaultValue: null },
        ];

        for (const setting of settingsToLoad) {
          const storedValue = await AsyncStorage.getItem(setting.key);
          let valueToSet: any;

          if (storedValue !== null) {
            valueToSet = JSON.parse(storedValue);
          } else {
            valueToSet = setting.defaultValue;
          }

          if (valueToSet !== null) { // Chỉ set nếu có giá trị (từ storage hoặc default)
            // Sử dụng type guard (dựa vào thuộc tính 'type' vừa thêm) để TypeScript hiểu rõ
            switch (setting.type) {
              case 'number':
                if (typeof valueToSet === 'number') {
                  (setting.setter as React.Dispatch<React.SetStateAction<number>>)(valueToSet);
                }
                break;
              case 'boolean':
                if (typeof valueToSet === 'boolean') {
                  (setting.setter as React.Dispatch<React.SetStateAction<boolean>>)(valueToSet);
                }
                break;
              case 'string_nullable_custom_setter':
                 // Với setter tùy chỉnh, chúng ta đã định nghĩa kiểu của nó
                (setting.setter as (value: string | null) => void)(valueToSet as string | null);
                break;
            }
          }
        }
      } catch (e) {
        console.error("Lỗi tải cài đặt:", e);
      }
    };
    loadSettings();
  }, []);

  const saveSetting = async (key: string, value: any) => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      Alert.alert('Lỗi', `Không thể lưu cài đặt cho ${key}.`);
    }
  };

  const openDurationModal = (key: string, currentValue: number) => {
    setCurrentEditingDurationKey(key);
    setCurrentDurationValue(currentValue.toString());
    setDurationModalVisible(true);
  };

  const handleSaveDuration = async () => {
    if (currentEditingDurationKey && currentDurationValue) {
      const numericValue = parseInt(currentDurationValue, 10);
      if (!isNaN(numericValue) && numericValue > 0) {
        switch (currentEditingDurationKey) {
          case POMODORO_DURATION_KEY:
            setPomodoroDuration(numericValue);
            break;
          case SHORT_BREAK_DURATION_KEY:
            setShortBreakDuration(numericValue);
            break;
          case LONG_BREAK_DURATION_KEY:
            setLongBreakDuration(numericValue);
            break;
          case LONG_BREAK_INTERVAL_KEY:
            setLongBreakInterval(numericValue);
            break;
        }
        await saveSetting(currentEditingDurationKey, numericValue);
        setDurationModalVisible(false);
        setCurrentEditingDurationKey(null);
      } else {
        Alert.alert('Lỗi', 'Vui lòng nhập một số dương hợp lệ.');
      }
    }
  };

  const pickSound = async (type: 'endSound' | 'breakMusic') => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/mpeg',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const fileUri = asset.uri;
        const fileName = asset.name || fileUri.split('/').pop() || 'Âm thanh đã chọn';

        if (type === 'endSound') {
          await saveSetting(END_SOUND_URI_KEY, fileUri);
          setEndSoundName(fileName);
          Alert.alert('Thành công', `Đã chọn chuông báo: ${fileName}`);
        } else if (type === 'breakMusic') {
          await saveSetting(BREAK_MUSIC_URI_KEY, fileUri);
          setBreakMusicName(fileName);
          Alert.alert('Thành công', `Đã chọn nhạc nghỉ: ${fileName}`);
        }
      }
    } catch (err) {
      console.error('Lỗi DocumentPicker: ', err);
      Alert.alert('Lỗi', 'Không thể chọn tệp âm thanh. ' + (err as Error).message);
    }
  };

  // ... (phần JSX không thay đổi nhiều, giữ nguyên)
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Dự Án - Tạm thời */}
      <SettingItem label="Dự Án" onPress={() => Alert.alert('Thông báo', 'Điều hướng đến Dự Án')} />

      {/* Cài đặt Pomodoro */}
      <Text style={styles.sectionHeader}>POMODORO</Text>
      <SettingItem label="Chuông báo kết thúc Pomodoro" value={endSoundName} onPress={() => pickSound('endSound')} />
      <SettingItem label="Tiếng Động Giúp Tập Trung" value={breakMusicName} onPress={() => pickSound('breakMusic')} />

      <SettingValueItem label="Thời Lượng Pomodoro" value={`${pomodoroDuration} Phút`} onPress={() => openDurationModal(POMODORO_DURATION_KEY, pomodoroDuration)} />
      <SettingValueItem label="Thời Lượng Giải lao Ngắn" value={`${shortBreakDuration} Phút`} onPress={() => openDurationModal(SHORT_BREAK_DURATION_KEY, shortBreakDuration)} />
      <SettingValueItem label="Thời Lượng Giải lao Dài" value={`${longBreakDuration} Phút`} onPress={() => openDurationModal(LONG_BREAK_DURATION_KEY, longBreakDuration)} />
      <SettingValueItem label="Giải lao Dài sau" value={`${longBreakInterval} Pomodoro`} onPress={() => openDurationModal(LONG_BREAK_INTERVAL_KEY, longBreakInterval)} />

      <SettingSwitchItem
        label="Vô hiệu hoá Giải lao"
        value={disableBreak}
        onValueChange={async (val) => { setDisableBreak(val); await saveSetting(DISABLE_BREAK_KEY, val);}}
      />
      <SettingSwitchItem
        label="Tự động bắt đầu Pomodoro kế tiếp"
        value={autoStartPomodoro}
        onValueChange={async (val) => { setAutoStartPomodoro(val); await saveSetting(AUTO_START_POMODORO_KEY, val);}}
      />
      <SettingSwitchItem
        label="Tự động bắt đầu lượt Giải lao"
        value={autoStartBreak}
        onValueChange={async (val) => { setAutoStartBreak(val); await saveSetting(AUTO_START_BREAK_KEY, val);}}
      />

      {/* Giao Diện */}
      <Text style={styles.sectionHeader}>GIAO DIỆN</Text>
      <SettingItem label="Giao Diện Pomodoro" onPress={() => router.push('/settings/pomodoro-interface')} />

      {/* Khác - Tạm thời */}
      <Text style={styles.sectionHeader}>KHÁC</Text>
      <SettingSwitchItem label="Trồng cây" value={false} onValueChange={() => {}} />
      <SettingItem label="Xếp Hạng" onPress={() => Alert.alert('Thông báo', 'Điều hướng đến Xếp Hạng')} />

      <View style={{ height: 50 }} />

      {/* Modal chỉnh sửa thời gian */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={isDurationModalVisible}
        onRequestClose={() => setDurationModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Chỉnh sửa giá trị</Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="number-pad"
              value={currentDurationValue}
              onChangeText={setCurrentDurationValue}
              placeholder="Nhập giá trị (số)"
              placeholderTextColor="#888"
            />
            <View style={styles.modalButtonContainer}>
              <Button title="Hủy" onPress={() => setDurationModalVisible(false)} color="#FF3B30" />
              <View style={{width: 20}} />
              <Button title="Lưu" onPress={handleSaveDuration} color="#FF6F00" />
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

// Component SettingItem cơ bản để tái sử dụng
const SettingItem: React.FC<{ label: string; value?: string; onPress?: () => void }> = ({ label, value, onPress }) => (
  <TouchableOpacity style={styles.settingItem} onPress={onPress} disabled={!onPress}>
    <Text style={styles.settingLabel}>{label}</Text>
    <View style={styles.valueContainer}>
      {value && <Text style={styles.settingValue}>{value}</Text>}
      {onPress && <Ionicons name="chevron-forward" size={20} color="#555" />}
    </View>
  </TouchableOpacity>
);


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  contentContainer: {
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    paddingHorizontal: 15,
    paddingVertical: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#3A3A3C',
  },
  settingLabel: {
    color: '#EFEFF4',
    fontSize: 16,
    flexShrink: 1,
    marginRight: 8,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  settingValue: {
    color: '#8E8E93',
    fontSize: 16,
    marginRight: 5,
    textAlign: 'right',
  },
  switchItemContainer: {},
  sectionHeader: {
    color: '#8E8E93',
    fontSize: 13,
    fontWeight: '400',
    textTransform: 'uppercase',
    paddingHorizontal: 15,
    paddingTop: 30,
    paddingBottom: 8,
    backgroundColor: '#000000',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '85%',
    backgroundColor: '#1C1C1E',
    borderRadius: 15,
    padding: 25,
    alignItems: 'stretch',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalInput: {
    backgroundColor: '#333',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 15,
    marginBottom: 25,
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
});