import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { KubiverseSection } from "@/components/KubiverseSection";
import { DeploymentGuide } from "@/components/DeploymentGuide";
import { DocumentationSection } from "@/components/DocumentationSection";
import { Footer } from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <Hero />
        <KubiverseSection />
        <DeploymentGuide />
        <DocumentationSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;