// Pomodoro/app/(auth)/register.tsx
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Text, TextInput, TouchableOpacity, View } from 'react-native';
// Import auth và db (Realtime Database instance) từ firebaseConfig
import { auth as firebaseAuthServiceFromConfig, db as realtimeDB } from '../../firebaseConfig';
import { styles } from './auth.styles';
// Import các hàm của Realtime Database nếu bạn muốn dùng SDK v9 modular (nhưng hiện tại đang dùng v8 compat)
// import { ref, set } from 'firebase/database';

export default function RegisterScreen() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (username.trim() === '' || email.trim() === '' || password.trim() === '' || confirmPassword.trim() === '') {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ Tên đăng nhập, Email, Mật khẩu và Xác nhận mật khẩu.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Lỗi', 'Mật khẩu xác nhận không khớp.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Lỗi', 'Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }

    setLoading(true);
    try {
      const userCredential = await firebaseAuthServiceFromConfig.createUserWithEmailAndPassword(email, password);
      const user = userCredential.user;

      if (user) {
        const userData = {
          uid: user.uid,
          username: username.trim().toLowerCase(), // Lưu username ở dạng chữ thường
          email: email.trim(),
          createdAt: Date.now(),
        };
        await realtimeDB.ref('users/' + user.uid).set(userData);
        console.log('RegisterScreen: User registered successfully with email:', email, 'and username:', username);
        router.replace('/(tabs)/index' as any); 

      }
    } catch (error: any) {
      console.error("Lỗi đăng ký REGISTER_SCREEN: ", error);
      let errorMessage = "Đã có lỗi xảy ra khi đăng ký. Vui lòng thử lại.";
      if (error.code) {
        switch (error.code) {
          case 'auth/email-already-in-use':
            errorMessage = 'Địa chỉ email này đã được sử dụng.';
            break;
          case 'auth/invalid-email':
            errorMessage = 'Địa chỉ email không hợp lệ.';
            break;
          case 'auth/weak-password':
            errorMessage = 'Mật khẩu quá yếu. Vui lòng chọn mật khẩu mạnh hơn (ít nhất 6 ký tự).';
            break;
          default:
            errorMessage = `Lỗi: ${error.message || error.toString()}`;
        }
      }
      Alert.alert('Lỗi đăng ký', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Đăng Ký</Text>
      <TextInput
        style={styles.input}
        placeholder="Tên đăng nhập"
        placeholderTextColor="#888"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#888"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Mật khẩu (ít nhất 6 ký tự)"
        placeholderTextColor="#888"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <TextInput
        style={styles.input}
        placeholder="Xác nhận mật khẩu"
        placeholderTextColor="#888"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
      />
      <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Đang xử lý...' : 'Đăng Ký'}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
         <Text style={styles.linkText}>Đã có tài khoản? Đăng nhập</Text>
      </TouchableOpacity>
    </View>
  );
}