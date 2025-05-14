import '../firebaseConfig';
import { Slot, SplashScreen, useRouter, useSegments } from 'expo-router';
import React, { useEffect } from 'react';
import { AuthProvider, useAuth } from '../context/AuthContext'; // Đảm bảo đường dẫn này đúng

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) {
      console.log('Auth loading...');
      return; // Chưa tải xong, không làm gì cả
    }

    // Kiểm tra xem route hiện tại có nằm trong group (auth) hay không
    // segments[0] sẽ là undefined nếu segments rỗng (root path)
    const isInAuthGroup = segments.length > 0 && segments[0] === '(auth)';

    console.log('Auth state loaded. User:', user ? user.uid : 'null', 'Segments:', segments, 'InAuthGroup:', isInAuthGroup);

    if (!user) {
      // Người dùng chưa đăng nhập
      if (!isInAuthGroup) {
        // Nếu chưa đăng nhập VÀ KHÔNG ở trong (auth) group (ví dụ: cố vào /tabs),
        // chuyển đến trang login.
        console.log('Redirecting to login (user not found, not in auth group)');
        router.replace('/(auth)/login');
      }
      // Nếu chưa đăng nhập NHƯNG ĐANG ở trong (auth) group (ví dụ: ở trang /login), thì không làm gì cả, để họ ở đó.
    } else {
      // Người dùng đã đăng nhập
      if (isInAuthGroup) {
        // Nếu đã đăng nhập VÀ ĐANG ở trong (auth) group (ví dụ: vừa login/register xong),
        // chuyển đến màn hình chính của app.
        console.log('Redirecting to home (user found, was in auth group)');
        router.replace('../(tabs)/index'); // Đảm bảo đây là path đúng sau khi đăng nhập
      }
      // Nếu đã đăng nhập VÀ KHÔNG ở trong (auth) group (ví dụ: đã ở trang /tabs), thì không làm gì cả.
    }

    // Ẩn SplashScreen khi đã xác định xong trạng thái và điều hướng (nếu có)
    // Chỉ ẩn khi không còn loading nữa để tránh FOUC (Flash Of Unstyled Content)
    console.log('Hiding SplashScreen');
    SplashScreen.hideAsync();

  }, [user, loading, segments, router]);

  if (loading) {
    // Bạn có thể hiển thị một màn hình chờ ở đây nếu muốn thay vì Slot trống
    return null; // Hoặc <CustomLoadingScreen />
  }

  return <Slot />; // Slot sẽ render layout của group hiện tại ((auth) hoặc (tabs))
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}