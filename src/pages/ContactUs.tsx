import { useState, useEffect } from 'react';
import SEO from '@/components/SEO';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ArrowLeft, Send, Mail, Phone, User, MessageSquare, CheckCircle } from 'lucide-react';

export default function ContactUs() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      if (data.session?.user?.email) {
        setForm(f => ({ ...f, email: data.session!.user.email! }));
      }
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.subject.trim() || !form.message.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from('contact_messages').insert({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        subject: form.subject.trim(),
        message: form.message.trim(),
        user_id: user?.id || null,
      });
      if (error) throw error;
      setSubmitted(true);
      toast.success('Message sent successfully!');
    } catch {
      toast.error('Failed to send message. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4 px-4">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-2xl font-heading font-bold text-foreground">Message Sent!</h1>
        <p className="text-muted-foreground text-center max-w-md">
          Thank you for reaching out. Our team will get back to you within 24 hours at <strong className="text-primary">{form.email}</strong>.
        </p>
        <Button onClick={() => navigate('/')} variant="outline">← Back to Home</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Contact Us — Loca8tor" description="Get in touch with Loca8tor. Send us your questions, feedback, or partnership inquiries." path="/contact" />
      <header className="border-b border-border p-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-heading font-bold text-foreground">Contact Us</h1>
      </header>

      <main className="max-w-lg mx-auto p-4 space-y-6">
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
          <p className="text-sm text-foreground font-medium">Need help?</p>
          <p className="text-xs text-muted-foreground mt-1">
            Fill out the form below and our team will respond within 24 hours. You can also reach us at <strong className="text-primary">support@loca8tor.com</strong>.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-muted-foreground" /> Full Name *
            </Label>
            <Input
              id="name"
              placeholder="Your full name"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              maxLength={100}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-muted-foreground" /> Email Address *
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="you@email.com"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              maxLength={255}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-muted-foreground" /> Phone Number
            </Label>
            <Input
              id="phone"
              type="tel"
              placeholder="080XXXXXXXX (optional)"
              value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              maxLength={20}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject" className="flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" /> Subject *
            </Label>
            <Input
              id="subject"
              placeholder="Brief description of your issue"
              value={form.subject}
              onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
              maxLength={200}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message *</Label>
            <Textarea
              id="message"
              placeholder="Describe your issue in detail..."
              value={form.message}
              onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
              rows={6}
              maxLength={2000}
              required
            />
            <p className="text-[10px] text-muted-foreground text-right">{form.message.length}/2000</p>
          </div>

          <Button type="submit" disabled={submitting} className="w-full gap-2">
            <Send className="w-4 h-4" /> {submitting ? 'Sending...' : 'Send Message'}
          </Button>
        </form>
      </main>
    </div>
  );
}
