import React from 'react';
import { Modal, Image as RNImage, Text, TouchableOpacity, View } from 'react-native';

interface ConfirmModalProps {
    visible: boolean;
    title?: string;
    message?: string;
    confirmLabel?: string;
    onConfirm: () => void;
    onCancel: () => void;
}

export default function ConfirmModal({
    visible,
    title = 'Delete this entry?',
    message,
    confirmLabel = 'Delete',
    onConfirm,
    onCancel,
}: ConfirmModalProps) {
    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={visible}
            onRequestClose={onCancel}
        >
            <View className="flex-1 justify-center items-center bg-black/80 p-5">
                <View className="bg-[#1a3749] rounded-2xl p-6 w-full max-w-sm border border-[#f3d275] items-center">
                    <View
                        style={{
                            width: 250,
                            height: 315,
                            marginBottom: 20,
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: 'white',
                            shadowColor: '#ffffff',
                            shadowOffset: { width: 0, height: 0 },
                            shadowOpacity: 0.8,
                            shadowRadius: 10,
                            elevation: 10,
                        }}
                    >
                        <RNImage
                            source={require('../assets/images/datasave-error.webp')}
                            style={{ width: '100%', height: '100%', borderRadius: 12 }}
                            resizeMode="cover"
                        />
                    </View>

                    <Text className="text-white text-xl font-bold mb-2 font-castoro text-center">
                        {title}
                    </Text>
                    {message ? (
                        <Text className="text-gray-300 text-sm font-quicksand mb-4 text-center">
                            {message}
                        </Text>
                    ) : null}

                    <View className="flex-row gap-3 mt-2 w-full justify-center">
                        <TouchableOpacity
                            className="flex-1 bg-transparent p-3 rounded-full items-center border border-gray-500"
                            onPress={onCancel}
                        >
                            <Text className="text-gray-300 font-bold font-quicksand">Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            className="flex-1 bg-red-700 p-3 rounded-full items-center border border-red-400"
                            onPress={onConfirm}
                        >
                            <Text className="text-white font-bold font-quicksand">{confirmLabel}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}
