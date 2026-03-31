import Navbar from "@/components/common/navbar";
import Footer from "@/components/common/footer";
import MobileBottomNav from "@/components/common/MobileBottomNav";

export default function PagesLayout({ children }) {
  return (
    <>
      <Navbar />
      <main className="min-h-screen pb-16 lg:pb-0">{children}</main>
      <Footer />
      <MobileBottomNav />
    </>
  );
}
