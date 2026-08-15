"use client";

import React, { createContext, useContext, useState } from "react";

export interface BookItem {
  id: string;
  title: string;
  author: string;
  targetExam: "CBSE" | "JEE" | "NEET" | "Foundation";
  classLevel: "Class 11" | "Class 12" | "Both";
  price: number;
  originalPrice: number;
  coverImage: string;
  rating: number;
  inStock: boolean;
}

export interface CartItem {
  book: BookItem;
  quantity: number;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (book: BookItem) => void;
  removeFromCart: (bookId: string) => void;
  updateQuantity: (bookId: string, quantity: number) => void;
  clearCart: () => void;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  subtotal: number;
  totalItems: number;
  purchasedBookIds: string[];
  isBookPurchased: (bookId: string) => boolean;
  markBookPurchased: (bookId: string | string[]) => void;
  purchasedCourseIds: string[];
  isCoursePurchased: (courseId: string) => boolean;
  markCoursePurchased: (courseId: string | string[]) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>([
    {
      book: {
        id: "b1",
        title: "Double Entry Book Keeping (Accountancy)",
        author: "T.S. Grewal",
        targetExam: "CBSE",
        classLevel: "Class 12",
        price: 650,
        originalPrice: 850,
        coverImage: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&auto=format&fit=crop&q=80",
        rating: 4.9,
        inStock: true,
      },
      quantity: 1,
    },
  ]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [purchasedBookIds, setPurchasedBookIds] = useState<string[]>([]);
  const [purchasedCourseIds, setPurchasedCourseIds] = useState<string[]>([]); // Default no courses purchased until payment

  const addToCart = (book: BookItem) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.book.id === book.id);
      if (existing) {
        return prev.map((item) =>
          item.book.id === book.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { book, quantity: 1 }];
    });
    setIsCartOpen(true);
  };

  const removeFromCart = (bookId: string) => {
    setCart((prev) => prev.filter((item) => item.book.id !== bookId));
  };

  const updateQuantity = (bookId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(bookId);
      return;
    }
    setCart((prev) =>
      prev.map((item) => (item.book.id === bookId ? { ...item, quantity } : item))
    );
  };

  const clearCart = () => setCart([]);

  const isBookPurchased = (bookId: string) => {
    return purchasedBookIds.includes(bookId);
  };

  const markBookPurchased = (bookId: string | string[]) => {
    setPurchasedBookIds((prev) => {
      const idsToAdd = Array.isArray(bookId) ? bookId : [bookId];
      const next = new Set([...prev, ...idsToAdd]);
      return Array.from(next);
    });
  };

  const isCoursePurchased = (courseId: string) => {
    return purchasedCourseIds.includes(courseId);
  };

  const markCoursePurchased = (courseId: string | string[]) => {
    setPurchasedCourseIds((prev) => {
      const idsToAdd = Array.isArray(courseId) ? courseId : [courseId];
      const next = new Set([...prev, ...idsToAdd]);
      return Array.from(next);
    });
  };

  const subtotal = cart.reduce((acc, item) => acc + item.book.price * item.quantity, 0);
  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        isCartOpen,
        setIsCartOpen,
        subtotal,
        totalItems,
        purchasedBookIds,
        isBookPurchased,
        markBookPurchased,
        purchasedCourseIds,
        isCoursePurchased,
        markCoursePurchased,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within a CartProvider");
  return context;
};
