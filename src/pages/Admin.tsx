import { useState, useEffect, useCallback, useMemo } from "react";
import { useRef } from "react";
import { Plus, Edit, Trash2, Eye, EyeOff, Package, BarChart3, Users, ShoppingBag, LogOut, Image, Search, X, ExternalLink, Calendar, Star, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { ProductForm } from "@/components/admin/ProductForm";
import { CategoryForm } from "@/components/admin/CategoryForm";
import { BannerForm } from "@/components/admin/BannerForm";
import { MarqueeForm } from "@/components/admin/MarqueeForm";
import { PromoBannerList } from "@/components/admin/PromoBannerList";
import { OrdersPanel } from "@/components/admin/OrdersPanel";
import { InventoryPanel } from "@/components/admin/InventoryPanel";

import { useSimpleAdminAuth } from "@/hooks/useSimpleAdminAuth";
import { useLocation, useNavigate } from "react-router-dom";
import { ErrorBoundary } from "react-error-boundary";
import { ShopImageCarouselForm } from "@/components/admin/ShopImageCarouselForm";
import { ShopImageCarouselList } from "@/components/admin/ShopImageCarouselList";
import RatingStats from "@/components/admin/RatingStats";

// Error Boundary Fallback Component
const ErrorFallback = ({ error, resetErrorBoundary }) => {
  return (
    <div className="container mx-auto px-4 py-8 text-center">
      <h2 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h2>
      <p className="text-gray-600 mb-4">{error.message}</p>
      <Button onClick={resetErrorBoundary}>Try again</Button>
    </div>
  );
};

interface Product {
  id: string;
  name: string;
  price: number;
  original_price?: number;
  description: string;
  short_description?: string;
  images: string[];
  video_url?: string;
  stock_quantity: number;
  is_active: boolean;
  is_featured: boolean;
  rating?: number;
  reviews_count?: number;
  slug: string;
  sku?: string;
  condition?: 'new' | 'used' | 'like_new' | 'refurbished' | 'open_box';
  categories?: {
    name: string;
    slug: string;
  };
}

interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image_url?: string;
  is_active: boolean;
}



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

interface ShopImageCarousel {
  id: string;
  title: string;
  alt_text: string;
  image_url: string;
  display_order: number;
  is_active: boolean;
}

interface ProductToDelete {
  id: string;
  name: string;
}

// Custom hook for managing pagination
const usePagination = (initialPage = 1) => {
  const [page, setPage] = useState(initialPage);
  
  const nextPage = useCallback(() => setPage(prev => prev + 1), []);
  const prevPage = useCallback(() => setPage(prev => Math.max(1, prev - 1)), []);
  const resetPage = useCallback(() => setPage(1), []);
  
  return { page, nextPage, prevPage, resetPage, setPage };
};

// Custom hook for search functionality
const useSearch = (items: Product[], searchFields: (keyof Product)[]) => {
  const [searchQuery, setSearchQuery] = useState("");
  
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    
    const query = searchQuery.toLowerCase();
    return items.filter(item => 
      searchFields.some(field => {
        const value = item[field];
        if (typeof value === 'string') {
          return value.toLowerCase().includes(query);
        }
        if (field === 'categories' && item.categories) {
          return item.categories.name.toLowerCase().includes(query);
        }
        return false;
      })
    );
  }, [items, searchQuery, searchFields]);
  
  return { searchQuery, setSearchQuery, filteredItems };
};

const Admin = () => {
  const { admin, loading: authLoading, signOut } = useSimpleAdminAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [carouselItems, setCarouselItems] = useState<ShopImageCarousel[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form state management
  const [showProductForm, setShowProductForm] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showBannerForm, setShowBannerForm] = useState(false);
  const [showCarouselForm, setShowCarouselForm] = useState(false);
  
  // Delete dialog state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [productsToDelete, setProductsToDelete] = useState<ProductToDelete[]>([]);
  const [showProductDeleteDialog, setShowProductDeleteDialog] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  
  // Editing state
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [editingCarouselItem, setEditingCarouselItem] = useState<ShopImageCarousel | null>(null);
  
  // Pagination hooks
  const productPagination = usePagination();
  const categoryPagination = usePagination();
  const bannerPagination = usePagination();
  const carouselPagination = usePagination();
  
  // Search functionality
  const productSearch = useSearch(products, ['name', 'description', 'short_description', 'sku']);
  
  const itemsPerPage = 20;
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const dataLoadedRef = useRef(false);
  const adminIdRef = useRef<string | null>(null); // Track admin ID to detect changes

  // Reset product page when searching
  useEffect(() => {
    productPagination.resetPage();
  }, [productSearch.searchQuery]);

  // Stats state - separate from paginated data
  const [stats, setStats] = useState({
    totalProducts: 0,
    activeProducts: 0,
    totalCategories: 0,
    activeCategories: 0,
    totalBanners: 0,
    activeBanners: 0,
    featuredProducts: 0,
    lowStockProducts: 0,
  });

  // Fetch stats independently of paginated data
  const fetchStats = useCallback(async () => {
    try {
      const [productsResult, categoriesResult, bannersResult] = await Promise.all([
        supabase
          .from('products')
          .select('is_active, is_featured, stock_quantity')
          .order('created_at', { ascending: false }),
        supabase
          .from('categories')
          .select('is_active')
          .order('created_at', { ascending: false }),
        supabase
          .from('banners')
          .select('is_active')
          .order('created_at', { ascending: false })
      ]);

      if (productsResult.error) throw productsResult.error;
      if (categoriesResult.error) throw categoriesResult.error;
      if (bannersResult.error) throw bannersResult.error;

      const allProducts = productsResult.data || [];
      const allCategories = categoriesResult.data || [];
      const allBanners = bannersResult.data || [];

      setStats({
        totalProducts: allProducts.length,
        activeProducts: allProducts.filter(p => p.is_active).length,
        totalCategories: allCategories.length,
        activeCategories: allCategories.filter(c => c.is_active).length,
        totalBanners: allBanners.length,
        activeBanners: allBanners.filter(b => b.is_active).length,
        featuredProducts: allProducts.filter(p => p.is_featured).length,
        lowStockProducts: allProducts.filter(p => (p.stock_quantity ?? 0) < 10).length,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard statistics",
        variant: "destructive",
      });
    }
  }, [toast]);

  // Optimized data fetching function - ENHANCED VERSION
  const fetchAllAdminData = useCallback(async () => {
    console.log('fetchAllAdminData called with pagination:', {
      productPage: productPagination.page,
      categoryPage: categoryPagination.page,
      bannerPage: bannerPagination.page,
      carouselPage: carouselPagination.page
    });
    
    try {
      setLoading(true);
      
      // For products: if searching, fetch all; otherwise use pagination
      const hasSearch = productSearch.searchQuery.trim().length > 0;
      
      const [productsResult, categoriesResult, bannersResult, carouselResult] = await Promise.all([
        hasSearch 
          ? supabase
              .from('products')
              .select(`*, categories(name, slug)`)
              .order('created_at', { ascending: false })
          : supabase
              .from('products')
              .select(`*, categories(name, slug)`)
              .order('created_at', { ascending: false })
              .range((productPagination.page - 1) * itemsPerPage, productPagination.page * itemsPerPage - 1),
        
        supabase
          .from('categories')
          .select('*')
          .order('created_at', { ascending: false }),
          // .range((categoryPagination.page - 1) * itemsPerPage, categoryPagination.page * itemsPerPage - 1),
        
        supabase
          .from('banners')
          .select('*')
          .order('display_order')
          .range((bannerPagination.page - 1) * itemsPerPage, bannerPagination.page * itemsPerPage - 1),
        
        supabase
          .from('carousel_images')
          .select('*')
          .order('display_order')
          .range((carouselPagination.page - 1) * itemsPerPage, carouselPagination.page * itemsPerPage - 1)
      ]);

      // Log results for debugging
      console.log('Data fetch results:', {
        products: productsResult.data?.length || 0,
        categories: categoriesResult.data?.length || 0,
        banners: bannersResult.data?.length || 0,
        carousel: carouselResult.data?.length || 0,
        errors: {
          products: productsResult.error,
          categories: categoriesResult.error,
          banners: bannersResult.error,
          carousel: carouselResult.error
        }
      });

      if (productsResult.error) throw productsResult.error;
      if (categoriesResult.error) throw categoriesResult.error;
      if (bannersResult.error) throw bannersResult.error;
      if (carouselResult.error) throw carouselResult.error;

      setProducts(productsResult.data || []);
      setCategories(categoriesResult.data || []);
      setBanners(bannersResult.data || []);
      setCarouselItems(carouselResult.data || []);

    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast({
        title: "Error",
        description: "Failed to load admin data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [
    productPagination.page, 
    categoryPagination.page, 
    bannerPagination.page, 
    carouselPagination.page,
    productSearch.searchQuery,
    toast
  ]);

  // Generic toggle function for better code reuse
  const createToggleFunction = useCallback((
    table: string,
    field: string,
    setState: React.Dispatch<React.SetStateAction<any[]>>,
    successMessage: string
  ) => {
    return async (id: string, currentStatus: boolean) => {
      try {
        const { error } = await supabase
          .from(table)
          .update({ [field]: !currentStatus })
          .eq('id', id);

        if (error) throw error;

        setState(prev => prev.map(item => 
          item.id === id ? { ...item, [field]: !currentStatus } : item
        ));

        toast({
          title: "Success",
          description: `${successMessage} ${!currentStatus ? 'activated' : 'deactivated'} successfully`,
        });
      } catch (error) {
        console.error(`Error updating ${table} ${field}:`, error);
        toast({
          title: "Error",
          description: `Failed to update ${table} ${field}`,
          variant: "destructive",
        });
      }
    };
  }, [toast]);

  // Generic delete function
  const createDeleteFunction = useCallback((
    table: string,
    setState: React.Dispatch<React.SetStateAction<any[]>>,
    confirmMessage: string
  ) => {
    return async (id: string) => {
      if (!confirm(confirmMessage)) return;

      try {
        const { error } = await supabase
          .from(table)
          .delete()
          .eq('id', id);

        if (error) throw error;

        setState(prev => prev.filter(item => item.id !== id));
        toast({
          title: "Success",
          description: `${table.slice(0, -1)} deleted successfully`,
        });
      } catch (error) {
        console.error(`Error deleting ${table}:`, error);
        toast({
          title: "Error",
          description: `Failed to delete ${table.slice(0, -1)}`,
          variant: "destructive",
        });
      }
    };
  }, [toast]);

  // Function to initiate category deletion (shows dialog)
  const initiateDeleteCategory = useCallback(async (id: string) => {
    try {
      // Find the category to delete
      const category = categories.find(c => c.id === id);
      if (!category) return;

      // Check if there are products associated with this category
      const { data: productsInCategory, error: checkError } = await supabase
        .from('products')
        .select('id, name')
        .eq('category_id', id);

      if (checkError) throw checkError;

      // Set up the dialog state
      setCategoryToDelete(category);
      setProductsToDelete(productsInCategory || []);
      setShowDeleteDialog(true);
    } catch (error) {
      console.error('Error checking category products:', error);
      toast({
        title: "Error",
        description: "Failed to check category dependencies",
        variant: "destructive",
      });
    }
  }, [categories, toast]);

  // Function to handle confirmed deletion
  const handleConfirmDelete = useCallback(async () => {
    if (!categoryToDelete) return;

    try {
      // If there are products to delete, delete them first
      if (productsToDelete.length > 0) {
        const productIds = productsToDelete.map(p => p.id);
        const { error: deleteProductsError } = await supabase
          .from('products')
          .delete()
          .in('id', productIds);

        if (deleteProductsError) throw deleteProductsError;

        // Update the products state to remove deleted products
        setProducts(prev => prev.filter(product => !productIds.includes(product.id)));

        toast({
          title: "Products Deleted",
          description: `${productsToDelete.length} product(s) deleted successfully`,
        });
      }

      // Now delete the category
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', categoryToDelete.id);

      if (error) throw error;

      setCategories(prev => prev.filter(category => category.id !== categoryToDelete.id));
      toast({
        title: "Success",
        description: "Category deleted successfully",
      });

      // Close dialog and reset state
      setShowDeleteDialog(false);
      setCategoryToDelete(null);
      setProductsToDelete([]);
      
      // Refresh stats after deletion
      fetchStats();
    } catch (error) {
      console.error('Error deleting category:', error);
      toast({
        title: "Error",
        description: "Failed to delete category",
        variant: "destructive",
      });
    }
  }, [categoryToDelete, productsToDelete, toast, fetchStats]);

  // Function to cancel deletion
  const handleCancelDelete = useCallback(() => {
    setShowDeleteDialog(false);
    setCategoryToDelete(null);
    setProductsToDelete([]);
  }, []);

  // Function to initiate product deletion (shows dialog)
  const initiateDeleteProduct = useCallback((product: Product) => {
    setProductToDelete(product);
    setShowProductDeleteDialog(true);
  }, []);

  // Function to handle confirmed product deletion
  const handleConfirmDeleteProduct = useCallback(async () => {
    if (!productToDelete) return;

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productToDelete.id);

      if (error) throw error;

      setProducts(prev => prev.filter(product => product.id !== productToDelete.id));
      toast({
        title: "Success",
        description: "Product deleted successfully",
      });

      // Close dialog and reset state
      setShowProductDeleteDialog(false);
      setProductToDelete(null);
      
      // Refresh stats after deletion
      fetchStats();
    } catch (error) {
      console.error('Error deleting product:', error);
      toast({
        title: "Error",
        description: "Failed to delete product",
        variant: "destructive",
      });
    }
  }, [productToDelete, toast, fetchStats]);

  // Function to cancel product deletion
  const handleCancelDeleteProduct = useCallback(() => {
    setShowProductDeleteDialog(false);
    setProductToDelete(null);
  }, []);

  // Specific toggle and delete functions using the generic ones
  const toggleProductStatus = createToggleFunction('products', 'is_active', setProducts, 'Product');
  const toggleProductFeatured = createToggleFunction('products', 'is_featured', setProducts, 'Product');
  const toggleCategoryVisibility = createToggleFunction('categories', 'is_active', setCategories, 'Category');
  const toggleBannerStatus = createToggleFunction('banners', 'is_active', setBanners, 'Banner');
  const toggleCarouselActive = createToggleFunction('carousel_images', 'is_active', setCarouselItems, 'Carousel image');

  const deleteProduct = createDeleteFunction('products', setProducts, 'Are you sure you want to delete this product?');
  const deleteBanner = createDeleteFunction('banners', setBanners, 'Are you sure you want to delete this banner?');
  const deleteCarouselItem = createDeleteFunction('carousel_images', setCarouselItems, 'Are you sure you want to delete this carousel image?');

  // Price formatting utility
  const formatPrice = useCallback((price: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0
    }).format(price);
  }, []);

  // Form handlers
  const handleCloseForm = useCallback((formType: 'product' | 'category' | 'banner' | 'carousel') => {
    switch (formType) {
      case 'product':
        setShowProductForm(false);
        setEditingProduct(null);
        break;
      case 'category':
        setShowCategoryForm(false);
        setEditingCategory(null);
        break;
      case 'banner':
        setShowBannerForm(false);
        setEditingBanner(null);
        break;
      case 'carousel':
        setShowCarouselForm(false);
        setEditingCarouselItem(null);
        break;
    }
  }, []);

  const handleSaveForm = useCallback((formType: 'product' | 'category' | 'banner' | 'carousel') => {
    Promise.all([
      fetchAllAdminData(),
      fetchStats()
    ]);
    handleCloseForm(formType);
  }, [fetchAllAdminData, fetchStats, handleCloseForm]);

  // Initial load effect
  useEffect(() => {
    console.log('Admin useEffect triggered:', { admin, authLoading, adminId: admin?.username });
    
    // Don't load if still authenticating
    if (authLoading) return;
    
    // Don't load if no admin
    if (!admin) {
      dataLoadedRef.current = false;
      adminIdRef.current = null;
      return;
    }

    // Check if admin changed (new login) or if data hasn't been loaded yet
    const adminChanged = adminIdRef.current !== admin.username;
    const shouldLoadData = !dataLoadedRef.current || adminChanged;

    if (shouldLoadData) {
      console.log('Loading admin data - reason:', adminChanged ? 'admin changed' : 'first load');
      
      const loadData = async () => {
        try {
          // Reset pagination to first page on new load
          if (adminChanged) {
            productPagination.resetPage();
            categoryPagination.resetPage();
            bannerPagination.resetPage();
            carouselPagination.resetPage();
          }
          
          await Promise.all([
            fetchAllAdminData(),
            fetchStats()
          ]);
          dataLoadedRef.current = true;
          adminIdRef.current = admin.username;
        } catch (error) {
          console.error('Error loading admin data:', error);
          dataLoadedRef.current = false;
        }
      };

      loadData();
    }
  }, [admin, authLoading, fetchAllAdminData, fetchStats]);

  // Pagination change effect - fetch data when pagination changes
  useEffect(() => {
    // Only fetch if admin is loaded and data has been initially loaded
    if (admin && dataLoadedRef.current) {
      fetchAllAdminData();
    }
  }, [
    productPagination.page, 
    categoryPagination.page, 
    bannerPagination.page, 
    carouselPagination.page,
    productSearch.searchQuery,
    admin,
    fetchAllAdminData
  ]);

  // Session management effects (keeping the original logic)
  useEffect(() => {
    if (!admin || authLoading) return;

    const handleLogout = async () => {
      try {
        await signOut();
        // Let the auth system handle token cleanup, only clear our custom admin session
        localStorage.removeItem('admin-session');
        toast({
          title: 'Session Ended',
          description: 'You have been logged out for security.',
        });
        navigate('/admin/login');
      } catch (error) {
        console.error('Error during logout:', error);
      }
    };

    const isAdminRoute = location.pathname.startsWith('/admin');
    if (!isAdminRoute) {
      handleLogout();
    }
  }, [location.pathname, admin, authLoading, signOut, toast, navigate]);

  // Security event listeners - only clear session when actually leaving admin area
  useEffect(() => {
    if (!admin) return;

    const handleVisibilityChange = () => {
      // Only sign out if user switches away from admin area, not just hiding the tab
      if (document.hidden && !location.pathname.startsWith('/admin')) {
        signOut();
        // Let the auth system handle token cleanup, don't manually clear Supabase tokens
        localStorage.removeItem('admin-session');
      }
    };

    const handlePopState = () => {
      // Only sign out when navigating away from admin area
      if (!location.pathname.startsWith('/admin')) {
        signOut();
        // Let the auth system handle token cleanup, don't manually clear Supabase tokens
        localStorage.removeItem('admin-session');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('popstate', handlePopState);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [admin, location.pathname, signOut]);

  const handleSignOut = async () => {
    try {
      await signOut();
      // Let the auth system handle token cleanup, only clear our custom admin session
      localStorage.removeItem('admin-session');
      localStorage.removeItem('simple_admin_session');
      toast({
        title: 'Signed Out',
        description: 'You have been successfully signed out.',
      });
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
      toast({
        title: 'Error',
        description: 'Error signing out. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Loading state
  if (authLoading) {
    return (
      <div className="container mx-auto px-3 py-4">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-36 mb-4"></div>
          <div className="grid grid-cols-1 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!admin) {
    return null; // This should not happen as SimpleProtectedRoute handles this
  }

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-8">
        <div className="mb-4 sm:mb-8 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <div>
            <h1 className="text-xl sm:text-3xl font-bold text-gray-900 mb-1">Admin Dashboard</h1>
            <p className="text-gray-600 text-xs sm:text-base">Welcome back, {admin.username}</p>
          </div>
          <Button variant="outline" onClick={handleSignOut} className="w-full sm:w-auto text-xs sm:text-sm h-8 sm:h-10">
            <LogOut className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
            Sign Out
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-6 mb-4 sm:mb-8">
          <Card className="p-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 px-2 pt-2 sm:px-6 sm:pt-6 sm:pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Products</CardTitle>
              <Package className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-2 pb-2 sm:px-6 sm:pb-6">
              <div className="text-lg sm:text-2xl font-bold">{stats.totalProducts}</div>
              <p className="text-xs text-muted-foreground">{stats.activeProducts} active</p>
            </CardContent>
          </Card>

          <Card className="p-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 px-2 pt-2 sm:px-6 sm:pt-6 sm:pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Categories</CardTitle>
              <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-2 pb-2 sm:px-6 sm:pb-6">
              <div className="text-lg sm:text-2xl font-bold">{stats.totalCategories}</div>
              <p className="text-xs text-muted-foreground">{stats.activeCategories} active</p>
            </CardContent>
          </Card>

          <Card className="p-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 px-2 pt-2 sm:px-6 sm:pt-6 sm:pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Banners</CardTitle>
              <Image className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-2 pb-2 sm:px-6 sm:pb-6">
              <div className="text-lg sm:text-2xl font-bold">{stats.totalBanners}</div>
              <p className="text-xs text-muted-foreground">{stats.activeBanners} active</p>
            </CardContent>
          </Card>

          <Card className="p-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 px-2 pt-2 sm:px-6 sm:pt-6 sm:pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Featured</CardTitle>
              <ShoppingBag className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-2 pb-2 sm:px-6 sm:pb-6">
              <div className="text-lg sm:text-2xl font-bold">{stats.featuredProducts}</div>
              <p className="text-xs text-muted-foreground">On homepage</p>
            </CardContent>
          </Card>

          <Card className="p-0 col-span-2 sm:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 px-2 pt-2 sm:px-6 sm:pt-6 sm:pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Low Stock</CardTitle>
              <Users className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-2 pb-2 sm:px-6 sm:pb-6">
              <div className="text-lg sm:text-2xl font-bold">{stats.lowStockProducts}</div>
              <p className="text-xs text-muted-foreground">Below 10 units</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="orders" className="space-y-3 sm:space-y-4">
          <TabsList
            className="
              flex flex-wrap w-full gap-1 sm:gap-0
              h-auto sm:h-10
              justify-start sm:grid sm:grid-cols-9
              bg-transparent
              p-0
            "
          >
            {/* Orders and Inventory lead: they are the day-to-day work, the rest
                is content management done occasionally. */}
            <TabsTrigger value="orders" className="flex-1 min-w-[120px] text-xs sm:text-sm h-8 sm:h-10">
              Orders
            </TabsTrigger>
            <TabsTrigger value="inventory" className="flex-1 min-w-[120px] text-xs sm:text-sm h-8 sm:h-10">
              Inventory
            </TabsTrigger>
            <TabsTrigger value="products" className="flex-1 min-w-[120px] text-xs sm:text-sm h-8 sm:h-10">
              Products
            </TabsTrigger>
            <TabsTrigger value="categories" className="flex-1 min-w-[120px] text-xs sm:text-sm h-8 sm:h-10">
              Categories
            </TabsTrigger>
            <TabsTrigger value="banners" className="flex-1 min-w-[120px] text-xs sm:text-sm h-8 sm:h-10">
              Top Banners
            </TabsTrigger>
            <TabsTrigger value="promo-banners" className="flex-1 min-w-[120px] text-xs sm:text-sm h-8 sm:h-10">
              Promo Banners
            </TabsTrigger>
            <TabsTrigger value="carousel" className="flex-1 min-w-[120px] text-xs sm:text-sm h-8 sm:h-10">
              Shop Images
            </TabsTrigger>
            <TabsTrigger value="marquee" className="flex-1 min-w-[120px] text-xs sm:text-sm h-8 sm:h-10">
              Marquee
            </TabsTrigger>
            <TabsTrigger value="ratings" className="flex-1 min-w-[120px] text-xs sm:text-sm h-8 sm:h-10">
              Ratings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="space-y-3 sm:space-y-4">
            <div>
              <h2 className="text-lg sm:text-2xl font-bold">Orders</h2>
              <p className="text-sm text-warm-muted">
                Every order placed on the site. Marking one delivered deducts its items from stock.
              </p>
            </div>
            <OrdersPanel />
          </TabsContent>

          <TabsContent value="inventory" className="space-y-3 sm:space-y-4">
            <div>
              <h2 className="text-lg sm:text-2xl font-bold">Inventory</h2>
              <p className="text-sm text-warm-muted">
                Stock levels, low-stock alerts and a full history of every movement.
              </p>
            </div>
            <InventoryPanel />
          </TabsContent>

          <TabsContent value="products" className="space-y-3 sm:space-y-4">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
              <h2 className="text-lg sm:text-2xl font-bold">Products</h2>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <Button onClick={() => setShowProductForm(true)} className="w-full sm:w-auto text-xs sm:text-sm h-8 sm:h-10">
                  <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                  Add Product
                </Button>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={productPagination.prevPage}
                    disabled={productPagination.page === 1 || productSearch.searchQuery.trim().length > 0}
                    className="text-xs h-7"
                  >
                    Prev
                  </Button>
                  <span className="text-xs">
                    {productSearch.searchQuery.trim().length > 0 ? 'All Results' : `Page ${productPagination.page}`}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={productPagination.nextPage}
                    disabled={productSearch.searchQuery.trim().length > 0 || products.length < itemsPerPage}
                    className="text-xs h-7"
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search products by name, description, category, or SKU..."
                  value={productSearch.searchQuery}
                  onChange={(e) => productSearch.setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-10 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {productSearch.searchQuery && (
                  <button
                    onClick={() => productSearch.setSearchQuery("")}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              {productSearch.searchQuery && (
                <div className="mt-2 text-xs text-gray-500">
                  Found {productSearch.filteredItems.length} product{productSearch.filteredItems.length !== 1 ? 's' : ''} 
                  {productSearch.searchQuery && ` matching "${productSearch.searchQuery}"`}
                </div>
              )}
            </div>

            <div className="space-y-2 sm:space-y-4">
              {productSearch.filteredItems.length === 0 ? (
                <Card className="p-0">
                  <CardContent className="p-6 text-center">
                    <div className="text-gray-500">
                      {productSearch.searchQuery ? (
                        <>
                          <Search className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                          <p className="text-lg font-medium mb-2">No products found</p>
                          <p className="text-sm">Try adjusting your search terms or clear the search to see all products.</p>
                        </>
                      ) : (
                        <>
                          <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                          <p className="text-lg font-medium mb-2">No products yet</p>
                          <p className="text-sm">Get started by adding your first product.</p>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                productSearch.filteredItems.map((product) => (
                <Card key={product.id} className="p-0">
                  <CardContent className="p-3 sm:p-6">
                    <div className="flex gap-3">
                      <img
                        src={product.images[0] || '/placeholder.svg'}
                        alt={product.name}
                        className="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded-lg flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                          <h3 className="font-semibold text-sm sm:text-lg truncate pr-2">{product.name}</h3>
                          <div className="flex flex-col items-end gap-1 flex-shrink-0">
                            <div className="font-bold text-sm sm:text-lg text-blue-600">
                              {formatPrice(product.price)}
                            </div>
                            {product.original_price && product.original_price > product.price && (
                              <div className="text-xs text-gray-400 line-through">
                                {formatPrice(product.original_price)}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <p className="text-gray-600 text-xs sm:text-sm mb-1 line-clamp-1">
                          {product.short_description || product.description}
                        </p>
                        
                        <div className="flex flex-wrap items-center gap-1 text-xs text-gray-500 mb-2">
                          <span>Stock: {product.stock_quantity}</span>
                          <span>•</span>
                          <span>{product.categories?.name || 'Uncategorized'}</span>
                          {product.video_url && (
                            <>
                              <span>•</span>
                              <span>📹</span>
                            </>
                          )}
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <div className="flex gap-1">
                            <Badge variant={product.is_active ? "default" : "secondary"} className="text-xs px-1 py-0">
                              {product.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                            {product.is_featured && (
                              <Badge variant="outline" className="text-xs px-1 py-0">Featured</Badge>
                            )}
                          </div>
                          
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => toggleProductStatus(product.id, product.is_active)}
                              className="h-6 w-6 p-0"
                            >
                              {product.is_active ? (
                                <EyeOff className="w-3 h-3" />
                              ) : (
                                <Eye className="w-3 h-3" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => toggleProductFeatured(product.id, product.is_featured)}
                              className="h-6 w-6 p-0 text-xs"
                            >
                              ⭐
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingProduct(product);
                                setShowProductForm(true);
                              }}
                              className="h-6 w-6 p-0"
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => initiateDeleteProduct(product)}
                              className="h-6 w-6 p-0"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )))}
            </div>
          </TabsContent>

          <TabsContent value="categories" className="space-y-3 sm:space-y-4">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
              <h2 className="text-lg sm:text-2xl font-bold">Categories</h2>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <Button onClick={() => setShowCategoryForm(true)} className="w-full sm:w-auto text-xs sm:text-sm h-8 sm:h-10">
                  <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                  Add Category
                </Button>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={categoryPagination.prevPage}
                    disabled={categoryPagination.page === 1}
                    className="text-xs h-7"
                  >
                    Prev
                  </Button>
                  <span className="text-xs">Page {categoryPagination.page}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={categoryPagination.nextPage}
                    disabled={categories.length < itemsPerPage}
                    className="text-xs h-7"
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {categories.map((category) => (
                <Card key={category.id} className="p-0">
                  <CardContent className="p-3 sm:p-4">
                    {category.image_url && (
                      <img 
                        src={category.image_url} 
                        alt={category.name}
                        className="w-full h-20 sm:h-32 object-cover rounded-lg mb-2"
                      />
                    )}
                    <div className="flex justify-between items-start mb-1 gap-2">
                      <h3 className="font-semibold text-sm sm:text-lg truncate">{category.name}</h3>
                      <Badge variant={category.is_active ? "default" : "secondary"} className="text-xs px-1 py-0 flex-shrink-0">
                        {category.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    {category.description && (
                      <p className="text-xs sm:text-sm text-gray-600 mb-2 line-clamp-2">{category.description}</p>
                    )}
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingCategory(category);
                          setShowCategoryForm(true);
                        }}
                        className="h-6 w-6 sm:h-8 sm:w-8 p-0"
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleCategoryVisibility(category.id, category.is_active)}
                        className="h-6 w-6 sm:h-8 sm:w-8 p-0"
                      >
                        {category.is_active ? (
                          <EyeOff className="w-3 h-3" />
                        ) : (
                          <Eye className="w-3 h-3" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => initiateDeleteCategory(category.id)}
                        className="h-6 w-6 sm:h-8 sm:w-8 p-0"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="banners" className="space-y-3 sm:space-y-4">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
              <h2 className="text-lg sm:text-2xl font-bold">Banners</h2>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <Button onClick={() => setShowBannerForm(true)} className="w-full sm:w-auto text-xs sm:text-sm h-8 sm:h-10">
                  <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                  Add Banner
                </Button>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={bannerPagination.prevPage}
                    disabled={bannerPagination.page === 1}
                    className="text-xs h-7"
                  >
                    Prev
                  </Button>
                  <span className="text-xs">Page {bannerPagination.page}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={bannerPagination.nextPage}
                    disabled={banners.length < itemsPerPage}
                    className="text-xs h-7"
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-2 sm:space-y-4">
              {banners.map((banner) => (
                <Card key={banner.id} className="p-0">
                  <CardContent className="p-3 sm:p-6">
                    <div className="flex gap-3">
                      <img
                        src={banner.image_url}
                        alt={banner.title}
                        className="w-16 h-10 sm:w-20 sm:h-12 object-cover rounded-lg flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                          <h3 className="font-semibold text-sm sm:text-lg truncate pr-2">{banner.title}</h3>
                          <Badge variant={banner.is_active ? "default" : "secondary"} className="text-xs px-1 py-0 flex-shrink-0">
                            {banner.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        
                        {banner.subtitle && (
                          <p className="text-gray-600 text-xs sm:text-sm mb-1 line-clamp-1">{banner.subtitle}</p>
                        )}
                        
                        <div className="flex flex-wrap items-center gap-1 text-xs text-gray-500 mb-2">
                          <span>Order: {banner.display_order}</span>
                          {banner.cta_text && (
                            <>
                              <span>•</span>
                              <span>CTA: {banner.cta_text}</span>
                            </>
                          )}
                          {banner.video_url && (
                            <>
                              <span>•</span>
                              <span>📹</span>
                            </>
                          )}
                        </div>
                        
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleBannerStatus(banner.id, banner.is_active)}
                            className="h-6 w-6 p-0"
                          >
                            {banner.is_active ? (
                              <EyeOff className="w-3 h-3" />
                            ) : (
                              <Eye className="w-3 h-3" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingBanner(banner);
                              setShowBannerForm(true);
                            }}
                            className="h-6 w-6 p-0"
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteBanner(banner.id)}
                            className="h-6 w-6 p-0"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="carousel" className="space-y-3 sm:space-y-4">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
              <h2 className="text-lg sm:text-2xl font-bold">Shop Image Carousel</h2>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <Button onClick={() => setShowCarouselForm(true)} className="w-full sm:w-auto text-xs sm:text-sm h-8 sm:h-10">
                  <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                  Add Carousel Image
                </Button>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={carouselPagination.prevPage}
                    disabled={carouselPagination.page === 1}
                    className="text-xs h-7"
                  >
                    Prev
                  </Button>
                  <span className="text-xs">Page {carouselPagination.page}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={carouselPagination.nextPage}
                    disabled={carouselItems.length < itemsPerPage}
                    className="text-xs h-7"
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
            <ShopImageCarouselList
              items={carouselItems}
              onEdit={(item) => {
                setEditingCarouselItem(item);
                setShowCarouselForm(true);
              }}
              onDelete={deleteCarouselItem}
              onToggleActive={toggleCarouselActive}
            />
          </TabsContent>

          <TabsContent value="marquee" className="space-y-3 sm:space-y-4">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
              <h2 className="text-lg sm:text-2xl font-bold">Website Marquee</h2>
            </div>
            <MarqueeForm />
          </TabsContent>

          <TabsContent value="ratings" className="space-y-3 sm:space-y-4">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
              <h2 className="text-lg sm:text-2xl font-bold">Product Ratings</h2>
            </div>
            <RatingStats />
          </TabsContent>

          <TabsContent value="promo-banners" className="space-y-3 sm:space-y-4">
            <PromoBannerList />
          </TabsContent>
        </Tabs>

        {/* Form Modals */}
        {showProductForm && (
          <ProductForm
            product={editingProduct}
            categories={categories}
            onClose={() => handleCloseForm('product')}
            onSave={() => handleSaveForm('product')}
          />
        )}

        {showCategoryForm && (
          <CategoryForm
            category={editingCategory}
            onClose={() => handleCloseForm('category')}
            onSave={() => handleSaveForm('category')}
          />
        )}

        {showBannerForm && (
          <BannerForm
            banner={editingBanner}
            onClose={() => handleCloseForm('banner')}
            onSave={() => handleSaveForm('banner')}
          />
        )}

        {showCarouselForm && (
          <ShopImageCarouselForm
            carouselItem={editingCarouselItem}
            onClose={() => handleCloseForm('carousel')}
            onSave={() => handleSaveForm('carousel')}
          />
        )}

        {/* Delete Category Confirmation Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-5 h-5" />
                Delete Category
              </AlertDialogTitle>
              <AlertDialogDescription className="text-left space-y-3">
                {productsToDelete.length > 0 ? (
                  <div className="space-y-3">
                    <p className="font-medium text-gray-900">
                      You are about to delete the category <span className="font-bold text-red-600">"{categoryToDelete?.name}"</span>
                    </p>
                    <p className="text-sm text-gray-700">
                      This category has <span className="font-bold text-red-600">{productsToDelete.length}</span> product(s) assigned to it:
                    </p>
                    <div className="bg-red-50 p-3 rounded-lg border-l-4 border-red-200">
                      <ul className="text-sm text-gray-700 space-y-1">
                        {productsToDelete.slice(0, 5).map((product, index) => (
                          <li key={product.id} className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-red-400 rounded-full flex-shrink-0"></span>
                            {product.name}
                          </li>
                        ))}
                        {productsToDelete.length > 5 && (
                          <li className="text-red-600 font-medium">
                            ... and {productsToDelete.length - 5} more product(s)
                          </li>
                        )}
                      </ul>
                    </div>
                    <div className="bg-yellow-50 p-3 rounded-lg border-l-4 border-yellow-200">
                      <p className="text-sm text-yellow-800">
                        <span className="font-bold">⚠️ Warning:</span> Clicking "Delete Everything" will permanently delete both the category and ALL associated products. This action cannot be undone.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="font-medium text-gray-900">
                      Are you sure you want to delete the category <span className="font-bold text-red-600">"{categoryToDelete?.name}"</span>?
                    </p>
                    <p className="text-sm text-gray-600">
                      This category has no products assigned to it. This action cannot be undone.
                    </p>
                  </div>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2">
              <AlertDialogCancel onClick={handleCancelDelete} className="flex-1">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleConfirmDelete} 
                className="flex-1 bg-red-600 hover:bg-red-700 focus:ring-red-500"
              >
                {productsToDelete.length > 0 ? 'Delete Everything' : 'Delete Category'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Product Confirmation Dialog */}
        <AlertDialog open={showProductDeleteDialog} onOpenChange={setShowProductDeleteDialog}>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-5 h-5" />
                Delete Product
              </AlertDialogTitle>
              <AlertDialogDescription className="text-left space-y-3">
                <div className="space-y-3">
                  <p className="font-medium text-gray-900">
                    Are you sure you want to delete the product <span className="font-bold text-red-600">"{productToDelete?.name}"</span>?
                  </p>
                  <div className="bg-red-50 p-3 rounded-lg border-l-4 border-red-200">
                    <div className="flex items-center gap-3">
                      {productToDelete?.images?.[0] && (
                        <img
                          src={productToDelete.images[0]}
                          alt={productToDelete.name}
                          className="w-12 h-12 object-cover rounded-lg flex-shrink-0"
                        />
                      )}
                      <div>
                        <p className="font-medium text-gray-900">{productToDelete?.name}</p>
                        <p className="text-sm text-gray-600">{formatPrice(productToDelete?.price || 0)}</p>
                        <p className="text-xs text-gray-500">Stock: {productToDelete?.stock_quantity}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-yellow-50 p-3 rounded-lg border-l-4 border-yellow-200">
                    <p className="text-sm text-yellow-800">
                      <span className="font-bold">⚠️ Warning:</span> This action cannot be undone. The product will be permanently removed from your inventory.
                    </p>
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2">
              <AlertDialogCancel onClick={handleCancelDeleteProduct} className="flex-1">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleConfirmDeleteProduct} 
                className="flex-1 bg-red-600 hover:bg-red-700 focus:ring-red-500"
              >
                Delete Product
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </ErrorBoundary>
  );
};

export default Admin;