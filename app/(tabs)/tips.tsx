import { ImageBackground, Linking, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import i18n from '../i18n';

export default function TipsScreen() {
    const insets = useSafeAreaInsets();
    return (
        <ImageBackground
            source={require('../../assets/images/background.webp')}
            resizeMode="cover"
            className="flex-1"
        >
            <View className="flex-1 bg-black/60 items-center justify-center p-5" style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
                <Text className="text-white text-2xl font-quicksand text-center mb-8">
                    {i18n.t('tipsMessage')}
                </Text>

                <TouchableOpacity
                    className="bg-lantern-marine p-5 rounded-full w-[80%] items-center border-2 border-lantern-light"
                    onPress={() => Linking.openURL('https://littlelanterns.info')}
                >
                    <Text className="text-white text-xl font-bold">{i18n.t('goThereNow')}</Text>
                </TouchableOpacity>
            </View>
        </ImageBackground>
    );
}
