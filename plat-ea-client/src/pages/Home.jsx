import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import Services from "../components/Services";
import Footer from "../components/Footer";
import WhatsAppHelpButton from "../components/WhatsAppHelpButton";

export default function Home() {
  return (
    <div className="page-shell">
      <Navbar />
      <main>
        <Hero />
        <Services />
      </main>
      <Footer />
      <WhatsAppHelpButton />
    </div>
  );
}