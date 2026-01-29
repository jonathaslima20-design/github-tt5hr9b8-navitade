import { useState, useEffect } from 'react';

interface AspectRatioBreakpoints {
  mobile: number;
  desktop: number;
}

export function useResponsiveAspectRatio(breakpoints: AspectRatioBreakpoints, breakpointWidth: number = 768) {
  const [currentAspectRatio, setCurrentAspectRatio] = useState(breakpoints.mobile);

  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth < breakpointWidth;
      const newAspectRatio = isMobile ? breakpoints.mobile : breakpoints.desktop;

      if (newAspectRatio !== currentAspectRatio) {
        setCurrentAspectRatio(newAspectRatio);
      }
    };

    window.addEventListener('resize', handleResize);

    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [breakpoints, currentAspectRatio, breakpointWidth]);

  return currentAspectRatio;
}
