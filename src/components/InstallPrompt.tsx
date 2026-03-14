import { useState, useEffect } from "react";
import { Download, X, Smartphone, Monitor } from "lucide-react";
import { useUserData } from "../App";

export function InstallPrompt() {
  const { deferredPrompt, showInstallPrompt, setShowInstallPrompt } = useUserData();
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (!showInstallPrompt || !deferredPrompt) return null;

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    // Show the native install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    
    // We've used the prompt, and can't use it again, so clear it
    setShowInstallPrompt(false);
  };

  const handleDismiss = () => {
    setShowInstallPrompt(false);
    // Optionally stash in localStorage to prevent showing again for a while
    localStorage.setItem("pwa_prompt_dismissed_at", Date.now().toString());
  };

  // Mobile View: Simple anchored prompt
  if (!isDesktop) {
    return (
      <div 
        className="fixed bottom-24 left-4 right-4 z-[20000] p-4 rounded-2xl animate-in slide-in-from-bottom-10 duration-500"
        style={{ 
          backgroundColor: 'var(--theme-card-bg)',
          boxShadow: '0 20px 50px rgba(0,0,0,0.4)',
          border: '1px solid var(--theme-text)15',
          backdropFilter: 'blur(20px)'
        }}
      >
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-primary/10" style={{ backgroundColor: 'var(--theme-accent)20' }}>
            <Smartphone className="text-primary" size={24} style={{ color: 'var(--theme-accent)' }} />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-lg" style={{ color: 'var(--theme-text)' }}>Install Smile Artist</h3>
            <p className="text-sm opacity-70 mb-4" style={{ color: 'var(--theme-text)' }}>
              Get our app on your home screen for a better experience and instant notifications.
            </p>
            <div className="flex gap-2">
              <button 
                onClick={handleInstallClick}
                className="flex-1 py-2.5 rounded-xl font-bold transition-all active:scale-95"
                style={{ 
                  backgroundColor: 'var(--theme-accent)',
                  color: 'white',
                  boxShadow: '0 4px 15px var(--theme-accent)40'
                }}
              >
                Install Now
              </button>
              <button 
                onClick={handleDismiss}
                className="px-4 py-2.5 rounded-xl font-medium transition-all opacity-60 hover:opacity-100"
                style={{ 
                  color: 'var(--theme-text)',
                  backgroundColor: 'var(--theme-text)05'
                }}
              >
                Not now
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Desktop View: Suggestion popup
  return (
    <div 
      className="fixed bottom-8 right-8 z-[20000] w-80 p-5 rounded-2xl animate-in fade-in slide-in-from-right-10 duration-700"
      style={{ 
        backgroundColor: 'var(--theme-card-bg)',
        boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
        border: '1px solid var(--theme-text)15',
        backdropFilter: 'blur(20px)'
      }}
    >
      <button 
        onClick={handleDismiss}
        className="absolute top-3 right-3 p-1 rounded-full hover:bg-black/5 transition-colors"
      >
        <X size={16} className="opacity-40" />
      </button>
      
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2.5 rounded-lg bg-primary/10" style={{ backgroundColor: 'var(--theme-accent)20' }}>
          <Monitor size={20} style={{ color: 'var(--theme-accent)' }} />
        </div>
        <h3 className="font-bold" style={{ color: 'var(--theme-text)' }}>Try our Desktop App</h3>
      </div>
      
      <p className="text-sm opacity-70 mb-5 leading-relaxed" style={{ color: 'var(--theme-text)' }}>
        Install Smile Artist on your computer for faster access and a premium full-screen experience.
      </p>
      
      <button 
        onClick={handleInstallClick}
        className="w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all hover:brightness-110 active:scale-[0.98]"
        style={{ 
          backgroundColor: 'var(--theme-accent)',
          color: 'white',
          boxShadow: '0 8px 20px var(--theme-accent)30'
        }}
      >
        <Download size={18} />
        Install App
      </button>
    </div>
  );
}
