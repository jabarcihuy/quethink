import { useEffect, useState } from "react";
import {
  Dimensions,
  Keyboard,
  Platform,
  useWindowDimensions,
} from "react-native";

// Android edge-to-edge may leave the window unresized beneath the IME.
export function useForumKeyboard() {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const { height: windowHeight } = useWindowDimensions();
  const [unadjustedHeight, setUnadjustedHeight] = useState(windowHeight);
  useEffect(() => {
    if (Platform.OS !== "android") return;
    const show = Keyboard.addListener("keyboardDidShow", (e) =>
      setKeyboardHeight(e.endCoordinates.height),
    );
    const hide = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardHeight(0);
      setUnadjustedHeight(Dimensions.get("window").height);
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  const alreadyResized = Math.max(0, unadjustedHeight - windowHeight);
  return keyboardHeight ? Math.max(0, keyboardHeight - alreadyResized) + 24 : 0;
}
