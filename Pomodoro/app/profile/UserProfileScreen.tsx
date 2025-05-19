import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ref, onValue } from 'firebase/database';
import { db } from '../../firebaseConfig';
import { useAuth } from '../../context/AuthContext'; 

interface UserInfo {
    email: string;
    username: string;
    uid: string;
    createdAt: number;
}

export default function ProfileScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const [info, setInfo] = useState<UserInfo | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        const userRef = ref(db, `users/${user.uid}`);
        const listener = onValue(userRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                setInfo({
                    email: data.email || '',
                    username: data.username || '',
                    uid: data.uid || user.uid,
                    createdAt: data.createdAt || 0,
                });
            }
            setLoading(false);
        }, (error) => {
            console.error("Firebase onValue error:", error);
            setLoading(false);
        });

        return () => {

            userRef && listener();
        };
    }, [user]);

    const formatDate = (timestamp: number) => {
        if (!timestamp) return 'Không có dữ liệu';
        const date = new Date(timestamp);
        return date.toLocaleString('vi-VN');
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color="#FF6F00" />
            </View>
        );
    }

    if (!user) {
        return (
            <View style={[styles.container, styles.centered]}>
                <Text style={styles.errorText}>Vui lòng đăng nhập để xem thông tin.</Text>
                </View>
        );
    }

    if (!info) {
        return (
            <View style={[styles.container, styles.centered]}>
                <Text style={styles.errorText}>Không tìm thấy thông tin người dùng.</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.headerBar}>
                <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
                    <Ionicons name="chevron-back" size={32} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerText}>Thông tin người dùng</Text>
                <View style={{ width: 32 }} />
            </View>

            <View style={styles.contentArea}>
                <Text style={styles.label}>Email: <Text style={styles.value}>{info.email}</Text></Text>
                <Text style={styles.label}>Tên người dùng: <Text style={styles.value}>{info.username}</Text></Text>
                <Text style={styles.label}>UID: <Text style={styles.value}>{info.uid}</Text></Text>
                <Text style={styles.label}>Ngày tạo tài khoản: <Text style={styles.value}>{formatDate(info.createdAt)}</Text></Text>

                <TouchableOpacity style={styles.button} onPress={() => router.push('/(auth)/change-password')}>
                    <Ionicons name="lock-closed-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.buttonText}>Đổi mật khẩu</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212',
    },
    centered: { 
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerBar: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 15,
        paddingTop: Platform.OS === 'android' ? 30 : 55, 
        paddingBottom: 15, 
        backgroundColor: '#1E1E1E', 
    },
    headerText: {
        color: 'white',
        fontSize: 18,
        fontWeight: '600',
        flex: 1,
        textAlign: 'center',
        marginHorizontal: 10,
    },
    contentArea: { 
        padding: 20,
    },
    label: {
        fontSize: 16,
        color: '#ccc',
        marginBottom: 12,
    },
    value: {
        color: '#fff',
        fontWeight: '500',
    },
    button: {
        flexDirection: 'row',
        backgroundColor: '#FF6F00',
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center', 
        marginTop: 30,
    },
    buttonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    errorText: {
        color: '#f66',
        fontSize: 16,
        textAlign: 'center',
    },
});