import * as Notifications from 'expo-notifications';
import { Platform } from "react-native";


export async function schedulePomodoroNotifications(durationMinutes: number) {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
        await Notifications.scheduleNotificationAsync({
        content: {
        title: '⏱️ Pomodoro bắt đầu',
        body: `Bạn bắt đầu phiên ${durationMinutes} phút.`,
        },
        trigger: null,
    });

    await Notifications.scheduleNotificationAsync({
        content: {
        title: '✅ Pomodoro kết thúc',
        body: 'Đã xong! Nghỉ ngơi một chút nhé!',
        }, trigger: {
            seconds: durationMinutes * 60,
        repeats: false,
        } as Notifications.NotificationTriggerInput,  });
     console.log('Pomodoro notifications scheduled for native.');
  } else {
    console.log('Notifications.scheduleNotificationAsync is not available on web. Skipping pomodoro notifications.');
    // Bạn có thể cân nhắc sử dụng Web Notification API ở đây nếu muốn có thông báo trên web,
    // nhưng nó là một API khác và cần xử lý riêng.
  }
}
export async function scheduleBreakReminder(breakMinutes: number) {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
        await Notifications.scheduleNotificationAsync({
        content: {
        title: '🍵 Hết giờ nghỉ',
        body: `Hết ${breakMinutes} phút nghỉ, quay lại làm việc thôi!`,
        },
        trigger: {
        seconds: breakMinutes * 60,
        repeats: false,
        } as Notifications.NotificationTriggerInput,
    });
     console.log('Break reminder scheduled for native.');
  } else {
    console.log('Notifications.scheduleNotificationAsync is not available on web. Skipping break reminder.');
  }
}