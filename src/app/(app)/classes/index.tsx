import { Redirect } from "expo-router";
import { useAuth } from "@/features/account/AuthProvider";
import { TeacherClasses } from "@/features/account/TeacherClasses";
export default function Classes() {
  return useAuth().profile?.role === "teacher" ? (
    <TeacherClasses />
  ) : (
    <Redirect href="/home" />
  );
}
