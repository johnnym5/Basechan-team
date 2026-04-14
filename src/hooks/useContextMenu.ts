'use client';
import { useState, useEffect, useCallback, useRef } from 'react';

export const useContextMenu = () => {
  const [anchorPoint, setAnchorPoint] = useState({ x: 0, y: 0 });
  const [isOpen, setIsOpen] = useState(false);
  const longPressTimeoutRef = useRef<NodeJS.Timeout>();

  const handleContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    setAnchorPoint({ x: event.pageX, y: event.pageY });
    setIsOpen(true);
  }, []);
  
  const handleTouchStart = useCallback((event: React.TouchEvent) => {
    longPressTimeoutRef.current = setTimeout(() => {
        // Prevent context menu from opening if touch moves
        event.preventDefault();
        setAnchorPoint({ x: event.touches[0].pageX, y: event.touches[0].pageY });
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
