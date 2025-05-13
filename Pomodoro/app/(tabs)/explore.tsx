import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons, MaterialIcons, FontAwesome5, Entypo } from '@expo/vector-icons';

const Sidebar = () => {
  return (
    <ScrollView className="bg-black flex-1 px-4 py-6">
      <View className="items-center mb-6">
        <View className="w-16 h-16 rounded-full bg-gray-700 mb-2" />
        <Text className="text-red-500 text-base font-semibold">Đăng Nhập | Đăng ký</Text>
      </View>

      <View className="bg-gray-800 rounded-lg px-3 py-2 mb-4">
        <TextInput
          placeholder="Tìm kiếm"
          placeholderTextColor="#aaa"
          className="text-white"
        />
      </View>

      {[
        { icon: 'sunny' as const, label: 'Hôm nay', color: 'text-green-500' },
        { icon: 'cloudy-night' as const, label: 'Ngày mai', color: 'text-orange-500' },
        { icon: 'calendar' as const, label: 'Tuần này', color: 'text-purple-500' },
        { icon: 'calendar-outline' as const, label: 'Đã lên kế hoạch', color: 'text-blue-500' },
        { icon: 'calendar-sharp' as const, label: 'Sự kiện', color: 'text-emerald-500' },
        { icon: 'checkmark-done-circle' as const, label: 'Đã hoàn thành', color: 'text-gray-300' },
        { icon: 'checkbox-outline' as const, label: 'Nhiệm vụ', color: 'text-sky-500' },
      ].map(({ icon, label, color }, index) => (
        <TouchableOpacity key={index} className="flex-row items-center justify-between py-3">
          <View className="flex-row items-center space-x-4">
            <Ionicons name={icon} size={20} className={`${color}`} />
            <Text className="text-white text-base">{label}</Text>
          </View>
          <Text className="text-gray-400 text-sm">3h 5</Text>
        </TouchableOpacity>
      ))}

      <TouchableOpacity className="flex-row items-center py-4">
        <Entypo name="circle-with-plus" size={20} color="red" />
        <Text className="text-red-500 ml-3 text-base">Thêm Dự Án</Text>
      </TouchableOpacity>

      <View className="items-center mt-10">
        <View className="w-16 h-16 rounded-full bg-cover bg-center" style={{ backgroundImage: `url('https://cdn.pixabay.com/photo/2017/06/20/19/22/fantasy-2423046_960_720.jpg')` }}>
          <Text className="text-white text-xl text-center mt-5">60</Text>
        </View>
      </View>
    </ScrollView>
  );
};

export default Sidebar;
