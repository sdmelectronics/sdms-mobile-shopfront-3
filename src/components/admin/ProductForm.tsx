import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectItem, SelectTrigger, SelectValue, SelectContent } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { FileUpload } from './FileUpload';
import { X } from 'lucide-react';
import { useSimpleAdminAuth } from '@/hooks/useSimpleAdminAuth';

interface Product {
  id?: string;
  name: string;
  price: number;
  original_price?: number;
  description: string;
  short_description?: string;
  images: string[];
  video_url?: string;
  stock_quantity: number;
  cost_price?: number | null;
  reorder_level?: number;
  is_active: boolean;
  is_featured: boolean;
  is_preorder?: boolean;
  preorder_availability_date?: string;
  preorder_description?: string;
  slug: string;
  sku?: string;
  category_id?: string;
  condition?: 'new' | 'used' | 'like_new' | 'refurbished' | 'open_box';
  specifications?: any;
  features?: string[];
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface ProductFormProps {
  product: Product | null;
  categories: Category[];
  onClose: () => void;
  onSave: () => void;
}

export const ProductForm = ({ product, categories, onClose, onSave }: ProductFormProps) => {
  const { admin, loading: authLoading } = useSimpleAdminAuth();
  const [formData, setFormData] = useState<Product>({
    name: '',
    price: 0,
    description: '',
    short_description: '',
    images: [],
    stock_quantity: 0,
    cost_price: null,
    reorder_level: 0,
    is_active: true,
    is_featured: false,
    is_preorder: false,
    slug: '',
    sku: '',
    condition: 'new',
    features: [],
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (product) {
      setFormData(product);
    }
  }, [product]);

  // Handle mobile viewport changes
  useEffect(() => {
    const handleResize = () => {
      if (dialogRef.current) {
        const vh = window.innerHeight * 0.01;
        dialogRef.current.style.setProperty('--vh', `${vh}px`);
        
        // Force a reflow to ensure the height is applied
        dialogRef.current.style.height = `calc(${vh}px * 85)`;
        dialogRef.current.style.maxHeight = `calc(${vh}px * 85)`;
      }
    };

    // Initial setup
    handleResize();
    
    // Add event listeners
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    
    // Handle mobile browser UI changes
    const handleVisualViewportChange = () => {
      if (window.visualViewport) {
        const vh = window.visualViewport.height * 0.01;
        if (dialogRef.current) {
          dialogRef.current.style.setProperty('--vh', `${vh}px`);
          dialogRef.current.style.height = `calc(${vh}px * 85)`;
          dialogRef.current.style.maxHeight = `calc(${vh}px * 85)`;
        }
      }
    };
    
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleVisualViewportChange);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleVisualViewportChange);
      }
    };
  }, []);

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const generateSKU = (name: string) => {
    return name
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 6) + '-' + Math.floor(1000 + Math.random() * 9000);
  };

  const handleInputChange = (field: keyof Product, value: any) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      if (field === 'name') {
        updated.slug = generateSlug(value);
        if (!prev.sku) {
          updated.sku = generateSKU(value);
        }
      }
      if (field === 'is_preorder' && !value) {
        updated.preorder_availability_date = undefined;
        updated.preorder_description = undefined;
      }
      return updated;
    });
  };

  const analyzerUrl = 'https://rvteqxtonbgjuhztnzpx.supabase.co/functions/v1/analyze-product-image';

  const handleImageUpload = async (url: string) => {
    if (formData.images.length >= 3) {
      toast({ title: "Limit reached", description: "Max 3 images per product", variant: "destructive" });
      return;
    }

    setFormData(prev => ({ ...prev, images: [...prev.images, url] }));

    if (formData.images.length === 0 && !formData.description && !formData.name && !formData.features?.length && !formData.short_description && !formData.sku) {
      try {
        toast({ title: 'AI Analysis', description: 'Analyzing image with AI...' });

        // Call the public analyzer function (no authentication needed)
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Error fetching session:', error);
        }

        const response = await fetch(analyzerUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ imageUrl: url }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Analyzer API error:', response.status, errorText);
          throw new Error(`Analyzer service unavailable (${response.status})`);
        }

        const data = await response.json();
        if (data.title && data.description && data.features && data.short_description && data.sku) {
          setFormData(prev => ({
            ...prev,
            name: data.title,
            slug: generateSlug(data.title),
            description: data.description,
            short_description: data.short_description,
            sku: data.sku,
            features: data.features,
          }));
          toast({ title: 'AI Fields Generated', description: 'Fields generated from image' });
        } else {
          throw new Error('Incomplete data returned');
        }
      } catch (err) {
        toast({ title: 'AI Generation Failed', description: 'Could not generate fields', variant: 'destructive' });
      }
    }
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleVideoUpload = (url: string) => {
    setFormData(prev => ({
      ...prev,
      video_url: url
    }));
  };

  const removeVideo = () => {
    setFormData(prev => ({
      ...prev,
      video_url: undefined
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { categories, ...cleanFormData } = formData as any;

      // Stock is owned by the stock_movements ledger, not by this form.
      // Writing stock_quantity directly here would desynchronise the cached
      // total from its ledger, so the intended level is pulled out and applied
      // as a movement below instead.
      const intendedStock = Number(cleanFormData.stock_quantity) || 0;
      delete cleanFormData.stock_quantity;

      const productData = {
        ...cleanFormData,
        price: Number(cleanFormData.price),
        original_price: cleanFormData.original_price ? Number(cleanFormData.original_price) : null,
        cost_price: cleanFormData.cost_price === '' || cleanFormData.cost_price === null || cleanFormData.cost_price === undefined
          ? null
          : Number(cleanFormData.cost_price),
        reorder_level: Number(cleanFormData.reorder_level) || 0,
        category_id: cleanFormData.category_id || null,
        specifications: cleanFormData.specifications
          ? JSON.parse(cleanFormData.specifications)
          : null,
        features: cleanFormData.features || [],
        is_preorder: cleanFormData.is_preorder,
        preorder_availability_date: cleanFormData.preorder_availability_date || null,
        preorder_description: cleanFormData.preorder_description || null,
      };

      console.log('Submitting productData:', JSON.stringify(productData, null, 2));

      if (product?.id) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', product.id);

        if (error) throw error;

        // Changing the stock figure is recorded as a correction, so the change
        // is visible in the product's history rather than silently overwriting
        // the running total.
        const currentStock = Number(product.stock_quantity) || 0;
        const difference = intendedStock - currentStock;

        if (difference !== 0) {
          const { error: movementError } = await supabase.from('stock_movements').insert({
            product_id: product.id,
            delta: difference,
            reason: 'correction',
            note: 'Adjusted while editing the product',
            actor_email: admin?.username ?? null,
          });
          if (movementError) throw movementError;
        }

        toast({
          title: "Success",
          description: difference !== 0
            ? `Product updated. Stock corrected by ${difference > 0 ? '+' : ''}${difference}.`
            : "Product updated successfully",
        });
      } else {
        // New products are inserted with zero stock and then given an opening
        // balance, so their very first unit is explained by the ledger too.
        const { data: created, error } = await supabase
          .from('products')
          .insert([{ ...productData, stock_quantity: 0 }])
          .select('id')
          .single();

        if (error) throw error;

        if (created?.id && intendedStock !== 0) {
          const { error: movementError } = await supabase.from('stock_movements').insert({
            product_id: created.id,
            delta: intendedStock,
            reason: 'opening_balance',
            note: 'Stock recorded when the product was created',
            actor_email: admin?.username ?? null,
          });
          if (movementError) throw movementError;
        }

        toast({
          title: "Success",
          description: "Product created successfully",
        });
      }

      onSave();
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: "Error",
        description: "Failed to save product",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDateForInput = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent ref={dialogRef} className="max-w-4xl max-h-[90vh] overflow-y-auto" style={{ maxHeight: 'calc(100vh - 2rem)' }}>
        <DialogHeader>
          <DialogTitle>{product ? 'Edit Product' : 'Add New Product'}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Product Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sku">SKU</Label>
              <Input
                id="sku"
                value={formData.sku || ''}
                onChange={(e) => handleInputChange('sku', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Price (UGX) *</Label>
              <Input
                id="price"
                type="number"
                value={formData.price}
                onChange={(e) => handleInputChange('price', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="original_price">Original Price (UGX)</Label>
              <Input
                id="original_price"
                type="number"
                value={formData.original_price || ''}
                onChange={(e) => handleInputChange('original_price', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cost_price">Cost Price (UGX)</Label>
              <Input
                id="cost_price"
                type="number"
                value={formData.cost_price ?? ''}
                onChange={(e) => handleInputChange('cost_price', e.target.value)}
                placeholder="What you paid per unit"
              />
              <p className="text-xs text-warm-faint">
                Used to work out profit. Leave blank if unknown — the product is
                then left out of profit figures rather than counted as free.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="stock_quantity">Stock Quantity *</Label>
              <Input
                id="stock_quantity"
                type="number"
                value={formData.stock_quantity}
                onChange={(e) => handleInputChange('stock_quantity', e.target.value)}
                required
              />
              <p className="text-xs text-warm-faint">
                Changing this records a stock correction in the product's history.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reorder_level">Low-stock alert at</Label>
              <Input
                id="reorder_level"
                type="number"
                value={formData.reorder_level ?? 0}
                onChange={(e) => handleInputChange('reorder_level', e.target.value)}
                placeholder="0"
              />
              <p className="text-xs text-warm-faint">
                Flags the product in Inventory once stock falls to this level.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select 
                value={formData.category_id || 'all'} 
                onValueChange={(value) => handleInputChange('category_id', value === 'all' ? null : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">No Category</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="condition">Condition *</Label>
              <Select 
                value={formData.condition || 'new'} 
                onValueChange={(value) => handleInputChange('condition', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select condition" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="used">Used</SelectItem>
                  <SelectItem value="like_new">Like New</SelectItem>
                  <SelectItem value="refurbished">Refurbished</SelectItem>
                  <SelectItem value="open_box">Open Box</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="short_description">Short Description</Label>
            <Input
              id="short_description"
              value={formData.short_description || ''}
              onChange={(e) => handleInputChange('short_description', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="features">Features</Label>
            <Textarea
              id="features"
              value={formData.features?.join(', ') || ''}
              onChange={(e) =>
                handleInputChange('features', e.target.value.split(',').map((f) => f.trim()))
              }
              rows={4}
              placeholder="Enter features separated by commas (e.g., Feature 1, Feature 2)"
            />
          </div>

          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_preorder"
                checked={formData.is_preorder}
                onCheckedChange={(checked) => handleInputChange('is_preorder', checked)}
              />
              <Label htmlFor="is_preorder" className="text-base font-medium">
                This is a pre-order item
              </Label>
            </div>

            {formData.is_preorder && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-6 p-4 bg-gray-50 rounded-lg">
                <div className="space-y-2">
                  <Label htmlFor="preorder_availability_date">Expected Availability Date</Label>
                  <Input
                    id="preorder_availability_date"
                    type="date"
                    value={formatDateForInput(formData.preorder_availability_date)}
                    onChange={(e) => handleInputChange('preorder_availability_date', e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="preorder_description">Pre-order Information</Label>
                  <Textarea
                    id="preorder_description"
                    value={formData.preorder_description || ''}
                    onChange={(e) => handleInputChange('preorder_description', e.target.value)}
                    rows={3}
                    placeholder="Additional information about the pre-order (e.g., shipping details, expected delivery time, etc.)"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <Label>Product Images (Max 3)</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {formData.images.map((image, index) => (
                <div key={index} className="relative">
                  <img 
                    src={image} 
                    alt={`Product ${index + 1}`}
                    className="w-full h-32 object-cover rounded-lg border"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => removeImage(index)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              
              {formData.images.length < 3 && (
                <FileUpload
                  onUpload={handleImageUpload}
                  bucket="product-images"
                  accept="image/*"
                  type="image"
                  label=""
                />
              )}
            </div>
          </div>

          <FileUpload
            onUpload={handleVideoUpload}
            bucket="product-videos"
            accept="video/*"
            type="video"
            label="Product Video (Optional)"
            currentFile={formData.video_url}
            onRemove={removeVideo}
          />

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => handleInputChange('is_active', checked)}
              />
              <Label htmlFor="is_active">Active</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_featured"
                checked={formData.is_featured}
                onCheckedChange={(checked) => handleInputChange('is_featured', checked)}
              />
              <Label htmlFor="is_featured">Featured</Label>
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Product'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
