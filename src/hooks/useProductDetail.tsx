import { createContext, useContext, useState, useCallback, useRef, ReactNode } from "react";
import { ProductDetailPanel } from "@/components/ProductDetailPanel";

interface ProductDetailContextType {
  openDetail: (product: any) => void;
  closeDetail: () => void;
}

const ProductDetailContext = createContext<ProductDetailContextType | undefined>(undefined);

/**
 * Provides the global slide-in product detail panel. Any product card can call
 * openDetail(product) to slide it in from the right (matches the design).
 */
export const ProductDetailProvider = ({ children }: { children: ReactNode }) => {
  const [product, setProduct] = useState<any | null>(null);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openDetail = useCallback((p: any) => {
    if (timer.current) clearTimeout(timer.current);
    setProduct(p);
    // Mount with the product first, then trigger the slide-in transition.
    timer.current = setTimeout(() => setOpen(true), 10);
  }, []);

  const closeDetail = useCallback(() => setOpen(false), []);

  return (
    <ProductDetailContext.Provider value={{ openDetail, closeDetail }}>
      {children}
      <ProductDetailPanel product={product} open={open} onClose={closeDetail} />
    </ProductDetailContext.Provider>
  );
};

export const useProductDetail = () => {
  const ctx = useContext(ProductDetailContext);
  if (!ctx) throw new Error("useProductDetail must be used within a ProductDetailProvider");
  return ctx;
};
