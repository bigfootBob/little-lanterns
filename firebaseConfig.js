import { initializeApp } from "firebase/app";
import { initializeFirestore } from "firebase/firestore";
// This tells Firebase we are in a mobile environment, not a browser

const firebaseConfig = {
  apiKey: "AIzaSyBau7dvlfmb-ZZaGY9KDRzoHRGREZQMyRI",
  authDomain: "little-lanterns.firebaseapp.com",
  projectId: "little-lanterns",
  storageBucket: "little-lanterns.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};

const app = initializeApp(firebaseConfig);

// Initialize Firestore with settings that avoid 'undefined' errors
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true, // This fixes the connection issue
});

export default app;