import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { auth as firebaseAuthServiceFromConfig, db as realtimeDB } from '../../firebaseConfig';
import { styles } from './auth.styles';

export default function LoginScreen() {
  const router = useRouter();
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (usernameOrEmail.trim() === '' || password.trim() === '') {
      Alert.alert('Lỗi', 'Vui lòng nhập Tên đăng nhập/Email và mật khẩu.');
      return;
    }
    setLoading(true);
    try {
      let emailToLogin = usernameOrEmail.trim();
      const enteredUsername = usernameOrEmail.trim().toLowerCase();

      if (!emailToLogin.includes('@') && emailToLogin.length > 0) {
        console.log(`Đang tìm email cho username: ${enteredUsername}`);
        const usersNodeRef = realtimeDB.ref('users');
        const query = usersNodeRef.orderByChild('username').equalTo(enteredUsername);
        const snapshot = await query.once('value'); // Thực thi query trực tiếp trên đối tượng query

        if (snapshot.exists()) {
          const usersData = snapshot.val();
         const userId = Object.keys(usersData)[0];
          if (usersData[userId] && usersData[userId].email) {
            emailToLogin = usersData[userId].email;
            console.log(`Đã tìm thấy email: ${emailToLogin} cho username: ${enteredUsername}`);
          } else {
             Alert.alert('Lỗi dữ liệu', 'Không tìm thấy thông tin email liên kết với tên đăng nhập này.');
             setLoading(false);
             return;
          }
        } else {
          Alert.alert('Lỗi đăng nhập', 'Tên đăng nhập không tồn tại.');
          setLoading(false);
          return;
        }
      }

      console.log(`Đang thử đăng nhập với email: ${emailToLogin}`);
      await firebaseAuthServiceFromConfig.signInWithEmailAndPassword(emailToLogin, password);
      router.replace('../index'); // Chuyển hướng đến trang chính sau khi đăng nhập thành công
    } catch (error: any) {
      console.error("Lỗi đăng nhập LOGIN_SCREEN: ", error);
      let errorMessage = "Đã có lỗi xảy ra khi đăng nhập. Vui lòng thử lại.";
      if (error.code) {
        switch (error.code) {
          case 'auth/user-not-found':
          case 'auth/wrong-password':
          case 'auth/invalid-credential':
            errorMessage = 'Tên đăng nhập/Email hoặc mật khẩu không chính xác.';
            break;
          case 'auth/invalid-email':
            errorMessage = 'Địa chỉ email được sử dụng để đăng nhập không hợp lệ.';
            break;
          case 'auth/network-request-failed':
            errorMessage = 'Lỗi kết nối mạng. Vui lòng kiểm tra lại kết nối internet.';
            break;
          default:
            errorMessage = error.message || "Một lỗi không xác định đã xảy ra từ Firebase.";
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      Alert.alert('Lỗi đăng nhập', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Đăng Nhập</Text>
      <TextInput
        style={styles.input}
        placeholder="Tên đăng nhập hoặc Email"
        placeholderTextColor="#888"
        value={usernameOrEmail}
        onChangeText={setUsernameOrEmail}
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Mật khẩu"
        placeholderTextColor="#888"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Đang xử lý...' : 'Đăng Nhập'}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
        <Text style={styles.linkText}>Chưa có tài khoản? Đăng ký</Text>
      </TouchableOpacity>
    </View>
  );
}