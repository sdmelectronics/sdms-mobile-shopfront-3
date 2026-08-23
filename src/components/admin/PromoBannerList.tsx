import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Eye, 
  Plus, 
  RefreshCw,
  GripVertical,
  Calendar,
  Link
} from 'lucide-react';
import { format } from 'date-fns';
import { usePromoBanners } from '@/hooks/usePromoBanners';
import { PromoBannerForm } from './PromoBannerForm';
import { useToast } from '@/hooks/use-toast';

interface PromoBanner {
  id: string;
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
  created_at: string;
  updated_at: string;
}

export const PromoBannerList: React.FC = () => {
  const [showForm, setShowForm] = useState(false);
  const [editingBanner, setEditingBanner] = useState<PromoBanner | null>(null);
  const [loading, setLoading] = useState(false);
  const { banners, loading: bannersLoading, error, createBanner, updateBanner, deleteBanner, toggleBannerStatus, refresh } = usePromoBanners();
  const { toast } = useToast();

  const handleCreate = async (bannerData: Omit<PromoBanner, 'id' | 'created_at' | 'updated_at'>) => {
    setLoading(true);
    try {
      await createBanner(bannerData);
      setShowForm(false);
    } catch (error) {
      // Error is handled by the hook
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (bannerData: Omit<PromoBanner, 'id' | 'created_at' | 'updated_at'>) => {
    if (!editingBanner) return;
    
    setLoading(true);
    try {
      await updateBanner(editingBanner.id, bannerData);
      setEditingBanner(null);
    } catch (error) {
      // Error is handled by the hook
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this banner? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteBanner(id);
    } catch (error) {
      // Error is handled by the hook
    }
  };

  const handleToggleStatus = async (id: string, isActive: boolean) => {
    try {
      await toggleBannerStatus(id, isActive);
    } catch (error) {
      // Error is handled by the hook
    }
  };

  const getStatusBadge = (banner: PromoBanner) => {
    const now = new Date();
    const startDate = banner.start_date ? new Date(banner.start_date) : null;
    const endDate = banner.end_date ? new Date(banner.end_date) : null;

    if (!banner.is_active) {
      return <Badge variant="secondary">Inactive</Badge>;
    }

    if (startDate && now < startDate) {
      return <Badge variant="outline">Scheduled</Badge>;
    }

    if (endDate && now > endDate) {
      return <Badge variant="destructive">Expired</Badge>;
    }

    return <Badge variant="default">Active</Badge>;
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM dd, yyyy');
  };

  if (bannersLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading promo banners...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 mb-4">Error: {error}</p>
        {/* Wrapped: refresh() is React Query's refetch, whose first argument is
            RefetchOptions — passing the click event through breaks the call. */}
        <Button onClick={() => refresh()} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  if (showForm || editingBanner) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">
            {editingBanner ? 'Edit Promo Banner' : 'Create New Promo Banner'}
          </h2>
          <Button
            variant="outline"
            onClick={() => {
              setShowForm(false);
              setEditingBanner(null);
            }}
          >
            Back to List
          </Button>
        </div>
        
        <PromoBannerForm
          banner={editingBanner || undefined}
          onSave={editingBanner ? handleUpdate : handleCreate}
          onCancel={() => {
            setShowForm(false);
            setEditingBanner(null);
          }}
          loading={loading}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Promo Banners</h2>
          <p className="text-muted-foreground">
            Manage promotional banners displayed on your website
          </p>
        </div>
        <div className="flex items-center gap-2">
       
          <Button onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Banner
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Banner List</CardTitle>
          <CardDescription>
            {banners.length} banner{banners.length !== 1 ? 's' : ''} total
          </CardDescription>
        </CardHeader>
        <CardContent>
          {banners.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No promo banners found</p>
              <Button onClick={() => setShowForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create First Banner
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Banner</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Sort Order</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {banners.map((banner) => (
                  <TableRow key={banner.id}>
                    <TableCell>
                      <div className="flex items-center">
                        <GripVertical className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <img
                          src={banner.image_url}
                          alt={banner.title}
                          className="w-12 h-12 object-cover rounded-lg border"
                        />
                        <div>
                          <div className="font-medium">{banner.title}</div>
                          {banner.subtitle && (
                            <div className="text-sm text-muted-foreground">
                              {banner.subtitle}
                            </div>
                          )}
                          {banner.badge_text && (
                            <Badge variant="outline" className="mt-1">
                              {banner.badge_text}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(banner)}
                        <Switch
                          checked={banner.is_active}
                          onCheckedChange={(checked) => handleToggleStatus(banner.id, checked)}
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      {banner.category_slug ? (
                        <Badge variant="secondary">
                          {banner.category_slug}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm space-y-1">
                        {banner.start_date && (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>From: {formatDate(banner.start_date)}</span>
                          </div>
                        )}
                        {banner.end_date && (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>To: {formatDate(banner.end_date)}</span>
                          </div>
                        )}
                        {!banner.start_date && !banner.end_date && (
                          <span className="text-muted-foreground">No date range</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{banner.sort_order}</Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditingBanner(banner)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => window.open(banner.link_url || `/products?category=${banner.category_slug}`, '_blank')}>
                            <Eye className="w-4 h-4 mr-2" />
                            View
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(banner.id)}>
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}; 