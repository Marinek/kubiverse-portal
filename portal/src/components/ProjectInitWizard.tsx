import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ProjectInitSchema, ProjectInitPayload } from "@kubiverse/shared";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ProjectInitWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProjectInitWizard({ open, onOpenChange }: ProjectInitWizardProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [logs, setLogs] = useState<{type: string, message?: string, status?: string}[]>([]);

  const form = useForm<ProjectInitPayload>({
    resolver: zodResolver(ProjectInitSchema),
    defaultValues: {
      project_type: "LIP_4",
      project_name: "",
      project_customer: "",
      dbms: "postgres",
      project_directory: "project",
      deployment: "none",
      deployment_name: "",
      build_image_name: "",
      notification_failure_email: "",
    },
  });

  const deploymentValue = form.watch("deployment");
  const projectTypeValue = form.watch("project_type");

  useEffect(() => {
    if (!activeJobId) return;

    const sse = new EventSource(`/api/v1/projects/status/${activeJobId}`);
    
    sse.onmessage = (e) => {
      const data = JSON.parse(e.data);
      setLogs((prev) => [...prev, data]);
      
      if (data.type === 'done') {
        sse.close();
        setIsSubmitting(false);
        if (data.status === 'SUCCESS') {
           toast.success(`Job ${activeJobId} erfolgreich abgeschlossen!`);
        } else {
           toast.error(`Job ${activeJobId} fehlgeschlagen. Rollback wurde durchgeführt.`);
        }
      }
    };

    sse.onerror = () => {
      sse.close();
      setIsSubmitting(false);
      toast.error("SSE Connection lost.");
    };

    return () => sse.close();
  }, [activeJobId]);

  async function submitData(data: ProjectInitPayload, isChaosTest = false) {
    setIsSubmitting(true);
    setLogs([]);
    setActiveJobId(null);
    try {
      const endpoint = isChaosTest ? '/api/v1/projects/init-fail-test' : '/api/v1/projects/init';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) throw new Error('API Request failed');
      
      const result = await response.json();
      setActiveJobId(result.jobId);
    } catch (error) {
      toast.error("Fehler beim Senden der Daten an das Backend.");
      setIsSubmitting(false);
    }
  }

  async function onSubmit(data: ProjectInitPayload) {
    await submitData(data, false);
  }

  async function onChaosTest() {
    await submitData(form.getValues(), true);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
        {activeJobId ? (
          <>
            <DialogHeader>
              <DialogTitle>Job Status: {activeJobId}</DialogTitle>
              <DialogDescription>
                Die Saga wird ausgeführt. Live-Logs vom Backend:
              </DialogDescription>
            </DialogHeader>
            <div className="bg-black text-green-400 p-4 font-mono text-sm rounded-md overflow-y-auto min-h-[300px] max-h-[400px] flex-1">
              {logs.map((log, i) => (
                <div key={i} className={log.type === 'error' ? 'text-red-500' : log.type === 'warn' ? 'text-yellow-400' : 'text-green-400'}>
                  {log.message || log.status}
                </div>
              ))}
              {isSubmitting && <div className="animate-pulse">_</div>}
            </div>
            <div className="flex justify-end pt-4 mt-auto">
              <Button onClick={() => { setActiveJobId(null); onOpenChange(false); }} disabled={isSubmitting}>
                {isSubmitting ? 'Läuft...' : 'Schließen'}
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Projekt initialisieren (LIP 4)</DialogTitle>
              <DialogDescription>
                Konfigurieren Sie hier die initiale Projektumgebung. Repository, Pipelines und 
                Kubernetes-Konfigurationen werden automatisch erstellt.
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                
                {/* Modular Project Type Selector */}
                <FormField
                  control={form.control}
                  name="project_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Projekt Typ *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Wähle einen Typ" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="LIP_4">LIP 4 (Standard)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* LIP 4 Specific Fields */}
                {projectTypeValue === "LIP_4" && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="project_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Projekt Name *</FormLabel>
                            <FormControl>
                              <Input placeholder="mein-projekt" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="project_customer"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Kunde *</FormLabel>
                            <FormControl>
                              <Input placeholder="Kundenname" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="dbms"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Datenbanksystem *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Wähle eine Datenbank" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="postgres">PostgreSQL</SelectItem>
                                <SelectItem value="mysql">MySQL</SelectItem>
                                <SelectItem value="mariadb">MariaDB</SelectItem>
                                <SelectItem value="oracle">Oracle</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="project_directory"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Projektverzeichnis</FormLabel>
                            <FormControl>
                              <Input placeholder="project" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="space-y-4 border rounded-lg p-4 bg-muted/30">
                      <h4 className="text-sm font-medium">Deployment Konfiguration</h4>
                      
                      <FormField
                        control={form.control}
                        name="deployment"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Deployment-Strategie</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Wähle eine Strategie" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="none">Kubernetes (Standard)</SelectItem>
                                <SelectItem value="deploy">VM Deployment</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {deploymentValue === "deploy" && (
                        <FormField
                          control={form.control}
                          name="deployment_name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>VM Name *</FormLabel>
                              <FormControl>
                                <Input placeholder="meine-vm" {...field} />
                              </FormControl>
                              <FormDescription>
                                Da Sie 'VM Deployment' gewählt haben, ist dieses Feld zwingend erforderlich.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="build_image_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Build Image Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Optional (Fallback auf Projekt Name)" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="notification_failure_email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Fehler-Benachrichtigung (E-Mail)</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="devops@materna.group" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center pt-4">
                  <Button type="button" variant="destructive" onClick={onChaosTest} disabled={isSubmitting}>
                    Chaos Test
                  </Button>
                  <div className="flex space-x-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => onOpenChange(false)}
                      disabled={isSubmitting}
                    >
                      Abbrechen
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Init...
                        </>
                      ) : (
                        "Projekt anlegen"
                      )}
                    </Button>
                  </div>
                </div>
              </form>
            </Form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
