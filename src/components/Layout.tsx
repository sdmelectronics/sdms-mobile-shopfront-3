
import { Outlet } from "react-router-dom"
import { Footer } from "./Footer";
import { Navbar } from "./Navbar";
import NavigatorBar from "./NavigatorBar";
import { Marquee } from "./Marquee";

export const Layout = () => {
  return (
    <div className="min-h-screen bg-warm-bg">
      <Marquee />
      <Navbar />
      <main className="pb-4 md:pb-0">
        <Outlet />
      </main>

      <Footer />
      <NavigatorBar />
    </div>
  );
};
