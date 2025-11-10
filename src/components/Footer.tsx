import React from "react";
import { Globe } from "lucide-react";

const Footer: React.FC = () => {
  return (
    <footer className="border-t border-border/50 py-8 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-r from-primary to-accent flex items-center justify-center">
              <Globe className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <div className="text-lg font-semibold">AI Economic Forecaster</div>
              <div className="text-sm text-muted-foreground">Democratizing economic forecasting with real-time data and AI</div>
            </div>
          </div>

          <div className="text-sm text-muted-foreground text-center">
            <div>Developers: <a className="text-primary hover:underline" target="_blank" href="https://github.com/Sapna190">Sapna Sharma</a> • <a className="text-primary hover:underline"target="_blank" href="https://github.com/senipatel">Seni Patel</a></div>
            <div className="mt-2">Built for <a className="text-primary hover:underline" target="_blank" href="https://hacknomics.devpost.com/">HackNomics</a> • © 2025</div>
          </div>

          <div className="flex items-center gap-3">
            <a className="text-muted-foreground hover:text-primary" href="#">Privacy</a>
            <a className="text-muted-foreground hover:text-primary" href="#">Terms</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
