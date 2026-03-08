import * as Haptics from 'expo-haptics';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ImageBackground, Keyboard, Image as RNImage, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import StatusModal from '../../components/StatusModal';
import { auth, db } from '../../firebaseConfig';
import i18n from '../i18n';

export default function App() {
  const insets = useSafeAreaInsets();
  const [active, setActive] = useState(false);
  const [seconds, setSeconds] = useState(0);
  // const [showerUsed, setShowerUsed] = useState(false); // Removed
  const [notes, setNotes] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [calmedBy, setCalmedBy] = useState('seizure_stopped');
  const [calmModalVisible, setCalmModalVisible] = useState(false);

  // Status Modal State
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [statusModalType, setStatusModalType] = useState<'success' | 'error'>('success');
  const [statusModalMessage, setStatusModalMessage] = useState('');

  const calmOptions = [
    { key: 'seizure_stopped', label: 'calmOptionSeizureStopped' },
    { key: 'meds', label: 'calmOptionMeds' },
    { key: 'time', label: 'calmOptionTime' },
    { key: 'drink_food', label: 'calmOptionDrinkFood' },
    { key: 'diaper', label: 'calmOptionDiaper' },
    { key: 'comfort', label: 'calmOptionComfort' },
    { key: 'other', label: 'calmOptionOther' },
  ];

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
    // Capture state to save
    const capturedSeconds = seconds;
    const capturedNotes = notes;
    const capturedCalmedBy = calmedBy;

    // Optimistically reset UI instantly
    setReviewing(false);
    setSeconds(0);
    setNotes('');
    setCalmedBy('seizure_stopped');

    try {
      await addDoc(collection(db, "episodes"), {
        userId: auth.currentUser?.uid,
        duration_seconds: capturedSeconds,
        notes: capturedNotes,
        calmed_by: capturedCalmedBy,
        variant: "LoF",
        timestamp: serverTimestamp(),
      });
      // Success Modal
      setStatusModalType('success');
      setStatusModalMessage(i18n.t('saveSuccessTitle'));
      setStatusModalVisible(true);
    } catch (e: any) {
      // Revert if failed
      setSeconds(capturedSeconds);
      setNotes(capturedNotes);
      setCalmedBy(capturedCalmedBy);
      setReviewing(true);

      // Error Modal
      setStatusModalType('error');
      setStatusModalMessage(e.message);
      setStatusModalVisible(true);
    }
  };

  return (

    <ImageBackground
      source={require('../../assets/images/LittleLanterns-bg.webp')}
      resizeMode="cover"
      className="flex-1"
    >
      <View className="flex-1 bg-black/60" style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom }}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View className="flex-1 justify-between p-5 pt-12">
            {/* Header Section */}
            <View className="items-center w-full">
              <RNImage
                source={require('../../assets/images/LittleLanters-logo.png')}
                className="w-[80px] h-[80px] mb-2"
                resizeMode="contain"
              />
              <Text className="text-white text-3xl mb-0 tracking-widest text-center font-castoro">
                {i18n.t('appTitle')}
              </Text>
              <Text className="text-white text-sm -mt-2 mb-8 tracking-widest text-center font-castoro-italic opacity-90">
                {i18n.t('appSubtitle')}
              </Text>
            </View>

            {/* Main Content Section */}
            <View className="items-center w-full mb-48">
              <Text className="text-white text-8xl font-bold mb-10">{seconds}s</Text>

              {!active && !reviewing ? (
                <TouchableOpacity
                  className="bg-lantern-marine p-8 rounded-full w-[80%] items-center shadow-lg border-2 border-lantern-light"
                  onPress={handleStart}
                >
                  <Text className="text-white text-xl font-bold">{i18n.t('startTracking')}</Text>
                </TouchableOpacity>
              ) : active ? (
                <TouchableOpacity
                  className="bg-red-500 p-8 rounded-full w-[80%] items-center shadow-lg border-2 border-lantern-light"
                  onPress={handleStop}
                >
                  <Text className="text-white text-xl font-bold">{i18n.t('stopTracking')}</Text>
                </TouchableOpacity>
              ) : (
                <View className="w-full items-center">
                  {/* Triggers Input */}
                  <TextInput
                    className="bg-[#2a2a2a] text-white p-4 rounded-xl mb-5 text-lg w-[80%] border border-[#e9efee]"
                    placeholder={i18n.t('addNotesPlaceholder')}
                    placeholderTextColor="#999"
                    value={notes}
                    onChangeText={setNotes}
                    multiline={true}
                    style={{ height: 100, textAlignVertical: 'top' }} // Larger height
                  />

                  {/* Calmed By Dropdown */}
                  <TouchableOpacity
                    className="bg-[#2a2a2a] p-4 rounded-xl mb-5 w-[80%] border border-[#e9efee] flex-row justify-between items-center"
                    onPress={() => setCalmModalVisible(true)}
                  >
                    <Text className={calmedBy ? "text-white text-lg" : "text-[#999] text-lg"}>
                      {calmedBy ? i18n.t(calmOptions.find(o => o.key === calmedBy)?.label || 'selectCalmFactor') : i18n.t('calmedByLabel')}
                    </Text>
                    <Text className="text-white">▼</Text>
                  </TouchableOpacity>

                  {/* Calm Selector Modal */}
                  {calmModalVisible && (
                    <View className="absolute top-0 left-0 right-0 bottom-0 justify-center items-center z-50">
                      <View className="bg-[#1a3749] rounded-2xl w-[80%] p-4 border border-[#f3d275] shadow-lg">
                        <Text className="text-white text-xl font-bold mb-4 text-center">{i18n.t('selectCalmFactor')}</Text>
                        {calmOptions.map((option) => (
                          <TouchableOpacity
                            key={option.key}
                            className="p-3 border-b border-[#ffffff20] w-full items-center"
                            onPress={() => {
                              setCalmedBy(option.key);
                              setCalmModalVisible(false);
                            }}
                          >
                            <Text className="text-white text-lg">{i18n.t(option.label)}</Text>
                          </TouchableOpacity>
                        ))}
                        <TouchableOpacity
                          className="mt-4 p-3 bg-lantern-marine rounded-full items-center"
                          onPress={() => setCalmModalVisible(false)}
                        >
                          <Text className="text-white font-bold">{i18n.t('close')}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}


                  <TouchableOpacity
                    className="bg-[#00C851] p-8 rounded-full w-[80%] items-center border-2 border-lantern-light"
                    onPress={handleSave}
                  >
                    <Text className="text-white text-xl font-bold">{i18n.t('saveEpisode')}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </TouchableWithoutFeedback>

        {/* Status Modal (Success/Error) */}
        <StatusModal
          visible={statusModalVisible}
          type={statusModalType}
          message={statusModalMessage}
          onClose={() => setStatusModalVisible(false)}
        />
      </View>
    </ImageBackground>
  );
}