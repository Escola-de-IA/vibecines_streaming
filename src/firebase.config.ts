// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

const firebaseConfig = {
  apiKey: "AIzaSyDRRvNduGwEzncZuNPfCJbluAi1NL5YV4w",
  authDomain: "login-vibecines.firebaseapp.com",
  projectId: "login-vibecines",
  storageBucket: "login-vibecines.firebasestorage.app",
  messagingSenderId: "919861521801",
  appId: "1:919861521801:web:8d829a6d1563231f58c558",
  measurementId: "G-DJ2EN7PV2F"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);

// ✅ IMPORTANTE: Exportar app para uso no firebase-backend
export { app, auth, analytics };