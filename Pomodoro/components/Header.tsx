// src/components/Header.tsx
import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'; // Hoặc Feather, Ionicons...

interface HeaderProps {
  onAvatarPress: () => void;
  onLoginRegisterPress: () => void;
  onMenuPress: () => void;
  onNotificationsPress: () => void;
  onSettingsPress: () => void;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#1E1E1E', // Đồng bộ với màu nền
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#555', // Màu placeholder cho avatar
    marginRight: 10,
  },
  loginTextContainer: {
    flex: 1,
  },
  loginText: {
    color: '#FFF',
    fontSize: 16,
  },
  iconsContainer: {
    flexDirection: 'row',
  },
  iconButton: {
    padding: 8,
  },
});

const Header: React.FC<HeaderProps> = ({
  onAvatarPress,
  onLoginRegisterPress,
  onMenuPress,
  onNotificationsPress,
  onSettingsPress,
}) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={onAvatarPress}>
        {/* Thay bằng Image nếu có ảnh avatar */}
        <View style={styles.avatar} />
        {/* <Image source={require('../assets/images/avatar_placeholder.png')} style={styles.avatar} /> */}
      </TouchableOpacity>
      <TouchableOpacity onPress={onLoginRegisterPress} style={styles.loginTextContainer}>
        <Text style={styles.loginText}>Đăng Nhập | Đăng Ký</Text>
      </TouchableOpacity>
      <View style={styles.iconsContainer}>
        <TouchableOpacity onPress={onMenuPress} style={styles.iconButton}>
          <Icon name="theme-light-dark" size={24} color="#FFF" />
        </TouchableOpacity>
        <TouchableOpacity onPress={onNotificationsPress} style={styles.iconButton}>
          <Icon name="bell-outline" size={24} color="#FFF" />
        </TouchableOpacity>
        <TouchableOpacity onPress={onSettingsPress} style={styles.iconButton}>
          <Icon name="tune" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default Header;