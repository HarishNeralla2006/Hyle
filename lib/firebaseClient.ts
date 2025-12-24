
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCBCak_CIdEoyU5VI9y4tjzN7vF-l-pfoE",
  authDomain: "sparkai-9bf6c.firebaseapp.com",
  projectId: "sparkai-9bf6c",
  storageBucket: "sparkai-9bf6c.appspot.com",
  messagingSenderId: "735653033049",
  appId: "1:735653033049:web:c44a83981360bad2a3ad48",
  measurementId: "G-61R1TPYY9G"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export the necessary Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
