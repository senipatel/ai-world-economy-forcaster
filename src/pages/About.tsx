import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Globe, ArrowLeft } from "lucide-react";

const About = () => {
  const navigate = useNavigate();   

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <button onClick={() => navigate("/")} className="flex items-center gap-2">
              <Globe className="h-8 w-8 text-accent" />
              <span className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                AI Economy Forecaster
              </span>
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Button variant="ghost" onClick={() => navigate("/")} className="mb-8">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Button>

        <h1 className="text-4xl font-bold mb-6">About AI Economy Forecaster</h1>
        
        <div className="prose prose-invert max-w-none space-y-6">
          <p className="text-lg text-muted-foreground">
            AI Economy Forecaster is a cutting-edge platform that brings together global economic data
            and artificial intelligence to help you understand and analyze economic trends worldwide.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-4">Our Mission</h2>
          <p className="text-muted-foreground">
            We believe that access to reliable economic data and intelligent analysis should be available
            to everyone. Our platform democratizes economic intelligence by providing intuitive tools
            powered by advanced AI technology.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-4">Data Sources</h2>
          <p className="text-muted-foreground">
            Our data comes from trusted international sources including the International Monetary Fund (IMF),
            World Bank, and other reputable organizations, ensuring accuracy and reliability.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-4">Technology</h2>
          <p className="text-muted-foreground">
            Built with modern web technologies and powered by Google's Gemini AI, our platform provides
            real-time analysis, interactive visualizations, and intelligent insights to help you make
            informed decisions.
          </p>
        </div>
      </div>
    </div>
  );
};

export default About;
