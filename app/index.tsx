import * as Haptics from 'expo-haptics';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Alert, ImageBackground, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { db } from '../firebaseConfig';
import i18n from './i18n';

export default function App() {
  const insets = useSafeAreaInsets();
  const [active, setActive] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [showerUsed, setShowerUsed] = useState(false);
  const [notes, setNotes] = useState('');

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
  };

  const handleSave = async () => {
    setActive(false);
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
      source={require('../assets/images/background.webp')}
      resizeMode="cover"
      className="flex-1"
    >
      <View className="flex-1 bg-black/40" style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom }}>
        <View className="flex-1 items-center justify-center p-5">

          <Text className="text-white text-8xl font-bold mb-10">{seconds}s</Text>

          {!active ? (
            <TouchableOpacity
              className="bg-amber-600 p-8 rounded-3xl w-full items-center"
              onPress={handleStart}
            >
              <Text className="text-white text-xl font-bold">{i18n.t('startTracking')}</Text>
            </TouchableOpacity>
          ) : (
            <View className="w-full">
              <TouchableOpacity
                className={`${showerUsed ? 'bg-[#0099cc] border-2 border-white' : 'bg-[#33b5e5]'
                  } p-6 rounded-2xl w-full items-center mb-5`}
                onPress={() => setShowerUsed(!showerUsed)}
              >
                <Text className="text-white text-xl font-bold">
                  {showerUsed ? i18n.t('showerLogged') : i18n.t('usingShower')}
                </Text>
              </TouchableOpacity>

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
    </ImageBackground>
  );
}