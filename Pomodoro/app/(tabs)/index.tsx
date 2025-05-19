import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { onValue, push, ref, remove, set, update } from 'firebase/database';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Button,
  FlatList,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebaseConfig';
import { styles } from './pomodoro.styles';

interface Task {
  id: string;
  title: string;
  completed: boolean;
  categoryKey: string;
  createdAt: number;
  dueDate?: number | null;
  scheduledAt?: number | null;
  pomodoroDuration?: number;
  scheduledTime?: string;
  completedPomodoros: number;
  timeSpent?: number;
}

interface Category {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  filterKey: Task['categoryKey'] | 'completed';
}

const CATEGORIES: Category[] = [
  { title: 'Hôm nay', icon: 'sunny-outline', color: '#FFD700', filterKey: 'today' },
  { title: 'Ngày mai', icon: 'alarm-outline', color: '#FF8C00', filterKey: 'tomorrow' },
  { title: 'Tuần này', icon: 'calendar-number-outline', color: '#6A5ACD', filterKey: 'thisWeek' },
  { title: 'Đã lên kế hoạch', icon: 'calendar-outline', color: '#87CEEB', filterKey: 'planned' },
  { title: 'Tất cả', icon: 'file-tray-full-outline', color: '#2196F3', filterKey: 'all' },
  { title: 'Đã hoàn thành', icon: 'checkmark-done-circle-outline', color: '#32CD32', filterKey: 'completed' },
];

const DEFAULT_POMODORO_DURATION = 25;

const formatDate = (timestamp?: number, includeTime: boolean = true): string => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  if (includeTime) {
    return `${date.toLocaleDateString('vi-VN')} ${date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
  }
  return date.toLocaleDateString('vi-VN');
};

export default function HomeScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [taskPomodoroDuration, setTaskPomodoroDuration] = useState('');
  const [taskScheduledTime, setTaskScheduledTime] = useState('');
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [selectedFilterKey, setSelectedFilterKey] = useState<Category['filterKey']>('today');
  const [isTaskModalVisible, setTaskModalVisible] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isDeadlinePickerVisible, setDeadlinePickerVisibility] = useState(false);
  const [selectedDeadline, setSelectedDeadline] = useState<Date | undefined>(undefined);
  const [selectedScheduledAt, setSelectedScheduledAt] = useState<Date | undefined>(undefined);
  const [isScheduledAtPickerVisible, setScheduledAtPickerVisibility] = useState(false);

  const handleLogout = async () => {
    await signOut();
  };

  useEffect(() => {
    if (user) {
      const tasksRef = ref(db, `users/${user.uid}/tasks`);
      const unsubscribe = onValue(tasksRef, (snapshot) => {
        const data = snapshot.val();
        const loadedTasks: Task[] = data ? Object.keys(data).map(key => ({
          id: key,
          ...data[key],
        })) : [];
        setAllTasks(loadedTasks);
        const updates: Record<string, any> = {};
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        loadedTasks.forEach(task => {
          if (!task.completed && (task.categoryKey === 'today' || task.categoryKey === 'tomorrow')) {
             if (!task.scheduledAt && !task.dueDate) {
                updates[`users/${user.uid}/tasks/${task.id}/categoryKey`] = 'planned';
             }
          }
        });
        if (Object.keys(updates).length > 0) {
          update(ref(db), updates);
        }
      });
      return () => unsubscribe();
    } else {
      setAllTasks([]);
    }
  }, [user]);

  const filterAndSortTasks = useCallback(() => {
    let tempTasks = [...allTasks];
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();

    if (selectedFilterKey === 'completed') {
      tempTasks = tempTasks.filter(task => task.completed);
    } else {
      tempTasks = tempTasks.filter(task => !task.completed);
      if (selectedFilterKey === 'today') {
        tempTasks = tempTasks.filter(task =>
          (task.scheduledAt && task.scheduledAt >= todayStart && task.scheduledAt <= todayEnd) ||
          (!task.scheduledAt && task.dueDate && task.dueDate >= todayStart && task.dueDate <= todayEnd) ||
          (!task.scheduledAt && !task.dueDate && task.categoryKey === 'today')
        );
      } else if (selectedFilterKey === 'tomorrow') {
        const tomorrowDate = new Date(todayStart);
        tomorrowDate.setDate(new Date(todayStart).getDate() + 1);
        const tomorrowStart = tomorrowDate.getTime();
        const tomorrowEnd = new Date(tomorrowDate.getFullYear(), tomorrowDate.getMonth(), tomorrowDate.getDate(), 23, 59, 59, 999).getTime();
        tempTasks = tempTasks.filter(task => task.scheduledAt && task.scheduledAt >= tomorrowStart && task.scheduledAt <= tomorrowEnd);
      } else if (selectedFilterKey === 'thisWeek') {
        const currentDay = now.getDay();
        const firstDayOfWeek = new Date(now);
        firstDayOfWeek.setDate(now.getDate() - currentDay + (currentDay === 0 ? -6 : 1));
        const weekStart = new Date(firstDayOfWeek.getFullYear(), firstDayOfWeek.getMonth(), firstDayOfWeek.getDate()).getTime();
        const lastDayOfWeek = new Date(weekStart);
        lastDayOfWeek.setDate(new Date(weekStart).getDate() + 6);
        const weekEnd = new Date(lastDayOfWeek.getFullYear(), lastDayOfWeek.getMonth(), lastDayOfWeek.getDate(), 23, 59, 59, 999).getTime();
        tempTasks = tempTasks.filter(task => task.scheduledAt && task.scheduledAt >= weekStart && task.scheduledAt <= weekEnd);
      } else if (selectedFilterKey === 'planned') {
          tempTasks = tempTasks.filter(task => (task.scheduledAt && task.scheduledAt > todayEnd) || (task.dueDate && task.dueDate > todayEnd));
      }
    }
    tempTasks.sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        const aTime = a.scheduledAt || a.dueDate;
        const bTime = b.scheduledAt || b.dueDate;
        if (aTime && bTime) return aTime - bTime;
        if (aTime) return -1;
        if (bTime) return 1;
        return b.createdAt - a.createdAt;
    });
    setFilteredTasks(tempTasks);
  }, [allTasks, selectedFilterKey]);

  useEffect(() => {
    filterAndSortTasks();
  }, [filterAndSortTasks]);

  const showDeadlinePicker = () => setDeadlinePickerVisibility(true);
  const hideDeadlinePicker = () => setDeadlinePickerVisibility(false);
  const handleConfirmDeadline = (date: Date) => {
    setSelectedDeadline(date);
    hideDeadlinePicker();
  };

  const showScheduledAtPicker = () => setScheduledAtPickerVisibility(true);
  const hideScheduledAtPicker = () => setScheduledAtPickerVisibility(false);
  const handleConfirmScheduledAt = (date: Date) => {
    setSelectedScheduledAt(date);
    hideScheduledAtPicker();
  };

  const handleOpenModal = (taskToEdit: Task | null = null) => {
    if (taskToEdit) {
      setEditingTask(taskToEdit);
      setNewTaskTitle(taskToEdit.title);
      setTaskPomodoroDuration(taskToEdit.pomodoroDuration?.toString() || DEFAULT_POMODORO_DURATION.toString());
      setTaskScheduledTime(taskToEdit.scheduledTime || '');
      setSelectedDeadline(taskToEdit.dueDate ? new Date(taskToEdit.dueDate) : undefined);
      setSelectedScheduledAt(taskToEdit.scheduledAt ? new Date(taskToEdit.scheduledAt) : undefined);
    } else {
      setEditingTask(null);
      setNewTaskTitle('');
      setTaskPomodoroDuration(DEFAULT_POMODORO_DURATION.toString());
      setTaskScheduledTime('');
      const now = new Date();
      let defaultDate = new Date(now);
      if (selectedFilterKey === 'tomorrow') {
        defaultDate.setDate(now.getDate() + 1);
      }
      const scheduledAtDate = new Date(defaultDate);
      scheduledAtDate.setHours(8, 0, 0, 0);
      setSelectedDeadline(new Date(defaultDate));
      setSelectedScheduledAt(scheduledAtDate);
      }
    setTaskModalVisible(true);
  };

  const handleSaveTask = async () => {
    if (!user) {
      Alert.alert("Lỗi", "Bạn cần đăng nhập để lưu công việc.");
      return;
    }

    const durationMinutes = parseInt(taskPomodoroDuration, 10);
    if (isNaN(durationMinutes) || durationMinutes <= 0) {
      Alert.alert("Lỗi", "Thời lượng Pomodoro không hợp lệ. Phải là số dương.");
      return;
    }

   let firebaseDueDate: number | null | undefined = selectedDeadline ? selectedDeadline.getTime() : (editingTask ? editingTask.dueDate : undefined);
     if (editingTask && selectedDeadline === undefined && editingTask.dueDate !== undefined) {
        firebaseDueDate = null;
    }

  let firebaseScheduledAt: number | null | undefined = selectedScheduledAt ? selectedScheduledAt.getTime() : (editingTask ? editingTask.scheduledAt : undefined);
    if (editingTask && selectedScheduledAt === undefined && editingTask.scheduledAt !== undefined) {
        firebaseScheduledAt = null;
    }

  try {
      if (editingTask) {
        const updatePayload: Partial<Task> = {
          title: newTaskTitle,
          pomodoroDuration: durationMinutes,
          scheduledTime: taskScheduledTime,
         };

        if (firebaseDueDate !== undefined) {
          updatePayload.dueDate = firebaseDueDate;
        }
         if (firebaseScheduledAt !== undefined) {
          updatePayload.scheduledAt = firebaseScheduledAt;
        }

        await update(ref(db, `users/${user.uid}/tasks/${editingTask.id}`), updatePayload);
        Alert.alert("Thành công", "Đã cập nhật công việc.");
      } else {
        const newTaskRef = push(ref(db, `users/${user.uid}/tasks`));
        const newTaskData: Omit<Task, 'id'> = {
          title: newTaskTitle,
          completed: false,
          categoryKey:
            selectedFilterKey !== 'completed' && selectedFilterKey !== 'all'
              ? selectedFilterKey
              : 'today',
          createdAt: Date.now(),
          dueDate: firebaseDueDate,
          scheduledAt: firebaseScheduledAt,
          pomodoroDuration: durationMinutes,
          scheduledTime: taskScheduledTime,
          completedPomodoros: 0,
          timeSpent: 0,
        };
        await set(newTaskRef, newTaskData);
        Alert.alert("Thành công", "Đã thêm công việc mới.");
      }

      setTaskModalVisible(false);
      setNewTaskTitle('');
      setEditingTask(null);
      setTaskPomodoroDuration(DEFAULT_POMODORO_DURATION.toString());
      setTaskScheduledTime('');
      setSelectedDeadline(undefined);
      setSelectedScheduledAt(undefined);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Một lỗi không xác định đã xảy ra.";
      console.error("Lỗi lưu công việc: ", error);
      Alert.alert("Lỗi", `Không thể lưu công việc. ${errorMessage}`);
    }
  };

  const toggleTaskCompletion = async (task: Task) => {
    if (!user) return;
    try {
      const newCompletedStatus = !task.completed;
      const updates: Partial<Task> = { completed: newCompletedStatus };
      if (newCompletedStatus) {
        updates.categoryKey = 'completed';
      } else {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        if (task.scheduledAt && task.scheduledAt >= todayStart) {
            updates.categoryKey = 'today';
        } else if (task.dueDate && task.dueDate >= todayStart) {
            updates.categoryKey = 'today';
        }
        else {
            updates.categoryKey = 'planned';
        }
      }
      await update(ref(db, `users/${user.uid}/tasks/${task.id}`), updates);
    } catch (error) {
      console.error("Lỗi cập nhật trạng thái công việc: ", error);
      Alert.alert("Lỗi", "Không thể cập nhật trạng thái công việc.");
    }
  };

  const handleDeleteTask = (taskId: string) => {
    if (!user) return;
    Alert.alert(
      "Xác nhận xóa",
      "Bạn có chắc chắn muốn xóa công việc này không?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          onPress: async () => {
            try {
              await remove(ref(db, `users/${user.uid}/tasks/${taskId}`));
              Alert.alert("Thành công", "Đã xóa công việc.");
            } catch (error) {
              console.error("Lỗi xóa công việc: ", error);
              Alert.alert("Lỗi", "Không thể xóa công việc.");
            }
          },
          style: "destructive"
        }
      ]
    );
  };

  const renderCategoryItem = ({ item }: { item: Category }) => {
    let count = 0;
    const nowForCategory = new Date();
    const todayStartForCategory = new Date(nowForCategory.getFullYear(), nowForCategory.getMonth(), nowForCategory.getDate()).getTime();
    const todayEndForCategory = new Date(nowForCategory.getFullYear(), nowForCategory.getMonth(), nowForCategory.getDate(), 23, 59, 59, 999).getTime();

    if (item.filterKey === 'completed') {
        count = allTasks.filter(task => task.completed).length;
    } else {
        const pendingTasks = allTasks.filter(t => !t.completed);
        if (item.filterKey === 'all') {
            count = pendingTasks.length;
        } else if (item.filterKey === 'today') {
            count = pendingTasks.filter(t =>
                (t.scheduledAt && t.scheduledAt >= todayStartForCategory && t.scheduledAt <= todayEndForCategory) ||
                (!t.scheduledAt && t.dueDate && t.dueDate >= todayStartForCategory && t.dueDate <= todayEndForCategory) ||
                (!t.scheduledAt && !t.dueDate && t.categoryKey === 'today')
            ).length;
        }
    }
    return (
        <TouchableOpacity
            style={[styles.categoryPill, selectedFilterKey === item.filterKey && styles.activeCategoryPill]}
            onPress={() => setSelectedFilterKey(item.filterKey)}
        >
            <Ionicons name={item.icon} size={18} color={selectedFilterKey === item.filterKey ? '#121212' : item.color} style={styles.categoryPillIcon} />
            <Text style={[styles.categoryPillText, selectedFilterKey === item.filterKey && styles.activeCategoryPillText]}>{item.title}</Text>
            {count > 0 && <Text style={[styles.categoryPillCount, selectedFilterKey === item.filterKey && styles.activeCategoryPillCount]}>{count}</Text>}
        </TouchableOpacity>
    );
  };

  const renderTaskItem = ({ item }: { item: Task }) => (
    <View style={styles.taskCard}>
      <TouchableOpacity style={styles.taskCheckButton} onPress={() => toggleTaskCompletion(item)}>
        <Ionicons
          name={item.completed ? "checkbox" : "square-outline"}
          size={24}
          color={item.completed ? "#32CD32" : "#ccc"}
        />
      </TouchableOpacity>

      <TouchableOpacity style={styles.taskTitleContainer} onPress={() => handleOpenModal(item)}>
        <Text style={[styles.taskCardTitle, item.completed && styles.completedTaskTitle]}>{item.title}</Text>
        {item.scheduledTime && (
          <Text style={[styles.scheduledAtText, item.completed && styles.completedTaskTitle]}>
            <Ionicons name="alarm-outline" size={13} color={item.completed ? '#777' : '#4CAF50'} /> Giờ làm: {item.scheduledTime}
          </Text>
        )}
        {item.scheduledAt && (
          <Text style={[newModalStyles.scheduledAtText, item.completed && styles.completedTaskTitle]}>
            <Ionicons name="time-outline" size={13} color={item.completed ? '#777' : '#FF8C00'} /> Bắt đầu: {formatDate(item.scheduledAt)}
          </Text>
        )}
        {item.dueDate && !item.scheduledAt && (
            <Text style={[styles.dueDateText, item.completed && styles.completedTaskTitle]}>
                <Ionicons name="calendar-outline" size={13} color={item.completed ? '#777' : '#FF3B30'} /> Deadline: {formatDate(item.dueDate, false)}
            </Text>
        )}
        <Text style={styles.pomodoroInfoText}>
            Pomo: {item.pomodoroDuration || DEFAULT_POMODORO_DURATION} phút | HT: {item.completedPomodoros ?? 0}
        </Text>
      </TouchableOpacity>

      {!item.completed && (
        <TouchableOpacity
          style={styles.playButton}
          onPress={() => router.push({
            pathname: '/(tabs)/pomodoro',
            params: {
              taskId: item.id,
              taskTitle: item.title,
              taskPomodoroDuration: (item.pomodoroDuration || DEFAULT_POMODORO_DURATION).toString()
            }
          })}
        >
          <Ionicons name="play-outline" size={28} color="#FF6F00" />
        </TouchableOpacity>
      )}
      <TouchableOpacity onPress={() => handleDeleteTask(item.id)} style={styles.deleteButton}>
        <Ionicons name="trash-outline" size={22} color="#FF3B30" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.screenContainer}>
      <View style={styles.mainHeader}>
        {user ? (
          <>
            <Text style={styles.authText}>Chào, {user.displayName || user.email}</Text>
            <TouchableOpacity onPress={() => router.push('/profile/UserProfileScreen')} style={homeScreenStyles.headerIcon}>
              <Ionicons name="person-circle-outline" size={28} color="#FFD700" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('../settings')} style={homeScreenStyles.headerIcon}>
              <Ionicons name="settings-outline" size={26} color="white" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleLogout} style={homeScreenStyles.headerIcon}>
              <Ionicons name="log-out-outline" size={28} color="#FF6F00" />
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
            <Text style={styles.authText}>Đăng Nhập | Đăng ký</Text>
          </TouchableOpacity>
        )}
      </View>
        <View style={styles.searchContainer}>
            <TextInput style={styles.searchInputStyle} placeholder="🔍  Tìm kiếm công việc..." placeholderTextColor="#888" />
        </View>
        <View style={{ height: 55, marginBottom: 15}}>
            <FlatList
                data={CATEGORIES}
                renderItem={renderCategoryItem}
                keyExtractor={(item) => item.filterKey}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoriesListContainer}
            />
        </View>
        <View style={styles.taskListHeader}>
            <Text style={styles.currentCategoryTitle}>
                {CATEGORIES.find(cat => cat.filterKey === selectedFilterKey)?.title || "Công việc"}
            </Text>
        </View>
      {filteredTasks.length === 0 ? (
        <View style={styles.emptyStateContainer}>
            <Ionicons name="file-tray-outline" size={60} color="#555" />
            <Text style={styles.emptyStateText}>Chưa có công việc nào trong mục này.</Text>
            {selectedFilterKey !== 'completed' && <Button title="Thêm công việc mới" onPress={() => handleOpenModal()} color="#FF6F00"/>}
        </View>
      ) : (
        <FlatList
            data={filteredTasks}
            renderItem={renderTaskItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: 150 }}
        />
      )}

      <Modal
          animationType="slide"
          transparent={true}
          visible={isTaskModalVisible}
          onRequestClose={() => setTaskModalVisible(false)}
        >
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setTaskModalVisible(false)}>
            <TouchableOpacity style={styles.modalContent} activeOpacity={1} onPress={(e) => e.stopPropagation()}>
              <Text style={styles.modalFormTitle}>
                {editingTask ? "Sửa công việc" : "Thêm công việc mới"}
              </Text>

              <TextInput
                style={styles.modalFormInput}
                placeholder="Tên công việc..."
                placeholderTextColor="#999"
                value={newTaskTitle}
                onChangeText={setNewTaskTitle}
                autoFocus
              />
              <Text style={newModalStyles.modalLabel}>Thời lượng Pomodoro (phút):</Text>
              <TextInput
                style={styles.modalFormInput}
                placeholder={`Mặc định: ${DEFAULT_POMODORO_DURATION} phút`}
                placeholderTextColor="#999"
                keyboardType="numeric"
                value={taskPomodoroDuration}
                onChangeText={setTaskPomodoroDuration}
              />
              <Text style={newModalStyles.modalLabel}>Thời gian thực hiện (HH:mm):</Text>
              <TextInput
                style={styles.modalFormInput}
                placeholder="Ví dụ: 08:30 (để trống nếu không có)"
                placeholderTextColor="#999"
                value={taskScheduledTime}
                onChangeText={setTaskScheduledTime}
              />
              <Text style={newModalStyles.modalLabel}>Deadline (Ngày hết hạn):</Text>
              <TouchableOpacity onPress={showDeadlinePicker} style={newModalStyles.datePickerButton}>
                <Ionicons name="calendar-outline" size={20} color="#FF6F00" style={{ marginRight: 10 }}/>
                <Text style={newModalStyles.datePickerButtonText}>
                  {selectedDeadline ? formatDate(selectedDeadline.getTime(), false) : "Chọn ngày hết hạn"}
                </Text>
              </TouchableOpacity>
              {selectedDeadline && (
                <TouchableOpacity onPress={() => setSelectedDeadline(undefined)} style={newModalStyles.clearDateButton}>
                  <Text style={newModalStyles.clearDateButtonText}>Xóa Deadline</Text>
                </TouchableOpacity>
              )}

              <Text style={newModalStyles.modalLabel}>Lên lịch bắt đầu (Ngày & Giờ):</Text>
              <TouchableOpacity onPress={showScheduledAtPicker} style={newModalStyles.datePickerButton}>
                 <Ionicons name="time-outline" size={20} color="#FF6F00" style={{ marginRight: 10 }}/>
                <Text style={newModalStyles.datePickerButtonText}>
                  {selectedScheduledAt ? formatDate(selectedScheduledAt.getTime(), true) : "Chọn ngày & giờ bắt đầu"}
                </Text>
              </TouchableOpacity>
              {selectedScheduledAt && (
                <TouchableOpacity onPress={() => setSelectedScheduledAt(undefined)} style={newModalStyles.clearDateButton}>
                  <Text style={newModalStyles.clearDateButtonText}>Xóa Lịch</Text>
                </TouchableOpacity>
              )}

              <View style={styles.modalActionButtons}>
                <Button title="Hủy" onPress={() => setTaskModalVisible(false)} color="#FF3B30" />
                <View style={{ width: 20 }} />
                <Button title={editingTask ? "Lưu" : "Thêm"} onPress={handleSaveTask} color="#FF6F00" />
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

      <DateTimePickerModal
        isVisible={isDeadlinePickerVisible}
        mode="date"
        onConfirm={handleConfirmDeadline}
        onCancel={hideDeadlinePicker}
        date={selectedDeadline || new Date()}
        minimumDate={new Date()}
        locale="vi_VN"
        display={Platform.OS === 'ios' ? 'inline' : 'default'}
      />
      <DateTimePickerModal
        isVisible={isScheduledAtPickerVisible}
        mode="datetime"
        onConfirm={handleConfirmScheduledAt}
        onCancel={hideScheduledAtPicker}
        date={selectedScheduledAt || new Date()}
        minimumDate={new Date()}
        locale="vi_VN"
        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
        is24Hour={true}
      />
       {selectedFilterKey !== 'completed' && (
        <TouchableOpacity style={styles.floatingActionButton} onPress={() => handleOpenModal()}>
            <Ionicons name="add" size={32} color="white" />
        </TouchableOpacity>
      )}
      <TouchableOpacity style={styles.bottomPomodoroButton} onPress={() => router.push('/(tabs)/pomodoro')}>
        <Ionicons name="timer-outline" size={30} color="white" />
      </TouchableOpacity>
    </View>
  );
}

const homeScreenStyles = StyleSheet.create({
  headerIcon: {
    marginLeft: 15,
    padding: 5,
  }
});

const newModalStyles = StyleSheet.create({
  modalLabel: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 8,
    marginLeft: 5,
    marginTop: 10,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderRadius: 10,
    paddingVertical: 15,
    paddingHorizontal: 15,
    marginBottom: 5,
  },
  datePickerButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  clearDateButton: {
    alignSelf: 'flex-start',
    marginTop: 0,
    marginBottom: 15,
    paddingVertical: 5,
  },
  clearDateButtonText: {
    color: '#FF6F00',
    fontSize: 13,
  },
  scheduledAtText: {
    color: '#FF8C00',
    fontSize: 13,
    marginTop: 4,
  },
});
