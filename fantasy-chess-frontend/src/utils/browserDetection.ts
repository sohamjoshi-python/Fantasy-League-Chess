import { useState, useEffect } from 'react';

export const isSmallScreen = (): boolean => {
  return window.innerWidth < 768; // Mobile breakpoint
};

export const getBrandName = (): string => {
  return isSmallScreen() ? 'FLC' : 'Fantasy League Chess';
};

export const getBrandNameFull = (): string => {
  return isSmallScreen() ? 'Fantasy League Chess (FLC)' : 'Fantasy League Chess';
};

export const useResponsiveBrandName = () => {
  const [brandName, setBrandName] = useState(getBrandName());
  const [brandNameFull, setBrandNameFull] = useState(getBrandNameFull());

  useEffect(() => {
    const handleResize = () => {
      setBrandName(getBrandName());
      setBrandNameFull(getBrandNameFull());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return { brandName, brandNameFull };
}; 