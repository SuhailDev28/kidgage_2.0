// client/src/layouts/PublicLayout.jsx
import { Outlet } from "react-router-dom";
import { Header } from "../components/common/Header.jsx";
import { Footer } from "../components/common/Footer.jsx";

export function PublicLayout() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-white text-[#0f172a]">
      <div className="flex min-h-screen flex-col">
        <Header />

        <main className="flex-1">
          <Outlet />
        </main>

        <Footer />
      </div>
    </div>
  );
}
