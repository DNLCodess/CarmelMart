import Navbar from "@/components/common/navbar";
import Footer from "@/components/common/footer";

export default function PagesLayout({ children }) {
  return (
    <>
      <Navbar />
      <main className="min-h-screen">{children}</main>
      <Footer />
    </>
  );
}
