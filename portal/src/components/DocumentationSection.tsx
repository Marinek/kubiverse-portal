import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  BookOpen, 
  ExternalLink, 
  HelpCircle, 
  MessageCircle, 
  FileText,
  Users,
  Zap,
  AlertCircle,
  Toolbox
} from "lucide-react";

export const DocumentationSection = () => {
  const resources = [
    {
      icon: Zap,
      title: "CI/CD Pipeline-Konfiguration",
      description: "Setup und Konfiguration der automatisierten Deployment-Pipelines",
      type: "Confluence",
      color: "bg-purple-500",
      urgent: false,
      link: import.meta.env.VITE_DOCS_CICD_PIPELINE_URL || "#"
    },
    {
      icon: BookOpen,
      title: "Anleitungen",
      description: "Ausführliche Anleitungen zu FMS DevOps Themen",
      type: "Confluence",
      color: "bg-blue-500",
      urgent: false,
      link: import.meta.env.VITE_DOCS_DEPLOYMENT_GUIDE_URL || "#"
    },
    {
      icon: FileText,
      title: "Konventionen",
      description: "Konventionen und Standard bei FMS DevOps",
      type: "Confluence", 
      color: "bg-green-500",
      urgent: false,
      link: import.meta.env.VITE_DOCS_CONVENTIONS_URL || "#"
    },
  ];

  const contacts = [
    {
      icon: AlertCircle,
      title: "Troubleshooting",
      description: "Häufige Probleme und deren Lösungen",
      type: "Confluence",
      color: "bg-orange-500",
      urgent: false,
      link: import.meta.env.VITE_DOCS_TROUBLESHOOTING_URL || "#"
    },
    {
      icon:  Users,
      title: "DevOps Services",
      description: "Dienstleistungen vom FMS DevOps im Überblick",
      type: "Confluence",
      color: "bg-orange-500",
      urgent: false,
      link: import.meta.env.VITE_DOCS_FLYER_URL || "#"
    },
    {
      icon: Users,
      title: "DevOps-Team",
      description: "Kontaktiere FMS DevOps über Teams",
      type: "Contact",
      color: "bg-orange-500",
      urgent: false,
      link: import.meta.env.VITE_TEAMS_CHAT_URL || "#",
      contact: "fms-devops@materna.group"
    }
  ];

  return (
    <section id="documentation" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4">
            <BookOpen className="w-4 h-4 mr-2" />
            Hilfe & Support
          </Badge>
          <h2 className="text-4xl font-bold mb-6">Dokumentation & Hilfe</h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Finden Sie alle notwendigen Ressourcen, Anleitungen und Kontakte für 
            eine erfolgreiche Nutzung des FMS-Kubiverse.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          <div>
            <h3 className="text-2xl font-bold mb-6 flex items-center">
              <FileText className="w-6 h-6 mr-3 text-primary" />
              Dokumentation
            </h3>
            <div className="space-y-4">
              {resources.map((resource, index) => (
                <a 
                  key={index} 
                  href={resource.link} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="block group"
                >
                  <Card className="hover:shadow-card transition-all duration-300 group-hover:-translate-y-1 h-full cursor-pointer">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4">
                          <div className={`w-10 h-10 ${resource.color} rounded-lg flex items-center justify-center`}>
                            <resource.icon className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <CardTitle className="text-lg">{resource.title}</CardTitle>
                              {resource.urgent && (
                                <Badge variant="destructive" className="text-xs">
                                  Wichtig
                                </Badge>
                              )}
                            </div>
                            <Badge variant="outline" className="text-xs mt-1">
                              {resource.type}
                            </Badge>
                          </div>
                        </div>
                        <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-sm">
                        {resource.description}
                      </CardDescription>
                    </CardContent>
                  </Card>
                </a>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-2xl font-bold mb-6 flex items-center">
              <HelpCircle className="w-6 h-6 mr-3 text-primary" />
              Support & Kontakt
            </h3>
            <div className="space-y-4">
              {contacts.map((resource, index) => (
                <a 
                  key={index} 
                  href={resource.link} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="block group"
                >
                  <Card className="hover:shadow-card transition-all duration-300 group-hover:-translate-y-1 h-full cursor-pointer">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4">
                          <div className={`w-10 h-10 ${resource.color} rounded-lg flex items-center justify-center`}>
                            <resource.icon className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <CardTitle className="text-lg">{resource.title}</CardTitle>
                              {resource.urgent && (
                                <Badge variant="destructive" className="text-xs">
                                  Wichtig
                                </Badge>
                              )}
                            </div>
                            <Badge variant="outline" className="text-xs mt-1">
                              {resource.type}
                            </Badge>
                          </div>
                        </div>
                        <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-sm">
                        {resource.description}
                      </CardDescription>
                    </CardContent>
                  </Card>
                </a>
              ))}
            </div>
          </div>
        </div>


      </div>
    </section>
  );
};