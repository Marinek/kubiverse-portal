import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { AlertCircle, Check, Copy, FileUp, KeyRound, Lock, ShieldCheck, Type } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  buildShareLink,
  copyToClipboard,
  createShare,
  CreatedShare,
  DEFAULT_EXPIRY,
  DEFAULT_MAX_DOWNLOADS,
  EXPIRY_OPTIONS,
  fieldMessage,
  formatBytes,
  formatDateTime,
  MAX_DOWNLOAD_OPTIONS,
  MAX_FILE_BYTES,
  MAX_PASSWORD_CHARS,
  MAX_TEXT_CHARS,
  MIN_PASSWORD_CHARS,
  SecureShareError,
  ShareField,
} from "@/lib/secureShareApi";

type Mode = "text" | "file";

const SecureShare = () => {
  const [mode, setMode] = useState<Mode>("text");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [expiresIn, setExpiresIn] = useState<string>(DEFAULT_EXPIRY);
  const [maxDownloads, setMaxDownloads] = useState<string>(DEFAULT_MAX_DOWNLOADS);
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<ShareField, string>>>({});
  const [created, setCreated] = useState<{ share: CreatedShare; link: string } | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "manual">("idle");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const linkInputRef = useRef<HTMLInputElement>(null);

  const mutation = useMutation({
    mutationFn: createShare,
    onSuccess: (share) => {
      setCreated({ share, link: buildShareLink(share.token) });
      setText("");
      setFile(null);
      setPassword("");
      setCopyState("idle");
    },
    onError: (error) => {
      if (error instanceof SecureShareError && error.fields.length) {
        setFieldErrors(Object.fromEntries(error.fields.map((field) => [field, fieldMessage(field)])));
      }
    },
  });

  const validate = (): Partial<Record<ShareField, string>> => {
    const errors: Partial<Record<ShareField, string>> = {};
    if (mode === "text") {
      if (!text.trim()) errors.text = "Bitte einen Text eingeben.";
      else if (text.length > MAX_TEXT_CHARS) errors.text = fieldMessage("text");
    } else if (!file) {
      errors.file = "Bitte eine Datei auswählen.";
    } else if (file.size === 0) {
      errors.file = fieldMessage("file");
    } else if (file.size > MAX_FILE_BYTES) {
      errors.file = "Die Datei ist zu groß. Die maximale Dateigröße beträgt 10 MB.";
    }
    if (password && (password.length < MIN_PASSWORD_CHARS || password.length > MAX_PASSWORD_CHARS)) {
      errors.password = fieldMessage("password");
    }
    return errors;
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;
    mutation.mutate({
      text: mode === "text" ? text : undefined,
      file: mode === "file" && file ? file : undefined,
      expiresIn,
      maxDownloads,
      password: password || undefined,
    });
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;
    setFile(selected);
    setFieldErrors((prev) => ({
      ...prev,
      file:
        selected && selected.size > MAX_FILE_BYTES
          ? "Die Datei ist zu groß. Die maximale Dateigröße beträgt 10 MB."
          : undefined,
    }));
  };

  const handleCopy = async () => {
    if (!created) return;
    if (await copyToClipboard(created.link)) {
      setCopyState("copied");
    } else {
      linkInputRef.current?.select();
      setCopyState("manual");
    }
  };

  const reset = () => {
    setCreated(null);
    setExpiresIn(DEFAULT_EXPIRY);
    setMaxDownloads(DEFAULT_MAX_DOWNLOADS);
    setFieldErrors({});
    mutation.reset();
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const generalError =
    mutation.error && !(mutation.error instanceof SecureShareError && mutation.error.fields.length)
      ? mutation.error.message
      : null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-3xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <ShieldCheck className="h-8 w-8 text-primary" />
            Secure Share
          </h1>
          <p className="text-muted-foreground mt-2">
            Teilen Sie Passwörter, Tokens oder Dateien über einen einmaligen Link. Inhalte werden verschlüsselt
            gespeichert und nach Ablauf oder nach dem letzten erlaubten Abruf automatisch gelöscht.
          </p>
        </div>

        {created ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-600" />
                Share erstellt
              </CardTitle>
              <CardDescription>
                Geben Sie diesen Link an die Empfänger weiter. Er wird nur jetzt angezeigt und kann später nicht
                wiederhergestellt werden.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  ref={linkInputRef}
                  readOnly
                  value={created.link}
                  aria-label="Freigabelink"
                  className="font-mono text-sm"
                  onFocus={(e) => e.target.select()}
                />
                <Button type="button" onClick={handleCopy} variant="secondary">
                  <Copy className="h-4 w-4 mr-2" />
                  Kopieren
                </Button>
              </div>
              {copyState === "copied" && <p className="text-sm text-green-600">Link in die Zwischenablage kopiert.</p>}
              {copyState === "manual" && (
                <p className="text-sm text-muted-foreground">
                  Automatisches Kopieren ist hier nicht möglich. Der Link ist markiert – bitte mit Strg+C kopieren.
                </p>
              )}
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                <div>
                  <dt className="text-muted-foreground">Läuft ab</dt>
                  <dd className="font-medium">{formatDateTime(created.share.expiresAt)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Erlaubte Abrufe</dt>
                  <dd className="font-medium">
                    {created.share.maxDownloads === null ? "Unbegrenzt bis zum Ablauf" : created.share.maxDownloads}
                  </dd>
                </div>
              </dl>
              <Alert>
                <KeyRound className="h-4 w-4" />
                <AlertDescription>
                  Falls Sie ein Passwort vergeben haben, teilen Sie es über einen anderen Kanal als den Link.
                </AlertDescription>
              </Alert>
              <Button type="button" variant="outline" onClick={reset}>
                Neuen Share erstellen
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <form onSubmit={handleSubmit} noValidate>
              <CardHeader>
                <CardTitle>Neuen Share erstellen</CardTitle>
                <CardDescription>Wählen Sie, ob Sie einen Text oder eine Datei teilen möchten.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Tabs value={mode} onValueChange={(value) => setMode(value as Mode)}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="text">
                      <Type className="h-4 w-4 mr-2" />
                      Text
                    </TabsTrigger>
                    <TabsTrigger value="file">
                      <FileUp className="h-4 w-4 mr-2" />
                      Datei
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="text" className="space-y-2 pt-2">
                    <Label htmlFor="share-text">Text-Secret</Label>
                    <Textarea
                      id="share-text"
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      rows={6}
                      className="font-mono"
                      autoComplete="off"
                      spellCheck={false}
                      aria-invalid={!!fieldErrors.text}
                      aria-describedby="share-text-hint"
                    />
                    <div id="share-text-hint" className="flex justify-between text-xs">
                      <span className="text-destructive">{fieldErrors.text}</span>
                      <span className={text.length > MAX_TEXT_CHARS ? "text-destructive" : "text-muted-foreground"}>
                        {text.length.toLocaleString("de-DE")} / {MAX_TEXT_CHARS.toLocaleString("de-DE")} Zeichen
                      </span>
                    </div>
                  </TabsContent>
                  <TabsContent value="file" className="space-y-2 pt-2">
                    <Label htmlFor="share-file">Datei (max. 10 MB)</Label>
                    <Input
                      id="share-file"
                      ref={fileInputRef}
                      type="file"
                      onChange={handleFileChange}
                      aria-invalid={!!fieldErrors.file}
                      aria-describedby="share-file-hint"
                    />
                    <div id="share-file-hint" className="text-xs">
                      {fieldErrors.file ? (
                        <span className="text-destructive">{fieldErrors.file}</span>
                      ) : (
                        file && (
                          <span className="text-muted-foreground">
                            {file.name} ({formatBytes(file.size)})
                          </span>
                        )
                      )}
                    </div>
                  </TabsContent>
                </Tabs>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="share-expiry">Ablaufzeit</Label>
                    <Select value={expiresIn} onValueChange={setExpiresIn}>
                      <SelectTrigger id="share-expiry">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {EXPIRY_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {fieldErrors.expiresIn && <p className="text-xs text-destructive">{fieldErrors.expiresIn}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="share-downloads">Erlaubte Abrufe</Label>
                    <Select value={maxDownloads} onValueChange={setMaxDownloads}>
                      <SelectTrigger id="share-downloads">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MAX_DOWNLOAD_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {fieldErrors.maxDownloads && (
                      <p className="text-xs text-destructive">{fieldErrors.maxDownloads}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="share-password">Zusatzpasswort (optional)</Label>
                  <Input
                    id="share-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    aria-invalid={!!fieldErrors.password}
                    aria-describedby="share-password-hint"
                  />
                  <p id="share-password-hint" className={`text-xs ${fieldErrors.password ? "text-destructive" : "text-muted-foreground"}`}>
                    {fieldErrors.password ??
                      `${MIN_PASSWORD_CHARS}–${MAX_PASSWORD_CHARS} Zeichen. Empfänger müssen es zusätzlich zum Link eingeben.`}
                  </p>
                </div>

                {fieldErrors.content && (
                  <p className="text-sm text-destructive">{fieldErrors.content}</p>
                )}

                {generalError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Share konnte nicht erstellt werden</AlertTitle>
                    <AlertDescription>{generalError}</AlertDescription>
                  </Alert>
                )}

                <Button type="submit" disabled={mutation.isPending} className="w-full sm:w-auto">
                  <Lock className="h-4 w-4 mr-2" />
                  {mutation.isPending ? "Wird verschlüsselt…" : "Share erstellen"}
                </Button>
              </CardContent>
            </form>
          </Card>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default SecureShare;
