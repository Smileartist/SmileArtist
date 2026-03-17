import React, { useState } from 'react';
import PageLayout from './PageLayout';
import FormInput from './FormInput';
import TextArea from './TextArea';
import SubmitButton from './SubmitButton';
import { supabase } from '../../utils/supabaseClient';
import { toast } from 'sonner';
import { Button } from '../ui/button';

export default function ReportBug() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ 
    name: '', 
    email: '', 
    title: '', 
    description: '', 
    steps: '', 
    screenshot_url: '' 
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.description.trim()) {
      toast.error("Please fill in the bug title and description");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('bug_reports').insert([formData]);
      if (error) throw error;
      
      toast.success("Bug reported successfully 🚀");
      setFormData({ name: '', email: '', title: '', description: '', steps: '', screenshot_url: '' });
    } catch (err: any) {
      toast.error(err.message || "Failed to submit report");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageLayout title="Report a Bug" subtitle="Found an issue? Let us know so we can fix it">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        </div>
        <FormInput 
          label="Bug Title" 
          id="title" 
          required
          placeholder="e.g., Feed fails to load on mobile" 
          value={formData.title}
          onChange={e => setFormData({ ...formData, title: e.target.value })}
        />
        <TextArea 
          label="Description" 
          id="description" 
          required
          placeholder="What happened? What did you expect to happen?" 
          value={formData.description}
          onChange={e => setFormData({ ...formData, description: e.target.value })}
        />
        <TextArea 
          label="Steps to Reproduce" 
          id="steps" 
          placeholder="1. Click on profile&#10;2. Select Settings&#10;3. App crashes" 
          value={formData.steps}
          onChange={e => setFormData({ ...formData, steps: e.target.value })}
        />
        <FormInput 
          label="Screenshot URL (Optional)" 
          id="screenshot_url" 
          type="url"
          placeholder="Link to image (Imgur, drive, etc.)" 
          value={formData.screenshot_url}
          onChange={e => setFormData({ ...formData, screenshot_url: e.target.value })}
        />
        <SubmitButton loading={loading}>Report Bug</SubmitButton>
      </form>
    </PageLayout>
  );
}
