import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { FileUpload } from './FileUpload';

interface ShopImageCarousel {
  id?: string;
  title: string;
  alt_text: string;
  image_url: string;
  display_order: number;
  is_active: boolean;
}

interface ShopImageCarouselFormProps {
  carouselItem?: ShopImageCarousel | null;
  onClose: () => void;
  onSave: () => void;
}

export const ShopImageCarouselForm = ({ carouselItem, onClose, onSave }: ShopImageCarouselFormProps) => {
  const [formData, setFormData] = useState<ShopImageCarousel>({
    title: '',
    alt_text: '',
    image_url: '',
    display_order: 0,
    is_active: true,
  });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (carouselItem) {
      setFormData(carouselItem);
    }
  }, [carouselItem]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.image_url.trim()) {
      toast({
        title: 'Error',
        description: 'Title and image are required',
        variant: 'destructive',
      });
      return;
    }
    setSaving(true);
    try {
      const dataToSave = {
        title: formData.title.trim(),
        alt_text: formData.alt_text.trim(),
        image_url: formData.image_url,
        display_order: formData.display_order,
        is_active: formData.is_active,
      };
      if (carouselItem && carouselItem.id) {
        const { error } = await supabase
          .from('carousel_images')
          .update(dataToSave)
          .eq('id', carouselItem.id);
        if (error) throw error;
        toast({ title: 'Success', description: 'Carousel image updated.' });
      } else {
        const { error } = await supabase
          .from('carousel_images')
          .insert([dataToSave]);
        if (error) throw error;
        toast({ title: 'Success', description: 'Carousel image created.' });
      }
      onSave();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to save carousel image', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto" style={{ maxHeight: 'calc(100vh - 2rem)' }}>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{carouselItem ? 'Edit Carousel Image' : 'Add Carousel Image'}</CardTitle>
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
                onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter image title"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="alt_text">Alt Text</Label>
              <Input
                id="alt_text"
                value={formData.alt_text}
                onChange={e => setFormData(prev => ({ ...prev, alt_text: e.target.value }))}
                placeholder="Enter alt text for accessibility"
              />
            </div>
            <FileUpload
              onUpload={url => setFormData(prev => ({ ...prev, image_url: url }))}
              bucket="shop-images"
              accept="image/*"
              type="image"
              label="Carousel Image *"
              currentFile={formData.image_url}
              onRemove={() => setFormData(prev => ({ ...prev, image_url: '' }))}
            />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="display_order">Display Order</Label>
                <Input
                  id="display_order"
                  type="number"
                  value={formData.display_order}
                  onChange={e => setFormData(prev => ({ ...prev, display_order: parseInt(e.target.value) || 0 }))}
                  placeholder="0"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={checked => setFormData(prev => ({ ...prev, is_active: checked }))}
                />
                <Label htmlFor="is_active">Active</Label>
              </div>
            </div>
            <div className="flex space-x-2 pt-4">
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : (carouselItem ? 'Update' : 'Create')}
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