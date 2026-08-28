// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAxktjXJwdMsqYN0rXBtF-C1AQQVBeT8Dg",
  authDomain: "healthguardian-ai-6d525.firebaseapp.com",
  projectId: "healthguardian-ai-6d525",
  storageBucket: "healthguardian-ai-6d525.firebasestorage.app",
  messagingSenderId: "314747195030",
  appId: "1:314747195030:web:83fbc3482daf59edb7bcb7",
  measurementId: "G-X7MQ8VNVK7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);