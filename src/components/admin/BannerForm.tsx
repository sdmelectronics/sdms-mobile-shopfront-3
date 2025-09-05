
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { FileUpload } from './FileUpload';

interface Banner {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string;
  video_url: string | null;
  cta_text: string | null;
  cta_link: string | null;
  is_active: boolean;
  display_order: number;
}

interface BannerFormProps {
  banner?: Banner | null;
  onClose: () => void;
  onSave: () => void;
}

export const BannerForm = ({ banner, onClose, onSave }: BannerFormProps) => {
  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    image_url: '',
    video_url: '',
    cta_text: 'Learn More',
    cta_link: '',
    is_active: true,
    display_order: 0
  });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (banner) {
      setFormData({
        title: banner.title,
        subtitle: banner.subtitle || '',
        image_url: banner.image_url,
        video_url: banner.video_url || '',
        cta_text: banner.cta_text || 'Learn More',
        cta_link: banner.cta_link || '',
        is_active: banner.is_active,
        display_order: banner.display_order
      });
    }
  }, [banner]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.image_url.trim()) {
      toast({
        title: "Error",
        description: "Title and image are required",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const bannerData = {
        title: formData.title.trim(),
        subtitle: formData.subtitle.trim() || null,
        image_url: formData.image_url,
        video_url: formData.video_url.trim() || null,
        cta_text: formData.cta_text.trim() || null,
        cta_link: formData.cta_link.trim() || null,
        is_active: formData.is_active,
        display_order: formData.display_order
      };

      if (banner) {
        const { error } = await supabase
          .from('banners')
          .update(bannerData)
          .eq('id', banner.id);

        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Banner updated successfully",
        });
      } else {
        const { error } = await supabase
          .from('banners')
          .insert([bannerData]);

        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Banner created successfully",
        });
      }

      onSave();
    } catch (error) {
      console.error('Error saving banner:', error);
      toast({
        title: "Error",
        description: "Failed to save banner",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const analyzerUrl = 'https://rvteqxtonbgjuhztnzpx.supabase.co/functions/v1/-product-image'

  const handleBannerImageUpload = async (url: string) => {
    setFormData(prev => ({ ...prev, image_url: url }));
    // Only auto-describe if subtitle is empty
    if (!formData.subtitle) {
      try {
        toast({
          title: 'AI Analysis',
          description: 'Analyzing image with AI...',
        });
        
        // Call the public analyzer function (no authentication needed)
        const response = await fetch(analyzerUrl, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ imageUrl: url }),
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Analyzer API error:', response.status, errorText);
          throw new Error(`Analyzer service unavailable (${response.status})`);
        }
        
        const data = await response.json();
        if (data.description) {
          setFormData(prev => ({ ...prev, subtitle: data.description }));
          toast({
            title: 'AI Description Added',
            description: 'A subtitle was generated from the image.',
          });
        } else {
          throw new Error('No description returned');
        }
      } catch (err) {
        toast({
          title: 'AI Description Failed',
          description: 'Could not generate subtitle from image.',
          variant: 'destructive',
        });
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto" style={{ maxHeight: 'calc(100vh - 2rem)' }}>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{banner ? 'Edit Banner' : 'Add New Banner'}</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter banner title"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subtitle">Subtitle</Label>
              <Textarea
                id="subtitle"
                value={formData.subtitle}
                onChange={(e) => setFormData(prev => ({ ...prev, subtitle: e.target.value }))}
                placeholder="Enter banner subtitle"
                rows={2}
              />
            </div>

            <FileUpload
              onUpload={handleBannerImageUpload}
              bucket="product-images"
              accept="image/*"
              type="image"
              label="Banner Image *"
              currentFile={formData.image_url}
              onRemove={() => setFormData(prev => ({ ...prev, image_url: '' }))}
            />

            <FileUpload
              onUpload={(url) => setFormData(prev => ({ ...prev, video_url: url }))}
              bucket="product-videos"
              accept="video/*"
              type="video"
              label="Banner Video (Optional)"
              currentFile={formData.video_url}
              onRemove={() => setFormData(prev => ({ ...prev, video_url: '' }))}
            />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cta_text">Button Text</Label>
                <Input
                  id="cta_text"
                  value={formData.cta_text}
                  onChange={(e) => setFormData(prev => ({ ...prev, cta_text: e.target.value }))}
                  placeholder="Learn More"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cta_link">Button Link</Label>
                <Input
                  id="cta_link"
                  value={formData.cta_link}
                  onChange={(e) => setFormData(prev => ({ ...prev, cta_link: e.target.value }))}
                  placeholder="/products"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="display_order">Display Order</Label>
                <Input
                  id="display_order"
                  type="number"
                  value={formData.display_order}
                  onChange={(e) => setFormData(prev => ({ ...prev, display_order: parseInt(e.target.value) || 0 }))}
                  placeholder="0"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                />
                <Label htmlFor="is_active">Active</Label>
              </div>
            </div>

            <div className="flex space-x-2 pt-4">
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : (banner ? 'Update Banner' : 'Create Banner')}
              </Button>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
