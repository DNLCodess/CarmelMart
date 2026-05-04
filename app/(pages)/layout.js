import Navbar from "@/components/common/navbar";
import Footer from "@/components/common/footer";
import MobileBottomNav from "@/components/common/MobileBottomNav";

export default function PagesLayout({ children }) {
  return (
    <>
      {/* <Navbar /> */}
      <main className="min-h-screen">{children}</main>
      {/* <Footer /> */}
      {/* Spacer that matches MobileBottomNav height + iOS safe-area-inset-bottom */}
      <div
        aria-hidden="true"
        className="lg:hidden h-16"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      />
      {/* <MobileBottomNav /> */}
    </>
  );
}
