import { getToken } from "firebase/app-check";
import { appCheck } from "./firebase";

export async function getAppCheckHeader() {
  if (!appCheck) return null;

  const { token } = await getToken(appCheck, false);
  return token || null;
}
