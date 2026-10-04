import Hero from "@/components/hero/Hero";
import FiltrosTiza from "@/components/marca/FiltrosTiza";
import Carta from "@/components/secciones/Carta";
import Footer from "@/components/secciones/Footer";
import Marquesina from "@/components/secciones/Marquesina";
import Membresias from "@/components/secciones/Membresias";
import Nav from "@/components/secciones/Nav";
import Sucursales from "@/components/secciones/Sucursales";
import SeccionCafe from "@/components/tienda/SeccionCafe";

export default function Home() {
  return (
    <>
      <FiltrosTiza />
      <Nav />
      <main>
        <Hero />
        <Marquesina />
        <SeccionCafe />
        <Sucursales />
        <Carta />
        <Membresias />
      </main>
      <Footer />
    </>
  );
}
