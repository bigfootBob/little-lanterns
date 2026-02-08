import * as Haptics from 'expo-haptics';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Alert, ImageBackground, Image as RNImage, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { db } from '../../firebaseConfig';
import i18n from '../i18n';

export default function App() {
  const [active, setActive] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [showerUsed, setShowerUsed] = useState(false);
  const [notes, setNotes] = useState('');
  const [reviewing, setReviewing] = useState(false);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (active) {
      interval = setInterval(() => setSeconds((s) => s + 1), 1000);
    } else if (interval) {
      clearInterval(interval);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [active]);

  const handleStart = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setActive(true);
    setReviewing(false);
  };

  const handleStop = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setActive(false);
    setReviewing(true);
  };

  const handleSave = async () => {
    setReviewing(false);
    try {
      await addDoc(collection(db, "episodes"), {
        duration_seconds: seconds,
        shower_reset: showerUsed,
        notes: notes,
        variant: "LoF",
        timestamp: serverTimestamp(),
      });
      Alert.alert(i18n.t('savedTitle'), i18n.t('savedMessage'));
      setSeconds(0);
      setShowerUsed(false);
      setNotes('');
    } catch (e: any) {
      Alert.alert(i18n.t('errorTitle'), e.message);
    }
  };

  return (

    <ImageBackground
      source={require('../../assets/images/LittleLanterns-bg.webp')}
      resizeMode="cover"
      className="flex-1"
    >
      <SafeAreaView className="flex-1 bg-black/60" style={{ flex: 1 }}>
        <View className="flex-1 justify-between p-5 pt-12">
          {/* Header Section */}
          <View className="items-center w-full">
            <RNImage
              source={require('../../assets/images/LittleLanters-logo.png')}
              className="w-[80px] h-[80px] mb-2"
              resizeMode="contain"
            />
            <Text className="text-white text-3xl font-bold mb-4 tracking-widest text-center">
              {i18n.t('appTitle')}
            </Text>
            <Text className="text-white text-sm font-bold mb-8 tracking-widest text-center">
              {i18n.t('appSubtitle')}
            </Text>
          </View>

          {/* Main Content Section */}
          <View className="items-center w-full mb-12">
            <Text className="text-white text-8xl font-bold mb-10">{seconds}s</Text>

            {!active && !reviewing ? (
              <TouchableOpacity
                className="bg-amber-600 p-8 rounded-3xl w-full items-center"
                onPress={handleStart}
              >
                <Text className="text-white text-xl font-bold">{i18n.t('startTracking')}</Text>
              </TouchableOpacity>
            ) : active ? (
              <TouchableOpacity
                className="bg-red-600 p-8 rounded-3xl w-full items-center"
                onPress={handleStop}
              >
                <Text className="text-white text-xl font-bold">{i18n.t('stopTracking')}</Text>
              </TouchableOpacity>
            ) : (
              <View className="w-full">
                {/* <TouchableOpacity
              className={`${showerUsed ? 'bg-[#0099cc] border-2 border-white' : 'bg-[#33b5e5]'
                } p-6 rounded-2xl w-full items-center mb-5`}
              onPress={() => setShowerUsed(!showerUsed)}
            >
              <Text className="text-white text-xl font-bold">
                {showerUsed ? i18n.t('showerLogged') : i18n.t('usingShower')}
              </Text>
            </TouchableOpacity> */}

                <TextInput
                  className="bg-[#222] text-white p-4 rounded-xl mb-5 text-lg"
                  placeholder={i18n.t('addNotesPlaceholder')}
                  placeholderTextColor="#999"
                  value={notes}
                  onChangeText={setNotes}
                />

                <TouchableOpacity
                  className="bg-[#00C851] p-8 rounded-3xl w-full items-center"
                  onPress={handleSave}
                >
                  <Text className="text-white text-xl font-bold">{i18n.t('saveEpisode')}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}