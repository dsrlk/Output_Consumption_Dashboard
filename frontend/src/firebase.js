import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyA_6HT0_eVSVACIgG0sdZtOSBYl1vHv3T0",
  authDomain: "expack-consumption-dashboard.firebaseapp.com",
  projectId: "expack-consumption-dashboard",
  storageBucket: "expack-consumption-dashboard.firebasestorage.app",
  messagingSenderId: "497107678587",
  appId: "1:497107678587:web:74688220aa3b66c43f39de",
  measurementId: "G-RQ3S6SPFN6"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
