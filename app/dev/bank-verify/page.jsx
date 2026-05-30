import { redirect } from "next/navigation";
import BankVerifyTester from "./BankVerifyTester";

export const metadata = { title: "Bank Verification Tester — Dev" };

export default function BankVerifyPage() {
  if (process.env.NODE_ENV === "production") redirect("/");
  return <BankVerifyTester />;
}
