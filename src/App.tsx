import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";
import { CartProvider } from "@/hooks/useCart";
import { WishlistProvider } from "@/hooks/useWishlist";
import { ProductDetailProvider } from "@/hooks/useProductDetail";
import { SimpleAdminAuthProvider } from "@/hooks/useSimpleAdminAuth";
import { Layout } from "@/components/Layout";
import { SimpleProtectedRoute } from "@/components/SimpleProtectedRoute";
import ErrorBoundary from "@/components/ErrorBoundary";
import Index from "./pages/Index";

// Code-split every route except the landing page. This keeps the initial
// bundle small so the app shell + homepage paint fast; other pages (Admin
// pulls in charts, etc.) are fetched on demand when navigated to.
const Products = lazy(() => import("./pages/Products"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const Checkout = lazy(() => import("./pages/Checkout"));
const Wishlist = lazy(() => import("./pages/Wishlist"));
const Admin = lazy(() => import("./pages/Admin"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ContactUsPage = lazy(() => import("./pages/ContactUsPage"));
const AboutUsPage = lazy(() => import("./pages/AboutUsPage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Mobile networks drop requests routinely. A single immediate retry
      // tends to fail for the same reason the first attempt did, so back off
      // between attempts instead.
      retry: 3,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
      refetchOnWindowFocus: false,
      // Phones suspend sockets when the app is backgrounded or the user moves
      // between wifi and mobile data. Without this, coming back to the tab
      // leaves whatever failed while it was asleep permanently empty.
      refetchOnReconnect: true,
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    },
  },
});

// Lightweight fallback shown only while a lazy route chunk downloads.
const RouteFallback = () => (
  <div className="min-h-[60vh] flex items-center justify-center">
    <div className="w-6 h-6 border-2 border-warm-accent border-t-transparent rounded-full animate-spin" />
  </div>
);

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SimpleAdminAuthProvider>
          <CartProvider>
            <WishlistProvider>
            <ProductDetailProvider>
            <Toaster />
            <Sonner />
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/" element={<Layout />}>
                  <Route index element={<Index />} />
                  <Route path="products" element={<Products />} />
                  <Route path="products/category/:category" element={<Products />} />
                  <Route path="products/search/:query" element={<Products />} />
                  <Route path="products/featured" element={<Products />} />
                  <Route path="products/top-rated" element={<Products />} />
                  <Route path="products/new-arrivals" element={<Products />} />
                  <Route path="products/on-sale" element={<Products />} />
                  <Route path="products/:slug" element={<ProductDetail />} />
                  <Route path="contactUsPage" element={<ContactUsPage />} />
                  <Route path="aboutUsPage" element={<AboutUsPage />} />
                  <Route path="checkout" element={<Checkout />} />
                  <Route path="wishlist" element={<Wishlist />} />
                  <Route path="*" element={<NotFound />} />
                </Route>

                <Route
                  path="/admin"
                  element={
                    <SimpleProtectedRoute>
                      <Admin />
                    </SimpleProtectedRoute>
                  }
                />
              </Routes>
            </Suspense>
            </ProductDetailProvider>
            </WishlistProvider>
          </CartProvider>
        </SimpleAdminAuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
