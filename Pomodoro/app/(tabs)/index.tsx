// app/(tabs)/index.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Modal, Button, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { db } from '../../firebaseConfig'; // Điều chỉnh đường dẫn nếu cần
import { ref, onValue, push, set, update, remove } from 'firebase/database';
import { styles } from './pomodoro.styles'; // Đường dẫn đến file styles
// Interfaces
interface Task {
  id: string;
  title: string;
  completed: boolean;
  categoryKey: string; // 'today', 'tomorrow', 'thisWeek', 'planned', 'all', 'event'
  createdAt: number;
  dueDate?: number;
  estimatedPomodoros?: number;
  completedPomodoros: number;
  timeSpent?: number; // in minutes
  projectId?: string;
}

interface Category {
  title: string;
  icon: keyof typeof Ionicons.glyphMap; // Để đảm bảo icon hợp lệ
  color: string;
  filterKey: Task['categoryKey'] | 'completed';
}

const CATEGORIES: Category[] = [
  { title: 'Hôm nay', icon: 'sunny-outline', color: '#FFD700', filterKey: 'today' },
  { title: 'Ngày mai', icon: 'alarm-outline', color: '#FF8C00', filterKey: 'tomorrow' },
  { title: 'Tuần này', icon: 'calendar-number-outline', color: '#6A5ACD', filterKey: 'thisWeek' },
  { title: 'Đã lên kế hoạch', icon: 'calendar-outline', color: '#87CEEB', filterKey: 'planned' },
  // { title: 'Sự kiện', icon: 'megaphone-outline', color: '#00BFA5', filterKey: 'event' }, // Cần logic riêng
  { title: 'Tất cả', icon: 'file-tray-full-outline', color: '#2196F3', filterKey: 'all' },
  { title: 'Đã hoàn thành', icon: 'checkmark-done-circle-outline', color: '#32CD32', filterKey: 'completed' },
];

export default function HomeScreen() {
  const router = useRouter();
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [selectedFilterKey, setSelectedFilterKey] = useState<Category['filterKey']>('today');

  const [isTaskModalVisible, setTaskModalVisible] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // --- Firebase: Lấy danh sách công việc ---
  useEffect(() => {
    const tasksRef = ref(db, 'tasks'); // Giả sử node của bạn là 'tasks'
    const unsubscribe = onValue(tasksRef, (snapshot) => {
      const data = snapshot.val();
      const loadedTasks: Task[] = data ? Object.keys(data).map(key => ({ id: key, ...data[key] })) : [];
      setAllTasks(loadedTasks);
    });
    return () => unsubscribe();
  }, []);

  // --- Lọc công việc ---
  const filterAndSortTasks = useCallback(() => {
    let tempTasks = [...allTasks];
    const now = new Date();
    const todayStart = new Date(now.setHours(0, 0, 0, 0)).getTime();
    const todayEnd = new Date(now.setHours(23, 59, 59, 999)).getTime();

    if (selectedFilterKey === 'completed') {
      tempTasks = tempTasks.filter(task => task.completed);
    } else {
      tempTasks = tempTasks.filter(task => !task.completed); // Mặc định chỉ hiển thị task chưa hoàn thành
      if (selectedFilterKey === 'today') {
        tempTasks = tempTasks.filter(task => (task.dueDate && task.dueDate >= todayStart && task.dueDate <= todayEnd) || (!task.dueDate && task.categoryKey === 'today'));
      } else if (selectedFilterKey === 'tomorrow') {
        const tomorrowStart = new Date(now.setDate(now.getDate() + 1)).setHours(0,0,0,0);
        const tomorrowEnd = new Date(now.setDate(now.getDate())).setHours(23,59,59,999); // now date is already tomorrow
        tempTasks = tempTasks.filter(task => task.dueDate && task.dueDate >= tomorrowStart && task.dueDate <= tomorrowEnd);
      } else if (selectedFilterKey === 'thisWeek') {
        const weekStart = new Date(now.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1) )).setHours(0,0,0,0); // Monday
        const weekEnd = new Date(now.setDate(now.getDate() - now.getDay() + 7)).setHours(23,59,59,999); // Sunday
        tempTasks = tempTasks.filter(task => task.dueDate && task.dueDate >= weekStart && task.dueDate <= weekEnd);
      } else if (selectedFilterKey === 'planned') {
          tempTasks = tempTasks.filter(task => task.dueDate && task.dueDate > todayEnd); // Các task có kế hoạch sau hôm nay
      }
      // 'all' không cần lọc thêm (ngoài việc chưa hoàn thành)
    }
    // Sắp xếp: công việc chưa hoàn thành lên trước, sau đó theo ngày tạo mới nhất
    tempTasks.sort((a, b) => (a.completed === b.completed) ? (b.createdAt - a.createdAt) : (a.completed ? 1 : -1));
    setFilteredTasks(tempTasks);
  }, [allTasks, selectedFilterKey]);

  useEffect(() => {
    filterAndSortTasks();
  }, [filterAndSortTasks]);


  const handleOpenModal = (taskToEdit: Task | null = null) => {
    if (taskToEdit) {
      setEditingTask(taskToEdit);
      setNewTaskTitle(taskToEdit.title);
    } else {
      setEditingTask(null);
      setNewTaskTitle('');
    }
    setTaskModalVisible(true);
  };

  const handleSaveTask = async () => {
    if (newTaskTitle.trim() === '') {
      Alert.alert("Lỗi", "Tên công việc không được để trống.");
      return;
    }

    const taskData = {
      title: newTaskTitle,
      completedPomodoros: editingTask?.completedPomodoros || 0,
      timeSpent: editingTask?.timeSpent || 0,
      // Thêm các trường khác như dueDate, estimatedPomodoros nếu có input trong modal
    };

    try {
      if (editingTask) { // Cập nhật công việc
        await update(ref(db, `tasks/${editingTask.id}`), {
            ...editingTask, // Giữ lại các trường cũ không thay đổi
            title: newTaskTitle,
            // Cập nhật các trường khác nếu có
        });
        Alert.alert("Thành công", "Đã cập nhật công việc.");
      } else { // Thêm công việc mới
        const newTaskRef = push(ref(db, 'tasks'));
        const newTask: Omit<Task, 'id'> = {
          title: newTaskTitle,
          completed: false,
          categoryKey: selectedFilterKey !== 'completed' && selectedFilterKey !== 'all' ? selectedFilterKey : 'today', // Mặc định cho vào "Hôm nay" nếu đang ở mục "Đã hoàn thành" hoặc "Tất cả"
          createdAt: Date.now(),
          completedPomodoros: 0,
          timeSpent: 0,
          // dueDate: ... // Xử lý dueDate nếu có trường nhập
        };
        await set(newTaskRef, newTask);
        Alert.alert("Thành công", "Đã thêm công việc mới.");
      }
      setTaskModalVisible(false);
      setNewTaskTitle('');
      setEditingTask(null);
    } catch (error) {
      console.error("Lỗi lưu công việc: ", error);
      Alert.alert("Lỗi", "Không thể lưu công việc. Vui lòng thử lại.");
    }
  };

  const toggleTaskCompletion = async (task: Task) => {
    try {
      await update(ref(db, `tasks/${task.id}`), { completed: !task.completed });
    } catch (error) {
      console.error("Lỗi cập nhật trạng thái công việc: ", error);
      Alert.alert("Lỗi", "Không thể cập nhật trạng thái.");
    }
  };

  const handleDeleteTask = (taskId: string) => {
    Alert.alert(
      "Xác nhận xóa",
      "Bạn có chắc chắn muốn xóa công việc này không?",
      [
        { text: "Hủy", style: "cancel" },
        { text: "Xóa", style: "destructive", onPress: async () => {
            try {
              await remove(ref(db, `tasks/${taskId}`));
            } catch (error) {
              console.error("Lỗi xóa công việc: ", error);
              Alert.alert("Lỗi", "Không thể xóa công việc.");
            }
          }
        }
      ]
    );
  };

  const renderCategoryItem = ({ item }: { item: Category }) => {
    // Đếm số lượng task cho từng category (chưa hoàn thành, trừ mục "Đã hoàn thành")
    let count = 0;
    if (item.filterKey === 'completed') {
        count = allTasks.filter(task => task.completed).length;
    } else {
        // Tạm thời dùng allTasks để đếm cho đơn giản, bạn có thể tối ưu bằng cách lọc như filterAndSortTasks
        if (item.filterKey === 'all') {
            count = allTasks.filter(task => !task.completed).length;
        } else if (item.filterKey === 'today') {
             const now = new Date();
             const todayStart = new Date(now.setHours(0, 0, 0, 0)).getTime();
             const todayEnd = new Date(now.setHours(23, 59, 59, 999)).getTime();
             count = allTasks.filter(task => !task.completed && ((task.dueDate && task.dueDate >= todayStart && task.dueDate <= todayEnd) || (!task.dueDate && task.categoryKey === 'today'))).length;
        }
        // Thêm logic đếm cho các category khác nếu cần
    }


    return (
        <TouchableOpacity
        style={[
            styles.categoryPill,
            selectedFilterKey === item.filterKey && styles.activeCategoryPill
        ]}
        onPress={() => setSelectedFilterKey(item.filterKey)}
        >
        <Ionicons name={item.icon} size={18} color={selectedFilterKey === item.filterKey ? '#121212' : item.color} style={styles.categoryPillIcon} />
        <Text style={[styles.categoryPillText, selectedFilterKey === item.filterKey && styles.activeCategoryPillText]}>{item.title}</Text>
        {count > 0 && <Text style={[styles.categoryPillCount, selectedFilterKey === item.filterKey && styles.activeCategoryPillCount]}>{count}</Text>}
        </TouchableOpacity>
    );
  }

  const renderTaskItem = ({ item }: { item: Task }) => (
    <View style={styles.taskCard}>
      <TouchableOpacity onPress={() => toggleTaskCompletion(item)} style={styles.taskCheckButton}>
        <Ionicons
          name={item.completed ? 'checkmark-circle' : 'ellipse-outline'}
          size={28}
          color={item.completed ? '#32CD32' : '#aaa'}
        />
      </TouchableOpacity>
      <TouchableOpacity style={styles.taskTitleContainer} onPress={() => handleOpenModal(item)}>
        <Text style={[styles.taskCardTitle, item.completed && styles.completedTaskTitle]}>
          {item.title}
        </Text>
        {/* Hiển thị thêm thông tin như số Pomodoro */}
        {(item.estimatedPomodoros || item.completedPomodoros > 0) && (
            <Text style={styles.pomodoroInfoText}>
                {item.completedPomodoros || 0} / {item.estimatedPomodoros || '?'} Pomodoros
            </Text>
        )}

      </TouchableOpacity>
      {!item.completed && (
        <TouchableOpacity
          style={styles.playButton}
          onPress={() => router.push({ pathname: '../(tabs)/pomodoro', params: { taskId: item.id, taskTitle: item.title } })}
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
      {/* Header */}
      <View style={styles.mainHeader}>
        <TouchableOpacity onPress={() => console.log("Mở Profile/Xác thực")}>
          <Ionicons name="person-circle-outline" size={38} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => console.log("Mở Profile/Xác thực")}>
          <Text style={styles.authText}>Đăng Nhập | Đăng ký</Text>
        </TouchableOpacity>
        <View style={styles.headerActionIcons}>
          <Ionicons name="notifications-outline" size={26} color="#fff" style={styles.actionIcon} />
          <Ionicons name="leaf-outline" size={26} color="#fff" style={styles.actionIcon} />
          <Ionicons name="trophy-outline" size={26} color="#fff" style={styles.actionIcon} />
        </View>
      </View>

      {/* Search bar */}
      <View style={styles.searchContainer}>
        <TextInput style={styles.searchInputStyle} placeholder="🔍  Tìm kiếm công việc..." placeholderTextColor="#888" />
      </View>

      {/* Category Pills */}
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

      {/* Task List Header */}
      <View style={styles.taskListHeader}>
          <Text style={styles.currentCategoryTitle}>
              {CATEGORIES.find(cat => cat.filterKey === selectedFilterKey)?.title || "Công việc"}
          </Text>
          {/* Có thể thêm nút "+" nhỏ ở đây nếu không dùng FAB */}
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
            contentContainerStyle={{ paddingBottom: 150 }} // Để không bị che bởi FAB và pomodoro button
        />
      )}

      {/* Add/Edit Task Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isTaskModalVisible}
        onRequestClose={() => setTaskModalVisible(false)}
      >
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setTaskModalVisible(false)}>
            <TouchableOpacity style={styles.modalContent} activeOpacity={1} onPress={(e) => e.stopPropagation()}>
                <Text style={styles.modalFormTitle}>{editingTask ? "Sửa công việc" : "Thêm công việc mới"}</Text>
                <TextInput
                style={styles.modalFormInput}
                placeholder="Tên công việc..."
                placeholderTextColor="#999"
                value={newTaskTitle}
                onChangeText={setNewTaskTitle}
                autoFocus
                />
                {/* TODO: Thêm các trường nhập liệu khác: dueDate, estimatedPomodoros,... */}
                <View style={styles.modalActionButtons}>
                    <Button title="Hủy" onPress={() => setTaskModalVisible(false)} color="#FF3B30" />
                    <View style={{width: 20}}/>
                    <Button title={editingTask ? "Lưu" : "Thêm"} onPress={handleSaveTask} color="#FF6F00"/>
                </View>
            </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* FAB for adding task */}
      {selectedFilterKey !== 'completed' && ( // Chỉ hiển thị FAB nếu không ở mục "Đã hoàn thành"
        <TouchableOpacity style={styles.floatingActionButton} onPress={() => handleOpenModal()}>
            <Ionicons name="add" size={32} color="white" />
        </TouchableOpacity>
      )}


      {/* Pomodoro navigation button (fixed at bottom center) */}
      <TouchableOpacity style={styles.bottomPomodoroButton} onPress={() => router.push('../(tabs)/pomodoro')}>
        {/* TODO: Hiển thị thời gian Pomodoro hiện tại nếu đang chạy, hoặc icon */}
        <Ionicons name="timer-outline" size={30} color="white" />
        {/* <Text style={styles.bottomPomodoroText}>60</Text> */}
      </TouchableOpacity>
    </View>
  );
}

