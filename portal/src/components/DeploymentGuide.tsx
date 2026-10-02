import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { toast } from "sonner";
import {
  ArrowRight,
  CheckCircle2,
  GitBranch,
  Rocket,
  Globe,
  Settings,
  ExternalLink,
  Loader2
} from "lucide-react";

export const DeploymentGuide = () => {
  const [projectName, setProjectName] = useState("");
  const [isBootstrapping, setIsBootstrapping] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const handleBootstrap = async () => {
    setFeedback(null);
    if (!projectName.trim()) {
      toast.error("Bitte einen Projektnamen eingeben");
      setFeedback({ message: "Bitte einen Projektnamen eingeben", type: "error" });
      return;
    }

    setIsBootstrapping(true);
    try {
      const response = await fetch("/kubiverse/api/bootstrap", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ projectName: projectName.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Bootstrap fehlgeschlagen");
      }

      toast.success("Projekt erfolgreich bootstrapped!");
      setFeedback({ message: "Projekt erfolgreich bootstrapped!", type: "success" });
      setProjectName("");
    } catch (error: any) {
      toast.error(`Fehler: ${error.message}`);
      setFeedback({ message: `Fehler: ${error.message}`, type: "error" });
    } finally {
      setIsBootstrapping(false);
    }
  };
  const steps = [
    {
      number: "01",
      icon: Settings,
      title: "Projekt in Bitbucket anlegen",
      description: "Erstellen Sie ein neues Repository oder aktualisieren Sie ein bestehendes Projekt in Bitbucket",
      details: [
        "Repository erstellen oder Code aktualisieren",
        "Deployment-Konfiguration hinzufügen",
        "Branch-Struktur nach internen Konventionen"
      ]
    },
    {
      number: "02",
      icon: GitBranch,
      title: "Branch pushen",
      description: "Pushen Sie Ihren Code in einen entsprechenden Branch (z.B. feature/test-deployment)",
      details: [
        "Branch-Naming nach Git-Konventionen",
        "feature/* für Feature-Deployments",
        "test/* für Testumgebungen",
        "staging/* für Staging-Deployments"
      ]
    },
    {
      number: "03",
      icon: Rocket,
      title: "CI/CD-Pipeline automatisch ausgelöst",
      description: "Die Pipeline erkennt automatisch den Push und startet den Deployment-Prozess",
      details: [
        "Automatische Erkennung von Deployment-Branches",
        "Build-Prozess wird gestartet",
        "Container-Image wird erstellt",
        "Tests werden ausgeführt"
      ]
    },
    {
      number: "04",
      icon: CheckCircle2,
      title: "Deployment in eigenem Namespace",
      description: "Ihr Projekt wird in einem isolierten Kubernetes-Namespace deployed",
      details: [
        "Eigener Namespace pro Projekt",
        "Isolierte Ressourcen",
        "Automatische Skalierung",
        "Health-Checks und Monitoring"
      ]
    },
    {
      number: "05",
      icon: Globe,
      title: "Zugriff über generierte URL",
      description: "Nach erfolgreichem Deployment ist Ihr Projekt über eine automatisch generierte URL erreichbar",
      details: [
        "Format: projektname.kubiverse.xxx.de",
        "HTTPS automatisch konfiguriert",
        "Load Balancing integriert",
        "URL wird automatisch generiert"
      ]
    }
  ];

  return (
    <section id="deployment" className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4">
            <Rocket className="w-4 h-4 mr-2" />
            Deployment-Prozess
          </Badge>
          <h2 className="text-4xl font-bold mb-6">Projekt veröffentlichen</h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            In nur 5 einfachen Schritten ist Ihr Projekt im Kubiverse deployed und
            über eine eigene URL erreichbar. Der gesamte Prozess läuft vollautomatisch ab.
          </p>
        </div>

        <div className="max-w-4xl mx-auto space-y-8">
          {steps.map((step, index) => (
            <Card key={index} className="group hover:shadow-card transition-all duration-300">
              <CardHeader className="pb-4">
                <div className="flex items-start space-x-6">
                  <div className="flex flex-col items-center">
                    <div className="w-14 h-14 bg-gradient-primary rounded-xl flex items-center justify-center mb-2 group-hover:shadow-glow transition-all duration-300">
                      <step.icon className="w-7 h-7 text-primary-foreground" />
                    </div>
                    <Badge variant="secondary" className="text-xs font-mono">
                      {step.number}
                    </Badge>
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-xl mb-2">{step.title}</CardTitle>
                    <CardDescription className="text-base">
                      {step.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="ml-20">
                  <ul className="space-y-2">
                    {step.details.map((detail, detailIndex) => (
                      <li key={detailIndex} className="flex items-center text-sm text-muted-foreground">
                        <div className="w-1.5 h-1.5 bg-accent rounded-full mr-3 flex-shrink-0" />
                        {detail}
                      </li>
                    ))}
                  </ul>
                  {index === 0 && (
                    <div className="mt-6 flex flex-col gap-3">
                      <div className="flex flex-col sm:flex-row gap-3">
                        <Input 
                          placeholder="Projektname eingeben" 
                          value={projectName}
                          onChange={(e) => setProjectName(e.target.value)}
                          className="max-w-xs"
                        />
                        <Button onClick={handleBootstrap} disabled={isBootstrapping}>
                          {isBootstrapping && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Projekt initialisieren
                        </Button>
                      </div>
                      {feedback && (
                        <div className={`p-3 rounded-md text-sm border max-w-lg ${feedback.type === 'success' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                          {feedback.message}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-16 p-8 bg-gradient-hero rounded-2xl shadow-elegant text-center">
          <h3 className="text-2xl font-bold text-primary-foreground mb-4">
            Bereit für Ihr erstes Deployment?
          </h3>
          <p className="text-primary-foreground/90 mb-6 max-w-2xl mx-auto">
            Folgen Sie unserer Schritt-für-Schritt-Anleitung und haben Sie Ihr
            Projekt in wenigen Minuten im Kubiverse deployed.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="secondary" size="lg" className="group">
              Deployment starten
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};