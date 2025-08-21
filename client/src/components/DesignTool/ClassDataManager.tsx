import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch } from '../../store';
import { RootState } from '../../store';
import { loadCustomClasses, loadCategories } from '../../store/classSlice';

/**
 * ClassDataManager - Handles loading custom classes and categories from database on app start
 * This component should be placed at the app root level to ensure data is loaded
 */
const ClassDataManager: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { isLoading, error } = useSelector((state: RootState) => (state as any).classes || { isLoading: false, error: null });

  useEffect(() => {
    // Load custom classes and categories from database on app start
    dispatch(loadCustomClasses());
    dispatch(loadCategories('class'));
  }, [dispatch]);

  // Optional: Show loading state or error (can be removed if not needed)
  if (isLoading) {
    console.log('Loading custom classes and categories...');
  }

  if (error) {
    console.error('Failed to load custom classes:', error);
  }

  return <>{children}</>;
};

export default ClassDataManager;