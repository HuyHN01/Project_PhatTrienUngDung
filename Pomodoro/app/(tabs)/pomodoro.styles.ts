// app/(tabs)/pomodoro.styles.ts
import { StyleSheet, Platform } from 'react-native';

export const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? 30 : 55,
    paddingHorizontal: 10,
  },
  headerBar: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    marginBottom: 30,
  },
  headerText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 10,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: {width: -1, height: 1},
    textShadowRadius: 5
  },
  timerDisplayContainer: {
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  timerText: {
    fontSize: 80,
    color: 'white',
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: {width: -1, height: 1},
    textShadowRadius: 10
  },
  mainActionButton: {
    backgroundColor: 'white',
    paddingVertical: 16,
    paddingHorizontal: 50,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 35,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2, },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  mainActionButtonText: {
    fontSize: 18,
    color: '#1C1C2E',
    fontWeight: 'bold',
  },
  modeSelectorContainer: {
    flexDirection: 'row',
    marginBottom: 40,
  },
  modeButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 25,
    marginHorizontal: 5,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  activeMode: {
    backgroundColor: '#FFFFFF',
  },
  modeButtonText: {
    color: '#E0E0E0',
    fontSize: 14,
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
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 25 : 15,
  },
  toolbarActionButton: {
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  toolbarActionText: {
    color: 'white',
    fontSize: 10,
    marginTop: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 2
  },
  screenContainer: {
    flex: 1,
    backgroundColor: '#121212',
  },
  mainHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 30 : 60,
    paddingBottom: 15,
    backgroundColor: '#1E1E1E',
  },
  authText: {
    color: '#FF6F00',
    marginLeft: 10,
    fontSize: 17,
    fontWeight: 'bold',
  },
  headerActionIcons: {
    flexDirection: 'row',
    flex: 1,
    justifyContent: 'flex-end',
  },
  actionIcon: {
    marginLeft: 20,
  },
  searchContainer: {
    backgroundColor: '#1E1E1E',
    paddingHorizontal: 16,
    paddingBottom: 15,
    paddingTop: 5,
  },
  searchInputStyle: {
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 15,
    color: '#fff',
    fontSize: 16,
  },
  categoriesListContainer: {
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 15,
    backgroundColor: '#2C2C2E',
    borderRadius: 20,
    marginRight: 10,
  },
  activeCategoryPill: {
    backgroundColor: '#FF6F00',
  },
  categoryPillIcon: {
    marginRight: 6,
  },
  categoryPillText: {
    color: '#E0E0E0',
    fontSize: 14,
    fontWeight: '500',
  },
  activeCategoryPillText: {
    color: '#121212',
    fontWeight: 'bold',
  },
   categoryPillCount: {
    marginLeft: 5,
    fontSize: 12,
    color: '#A0A0A0',
    fontWeight: 'bold',
  },
  activeCategoryPillCount: {
    color: '#2C2C2E',
  },
  taskListHeader: {
    paddingHorizontal: 16,
    marginTop: 5,
    marginBottom: 12,
  },
  currentCategoryTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  taskCheckButton: {
    paddingRight: 12, // Thêm padding để dễ bấm hơn
  },
  taskTitleContainer: {
    flex: 1,
  },
  taskCardTitle: {
    color: '#fff',
    fontSize: 17,
  },
  completedTaskTitle: {
    textDecorationLine: 'line-through',
    color: '#777',
  },
  pomodoroInfoText: {
      color: '#aaa',
      fontSize: 12,
      marginTop: 4,
  },
  playButton: {
    padding: 8, // Khu vực bấm lớn hơn
  },
  deleteButton: {
    padding: 8,
    marginLeft: 5,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalContent: {
    width: '90%',
    backgroundColor: '#2C2C2E',
    borderRadius: 15,
    padding: 25,
    alignItems: 'stretch', // Để input chiếm full width
  },
  modalFormTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 25,
    color: '#fff',
    textAlign: 'center',
  },
  modalFormInput: {
    backgroundColor: '#1E1E1E',
    borderRadius: 10,
    paddingVertical: 15,
    paddingHorizontal: 15,
    marginBottom: 25,
    fontSize: 16,
    color: '#fff',
  },
  modalActionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end', // Đẩy nút sang phải
  },
  floatingActionButton: {
    position: 'absolute',
    right: 25,
    bottom: 95, // Nâng lên trên nút Pomodoro
    backgroundColor: '#FF6F00',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
  },
  bottomPomodoroButton: {
    position: 'absolute',
    bottom: 20,
    left: '50%',
    transform: [{ translateX: -35 }], // Căn giữa chính xác
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#FF6F00',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
    borderWidth: 3,
    borderColor: '#121212'
  },
//   bottomPomodoroText: { // Nếu muốn hiển thị số
//     color: 'white',
//     fontSize: 24,
//     fontWeight: 'bold',
//   },
  emptyStateContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingBottom: 100, // Để không bị che
  },
  emptyStateText: {
    color: '#888',
    fontSize: 16,
    marginTop: 15,
    marginBottom: 20,
  }
});