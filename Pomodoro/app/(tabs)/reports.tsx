
import dayjs from 'dayjs';
import { onValue, ref } from 'firebase/database';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, ScrollView, Text, View } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { useAuth } from '../../context/AuthContext'; // Đường dẫn tới AuthContext
import { db } from '../../firebaseConfig'; // Đường dẫn tới firebaseConfig
import { styles } from './pomodoro.styles';


interface PomodoroSession {

  durationMinutes: number;
  completedAt: number;
}

interface ChartDayData {
  date: string; // YYYY-MM-DD
  minutes: number;
}

export default function ReportScreen() {
  const { user } = useAuth();
  const [chartDataPoints, setChartDataPoints] = useState<ChartDayData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchWeeklyStats = async () => {
      setLoading(true);
      setError(null);
      const endDate = dayjs(); // Hôm nay
      const startDate = endDate.subtract(6, 'day'); // 7 ngày trước (tính cả hôm nay)
      const daysInRange: ChartDayData[] = [];

      // Tạo một mảng các ngày trong 7 ngày qua với giá trị ban đầu là 0
      for (let i = 0; i < 7; i++) {
        const currentDate = startDate.add(i, 'day');
        daysInRange.push({
          date: currentDate.format('YYYY-MM-DD'),
          minutes: 0,
        });
      }

      try {
        const promises = daysInRange.map(dayData => {
          const statsDateRef = ref(db, `stats/${user.uid}/${dayData.date}`);
          return new Promise<ChartDayData>((resolve) => {
            onValue(statsDateRef, (snapshot) => {
              const dailyStats = snapshot.val();
              resolve({
                date: dayData.date,
                minutes: dailyStats?.minutesWorked || 0, // Lấy minutesWorked, mặc định là 0 nếu không có
              });
            }, { onlyOnce: true }); // Đọc một lần cho mỗi ngày
          });
        });

        const dailyDataArray = await Promise.all(promises);

        // Sắp xếp lại theo đúng thứ tự ngày nếu Promise.all không đảm bảo
        dailyDataArray.sort((a, b) => dayjs(a.date).valueOf() - dayjs(b.date).valueOf());

        setChartDataPoints(dailyDataArray);

      } catch (e) {
        console.error("Error fetching weekly stats from /stats:", e);
        setError("Đã có lỗi xảy ra khi lấy dữ liệu báo cáo.");
      } finally {
        setLoading(false);
      }
    };

    fetchWeeklyStats();

  }, [user]);

  const screenWidth = Dimensions.get("window").width;

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#FF6F00" />
        <Text style={styles.loadingText}>Đang tải báo cáo...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!user) {
    return (
        <View style={[styles.container, styles.centered]}>
            <Text style={styles.infoText}>Vui lòng đăng nhập để xem báo cáo.</Text>
        </View>
    );
  }

  if (chartDataPoints.length === 0) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.infoText}>Chưa có dữ liệu làm việc trong 7 ngày qua.</Text>
      </View>
    );
  }

  const chartConfig = {
    backgroundColor: "#1E1E1E",
    backgroundGradientFrom: "#121212",
    backgroundGradientTo: "#1E1E1E",
    decimalPlaces: 0, // không có số thập phân cho phút
    color: (opacity = 1) => `rgba(255, 111, 0, ${opacity})`, // Màu cam
    labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`, // Màu trắng cho label
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: "5", // Kích thước chấm
      strokeWidth: "2",
      stroke: "#FF6F00", // Màu viền chấm
    },
    propsForBackgroundLines: {
        strokeDasharray: "", // Nét liền cho đường lưới
        stroke: "rgba(255, 255, 255, 0.2)", // Màu đường lưới
    }
  };

  const lineChartData = {
    labels: chartDataPoints.map(d => dayjs(d.date).format('DD/MM')), // MM/DD
    datasets: [
      {
        data: chartDataPoints.map(d => d.minutes),
        color: (opacity = 1) => `rgba(255, 111, 0, ${opacity})`, // Màu đường line
        strokeWidth: 2, // Độ dày đường line
      },
    ],
    legend: ["Số phút làm việc"] // Chú thích cho biểu đồ
  };

  return (
    <ScrollView style={styles.container}>
        <Text style={styles.headerTitle}>Báo cáo Thời gian Làm việc</Text>
        <Text style={styles.subHeaderTitle}>7 ngày gần nhất</Text>
        {chartDataPoints.length > 0 ? (
        <LineChart
            data={lineChartData}
            width={screenWidth - 20} // Điều chỉnh padding
            height={250}
            chartConfig={chartConfig}
            bezier // Làm cho đường cong mượt hơn
            style={{
            marginVertical: 15,
            borderRadius: 16,
            alignSelf: 'center'
            }}
            yAxisSuffix="p" // Thêm 'p' sau số phút
            // fromZero // Bắt đầu trục Y từ 0
            // segments={5} // Số đoạn trên trục Y (tùy chọn)
        />
        ) : (
        <Text style={styles.infoText}>Không có dữ liệu để hiển thị biểu đồ.</Text>
        )}
        {/* Bạn có thể thêm các thống kê khác ở đây */}
    </ScrollView>
  );
}
