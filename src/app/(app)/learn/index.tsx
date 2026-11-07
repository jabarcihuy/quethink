import { Redirect } from "expo-router";
import { useAuth } from "@/features/account/AuthProvider";
import { MaterialList } from "@/features/learning/MaterialList";
export default function Learn() {
  return useAuth().profile?.role === "student" ? (
    <MaterialList />
  ) : (
    <Redirect href="/home" />
  );
}
