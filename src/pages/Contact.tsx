import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "react-router-dom";
import { Globe, ArrowLeft, Mail, MessageSquare } from "lucide-react";

const Contact = () => {
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

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Button variant="ghost" onClick={() => navigate("/")} className="mb-8">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Button>

        <h1 className="text-4xl font-bold mb-6">Contact Us</h1>
        <p className="text-lg text-muted-foreground mb-12">
          Have questions or feedback? We'd love to hear from you.
        </p>

        <form className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Name</label>
            <Input placeholder="Your name" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <Input type="email" placeholder="your@email.com" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Message</label>
            <Textarea placeholder="Tell us what's on your mind..." rows={6} />
          </div>

          <Button type="submit" variant="hero" size="lg" className="w-full">
            <Mail className="mr-2 h-5 w-5" />
            Send Message
          </Button>
        </form>

        <div className="mt-12 p-6 bg-card border border-border rounded-lg">
          <div className="flex items-start gap-4">
            <MessageSquare className="h-6 w-6 text-accent flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold mb-2">Quick Response</h3>
              <p className="text-sm text-muted-foreground">
                We typically respond within 24-48 hours. For urgent matters, please include
                "URGENT" in your message subject.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;
