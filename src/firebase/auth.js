import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "./firebase";

export const doSignInWithEmailAndPassword = (email, password) =>
  signInWithEmailAndPassword(auth, email, password);

export const doSignOut = () => auth.signOut();
