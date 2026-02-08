import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212', alignItems: 'center', justifyContent: 'center', padding: 20 },
  timer: { color: '#fff', fontSize: 60, marginBottom: 40, fontWeight: 'bold' },
  startBtn: { backgroundColor: '#00ffeeff', padding: 30, borderRadius: 30, width: '90%', alignItems: 'center' },
  showerBtn: { backgroundColor: '#33b5e5', padding: 20, borderRadius: 30, width: '90%', alignItems: 'center', marginBottom: 20 },
  activeShower: { backgroundColor: '#0099cc', borderWidth: 2, borderColor: '#fff' },
  input: { backgroundColor: '#222', color: '#fff', padding: 15, borderRadius: 30, marginBottom: 20, fontSize: 16 },
  stopBtn: { backgroundColor: '#00C851', padding: 30, borderRadius: 30, width: '90%', alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 20, fontWeight: 'bold' }
});