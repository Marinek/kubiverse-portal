import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertCircle, Copy, Download, Eye, FileText, KeyRound, ShieldAlert, ShieldCheck } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  copyToClipboard,
  downloadBlob,
  formatDateTime,
  lookupShare,
  MAX_PASSWORD_ATTEMPTS,
  retrieveShare,
  RetrievedShare,
  SecureShareError,
} from "@/lib/secureShareApi";

const NotAvailable = () => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <ShieldAlert className="h-5 w-5 text-muted-foreground" />
        Share nicht verfügbar
      </CardTitle>
      <CardDescription>
        Dieser Share existiert nicht oder ist nicht mehr verfügbar. Er ist möglicherweise abgelaufen, wurde bereits
        abgerufen oder gelöscht.
      </CardDescription>
    </CardHeader>
    <CardContent>
      <Link to="/secure-share">
        <Button variant="outline">Eigenen Share erstellen</Button>
      </Link>
    </CardContent>
  </Card>
);

const SecureShareAccess = () => {
  const { token: routeToken } = useParams();
  const navigate = useNavigate();
  // Held in memory only; the address bar and history entry are cleared below.
  const [token] = useState<string | null>(routeToken ?? null);
  const [password, setPassword] = useState("");
  const [result, setResult] = useState<{ share: RetrievedShare; deleted: boolean } | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "manual">("idle");
  const textRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (routeToken) {
      navigate("/share", { replace: true });
    }
  }, [routeToken, navigate]);

  const lookup = useQuery({
    queryKey: ["secure-share-lookup", token],
    queryFn: () => lookupShare(token as string),
    enabled: !!token,
    retry: false,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    gcTime: 0,
  });

  const retrieve = useMutation({
    mutationFn: () => retrieveShare(token as string, password || undefined),
    onSuccess: (share) => {
      const deleted = lookup.data?.remainingDownloads === 1;
      setResult({ share, deleted });
      setPassword("");
      if (share.type === "FILE") {
        downloadBlob(share.blob, share.filename);
      }
    },
    onError: (error) => {
      if (error instanceof SecureShareError && error.status === 403) {
        setPassword("");
      }
    },
  });

  const handleCopy = async () => {
    if (result?.share.type !== "TEXT") return;
    if (await copyToClipboard(result.share.text)) {
      setCopyState("copied");
    } else if (textRef.current) {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(textRef.current);
      selection?.removeAllRanges();
      selection?.addRange(range);
      setCopyState("manual");
    }
  };

  const lookupError = lookup.error instanceof SecureShareError ? lookup.error : null;
  const retrieveError = retrieve.error instanceof SecureShareError ? retrieve.error : null;
  const notAvailable = lookupError?.status === 404 || retrieveError?.status === 404;

  const renderContent = () => {
    if (!token) {
      return (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Kein Freigabelink</AlertTitle>
          <AlertDescription>
            Aus Sicherheitsgründen wird der Link nach dem Öffnen aus der Adresszeile entfernt. Bitte öffnen Sie den
            vollständigen Freigabelink erneut.
          </AlertDescription>
        </Alert>
      );
    }
    if (notAvailable) {
      return <NotAvailable />;
    }
    if (lookup.isLoading || (lookup.isFetching && !lookup.isFetchedAfterMount)) {
      return <p className="text-muted-foreground">Share wird geprüft…</p>;
    }
    if (lookup.isError) {
      return (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Share konnte nicht geladen werden</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>{lookup.error.message}</p>
            <Button variant="outline" size="sm" onClick={() => lookup.refetch()}>
              Erneut versuchen
            </Button>
          </AlertDescription>
        </Alert>
      );
    }
    if (result) {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-green-600" />
              {result.share.type === "TEXT" ? "Geteiltes Secret" : "Download gestartet"}
            </CardTitle>
            {result.deleted && (
              <CardDescription>
                Dies war der letzte erlaubte Abruf. Der Share wurde gelöscht und ist nicht mehr abrufbar.
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {result.share.type === "TEXT" ? (
              <>
                <pre
                  ref={textRef}
                  className="whitespace-pre-wrap break-all rounded-md border bg-muted/40 p-4 font-mono text-sm"
                >
                  {result.share.text}
                </pre>
                <Button variant="secondary" onClick={handleCopy}>
                  <Copy className="h-4 w-4 mr-2" />
                  Kopieren
                </Button>
                {copyState === "copied" && <p className="text-sm text-green-600">In die Zwischenablage kopiert.</p>}
                {copyState === "manual" && (
                  <p className="text-sm text-muted-foreground">
                    Automatisches Kopieren ist hier nicht möglich. Der Text ist markiert – bitte mit Strg+C kopieren.
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm">
                Die Datei <span className="font-medium">{result.share.filename}</span> wurde heruntergeladen.
              </p>
            )}
          </CardContent>
        </Card>
      );
    }

    const metadata = lookup.data;
    if (!metadata) return null;
    const isText = metadata.type === "TEXT";

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            {isText ? "Mit Ihnen wurde ein Text-Secret geteilt" : "Mit Ihnen wurde eine Datei geteilt"}
          </CardTitle>
          <CardDescription>
            Der Inhalt wird erst angezeigt bzw. heruntergeladen, wenn Sie unten bestätigen. Jeder Abruf zählt.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            <div>
              <dt className="text-muted-foreground">Läuft ab</dt>
              <dd className="font-medium">{formatDateTime(metadata.expiresAt)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Verbleibende Abrufe</dt>
              <dd className="font-medium">
                {metadata.remainingDownloads === null ? "Unbegrenzt bis zum Ablauf" : metadata.remainingDownloads}
              </dd>
            </div>
          </dl>

          {!isText && (
            <Alert>
              <ShieldAlert className="h-4 w-4" />
              <AlertDescription>
                Dateien werden nicht auf Schadsoftware geprüft. Öffnen Sie die Datei nur, wenn Sie den Absender kennen.
              </AlertDescription>
            </Alert>
          )}

          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              retrieve.mutate();
            }}
          >
            {metadata.passwordRequired && (
              <div className="space-y-2">
                <Label htmlFor="share-access-password" className="flex items-center gap-2">
                  <KeyRound className="h-4 w-4" />
                  Passwort
                </Label>
                <Input
                  id="share-access-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="off"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Nach {MAX_PASSWORD_ATTEMPTS} Fehlversuchen wird der Share endgültig gelöscht.
                </p>
              </div>
            )}

            {retrieve.isError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{retrieve.error.message}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" disabled={retrieve.isPending || (metadata.passwordRequired && !password)}>
              {isText ? <Eye className="h-4 w-4 mr-2" /> : <Download className="h-4 w-4 mr-2" />}
              {retrieve.isPending ? "Wird geladen…" : isText ? "Anzeigen" : "Herunterladen"}
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-3xl">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3 mb-8">
          <ShieldCheck className="h-8 w-8 text-primary" />
          Secure Share
        </h1>
        {renderContent()}
      </main>
      <Footer />
    </div>
  );
};

export default SecureShareAccess;
