import * as Haptics from 'expo-haptics';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { GoogleAuthProvider, linkWithCredential } from 'firebase/auth';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, FlatList, ImageBackground, Keyboard, Modal, Image as RNImage, ScrollView, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { Svg, Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import StatusModal from '../../components/StatusModal';
import { CALM_CATEGORIES, getCalmLabel } from '../../constants/calmCategories';
import { useChild } from '../../hooks/use-child';
import { auth, db } from '../../firebaseConfig';
import i18n from '../i18n';

const deviceHeight = Dimensions.get('window').height;

export default function App() {
  const insets = useSafeAreaInsets();
  const { childId, childName } = useChild();
  const [active, setActive] = useState(false);
  const glowAnim = useRef(new Animated.Value(0)).current;
  const waveAnim = useRef(new Animated.Value(0)).current;
  const screenWidth = Dimensions.get('window').width;
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

  // Login / Google link modal state
  const [loginModalVisible, setLoginModalVisible] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const isLinkedToGoogle = auth.currentUser?.providerData.some(p => p.providerId === 'google.com') ?? false;

  // Offset picker state
  const [offsetModalVisible, setOffsetModalVisible] = useState(false);
  const [selectedOffset, setSelectedOffset] = useState(0);
  const ITEM_HEIGHT = 52;
  const MINUTES = Array.from({ length: 61 }, (_, i) => i); // 0–60

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (active) {
      interval = setInterval(() => {
        setSeconds((s) => s + 1);
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0, duration: 420, useNativeDriver: true }),
        ]).start();
      }, 1000);

      // Continuous wave scroll loop
      waveAnim.setValue(0);
      Animated.loop(
        Animated.timing(waveAnim, { toValue: 1, duration: 2400, useNativeDriver: true })
      ).start();
    } else {
      glowAnim.stopAnimation();
      glowAnim.setValue(0);
      waveAnim.stopAnimation();
      waveAnim.setValue(0);
      if (interval) clearInterval(interval);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [active]);

  const handleStart = (offsetMinutes = 0) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSeconds(offsetMinutes * 60);
    setActive(true);
    setReviewing(false);
  };

  const handleStartWithOffset = () => {
    setOffsetModalVisible(false);
    handleStart(selectedOffset);
    setSelectedOffset(0);
  };

  const handleGoogleLink = async () => {
    if (!auth.currentUser) return;
    setIsLinking(true);
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      if (userInfo.data?.idToken) {
        const credential = GoogleAuthProvider.credential(userInfo.data.idToken);
        try {
          await linkWithCredential(auth.currentUser, credential);
          setLoginModalVisible(false);
          setStatusModalType('success');
          setStatusModalMessage(i18n.t('backupSuccessMessage'));
          setStatusModalVisible(true);
        } catch (linkError: any) {
          if (linkError.code === 'auth/credential-already-in-use') {
            await import('firebase/auth').then(async ({ signInWithCredential }) => {
              await signInWithCredential(auth, credential);
              setLoginModalVisible(false);
              setStatusModalType('success');
              setStatusModalMessage(i18n.t('restoreSuccessMessage'));
              setStatusModalVisible(true);
            });
          } else {
            throw linkError;
          }
        }
      } else {
        throw new Error('No ID Token found');
      }
    } catch (error: any) {
      setLoginModalVisible(false);
      setStatusModalType('error');
      setStatusModalMessage(error.message);
      setStatusModalVisible(true);
    } finally {
      setIsLinking(false);
    }
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
        childId,
        addedBy: auth.currentUser?.uid,
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
          <View className="flex-1 p-5 pt-12">
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
              <Text className="text-white text-sm -mt-2 tracking-widest text-center font-castoro-italic opacity-90">
                {i18n.t('appSubtitle')}
              </Text>
              {childName ? (
                <Text className="text-lantern-light/80 text-xs font-quicksand mt-1 tracking-wide">
                  Tracking for <Text className="text-lantern-light font-bold">{childName}</Text>
                </Text>
              ) : null}
              <TouchableOpacity className="mt-2" onPress={() => setLoginModalVisible(true)}>
                <Text className={`text-xs font-quicksand ${isLinkedToGoogle ? 'text-green-400' : 'text-white/40 underline'}`}>
                  {isLinkedToGoogle ? 'Backed up to Google' : 'Login / Backup'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Main Content Section — centered in remaining space */}
            <View className="flex-1 items-center justify-center" style={{ marginBottom: 120 }}>

              {/* Scrolling wave + solid fill to bottom — visible only while active */}
              {active && (
                <View style={{ position: 'absolute', bottom: -120, width: screenWidth, height: deviceHeight * 0.38, overflow: 'hidden' }}>
                  {/* Wave crest */}
                  <Animated.View style={{
                    flexDirection: 'row',
                    transform: [{
                      translateX: waveAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, -screenWidth],
                      }),
                    }],
                  }}>
                    {[0, 1].map(i => (
                      <Svg key={i} width={screenWidth} height={160} viewBox="0 0 1440 160" preserveAspectRatio="none">
                        <Path
                          d="M0,80L48,90.7C96,101,192,123,288,117.3C384,112,480,80,576,64C672,48,768,48,864,58.7C960,69,1056,91,1152,96C1248,101,1344,91,1392,85.3L1440,80L1440,160L0,160Z"
                          fill="rgba(0,153,255,0.18)"
                        />
                        <Path
                          d="M0,112L48,101.3C96,91,192,69,288,69.3C384,69,480,91,576,106.7C672,123,768,123,864,112C960,101,1056,80,1152,74.7C1248,69,1344,80,1392,85.3L1440,91L1440,160L0,160Z"
                          fill="rgba(0,153,255,0.10)"
                        />
                      </Svg>
                    ))}
                  </Animated.View>
                  {/* Solid fill below the wave */}
                  <View style={{ width: screenWidth, flex: 1, backgroundColor: 'rgba(0,153,255,0.22)' }} />
                </View>
              )}

              <Animated.Text
                style={{
                  transform: [{
                    scale: glowAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 1.12],
                    }),
                  }],
                  color: 'white',
                  fontSize: 96,
                  fontWeight: 'bold',
                  marginBottom: 40,
                }}
              >
                {seconds}s
              </Animated.Text>

              {!active && !reviewing ? (
                <View className="items-center w-full">
                  <TouchableOpacity
                    className="bg-lantern-marine p-8 rounded-full w-[80%] items-center shadow-lg border-2 border-lantern-light"
                    onPress={() => handleStart(0)}
                  >
                    <Text className="text-white text-xl font-bold">{i18n.t('startTracking')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity className="mt-4" onPress={() => { setSelectedOffset(0); setOffsetModalVisible(true); }}>
                    <Text className="text-white/50 text-xs font-quicksand underline">Started earlier?</Text>
                  </TouchableOpacity>
                </View>
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
                      {calmedBy ? getCalmLabel(calmedBy, (key: string) => i18n.t(key)) : i18n.t('calmedByLabel')}
                    </Text>
                    <Text className="text-white">▼</Text>
                  </TouchableOpacity>

                  {/* Calm Selector Modal */}
                  <Modal
                    animationType="fade"
                    transparent={true}
                    visible={calmModalVisible}
                    onRequestClose={() => setCalmModalVisible(false)}
                  >
                    <View className="flex-1 justify-center items-center bg-black/60 z-50">
                      <View
                        className="bg-[#1a3749] rounded-2xl w-[90%] p-4 border border-[#f3d275] shadow-lg"
                        style={{ height: deviceHeight * 0.7 }}
                      >
                        <Text className="text-white text-xl font-bold mb-4 text-center">{i18n.t('selectCalmFactor')}</Text>
                        <ScrollView className="w-full flex-1 mb-2" showsVerticalScrollIndicator={true}>
                          {CALM_CATEGORIES.map((cat) => (
                            <View key={cat.title} className="w-full mb-4">
                              <Text style={{ color: cat.color }} className="text-sm font-bold pl-2 pb-1">{cat.title}</Text>
                              <View className="bg-black/20 rounded-xl overflow-hidden w-full border border-[#ffffff15]">
                                {cat.options.map((option, idx) => (
                                  <TouchableOpacity
                                    key={option.key}
                                    className={`p-3 border-[#ffffff20] w-full items-center ${idx !== cat.options.length - 1 ? 'border-b' : ''}`}
                                    onPress={() => {
                                      setCalmedBy(option.key);
                                      setCalmModalVisible(false);
                                    }}
                                  >
                                    <Text className="text-white text-base">{i18n.t(option.label)}</Text>
                                  </TouchableOpacity>
                                ))}
                              </View>
                            </View>
                          ))}
                        </ScrollView>
                        <TouchableOpacity
                          className="mt-2 p-3 bg-lantern-marine rounded-full items-center"
                          onPress={() => setCalmModalVisible(false)}
                        >
                          <Text className="text-white font-bold">{i18n.t('close')}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </Modal>


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

        {/* Login / Google Backup Modal */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={loginModalVisible}
          onRequestClose={() => setLoginModalVisible(false)}
        >
          <View className="flex-1 justify-center items-center bg-black/80 p-5">
            <View className="bg-[#1a3749] rounded-2xl p-6 w-full max-w-sm border border-[#f3d275] items-center">
              {isLinkedToGoogle ? (
                <>
                  <Text className="text-green-400 text-xl font-bold mb-2 font-castoro text-center">Account Secured</Text>
                  <Text className="text-green-200/80 text-sm font-quicksand text-center leading-relaxed mb-6">
                    Your tracker data is safely backed up to your Google Account.
                  </Text>
                </>
              ) : (
                <>
                  <Text className="text-white text-xl font-bold mb-2 font-castoro text-center">Secure Your Data</Text>
                  <Text className="text-gray-300 text-sm font-quicksand text-center leading-relaxed mb-6">
                    Link a Google Account so your tracking history is preserved if you change phones or reinstall the app.
                  </Text>
                  <TouchableOpacity
                    className={`p-4 rounded-full w-[80%] items-center mb-4 ${isLinking ? 'bg-gray-600' : 'bg-white'}`}
                    onPress={handleGoogleLink}
                    disabled={isLinking}
                  >
                    <Text className={`font-bold text-lg font-quicksand ${isLinking ? 'text-gray-300' : 'text-black'}`}>
                      {isLinking ? 'Loading...' : i18n.t('backupToGoogle')}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
              <TouchableOpacity
                className="p-3 rounded-full items-center border border-gray-500 w-[80%]"
                onPress={() => setLoginModalVisible(false)}
              >
                <Text className="text-gray-300 font-bold font-quicksand">{i18n.t('close')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Offset Picker Modal */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={offsetModalVisible}
          onRequestClose={() => setOffsetModalVisible(false)}
        >
          <View className="flex-1 justify-center items-center bg-black/80 p-5">
            <View className="bg-[#1a3749] rounded-2xl p-6 w-full max-w-sm border border-[#f3d275] items-center">
              <Text className="text-white text-xl font-bold mb-1 font-castoro text-center">Started earlier?</Text>
              <Text className="text-gray-400 text-sm font-quicksand mb-5 text-center">How many minutes ago did it start?</Text>

              {/* Scroll Wheel */}
              <View style={{ height: ITEM_HEIGHT * 3, width: 180, position: 'relative' }}>
                <View style={{
                  position: 'absolute',
                  top: ITEM_HEIGHT,
                  left: 0,
                  right: 0,
                  height: ITEM_HEIGHT,
                  borderTopWidth: 1,
                  borderBottomWidth: 1,
                  borderColor: '#f3d275',
                  zIndex: 1,
                }} pointerEvents="none" />
                <FlatList
                  data={MINUTES}
                  keyExtractor={(item) => item.toString()}
                  snapToInterval={ITEM_HEIGHT}
                  decelerationRate="fast"
                  showsVerticalScrollIndicator={false}
                  initialScrollIndex={0}
                  getItemLayout={(_, index) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index })}
                  contentContainerStyle={{ paddingVertical: ITEM_HEIGHT }}
                  onMomentumScrollEnd={(e) => {
                    const index = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT);
                    setSelectedOffset(MINUTES[Math.max(0, Math.min(index, MINUTES.length - 1))] ?? 0);
                  }}
                  renderItem={({ item }) => (
                    <View style={{ height: ITEM_HEIGHT, justifyContent: 'center', alignItems: 'center' }}>
                      <Text style={{
                        color: item === selectedOffset ? 'white' : 'rgba(255,255,255,0.25)',
                        fontSize: item === selectedOffset ? 30 : 20,
                        fontWeight: item === selectedOffset ? 'bold' : 'normal',
                        fontFamily: 'Quicksand',
                      }}>
                        {item} min
                      </Text>
                    </View>
                  )}
                />
              </View>

              <View className="flex-row gap-3 mt-5 w-full justify-center">
                <TouchableOpacity
                  className="flex-1 bg-transparent p-3 rounded-full items-center border border-gray-500"
                  onPress={() => { setOffsetModalVisible(false); setSelectedOffset(0); }}
                >
                  <Text className="text-gray-300 font-bold font-quicksand">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="flex-1 bg-lantern-marine p-3 rounded-full items-center border border-lantern-light"
                  onPress={handleStartWithOffset}
                >
                  <Text className="text-white font-bold font-quicksand">Start Tracking</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

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