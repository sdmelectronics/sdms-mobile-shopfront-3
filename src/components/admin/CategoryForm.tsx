
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { FileUpload } from './FileUpload';

interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image_url?: string;
  is_active: boolean;
}

interface CategoryFormProps {
  category?: Category | null;
  onClose: () => void;
  onSave: () => void;
}

export const CategoryForm = ({ category, onClose, onSave }: CategoryFormProps) => {
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    image_url: '',
    is_active: true,
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();



  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name,
        slug: category.slug,
        description: category.description || '',
        image_url: category.image_url || '',
        is_active: category.is_active,
      });
    } else {
      setFormData({
        name: '',
        slug: '',
        description: '',
        image_url: '',
        is_active: true,
      });
    }
  }, [category]);

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const handleNameChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      name: value,
      slug: generateSlug(value)
    }));
  };

  const analyzerUrl = 'https://rvteqxtonbgjuhztnzpx.supabase.co/functions/v1/analyze-product-image';

  const handleImageUpload = async (url: string) => {
    setFormData(prev => ({ ...prev, image_url: url }));
    // Only auto-describe if description is empty
    if (!formData.description) {
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
          setFormData(prev => ({ ...prev, description: data.description }));
          toast({
            title: 'AI Description Added',
            description: 'A description was generated from the image.',
          });
        } else {
          throw new Error('No description returned');
        }
      } catch (err) {
        toast({
          title: 'AI Description Failed',
          description: 'Could not generate description from image.',
          variant: 'destructive',
        });
      }
    }
  };

  const handleImageRemove = () => {
    setFormData(prev => ({ ...prev, image_url: '' }));
    toast({
      title: 'Image Removed',
      description: 'Category image has been removed.',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (category) {
        // Update existing category
        const { error } = await supabase
          .from('categories')
          .update(formData)
          .eq('id', category.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Category updated successfully",
        });
      } else {
        // Create new category
        const { error } = await supabase
          .from('categories')
          .insert(formData);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Category created successfully",
        });
      }

      onSave();
    } catch (error: any) {
      console.error('Error saving category:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save category",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl dialog-mobile-fix dialog-content overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {category ? 'Edit Category' : 'Add New Category'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Category Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Electronics, Appliances, etc."
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Slug *</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                placeholder="electronics-appliances"
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Brief description of the category"
              rows={3}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <FileUpload
              onUpload={handleImageUpload}
              onRemove={handleImageRemove}
              currentFile={formData.image_url}
              bucket="category-images"
              accept="image/*"
              type="image"
              label="Category Image"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => {
                setFormData(prev => ({ 
                  ...prev, 
                  is_active: checked === true 
                }));
              }}
            />
            <Label htmlFor="is_active">Active</Label>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : category ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
