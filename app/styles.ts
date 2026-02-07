import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212', alignItems: 'center', justifyContent: 'center', padding: 20 },
  timer: { color: '#fff', fontSize: 80, marginBottom: 40, fontWeight: 'bold' },
  startBtn: { backgroundColor: '#FF8C00', padding: 30, borderRadius: 20, width: '100%', alignItems: 'center' },
  showerBtn: { backgroundColor: '#33b5e5', padding: 20, borderRadius: 15, width: '100%', alignItems: 'center', marginBottom: 20 },
  activeShower: { backgroundColor: '#0099cc', borderWidth: 2, borderColor: '#fff' },
  input: { backgroundColor: '#222', color: '#fff', padding: 15, borderRadius: 10, marginBottom: 20, fontSize: 16 },
  stopBtn: { backgroundColor: '#00C851', padding: 30, borderRadius: 20, width: '100%', alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 20, fontWeight: 'bold' }
});