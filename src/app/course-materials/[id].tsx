import { Stack, useLocalSearchParams, Redirect } from "expo-router";
import { RequireAccount } from "@/components/AccountUI";
import { useAuth } from "@/features/account/AuthProvider";
import { MaterialList } from "@/features/learning/MaterialList";
import { useLearningText } from "@/features/learning/UI";
export default function Screen() {
  const t = useLearningText(),
    { id } = useLocalSearchParams<{ id: string }>();
  return (
    <RequireAccount complete>
      {useAuth().profile?.role === "teacher" ? (
        <>
          <Stack.Screen options={{ title: t.materials }} />
          <MaterialList classId={id} />
        </>
      ) : (
        <Redirect href="/home" />
      )}
    </RequireAccount>
  );
}
