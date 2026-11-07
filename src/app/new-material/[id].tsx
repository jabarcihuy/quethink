import { Redirect, useLocalSearchParams } from "expo-router";
import { RequireAccount } from "@/components/AccountUI";
import { useAuth } from "@/features/account/AuthProvider";
import { MaterialForm } from "@/features/learning/MaterialForm";
export default function Screen() {
  const { id } = useLocalSearchParams<{ id: string }>(),
    auth = useAuth();
  return (
    <RequireAccount complete>
      {auth.profile?.role === "teacher" ? (
        <MaterialForm
          newClassId={id}
          material={{
            id: "",
            classId: id,
            title: "",
            body: "",
            requiresLab: false,
            attachments: [],
            position: 0,
            available: true,
            completed: false,
            archived: false,
          }}
        />
      ) : (
        <Redirect href="/home" />
      )}
    </RequireAccount>
  );
}
