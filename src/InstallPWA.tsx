import { useEffect, useState } from "react";
import { Button } from "./components/ui/button.tsx";
import React from "react";

const InstallPWA = () => {
  const [promptEvent, setPromptEvent] = useState<any>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      setPromptEvent(e);
      setVisible(true);
    });
  }, []);

  const handleInstall = () => {
    if (!promptEvent) return;
    promptEvent.prompt();
    promptEvent.userChoice.then((choiceResult: any) => {
      if (choiceResult.outcome === 'accepted') {
        if (import.meta.env.DEV) {
          console.log('PWA installed');
        }
      }
      setPromptEvent(null);
      setVisible(false);
    });
  };

  return (
    visible && (
      <Button onClick={handleInstall} className="fixed bottom-4 right-4 bg-warm-accent text-white px-4 py-2 rounded-xl shadow-lg">
        Install App
      </Button>
    )
  );
};

export default InstallPWA;
