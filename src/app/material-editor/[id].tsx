import { useCallback } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { RequireAccount } from "@/components/AccountUI";
import { useAuth } from "@/features/account/AuthProvider";
import { useResource } from "@/features/account/useResource";
import { learningRepository } from "@/features/learning/repository";
import { MaterialForm } from "@/features/learning/MaterialForm";
import { Loading, Failure } from "@/features/learning/UI";
export default function Screen() {
  return (
    <RequireAccount complete>
      <Editor />
    </RequireAccount>
  );
}
function Editor() {
  const { id } = useLocalSearchParams<{ id: string }>(),
    auth = useAuth();
  const r = useResource(
    useCallback(() => learningRepository.material(id), [id]),
  );
  if (auth.profile?.role !== "teacher")
    return (
      <Failure
        error={{ code: "FORBIDDEN" }}
        retry={() => router.replace("/home")}
      />
    );
  if (r.loading) return <Loading />;
  if (r.error || !r.data) return <Failure error={r.error} retry={r.refresh} />;
  return <MaterialForm key={r.data.id} material={r.data} />;
}
