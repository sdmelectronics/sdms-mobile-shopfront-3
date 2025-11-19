import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Upload, X, Save, Plus, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface PromoBanner {
  id?: string;
  title: string;
  subtitle?: string;
  description?: string;
  image_url: string;
  cta_text: string;
  badge_text?: string;
  category_slug?: string;
  link_url?: string;
  is_active: boolean;
  sort_order: number;
  start_date?: string;
  end_date?: string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
}

interface PromoBannerFormProps {
  banner?: PromoBanner;
  onSave: (banner: Omit<PromoBanner, 'id'>) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

const badgeOptions = [
  { value: 'none', label: 'No Badge' },
  { value: 'NEW', label: 'NEW' },
  { value: 'SALE', label: 'SALE' },
  { value: 'FEATURED', label: 'FEATURED' },
  { value: 'HOT', label: 'HOT' },
  { value: 'LIMITED', label: 'LIMITED' },
];

// Categories will be fetched from the database

export const PromoBannerForm: React.FC<PromoBannerFormProps> = ({
  banner,
  onSave,
  onCancel,
  loading = false,
}) => {
  const [formData, setFormData] = useState<PromoBanner>({
    title: '',
    subtitle: '',
    description: '',
    image_url: '',
    cta_text: 'Shop Now',
    badge_text: '',
    category_slug: '',
    link_url: '',
    is_active: true,
    sort_order: 0,
    start_date: '',
    end_date: '',
  });

  const [imagePreview, setImagePreview] = useState<string>('');
  const [showStartDate, setShowStartDate] = useState(false);
  const [showEndDate, setShowEndDate] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const { toast } = useToast();

  // Fetch categories from database
  const fetchCategories = async () => {
    setLoadingCategories(true);
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, slug, is_active')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast({
        title: 'Error',
        description: 'Failed to load categories',
        variant: 'destructive',
      });
    } finally {
      setLoadingCategories(false);
    }
  };

  // Initialize form with banner data if editing and fetch categories
  useEffect(() => {
    fetchCategories();
    if (banner) {
      setFormData(banner);
      setImagePreview(banner.image_url);
    }
  }, [banner]);

  const handleInputChange = (field: keyof PromoBanner, value: any) => {
    setFormData(prev => {
      const newData = {
        ...prev,
        [field]: value,
      };
      
      // Automatically set link_url when category is selected
      if (field === 'category_slug' && value && value !== 'none') {
        newData.link_url = `/products/category/${value}`;
      }
      
      return newData;
    });
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Error",
        description: "Please select a valid image file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "Image size must be less than 5MB",
        variant: "destructive",
      });
      return;
    }

    try {
      const { supabase } = await import('@/integrations/supabase/client');
      
      // Create a unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `promo-banners/${fileName}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('promo-banners')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('promo-banners')
        .getPublicUrl(filePath);

      // Set the image URL and preview
      setImagePreview(publicUrl);
      handleInputChange('image_url', publicUrl);
      
      toast({
        title: "Success",
        description: "Image uploaded successfully",
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Error",
        description: "Failed to upload image. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic sanity: ensure onSave exists
    if (typeof onSave !== 'function') {
      console.error('PromoBannerForm: onSave prop is not a function', onSave);
      toast({
        title: 'Error',
        description: 'Save handler not available',
        variant: 'destructive',
      });
      return;
    }

    // Validation
    if (!formData.title || !formData.title.trim()) {
      toast({
        title: 'Error',
        description: 'Title is required',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.image_url || !formData.image_url.trim()) {
      
      toast({
        title: 'Error',
        description: 'Image is required',
        variant: 'destructive',
      });
      return;
    }

    try {
      const result = await onSave(formData);
      toast({
        title: 'Saved',
        description: banner ? 'Banner updated' : 'Banner created',
      });

      // Clear the form and preview so when the user returns the form is empty
      setFormData({
        title: '',
        subtitle: '',
        description: '',
        image_url: '',
        cta_text: 'Shop Now',
        badge_text: '',
        category_slug: '',
        link_url: '',
        is_active: true,
        sort_order: 0,
        start_date: '',
        end_date: '',
      });
      setImagePreview('');

      // Give the toast a moment to display, then return user to banners (parent's onCancel closes the form)
      if (typeof onCancel === 'function') {
        setTimeout(() => {
          try {
            onCancel();
          } catch (err) {
            console.error('Error calling onCancel after save', err);
          }
        }, 600);
      }
    } catch (error) {
      console.error('onSave threw', error);
      toast({
        title: 'Error saving',
        description: (error as any)?.message || 'Failed to save banner',
        variant: 'destructive',
      });
    }
  };

  const removeImage = async () => {
    // If there's an existing image URL that's not a blob URL, we could delete it from storage
    // For now, we'll just clear the form
    setImagePreview('');
    handleInputChange('image_url', '');
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {banner ? 'Edit Promo Banner' : 'Create New Promo Banner'}
        </CardTitle>
        <CardDescription>
          {banner ? 'Update the promo banner details below.' : 'Fill in the details to create a new promo banner.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="Enter banner title"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="subtitle">Subtitle</Label>
              <Input
                id="subtitle"
                value={formData.subtitle}
                onChange={(e) => handleInputChange('subtitle', e.target.value)}
                placeholder="Enter subtitle"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Enter banner description"
              rows={3}
            />
          </div>

          {/* Image Upload */}
          <div className="space-y-2">
            <Label>Banner Image *</Label>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="image-upload"
                />
                <Label
                  htmlFor="image-upload"
                  className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  Upload Image
                </Label>
              </div>
              
              {imagePreview && (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-20 h-20 object-cover rounded-lg border"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute -top-2 -right-2 w-6 h-6 p-0"
                    onClick={removeImage}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Call to Action */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cta_text">Call to Action Text</Label>
              <Input
                id="cta_text"
                value={formData.cta_text}
                onChange={(e) => handleInputChange('cta_text', e.target.value)}
                placeholder="e.g., Shop Now, Explore, Discover"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="badge_text">Badge Text</Label>
              <Select
                value={formData.badge_text || 'none'}
                onValueChange={(value) => handleInputChange('badge_text', value === 'none' ? '' : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select badge" />
                </SelectTrigger>
                <SelectContent>
                  {badgeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Category and Link */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category_slug || 'none'}
                onValueChange={(value) => handleInputChange('category_slug', value === 'none' ? '' : value)}
                disabled={loadingCategories}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingCategories ? "Loading categories..." : "Select category"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Category</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.slug} value={category.slug}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="link_url">Custom Link URL</Label>
              <Input
                id="link_url"
                value={formData.link_url}
                onChange={(e) => handleInputChange('link_url', e.target.value)}
                placeholder={formData.category_slug ? "Auto-generated from category" : "e.g., /products?category=smartphones"}
                className={formData.category_slug ? "bg-gray-50" : ""}
              />
              {formData.category_slug && (
                <p className="text-xs text-muted-foreground">
                  Auto-generated from selected category. You can modify this if needed.
                </p>
              )}
            </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date (Optional)</Label>
              <Popover open={showStartDate} onOpenChange={setShowStartDate}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.start_date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.start_date ? format(new Date(formData.start_date), "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.start_date ? new Date(formData.start_date) : undefined}
                    onSelect={(date) => {
                      handleInputChange('start_date', date ? date.toISOString() : '');
                      setShowStartDate(false);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="space-y-2">
              <Label>End Date (Optional)</Label>
              <Popover open={showEndDate} onOpenChange={setShowEndDate}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.end_date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.end_date ? format(new Date(formData.end_date), "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.end_date ? new Date(formData.end_date) : undefined}
                    onSelect={(date) => {
                      handleInputChange('end_date', date ? date.toISOString() : '');
                      setShowEndDate(false);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Settings */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Active Status</Label>
                <p className="text-sm text-muted-foreground">
                  Enable or disable this banner
                </p>
              </div>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => handleInputChange('is_active', checked)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="sort_order">Sort Order</Label>
              <Input
                id="sort_order"
                type="number"
                value={formData.sort_order}
                onChange={(e) => handleInputChange('sort_order', parseInt(e.target.value) || 0)}
                placeholder="0"
                min="0"
              />
            </div>
          </div>

          {/* Preview */}
          {imagePreview && (
            <div className="space-y-2">
              <Label>Preview</Label>
              <div className="border rounded-lg p-4 bg-gray-50">
                <div className="flex items-center min-h-[100px] bg-white rounded-lg shadow-sm">
                  <div className="p-4 w-2/3 flex flex-col justify-center">
                    <div className="space-y-2">
                      {formData.badge_text && (
                        <Badge variant="secondary" className="w-fit">
                          {formData.badge_text}
                        </Badge>
                      )}
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">
                          {formData.title || 'Banner Title'}
                        </h3>
                        {formData.subtitle && (
                          <p className="text-blue-600 font-medium text-xs">
                            {formData.subtitle}
                          </p>
                        )}
                      </div>
                      {formData.description && (
                        <p className="text-gray-600 text-xs leading-relaxed">
                          {formData.description}
                        </p>
                      )}
                      <Button size="sm" className="w-fit">
                        {formData.cta_text || 'Shop Now'}
                      </Button>
                    </div>
                  </div>
                  <div className="w-1/3 h-[100px] relative overflow-hidden">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-4 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {banner ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>
                  {banner ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  {banner ? 'Update Banner' : 'Create Banner'}
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};