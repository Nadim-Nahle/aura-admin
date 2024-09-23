import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAq4rHeYjdnUpZj-Buo8MhwvSZHX7-efUs",
  authDomain: "aura-9c98c.firebaseapp.com",
  projectId: "aura-9c98c",
  storageBucket: "aura-9c98c.appspot.com",
  messagingSenderId: "223568843662",
  appId: "1:223568843662:web:abf97fe8444f94d9324adf",
  measurementId: "G-42TL3EVN2P"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export {app, auth};