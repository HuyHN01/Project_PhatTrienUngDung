import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Text, TextInput, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { auth as firebaseAuthServiceFromConfig } from '../../firebaseConfig';
import { styles } from './auth.styles';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePasswordReset = async () => {
    if (email.trim() === '') {
      Alert.alert('Lỗi', 'Vui lòng nhập địa chỉ email của bạn.');
      return;
    }
    setLoading(true);
  try {
      await firebaseAuthServiceFromConfig.sendPasswordResetEmail(email.trim());
      Alert.alert(
        'Thành công',
        'Nếu tài khoản của bạn tồn tại, một email hướng dẫn đặt lại mật khẩu đã được gửi đến địa chỉ email của bạn. Vui lòng kiểm tra hộp thư đến (bao gồm cả thư mục spam).',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/(auth)/login'), 
          },
        ]
      );
      
    } catch (error: any) {
      console.error("Lỗi gửi email đặt lại mật khẩu: ", error);
      let errorMessage = "Đã có lỗi xảy ra. Vui lòng thử lại.";
      if (error.code) {
        switch (error.code) {
          case 'auth/invalid-email':
            errorMessage = 'Địa chỉ email không hợp lệ.';
            break;
          case 'auth/network-request-failed':
            errorMessage = 'Lỗi kết nối mạng. Vui lòng kiểm tra lại kết nối internet.';
            break;
          default:
            errorMessage = error.message || "Một lỗi không xác định đã xảy ra khi gửi email.";
        }
      }
      Alert.alert('Lỗi', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Quên Mật Khẩu</Text>
      <Text style={{color: '#ccc', textAlign: 'center', marginBottom: 20, paddingHorizontal: 10}}>
        Nhập địa chỉ email đã đăng ký của bạn. Chúng tôi sẽ gửi một liên kết để bạn đặt lại mật khẩu.
      </Text>
      <TextInput
        style={styles.input}
        placeholder="Nhập địa chỉ Email của bạn"
        placeholderTextColor="#888"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TouchableOpacity style={styles.button} onPress={handlePasswordReset} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Gửi Email Đặt Lại</Text>
        )}
      </TouchableOpacity>
      <TouchableOpacity onPress={() => router.back()}>
        <Text style={styles.linkText}>Quay lại Đăng nhập</Text>
      </TouchableOpacity>
    </View>
  );
}