'use client';
import { useState, useEffect, useCallback, useRef } from 'react';

export const useContextMenu = () => {
  const [anchorPoint, setAnchorPoint] = useState({ x: 0, y: 0 });
  const [isOpen, setIsOpen] = useState(false);
  const longPressTimeoutRef = useRef<NodeJS.Timeout>(null);

  const handleContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    setAnchorPoint({ x: event.pageX, y: event.pageY });
    setIsOpen(true);
  }, []);
  
  const handleTouchStart = useCallback((event: React.TouchEvent) => {
    const touch = event.touches[0];
    longPressTimeoutRef.current = setTimeout(() => {
        setAnchorPoint({ x: touch.pageX, y: touch.pageY });
        setIsOpen(true);
    }, 500); // 500ms for long press
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current);
    }
  }, []);

  const closeMenu = useCallback(() => {
    setIsOpen(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      const handleClick = () => closeMenu();
      const handleScroll = () => closeMenu();
      document.addEventListener('click', handleClick);
      window.addEventListener('scroll', handleScroll);
      return () => {
        document.removeEventListener('click', handleClick);
        window.removeEventListener('scroll', handleScroll);
      };
    }
  }, [isOpen, closeMenu]);

  return { anchorPoint, isOpen, handleContextMenu, handleTouchStart, handleTouchEnd, closeMenu };
};
