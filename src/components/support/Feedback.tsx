import React, { useState } from 'react';
import PageLayout from './PageLayout';
import FormInput from './FormInput';
import TextArea from './TextArea';
import SubmitButton from './SubmitButton';
import { supabase } from '../../utils/supabaseClient';
import { toast } from 'sonner';

export default function Feedback() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.message.trim()) {
      toast.error("Please enter your feedback message");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('feedback').insert([formData]);
      if (error) throw error;
      
      toast.success("Thanks for your feedback 💛");
      setFormData({ name: '', email: '', message: '' });
    } catch (err: any) {
      toast.error(err.message || "Failed to submit feedback");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageLayout title="Share Feedback" subtitle="Help us improve Smile Artist with your thoughts">
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormInput 
          label="Name (Optional)" 
          id="name" 
          placeholder="Your name" 
          value={formData.name}
          onChange={e => setFormData({ ...formData, name: e.target.value })}
        />
        <FormInput 
          label="Email (Optional)" 
          id="email" 
          type="email"
          placeholder="your@email.com" 
          value={formData.email}
          onChange={e => setFormData({ ...formData, email: e.target.value })}
        />
        <TextArea 
          label="Feedback Message" 
          id="message" 
          required
          placeholder="Tell us what you love or what we can improve..." 
          value={formData.message}
          onChange={e => setFormData({ ...formData, message: e.target.value })}
        />
        <SubmitButton loading={loading}>Submit Feedback</SubmitButton>
      </form>
    </PageLayout>
  );
}
