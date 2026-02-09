import { ImageBackground, Linking, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import i18n from '../i18n';

export default function TipsScreen() {
    return (
        <ImageBackground
            source={require('../../assets/images/background.webp')}
            resizeMode="cover"
            className="flex-1"
        >
            <SafeAreaView className="flex-1 bg-black/60 items-center justify-center p-5">
                <Text className="text-white text-2xl font-quicksand text-center mb-8">
                    {i18n.t('tipsMessage')}
                </Text>

                <TouchableOpacity
                    className="bg-lantern-marine p-5 rounded-full w-[80%] items-center border-2 border-lantern-light"
                    onPress={() => Linking.openURL('https://littlelanterns.info')}
                >
                    <Text className="text-white text-xl font-bold">{i18n.t('goThereNow')}</Text>
                </TouchableOpacity>
            </SafeAreaView>
        </ImageBackground>
    );
}
