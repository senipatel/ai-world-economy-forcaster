import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { TrendingUp, Globe, BarChart3, Brain, ArrowRight, Lightbulb, Target, Mail, MessageSquare, Activity, TrendingDown, AlertCircle, Zap } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-background">
      {/* Navigation */}
      <nav className="border-b border-border/50 backdrop-blur-sm bg-card/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2"
            >
              <div className="h-8 w-8 rounded-full bg-gradient-to-r from-primary to-accent flex items-center justify-center">
                <Globe className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                AI Economic Forecaster
              </span>
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-4"
            >
              <a href="#features" className="text-sm hover:text-primary transition-colors hidden sm:inline">Features</a>
              <a href="#about" className="text-sm hover:text-primary transition-colors hidden sm:inline">About</a>
              <a href="#contact" className="text-sm hover:text-primary transition-colors hidden sm:inline">Contact</a>
              <ThemeToggle />
              <Button onClick={() => navigate("/map")} size="sm" className="bg-primary hover:bg-primary/90">
                Dashboard
                <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </motion.div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 md:py-32">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center max-w-4xl mx-auto space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm"
            >
              <Zap className="h-4 w-4 text-primary" />
              <span className="text-primary font-medium">Powered by FRED & Gemini AI</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-5xl md:text-7xl font-bold leading-tight"
            >
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                AI Economic
              </span>
              <br />
              Forecaster
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed"
            >
              Transform complex US economic data into actionable insights with real-time charts and AI-powered analysis
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <Button 
                size="lg"
                onClick={() => navigate("/map")}
                className="text-lg h-14 px-8 bg-gradient-to-r from-primary to-accent hover:shadow-[var(--shadow-glow)] hover:scale-105 transition-all"
              >
                Open Dashboard
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Activity,
                title: "Real-Time Economic Data",
                description: "Access live US economic indicators including GDP, inflation, unemployment, and federal funds rate from FRED API"
              },
              {
                icon: Brain,
                title: "AI-Powered Analysis",
                description: "Get context-aware insights for each chart powered by Gemini AI. Ask questions and understand trends instantly"
              },
              {
                icon: TrendingUp,
                title: "Interactive Forecasting",
                description: "Adjust policy parameters with interactive sliders and see real-time impact on economic forecasts"
              }
            ].map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-card border border-border rounded-xl p-8 hover:shadow-[var(--shadow-card)] transition-all duration-300 hover:border-primary/50 group"
              >
                <div className="h-14 w-14 rounded-lg bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Economic Indicators */}
      <section className="py-24 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold mb-4">Track Critical Economic Indicators</h2>
            <p className="text-xl text-muted-foreground">Monitor the metrics that matter most to the US economy</p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: TrendingUp, label: "GDP Growth", color: "text-green-600 dark:text-green-400" },
              { icon: TrendingDown, label: "Inflation Rate", color: "text-red-600 dark:text-red-400" },
              { icon: AlertCircle, label: "Unemployment", color: "text-yellow-600 dark:text-yellow-400" },
              { icon: BarChart3, label: "Fed Funds Rate", color: "text-blue-600 dark:text-blue-400" }
            ].map((indicator, i) => (
              <motion.div
                key={indicator.label}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-card border border-border rounded-xl p-6 text-center hover:shadow-[var(--shadow-card)] transition-all"
              >
                <indicator.icon className={`h-12 w-12 mx-auto mb-4 ${indicator.color}`} />
                <h3 className="font-semibold">{indicator.label}</h3>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold mb-4">About the Project</h2>
            <p className="text-xl text-muted-foreground">Democratizing Economic Forecasting</p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-12 items-start">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-8"
            >
              <div className="bg-card border border-border rounded-xl p-8">
                <div className="h-12 w-12 rounded-lg bg-destructive/10 flex items-center justify-center mb-4">
                  <AlertCircle className="h-6 w-6 text-destructive" />
                </div>
                <h3 className="text-2xl font-semibold mb-4">The Problem</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Traditional economic forecasting models are often complex, require deep expertise, and may not 
                  process vast amounts of real-time data efficiently. This creates a barrier for individuals and 
                  small businesses to make data-driven economic decisions.
                </p>
              </div>

              <div className="bg-card border border-border rounded-xl p-8">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Lightbulb className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-2xl font-semibold mb-4">Our Solution</h3>
                <p className="text-muted-foreground leading-relaxed">
                  AI Economy Forecaster simplifies economic analysis by providing intuitive visualizations, 
                  AI-powered insights, and interactive policy simulations. We make complex economic data accessible 
                  to everyone, empowering informed decision-making.
                </p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="bg-card border border-border rounded-xl p-8"
            >
              <h3 className="text-2xl font-semibold mb-6">Built With Modern Technology</h3>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { name: "React", icon: "⚛️" },
                  { name: "TypeScript", icon: "📘" },
                  { name: "Vite", icon: "⚡" },
                  { name: "Tailwind CSS", icon: "🎨" },
                  { name: "Shadcn UI", icon: "🧩" },
                  { name: "Gemini AI", icon: "🤖" },
                  { name: "FRED API", icon: "📊" },
                  { name: "Recharts", icon: "📈" }
                ].map((tech, i) => (
                  <motion.div
                    key={tech.name}
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <span className="text-2xl">{tech.icon}</span>
                    <span className="font-medium">{tech.name}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-24 bg-muted/30">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl font-bold mb-4">Get In Touch</h2>
            <p className="text-xl text-muted-foreground">Have questions or feedback? We'd love to hear from you.</p>
          </motion.div>

          <motion.form
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-card border border-border rounded-xl p-8 space-y-6"
          >
            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2">Name</label>
                <Input placeholder="Your name" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <Input type="email" placeholder="your@email.com" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Message</label>
              <Textarea placeholder="Tell us what's on your mind..." rows={6} />
            </div>

            <Button type="submit" size="lg" className="w-full bg-gradient-to-r from-primary to-accent">
              <Mail className="mr-2 h-5 w-5" />
              Send Message
            </Button>
          </motion.form>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-8 p-6 bg-card border border-border rounded-lg"
          >
            <div className="flex items-start gap-4">
              <MessageSquare className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold mb-2">Quick Response</h3>
                <p className="text-sm text-muted-foreground">
                  We typically respond within 24-48 hours. For urgent matters, please include
                  "URGENT" in your message subject.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 border border-primary/20 rounded-2xl p-12 md:p-16 text-center"
          >
            <Target className="h-16 w-16 text-primary mx-auto mb-6" />
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Ready to Explore Economic Insights?</h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Start analyzing real-time economic data with AI-powered insights
            </p>
            <Button 
              size="lg"
              onClick={() => navigate("/map")}
              className="text-lg h-14 px-8 bg-gradient-to-r from-primary to-accent hover:shadow-[var(--shadow-glow)] hover:scale-105 transition-all"
            >
              Launch Dashboard
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-muted-foreground">
          <p>© 2025 AI Economy Forecaster. Powered by advanced data analytics and AI.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
