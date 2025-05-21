import dayjs from 'dayjs';
import { onValue, ref } from 'firebase/database';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, ScrollView, Text, View } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebaseConfig'; 
import { styles } from './pomodoro.styles';

interface PomodoroSession {
  durationMinutes: number;
  completedAt: number;
}

interface ChartDayData {
  date: string; 
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
      const endDate = dayjs(); 
      const startDate = endDate.subtract(6, 'day');
      const daysInRange: ChartDayData[] = [];

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
                minutes: dailyStats?.minutesWorked || 0,
              });
            }, { onlyOnce: true });
          });
        });

        const dailyDataArray = await Promise.all(promises);

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
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(255, 111, 0, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: "5",
      strokeWidth: "2",
      stroke: "#FF6F00",
    },
    propsForBackgroundLines: {
        strokeDasharray: "",
        stroke: "rgba(255, 255, 255, 0.2)",
    }
  };

  const lineChartData = {
    labels: chartDataPoints.map(d => dayjs(d.date).format('DD/MM')),
    datasets: [
      {
        data: chartDataPoints.map(d => d.minutes),
        color: (opacity = 1) => `rgba(255, 111, 0, ${opacity})`,
        strokeWidth: 2,
      },
    ],
    legend: ["Số phút làm việc"]
  };

  return (
    <ScrollView style={styles.container}>
        <Text style={styles.headerTitle}>Báo cáo Thời gian Làm việc</Text>
        <Text style={styles.subHeaderTitle}>7 ngày gần nhất</Text>
        {chartDataPoints.length > 0 ? (
        <LineChart
            data={lineChartData}
            width={screenWidth - 20}
            height={250}
            chartConfig={chartConfig}
            bezier
            style={{
            marginVertical: 15,
            borderRadius: 16,
            alignSelf: 'center'
            }}
            yAxisSuffix="p"
        />
        ) : (
        <Text style={styles.infoText}>Không có dữ liệu để hiển thị biểu đồ.</Text>
        )}
    </ScrollView>
  );
}
