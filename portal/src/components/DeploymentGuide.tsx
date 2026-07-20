import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  CheckCircle2,
  GitBranch,
  FolderGit2,
  Rocket,
  Globe,
  Settings,
  ExternalLink,
  Loader2
} from "lucide-react";

export const DeploymentGuide = () => {
  const steps = [
    {
      number: "01",
      icon: FolderGit2,
      title: "Neues Projekt in Bitbucket anlegen",
      description: "Dieser Schritt dient zur Erstellung eines neuen Projekts. Falls bereits eines existiert, kann er übersprungen werden.",
      details: [
        "Neues Bitbucket Repository aus Template erstellen",
        "Deployment-Konfiguration ist bereits enthalten",
        "Ein Jira Board oder Confluence können (wenn erforderlich) über ein ALM Ticket beantragt werden"
      ],
      link: "https://bitbucket.materna.net"
    },
    {
      number: "02",
      icon: GitBranch,
      title: "Branch pushen",
      description: "Pushen Sie Ihren Code in einen entsprechenden Branch (z.B. feature/test-deployment)",
      details: [
        "feature/* für Feature-Deployments",
        "develop für aktuellen Entwicklungsstand",
        "release/* für ausgewählten Release-Stand",
        "master für Referenzstand beim Kunden"
      ],
      link: "https://bitbucket.materna.net"
    },
    {
      number: "03",
      icon: Rocket,
      title: "CI/CD-Pipeline automatisch ausgelöst",
      description: "Die (Jenkins-)Pipeline erkennt automatisch den Push und startet den Build-Prozess",
      details: [
        "Automatische Erkennung von Deployment-Branches",
        "Build-Prozess wird gestartet",
        "Container-Image wird erstellt",
        "Release-Artefakte werden ggf. erstellt"
      ],
      link: "https://fms-jenkins.materna.net"
    },
    {
      number: "04",
      icon: CheckCircle2,
      title: "Deployment automatisch ausgelöst",
      description: "Ein erfolgreicher Build löst (über ArgoCD) automatisch ein Deployment in den Kubernetes-Namespace des Projekts aus",
      details: [
        "Eigener Namespace pro Projekt",
        "Isolierte Ressourcen",
        "Automatische Skalierung",
        "Health-Checks und Log-Prüfung"
      ],
      link: "https://argocd.fms-kubiverse.materna.net/"
    },
    {
      number: "05",
      icon: Globe,
      title: "Projekt ist online über seine Kubiverse URL",
      description: "Nach dem Deployment ist das Projekt über seine Kubiverse URL erreichbar",
      details: [
        "URL Format: projektname.kubiverse.xxx.de",
        "HTTPS automatisch konfiguriert",
        "Load Balancing integriert",
        "Tests und Monitoring der Anwendungen und Dienste des Projekts"
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
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};