import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView, Platform, ActivityIndicator } from 'react-native'; 
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { useAuth } from '../../context/AuthContext'; 
import { styles as pomodoroStyles, styles } from '../(tabs)/pomodoro.styles'; 

export default function ChangePasswordScreen() {
    const router = useRouter();
    const { user } = useAuth();

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChangePassword = async () => {
        if (!user?.email) {
            Alert.alert("Lỗi", "Không xác định được người dùng. Vui lòng đăng nhập lại.");
            return;
        }

        if (!currentPassword) {
            Alert.alert("Lỗi", "Vui lòng nhập mật khẩu hiện tại.");
            return;
        }
         if (newPassword.length < 6) {
            Alert.alert("Lỗi", "Mật khẩu mới phải có ít nhất 6 ký tự.");
            return;
        }
        if (newPassword !== confirmPassword) {
            Alert.alert("Lỗi", "Mật khẩu mới và mật khẩu xác nhận không khớp.");
            return;
        }

        setLoading(true);
        try {
            const credential = EmailAuthProvider.credential(user.email, currentPassword);
            await reauthenticateWithCredential(user, credential);
            await updatePassword(user, newPassword);
            Alert.alert("Thành công", "Mật khẩu đã được thay đổi thành công.");
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            router.back(); 
        } catch (error: any) {
            console.error("Đổi mật khẩu thất bại:", error);
            if (error.code === 'auth/wrong-password') {
                Alert.alert("Lỗi", "Mật khẩu hiện tại không đúng.");
            } else if (error.code === 'auth/too-many-requests') {
                 Alert.alert("Lỗi", "Bạn đã thử quá nhiều lần. Vui lòng thử lại sau.");
            }
            else {
                Alert.alert("Lỗi", error.message || "Không thể đổi mật khẩu. Vui lòng thử lại.");
            }
        } finally {
            setLoading(false);
        }
    };
const stylesToUse = pomodoroStyles; 
    return (
        <View style={[stylesToUse.container, {paddingTop: 0}]}>
            <View style={stylesToUse.headerBar}>
                <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} disabled={loading}>
                    <Ionicons name="chevron-back" size={32} color="white" />
                </TouchableOpacity>
                <Text style={stylesToUse.headerText}>Đổi mật khẩu</Text>
                <View style={{ width: 32 }} /> 
            </View>

            <ScrollView
                contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 }}
                keyboardShouldPersistTaps="handled"
            >
        
                <TextInput
                    placeholder="Mật khẩu hiện tại"
                    placeholderTextColor="#aaa"
                    secureTextEntry
                    style={stylesToUse.modalFormInput} 
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    autoCapitalize="none"
                    editable={!loading}
                />
                <TextInput
                    placeholder="Mật khẩu mới (ít nhất 6 ký tự)"
                    placeholderTextColor="#aaa"
                    secureTextEntry
                    style={stylesToUse.modalFormInput}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    autoCapitalize="none"
                    editable={!loading}
                />
                <TextInput
                    placeholder="Xác nhận mật khẩu mới"
                    placeholderTextColor="#aaa"
                    secureTextEntry
                    style={stylesToUse.modalFormInput}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    autoCapitalize="none"
                    editable={!loading}
                />

                <TouchableOpacity
                        onPress={handleChangePassword}
                        style={[stylesToUse.mainActionButton, { marginTop: 25 }, loading && styles.disabledButton]}
                        disabled={loading}
                        >
                        {loading ? (
                                <ActivityIndicator color="#1C1C2E" />
                        ) : (
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Ionicons name="lock-closed-outline" size={24} color="#1C1C2E" style={{ marginRight: 8 }} />
                                <Text style={stylesToUse.mainActionButtonText}>Xác nhận đổi mật khẩu</Text>
                                </View>
                        )}
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}
