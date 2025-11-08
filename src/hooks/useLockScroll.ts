import { useEffect } from 'react';

export function useLockScroll(isLocked: boolean) {
  useEffect(() => {
    if (isLocked) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = `${scrollbarWidth}px`;

      const main = document.querySelector('main');
      if (main) {
        main.style.overflow = 'hidden';
      }
    } else {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';

      const main = document.querySelector('main');
      if (main) {
        main.style.overflow = '';
      }
    }

    return () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';

      const main = document.querySelector('main');
      if (main) {
        main.style.overflow = '';
      }
    };
  }, [isLocked]);
}
