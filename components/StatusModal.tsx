import React from 'react';
import { Modal, Image as RNImage, Text, TouchableOpacity, View } from 'react-native';
import i18n from '../app/i18n';

interface StatusModalProps {
    visible: boolean;
    type: 'success' | 'error';
    title?: string;
    message?: string;
    onClose: () => void;
}

export default function StatusModal({ visible, type, title, message, onClose }: StatusModalProps) {
    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
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
                            // Glow effect (iOS/Web)
                            shadowColor: '#ffffff',
                            shadowOffset: { width: 0, height: 0 },
                            shadowOpacity: 0.8,
                            shadowRadius: 10,
                            // Android
                            elevation: 10,
                        }}
                    >
                        <RNImage
                            source={type === 'success' ? require('../assets/images/datasave-success.webp') : require('../assets/images/datasave-error.webp')}
                            style={{
                                width: '100%',
                                height: '100%',
                                borderRadius: 12,
                            }}
                            resizeMode="cover"
                        />
                    </View>
                    <Text className="text-white text-xl font-bold mb-2 font-castoro text-center">
                        {title ? title : (type === 'success' ? i18n.t('saveSuccessTitle') : i18n.t('saveErrorTitle'))}
                    </Text>
                    {(type === 'error' || message) && (
                        <Text className={`text-base font-quicksand mb-4 text-center ${type === 'error' ? 'text-red-400' : 'text-gray-300'}`}>
                            {message}
                        </Text>
                    )}
                    <TouchableOpacity
                        className="bg-lantern-marine p-3 rounded-full items-center border border-[#f3d275] min-w-[120px] mt-4"
                        onPress={onClose}
                    >
                        <Text className="text-white font-bold">{i18n.t('close')}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}
